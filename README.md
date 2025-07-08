🚀 **Git Search for VS Code: Unravel the Mysteries of Your Codebase!**

🔍**The Lowdown**: Ever wonder who altered that crucial line of code and when? With Git Search, you're just a few clicks away from unveiling the mysteries of your codebase. Just cross your fingers you're not the digital detective hunting your own coding missteps! 😉

## Demo

![Git Search in Action](./assets/out.gif)

## Why Git Search?

Working with legacy code or unfamiliar projects often presents a host of challenges, particularly when trying to decipher what's happening and what has transpired. Frequently, I find that commit messages are either missing or lack sufficient detail. In the best-case scenario, they might point to a Jira ticket, but as we know, that doesn't always shed much light on the issue. In the worst cases, I encounter unhelpful commit messages like "fix."

Regularly, there's a need to understand how a specific variable or function was created or used. Typically, this would involve using git log -S in the terminal and manually opening each commit to examine the changes. This process can be quite tedious. To streamline this task, I created this extension.

## Features

- **🚀 Rapid Git Log Searches**: Dive into your code's history with the speed of a hot rod. Unearth the "who" and "when" behind every change, fast.
- **🔗 Direct Commit Access**: Found something intriguing? Jump straight from your search results to the actual commit in your remote repository.
- **📄 Smart Pagination**: Dealing with a mountain of results? Effortlessly navigate through them with intuitive pagination.
- **⚙️ Seamless Repo Integration**: Git Search tunes itself to your current workspace's Git setup. No complex configurations, just plug and play.

## How to Use

1.  Open the Command Palette (`Cmd+Shift+P` on macOS or `Ctrl+Shift+P` on Windows/Linux).
2.  Search for and select the **"Show Git Search Panel"** command.
3.  In the new panel, type your search term into the input box and press Enter. This will run a `git log -S"<your-term>"` command to find commits that introduce or remove that string.
4.  The results, including commit hash, author, and date, will be displayed in the panel.

## Contributing

Got some cool ideas or valuable feedback? Team up with us on [GitHub](https://github.com/lmn451/git-search) and help make Git Search even more awesome. Let’s code, collaborate, and create something phenomenal!
