import * as vscode from "vscode";
import { JiraService } from "./jiraService";
import { GitIntegration } from "./gitIntegration";
import { BranchTreeItem } from "./branchTreeProvider";
export async function activate(context: vscode.ExtensionContext) {
  const outputChannel = vscode.window.createOutputChannel("Jira Description");
  const jiraService = new JiraService(outputChannel, context);
  await jiraService.initialize(); // Initialize JiraService asynchronously
  context.subscriptions.push(outputChannel);
  outputChannel.appendLine("Activating Jira Description extension");

  // Wait for Git extension to be available and activated
  try {
    const gitExtension = vscode.extensions.getExtension("vscode.git");
    if (!gitExtension) {
      throw new Error("Git extension not found");
    }

    outputChannel.appendLine("Waiting for Git extension to activate...");
    await gitExtension.activate();
    outputChannel.appendLine("Git extension activated successfully");

    // Initialize services after Git is ready
    const gitIntegration = new GitIntegration(jiraService, outputChannel);
    await gitIntegration.initialize();

    // Register commands
    context.subscriptions.push(
      vscode.commands.registerCommand("jira-desc.configure", async () => {
        await configureJiraSettings(context);
      }),
      vscode.commands.registerCommand("jira-desc.refreshBranches", () => {
        gitIntegration.refreshBranches();
      }),
      vscode.commands.registerCommand("jiraDesc.openIssue", (arg: BranchTreeItem | string | undefined) => {
        let key: string | undefined;
        if (typeof arg === "string") {
          key = arg;
        } else if (arg instanceof BranchTreeItem && arg.issue) {
          key = arg.issue.key;
        }

        if (key) {
          const jiraUrl = vscode.workspace.getConfiguration("jira-desc").get<string>("url");
          if (jiraUrl) {
            vscode.env.openExternal(vscode.Uri.parse(`${jiraUrl}/browse/${key}`));
          } else {
            vscode.window.showWarningMessage("Jira URL not configured.");
          }
        } else {
          vscode.window.showErrorMessage("Could not determine Jira issue key to open.");
        }
      }),
      vscode.commands.registerCommand("jiraDesc.copyIssueKey", (arg: BranchTreeItem | string | undefined) => {
        let key: string | undefined;
        if (typeof arg === "string") {
          key = arg;
        } else if (arg instanceof BranchTreeItem && arg.issue) {
          key = arg.issue.key;
        }

        if (key) {
          vscode.env.clipboard.writeText(key);
          vscode.window.showInformationMessage(`Copied ${key} to clipboard`);
        } else {
          vscode.window.showErrorMessage("Could not determine Jira issue key to copy.");
        }
      })
    );

    context.subscriptions.push(gitIntegration);
  } catch (error) {
    outputChannel.appendLine(`Failed to initialize: ${error}`);
    throw error;
  }
}

async function configureJiraSettings(context: vscode.ExtensionContext) {
  // Receive context
  const url = await vscode.window.showInputBox({
    prompt: "Enter your Jira URL (e.g., https://your-domain.atlassian.net)",
    value: vscode.workspace.getConfiguration("jira-desc").get("url", ""),
  });

  if (url) {
    const username = await vscode.window.showInputBox({
      prompt: "Enter your Jira username (email)",
      value: vscode.workspace.getConfiguration("jira-desc").get("username", ""),
    });

    if (username) {
      const apiToken = await vscode.window.showInputBox({
        prompt: "Enter your Jira API token",
        value: vscode.workspace.getConfiguration("jira-desc").get("apiToken", ""),
        password: true,
      });

      if (apiToken) {
        await vscode.workspace.getConfiguration("jira-desc").update("url", url, true);
        await vscode.workspace.getConfiguration("jira-desc").update("username", username, true);
        // Store the API token securely
        await context.secrets.store("jiraApiToken", apiToken);
        // Remove the insecurely stored token if it exists (optional, but good practice)
        await vscode.workspace.getConfiguration("jira-desc").update("apiToken", undefined, true);
        vscode.window.showInformationMessage("Jira settings updated successfully.");
      }
    }
  }
}

export function deactivate() {}
