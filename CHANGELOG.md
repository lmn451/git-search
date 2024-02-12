# Change Log [created by aichangelog](https://github.com/lmn451/aichangelog)

## Version 0.2.4

Changelog:

- Updated extension version to 0.2.4 in package.json
- Reset the isLoadMore variable to false when handling update of number of context lines in extension.js

## Version 0.2.3

Changelog:

- Updated `extension.js` to add a new variable `NUMBER_OF_COTEXT_LINES` and a new function `handleUpdateNumberOfContextLines`.
- Updated `gitSearchPanel.html` to add a new input field `numberOfContextLines`.
- Updated `package.json` to update the extension version to `0.2.3`.
- Updated `gitCommands.js` to accept a new parameter `numberOfContextLines` in the `getRelatedDiffs` function.

## Version 0.2.2

- Added `getRelatedCommitsInfo`, `getRelatedDiffs`, `getRepoUrl`, `adjustDate`, and `formatDate` functions to `./src/gitCommands` file
- Updated `executeGitSearch` function in `extension.js` to use `getRelatedCommitsInfo` function instead of `executeCommand` function to retrieve related commits information
- Updated `executeGitSearch` function in `extension.js` to use `getRelatedDiffs` function instead of `executeCommand` function to retrieve related diffs
- Moved `sanitize`, `adjustDate`, and `formatDate` functions from `extension.js` to `./src/helpers` file
- Added `executeCommand` function to `./src/helpers` file
- Updated `executeGitSearch` function in `extension.js` and `getRepoUrl` function in `./src/gitCommands` file to use `executeCommand` function from `./src/helpers` file
- Updated the version number in `package.json`

## Version 0.2.1

Changelog:

- Updated `gitSearchPanel.html`:

  - Removed `pre` styling
  - Modified `.highlight` class: added `color: blue`
  - Modified `.current-highlight` class: added `color: blue`
  - Modified `.searched-query` class: added `border: 1px solid blueviolet`

- Updated `package.json`:
  - Updated version from `0.2.0` to `0.2.1`

## Version 0.2.0

Changelog:

- Added the `customGrep.js` module to handle highlighting of search queries in HTML.
- Imported and used the `highlightQueryInHtml` function from the `customGrep` module to highlight the search query in the displayed commit diffs.
- Updated the `package.json` file version from `0.1.15` to `0.2.0`.
- Updated the `gitSearchPanel.html` file to add a CSS style for the highlighted search query.
- Added error handling to display error messages in case of any errors during execution.

## Version 0.1.15

Changelog:

- Updated `extension.js`

  - Fixed `isLoadMore` parameter to use `contentArray` instead of `content` for determining if there are more results to load.

- Updated `package.json`
  - Increased the version number from `0.1.14` to `0.1.15`.

## Version 0.1.14

Changelog:

- Updated package version from 0.1.13 to 0.1.14

## Version 0.1.13

## Changelog

### extension.js

- Changed variable name `pageSize` to `PAGE_SIZE` to follow camel case convention.
- Changed variable name `mode` to `MODE` to follow camel case convention.
- Added missing blank line.
- Modified `handleChangeMode` function to perform strict equality check.
- Modified `getRepoUrl` function to remove unnecessary string interpolation.
- Modified `executeGitSearch` function to use the `filter` method instead of the `split` method to filter out empty lines in the `commits` array.
- Modified `executeGitSearch` function to handle empty `diffResults` array and display an information message instead of an error message.
- Modified `executeGitSearch` function to use the `map` method instead of the `filter` method in the `diffPromises` array, and handle errors by displaying an information message.
- Modified `executeGitSearch` function to use the `map` method instead of the `split` method in the `contentArray` variable, and handle null values by returning an empty string.
- Modified `executeGitSearch` function to handle null values in the `diffResults` array and prevent errors.
- Modified `handleResetCommand` function to remove unnecessary blank line.
- Modified `handleChangeMode` function to remove unnecessary blank line.
- Modified `executeGitSearch` function to add missing blank lines for readability.
- Modified `executeGitSearch` function to handle null values in the `diffResults` array and prevent errors.
- Modified `executeGitSearch` function to handle empty `content` string and return the correct `isLoadMore` value in the `postMessage` call.

### package.json

- Updated extension version to 0.1.13.
- Updated supported VS Code version to ^1.86.0.
- Added missing keywords for the extension.
- Added missing prettier script.
- Updated devDependency versions for various packages.

## Version 0.1.11

- Updated the placeholder text for the search input field in gitSearchPanel.html to include a note about being regexp friendly when "G mode" is enabled.
- Added a title attribute with a description of "G mode" in the modeContainer div in gitSearchPanel.html.
- Updated the description field in package.json to mention both "git log -S" and "git log -G" instead of just "git log -G".
- Increased the version number in package.json from 0.1.10 to 0.1.11.

## Version 0.1.10

- Added a new variable `mode` to store the search mode
- Implemented the `handleChangeMode` function to update the mode based on user input
- Added a checkbox in the HTML file for users to change the search mode
- Updated the `executeGitSearch` function to use the `mode` variable in the logCommand
- Updated the package version to "0.1.10" in the package.json file

## Version 0.1.2

Changelog:

- Added `formatDate` function to `src/helpers.js` to format commit dates and calculate relative time.
- Updated version in `package.json` from 0.1.1 to 0.1.2.

## Version 0.1.1

- Updated version in package.json from "0.1.0" to "0.1.1"
- Modified executeGitSearch function in extension.js:
  - Removed initializing content as an empty string
  - Modified the assignment of text in panel.webview.postMessage to only include <ul> tags if content is not null or undefined
  - Modified the assignment of isLoadMore in panel.webview.postMessage to use the boolean value of content, indicating whether content is truthy or falsy

## Version 0.1.0

- Updated version in package.json from "0.0.23" to "0.1.0".

## Version 0.0.23

## gitSearchPanel.html

- Updated loadMoreBtn innerHTML to "Loading"
- Disabled loadMoreBtn when clicked
- Updated loadMoreBtn innerHTML to "Load More" and enabled it in "showResults" event
- Updated loadMoreBtn innerHTML to "Load More" and enabled it in "appendResults" event
- Updated loadMoreBtn innerHTML to "Load More" and enabled it in "reset" event

## package.json

- Updated version to "0.0.23"

## Version 0.0.22

- Updated package version to `0.0.22` in `package.json`
- Added `font-weight: 600;` to `pre` element in `gitSearchPanel.html`

## Version 0.0.21

### extension.js

- Updated `logCommand` to use `%H` as commit hash format.
- Updated `diffCommand` to wrap `commitHash^!` in quotes in git diff command.

### package.json

- Updated extension version to 0.0.21.

## Version 0.0.20

#### README.md

- Updated project title and description for enhanced visibility and clarity.
- Revised project introduction with a more detailed and engaging overview.
- Improved the explanation of Git Search functionality for better comprehension.
- Amplified the significance of Git Search in the development process with a new heading.
- Enhanced the speed and efficiency of Git log searches.
- Enabled direct access to commits from search results.
- Streamlined result navigation with smart pagination.
- Ensured seamless integration with the current workspace's Git setup.
- Revamped the guide on how to use Git Search for ease of access and understanding.
- Added content for initiating the search and exploring results.

#### extension.js

- Implemented error handling for a more robust user experience.
- Added functionality for dynamically displaying and appending search results.

#### package.json

- Version bumped to 0.0.20.

## Version 0.0.19

### Extension.js

- Added message to show loading when search is initiated
- Modified `executeGitSearch` to handle `isLoadMore` parameter

### GitSearchPanel.html

- Adjusted styling for `body` to use grid layout for better responsiveness
- Moved `loadMoreBtn` button to be nested within a footer element
- Updated logic to show `loadMoreBtn` based on `isLoadMore` property in the message

### Package.json

- Updated extension version to 0.0.19

## Version 0.0.18

## Extension.js

- Added handling for empty query in `executeGitSearch`

## GitSearchPanel.html

- Improved styling for input elements
- Adjusted padding and margins for buttons
- Limited max height with overflow for results section
- Improved layout and styling for search and find widgets
- Optimized logic for displaying search results
- Enhanced functionality for find logic with navigation buttons

## Package.json

- Updated extension version to 0.0.18

## Version 0.0.17

### gitSearchPanel.html

#### Added

- Added a `span` element with id `matchCount` to display match count in the find widget.
- Added logic to update the match count when performing a search query.

#### Changed

- Updated behavior when query is empty to reset the counter and prevent navigating with an empty query.
- Updated the logic to display the match count based on the current index and total matches found.

### package.json

#### Changed

- Updated package version to `0.0.17`.

## Version 0.0.16

## Extension.js

- Updated `Convert` initialization, removed unnecessary option.
- Modified `activate` function, adjusted panel initialization with additional options.
- Refactored `getWebviewContent` function, removed `repoUrl` parameter.
- Updated `executeGitSearch` function, simplified logic, improved search and display of git commits.
- Simplified error handling in `executeCommand` function.

## GitSearchPanel.html

- Adjusted search query input width and added a relative positioning style.
- Added search and find widget functionalities with highlight and navigation.
- Improved search logic and user interaction for finding and highlighting text.

## Package.json

- Updated extension version to 0.0.16.
- Added "Visualization" category in addition to "Other".

## Version 0.0.14

### Changes in extension.js

- Updated logCommand to use `-G` flag instead of `-S` for search query
- Updated diffCommand to use actual `query` variable instead of `sanitizedQuery`

### Changes in gitSearchPanel.html

- Updated placeholder text for searchQuery input to indicate regex-friendly query entry

### Changes in package.json

- Updated description to reflect the usage of `-G` option instead of `-S`
- Updated version to 0.0.14

## Version 0.0.13

### Extension.js

- Added `{ adjustDate }` import from helpers.js
- Moved `lastCommitDate` declaration up
- Reset `lastCommitDate` on "search" and "reset" commands
- Removed unused `currentPage` variable
- Improved handling of load more functionality

### GitSearchPanel.html

- Updated handling of "reset" command

### Package.json

- Updated extension version to 0.0.13

### src/helpers.js

- Added `adjustDate` function to adjust date by subtracting a second

## Version 0.0.12

### extension.js

- Updated `executeGitSearch` to include the full commit hash in the `git diff` command for better diff display.

### package.json

- Updated extension version to `0.0.12`.

## Version 0.0.11

## Extension.js

- Changed `diffCommand` in `executeGitSearch` to include quotes around `commitHash^!`

## Package.json

- Updated extension version to 0.0.11

## Version 0.0.10

### Extension.js

- Updated `Convert` instantiation to include `{ escapeXML: true }`
- Modified `currentPage` incrementation in `activate` function
- Revised `resolve` fallback in `getRepoUrl` function
- Adjusted `content` initialization in `executeGitSearch` function
- Appended `"</ul>"` to `content` in `executeGitSearch` function

### Package.json

- Increased version from `0.0.9` to `0.0.10`

## Version 0.0.9

### Changes in `extension.js`

- Updated string quotes to be consistent with double quotes.
- Added import for `sanitize` from `./src/sanitize`.
- Revised logic for setting `latestQuery`.
- Adjusted logic for `currentPage` and `isLoadMore`.
- Refactored `activate` function for better readability.

### Changes in `gitSearchPanel.html`

- Minor formatting changes for readability.

### Changes in `package-lock.json`

- Updated version from "0.0.5" to "0.0.8".

### Changes in `package.json`

- Updated version from "0.0.8" to "0.0.9".

### New file `src/sanitize.js`

- Added new file `src/sanitize.js` for sanitizing strings.

## Version 0.0.8

- Updated package version to 0.0.8

## Version 0.0.7

## Changelog

### Changed

- Updated the example image to `./assets/out.gif` in the README.md file

### Changed

- Modified the repository field in package.json to include type and url properties

## Version 0.0.6

## Changelog

### Added

- Added example image in README.md

### Updated

- Updated version to 0.0.6 in package.json

### Changed

- Changed project name to "git-log-s" in package-lock.json
- Updated logCommand in extension.js to include skip and n arguments
- Updated version to 0.0.5 and dependencies in package-lock.json

### Fixed

- Fixed outdated information in README.md regarding project name

### Dependencies

- Updated "ansi-to-html" dependency to version ^0.7.2

## Version 0.0.5

### Changed

- Updated extension version to `0.0.5` in `package.json`
- Added `ansi-to-html` dependency in `package.json` and `pnpm-lock.yaml`
- Added `gitSearchPanel.html` for webview content
- Refactored `extension.js` to include file system and path modules, `Convert` class import, and updated content generation for webview output

## Version 0.0.4

- Renamed extension to "Git Search for VS Code 🚀"
- Updated TL;DR and added emoji for better readability
- Improved description and added emojis for sections like "What's This?" and "Why It Rocks"
- Added key features section with bullet points for quick reference
- Included instructions on how to use the extension in the "Using It" section
- Added a section "Get Involved 🤝" to encourage feedback and contributions
- Refactored code in extension.js for better readability
- Added functionality for "Load More" button in the webview
- Increased the page size for search results to 10
- Updated package version to 0.0.4 in package.json

## Version 0.0.3

#### README.md

- Updated extension name to "Git Search Extension for Visual Studio Code"
- Added detailed overview of the extension features and functionalities
- Provided key features list for quick reference
- Outlined various use cases for leveraging the extension
- Included clear instructions on how to get started with using the extension
- Encouraged contributions and collaboration on GitHub repository

#### package.json

- Updated extension version to "0.0.3"

## Version 0.0.2

- Updated package.json description to clarify "git log -S in your VS Code"
- Added an icon reference in package.json pointing to "./assets/logo.png"
- Bumped package version to 0.0.2
