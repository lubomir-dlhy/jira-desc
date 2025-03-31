import * as vscode from "vscode";
import { JiraService } from "./jiraService";
import { GitLensIntegration } from "./gitLensIntegration";

export async function activate(context: vscode.ExtensionContext) {
  const outputChannel = vscode.window.createOutputChannel("Jira Description");
  const jiraService = new JiraService(outputChannel, context);
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
    const gitLens = new GitLensIntegration(jiraService, outputChannel);
    await gitLens.initialize();

    // Register commands
    context.subscriptions.push(
      vscode.commands.registerCommand("jira-desc.configure", async () => {
        await configureJiraSettings();
      }),
      vscode.commands.registerCommand("jira-desc.refreshBranches", () => {
        gitLens.refreshBranches();
      })
    );

    context.subscriptions.push(gitLens);
  } catch (error) {
    outputChannel.appendLine(`Failed to initialize: ${error}`);
    throw error;
  }
}

async function configureJiraSettings() {
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
        await vscode.workspace.getConfiguration("jira-desc").update("apiToken", apiToken, true);
        vscode.window.showInformationMessage("Jira settings updated successfully.");
      }
    }
  }
}

export function deactivate() {}
