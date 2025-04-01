# Jira Description for GitLens

This extension enhances GitLens branches view by displaying Jira issue details directly in VS Code.

## Features

- Extracts Jira issue IDs from branch names
- Displays issue summaries, statuses, and other details in GitLens branches view
- Updates issue information in real-time
- Configurable branch naming pattern
- Offline caching support for Jira issues
- Context menu actions for quick access to Jira issues
- Dedicated SCM view for Jira-related branches

## Requirements

- VS Code 1.80.0 or higher
- GitLens extension installed
- Jira account with API access

## Setup

1. Install the extension
2. Run the "Configure Jira Integration" command from the Command Palette
3. Enter your Jira URL, username (email), and API token
4. View your branches in GitLens to see the Jira information

## Available Commands

- **Configure Jira Integration**: Set up your Jira connection details
- **Refresh Jira Details**: Manually refresh Jira issue information
- **Refresh Branches**: Update the branch list and associated Jira details
- **Open Jira Issue**: Open the current issue in your browser
- **Copy Jira Issue Key**: Copy the issue key to clipboard

## Configuration

- `jira-desc.url`: Your Jira instance URL (e.g., https://your-domain.atlassian.net)
- `jira-desc.username`: Your Jira username (email)
- `jira-desc.apiToken`: Your Jira API token
- `jira-desc.branchPattern`: Regex pattern to extract Jira issue IDs from branch names (default: `([A-Z]+-\\d+)`)
- `jira-desc.maxBranches`: Maximum number of recent branches to fetch Jira details for (default: 20, 0 for unlimited)
- `jira-desc.cache.enabled`: Enable offline caching of Jira issues (default: true)
- `jira-desc.cache.duration`: Cache duration in seconds (default: 86400, i.e., 24 hours)

## Views and UI Elements

The extension adds a new "Jira Branches" view to the Source Control section of VS Code. This view displays your Git branches with associated Jira information. Each branch entry includes:

- Branch name with Jira issue key
- Issue summary and status
- Context menu options for quick actions (open issue, copy issue key)

## How to Get a Jira API Token

1. Log in to your Atlassian account
2. Go to Account Settings > Security > Create and manage API tokens
3. Create a new token and save it securely
