const vscode = require('vscode');
const { exec } = require('child_process');

let currentPage = 0;
const pageSize = 10;
let latestQuery = '';

function activate(context) {
    let disposable = vscode.commands.registerCommand('git-search.showPanel', () => {
        const panel = vscode.window.createWebviewPanel(
            'gitSearch',
            'Git Search',
            vscode.ViewColumn.One,
            { enableScripts: true }
        );

        getRepoUrl().then(repoUrl => {
            panel.webview.html = getWebviewContent(repoUrl);
        });

        panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'search':
                        latestQuery = message.text;
                        currentPage = 0;
                        await executeGitSearch(message.text, panel);
                        break;
                    case 'loadMore':
                        currentPage++;
                        await executeGitSearch(latestQuery, panel, true);
                        break;
                    case 'reset':
                        latestQuery = '';
                        currentPage = 0;
                        panel.webview.postMessage({ command: 'showResults', text: '' });
                        break;
                }
            },
            undefined,
            context.subscriptions
        );
    });

    context.subscriptions.push(disposable);
}

function getRepoUrl() {
    return new Promise((resolve, reject) => {
        if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
            const workspaceFolderPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
            exec('git config --get remote.origin.url', { cwd: workspaceFolderPath }, (error, stdout, stderr) => {
                if (error || stderr || !stdout) {
                    resolve(''); // Fallback if Git repo URL can't be determined
                } else {
                    const repoUrl = stdout.trim().replace('.git', '').replace('git@github.com:', 'https://github.com/');
                    resolve(repoUrl);
                }
            });
        } else {
            resolve('');
        }
    });
}

function getWebviewContent(repoUrl) {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <style>
            body { font-family: Arial, sans-serif; }
            #searchQuery { width: 80%; padding: 8px; }
            #searchBtn, #loadMoreBtn, #resetBtn { padding: 8px 15px; margin: 5px; }
            #results { margin-top: 20px; }
            .commit { padding: 10px; border-bottom: 1px solid #ccc; }
            .commit a { text-decoration: none; color: blue; }
        </style>
        <title>Git Search</title>
    </head>
    <body>
        <input type="text" id="searchQuery" placeholder="Enter search query">
        <button id="searchBtn">Search</button>
        <button id="resetBtn">Reset</button>
        <div id="results"></div>
        <button id="loadMoreBtn" style="display:none;">Load More</button>

        <script>
            const vscode = acquireVsCodeApi();
            document.getElementById('searchBtn').addEventListener('click', () => {
                const query = document.getElementById('searchQuery').value;
                vscode.postMessage({ command: 'search', text: query });
            });

            document.getElementById('resetBtn').addEventListener('click', () => {
				document.getElementById('searchQuery').value = ''
                vscode.postMessage({ command: 'reset' });
            });

            document.getElementById('loadMoreBtn').addEventListener('click', () => {
                vscode.postMessage({ command: 'loadMore', text: latestQuery });
            });

            window.addEventListener('message', event => {
                const message = event.data;
                switch (message.command) {
                    case 'showResults':
                        document.getElementById('results').innerHTML = message.text;
                        document.getElementById('loadMoreBtn').style.display = 'block';
                        break;
                    case 'appendResults':
                        document.getElementById('results').innerHTML += message.text;
                        break;
                }
            });
        </script>
    </body>
    </html>`;
}

async function executeGitSearch(query, panel, isLoadMore = false) {
    if (!query.trim()) {
        panel.webview.postMessage({ command: 'showResults', text: 'Please enter a valid search query.' });
        return;
    }

    if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
        panel.webview.postMessage({ command: 'showResults', text: 'No open workspace with a Git repository detected.' });
        return;
    }

    const workspaceFolderPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
    const sanitizedQuery = query.replace(/[^a-zA-Z0-9 _-]/g, "");

    try {
        const repoUrl = await getRepoUrl();
        const command = `git log -S"${sanitizedQuery}" --skip=${currentPage * pageSize} -n ${pageSize} --pretty=format:"<li class='commit'><a href='${repoUrl}/commit/%H'>%h</a> - %s (%cd)</li>" --date=format:"%Y-%m-%d %H:%M"`;
        const stdout = await executeCommand(command, workspaceFolderPath);
        let content = stdout ? `<ul>${stdout}</ul>` : '<p>No results found.</p>';
        if (!isLoadMore) {
            content += '<button id="loadMoreBtn" style="display:none;">Load More</button>';
        }
        panel.webview.postMessage({ command: isLoadMore ? 'appendResults' : 'showResults', text: content });
    } catch (error) {
        panel.webview.postMessage({ command: 'showResults', text: `Error: ${error.message}` });
    }
}

function executeCommand(command, cwd) {
    return new Promise((resolve, reject) => {
        exec(command, { cwd }, (error, stdout, stderr) => {
            if (error) {
                reject(error);
                return;
            }
            if (stderr) {
                reject(new Error(stderr));
                return;
            }
            resolve(stdout);
        });
    });
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
}
