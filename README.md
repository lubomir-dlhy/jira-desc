# Jira Branch Description

Display Jira issue details obtained from branches in the VS Code Source Control (SCM) view.

This extension enhances the SCM view by extracting Jira issue keys from your branch names and displaying relevant issue details directly within VS Code.

## Features

- Extracts Jira issue IDs from branch names using a configurable regex pattern.
- Displays issue summaries, statuses, types, priorities, and assignees in a dedicated "Jira Branches" view within the SCM panel.
- Provides inline icons on hover/selection to quickly copy the issue key or open the issue in Jira.
- Updates issue information (respecting cache settings).
- Supports offline caching for Jira issue details.
- Configurable Jira connection details, branch pattern, cache settings, and number of branches to fetch.

## Requirements

- VS Code 1.80.0 or higher
- Git initialized in your workspace
- Jira account with API access

## Installation

### Option 1: Install from VSIX

1.  Download the latest `.vsix` file from the [Releases page](https://github.com/lubomir-dlhy/jira-desc/releases).
2.  Open VS Code.
3.  Go to the Extensions view (Ctrl+Shift+X or Cmd+Shift+X).
4.  Click the "..." menu in the top-right corner.
5.  Select "Install from VSIX..." and choose the downloaded `.vsix` file.

### Option 2: Build from Source

1.  Clone the repository:
    ```bash
    git clone https://github.com/lubomir-dlhy/jira-desc.git
    cd jira-desc
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Compile the extension:
    ```bash
    npm run compile
    ```
4.  Package the extension:
    ```bash
    npm run package
    ```
    This will create a `jira-desc-x.y.z.vsix` file.
5.  Follow the steps in "Option 1: Install from VSIX" using the generated file.

## Setup

1.  Install the extension (see Installation section).
2.  Open the Command Palette (Ctrl+Shift+P or Cmd+Shift+P).
3.  Run the command: `Jira Description: Configure Jira Integration`.
4.  Enter your Jira instance URL (e.g., `https://your-domain.atlassian.net`).
5.  Enter your Jira username (usually your email).
6.  Enter your Jira API token (see below).
7.  The "Jira Branches" view should appear in the Source Control panel, showing details for branches matching the configured pattern.

## Available Commands

- **Jira Description: Configure Jira Integration**: Set up or update your Jira connection details.
- **Jira Description: Refresh Branches**: Manually forces a refresh of branch and Jira issue information, bypassing the cache. (Icon in the view title bar)
- **Jira Description: Refresh Jira Details**: (Not typically user-facing, used internally or for debugging) Refreshes details for already known issues.
- **Jira Description: Open Jira Issue**: Opens the associated Jira issue in your default browser. (Inline icon)
- **Jira Description: Copy Jira Issue Key**: Copies the associated Jira issue key to the clipboard. (Inline icon)

## Configuration

These settings can be configured in your VS Code Settings UI or `settings.json`:

- `jira-desc.url`: Your Jira instance URL (e.g., `https://your-domain.atlassian.net`).
- `jira-desc.username`: Your Jira username (email).
- `jira-desc.apiToken`: Your Jira API token.
- `jira-desc.branchPattern`: Regex pattern to extract Jira issue IDs from branch names (default: `([A-Z]+-\\d+)`). The first capture group is used as the key.
- `jira-desc.maxBranches`: Maximum number of recent branches to fetch Jira details for (default: 10, 0 for unlimited).
- `jira-desc.cache.enabled`: Enable offline caching of Jira issues (default: true).
- `jira-desc.cache.duration`: Cache duration in seconds (default: 86400, i.e., 24 hours).

## How to Get a Jira API Token

1.  Log in to your Atlassian account: [https://id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
2.  Click "Create API token".
3.  Give the token a descriptive label (e.g., "VSCode Jira Desc Extension").
4.  Copy the generated token immediately – you won't be able to see it again.
5.  Paste this token into the extension's configuration when prompted.

## License

[MIT](LICENSE)
