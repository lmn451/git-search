const assert = require('assert');
const vscode = require('vscode');
const sinon = require('sinon');
const myExtension = require('../../extension');

suite('Extension Integration Tests', () => {
    let sandbox;
    let mockPanel;
    let postMessageStub;
    let mockSearchEngine;

    setup(() => {
        sandbox = sinon.createSandbox();

        // Create a mock panel
        postMessageStub = sandbox.stub();
        mockPanel = {
            webview: {
                html: '',
                postMessage: postMessageStub,
            },
            reveal: () => {},
            dispose: () => {},
        };

        // Create a mock SearchEngine
        mockSearchEngine = {
            search: sandbox.stub(),
            loadMore: sandbox.stub(),
            reset: sandbox.stub(),
            changeMode: sandbox.stub(),
            updateContextLines: sandbox.stub(),
            latestQuery: ''
        };

        // Replace the search engine in the extension
        myExtension.setSearchEngine(mockSearchEngine);

        // Stub workspace
        sandbox.stub(vscode.workspace, 'workspaceFolders').value([{
            uri: { fsPath: '/test/workspace' }
        }]);
    });

    teardown(() => {
        sandbox.restore();
    });

    suite('Message Handling', () => {
        test('should handle search command', async () => {
            mockSearchEngine.search.resolves({
                html: '<li>Test result</li>',
                canLoadMore: true,
                latestQuery: 'test'
            });

            await myExtension.handleWebviewMessage({ 
                command: 'search', 
                text: 'test query' 
            }, mockPanel);

            // Should show loading first
            assert.ok(postMessageStub.calledWith({ 
                command: 'showResults', 
                text: 'Loading' 
            }));

            // Should call search engine
            assert.ok(mockSearchEngine.search.calledWith('test query', '/test/workspace'));

            // Should post results
            assert.ok(postMessageStub.calledWith({
                command: 'showResults',
                text: '<li>Test result</li>',
                latestQuery: 'test',
                isLoadMore: true
            }));
        });

        test('should handle reset command', async () => {
            await myExtension.handleWebviewMessage({ 
                command: 'reset' 
            }, mockPanel);

            assert.ok(mockSearchEngine.reset.called);
            assert.ok(postMessageStub.calledWith({ 
                command: 'reset', 
                text: '' 
            }));
        });

        test('should handle changeMode command', async () => {
            await myExtension.handleWebviewMessage({ 
                command: 'changeMode', 
                mode: 'G' 
            }, mockPanel);

            assert.ok(mockSearchEngine.changeMode.calledWith('G'));
        });

        test('should handle loadMore command', async () => {
            mockSearchEngine.loadMore.resolves({
                html: '<li>More results</li>',
                canLoadMore: false,
                latestQuery: 'test',
                isLoadMore: true
            });

            await myExtension.handleWebviewMessage({ 
                command: 'loadMore' 
            }, mockPanel);

            assert.ok(mockSearchEngine.loadMore.calledWith('/test/workspace'));
            assert.ok(postMessageStub.calledWith({
                command: 'showResults',
                text: '<li>More results</li>',
                latestQuery: 'test',
                isLoadMore: false
            }));
        });

        test('should handle updateNumberOfContextLines command', async () => {
            mockSearchEngine.latestQuery = 'previous query';
            mockSearchEngine.search.resolves({
                html: '<li>Updated results</li>',
                canLoadMore: false,
                latestQuery: 'previous query'
            });

            await myExtension.handleWebviewMessage({ 
                command: 'updateNumberOfContextLines', 
                value: 5 
            }, mockPanel);

            assert.ok(mockSearchEngine.updateContextLines.calledWith(5));
            assert.ok(mockSearchEngine.search.calledWith('previous query', '/test/workspace'));
        });

        test('should handle search errors gracefully', async () => {
            const showErrorStub = sandbox.stub(vscode.window, 'showErrorMessage');
            mockSearchEngine.search.rejects(new Error('Search failed'));

            await myExtension.handleWebviewMessage({ 
                command: 'search', 
                text: 'failing query' 
            }, mockPanel);

            assert.ok(showErrorStub.calledWith('Error: Search failed'));
            assert.ok(postMessageStub.calledWith({
                command: 'showResults',
                text: 'Search failed'
            }));
        });
    });

    suite('Webview Creation', () => {
        test('should create webview panel correctly', () => {
            const createPanelStub = sandbox.stub(vscode.window, 'createWebviewPanel');
            const mockCreatedPanel = {
                webview: {
                    html: '',
                    onDidReceiveMessage: sandbox.stub()
                }
            };
            createPanelStub.returns(mockCreatedPanel);

            myExtension.showPanel({ subscriptions: [] });

            assert.ok(createPanelStub.calledWith(
                'gitSearch',
                'Git Search',
                vscode.ViewColumn.One,
                { enableScripts: true }
            ));
        });

        test('should set webview content', () => {
            const content = myExtension.getWebviewContent();
            assert.ok(typeof content === 'string');
            assert.ok(content.length > 0);
        });
    });

    suite('Workspace Handling', () => {
        test('should handle no workspace gracefully', async () => {
            sandbox.restore();
            sandbox = sinon.createSandbox();
            sandbox.stub(vscode.workspace, 'workspaceFolders').value([]);

            mockSearchEngine.search.resolves({
                html: 'No workspace found',
                canLoadMore: false
            });

            // Re-setup mocks after sandbox restore
            postMessageStub = sandbox.stub();
            mockPanel.webview.postMessage = postMessageStub;

            await myExtension.handleWebviewMessage({ 
                command: 'search', 
                text: 'test' 
            }, mockPanel);

            assert.ok(mockSearchEngine.search.calledWith('test', null));
        });
    });
}); 