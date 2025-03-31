# Jira Description for GitLens

This extension enhances GitLens branches view by displaying Jira issue details directly in VS Code.

## Features

- Extracts Jira issue IDs from branch names
- Displays issue summaries, statuses, and other details in GitLens branches view
- Updates issue information in real-time
- Configurable branch naming pattern

## Requirements

- VS Code 1.80.0 or higher
- GitLens extension installed
- Jira account with API access

## Setup

1. Install the extension
2. Run the "Configure Jira Integration" command from the Command Palette
3. Enter your Jira URL, username (email), and API token
4. View your branches in GitLens to see the Jira information

## Configuration

- `jira-desc.url`: Your Jira instance URL (e.g., https://your-domain.atlassian.net)
- `jira-desc.username`: Your Jira username (email)
- `jira-desc.apiToken`: Your Jira API token
- `jira-desc.branchPattern`: Regex pattern to extract Jira issue IDs from branch names

## How to Get a Jira API Token

1. Log in to your Atlassian account
2. Go to Account Settings > Security > Create and manage API tokens
3. Create a new token and save it securely
