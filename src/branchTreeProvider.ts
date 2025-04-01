import * as vscode from "vscode";
import { JiraIssue } from "./models";

export class BranchTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly issue?: JiraIssue,
    public readonly branchName?: string,
    public readonly subIssues?: JiraIssue[],
    public readonly itemType: "issue" | "details" | "description" | "subissues" | "detail-item" = "issue"
  ) {
    super(label, collapsibleState);
    if (issue && itemType === "issue") {
      // Set context value for hover actions
      this.contextValue = "jiraIssue";

      // Set hover tooltip with markdown
      this.tooltip = new vscode.MarkdownString();
      this.tooltip.isTrusted = true;
      this.tooltip.appendMarkdown(`### ${issue.key}: ${issue.summary}\n\n`);
      this.tooltip.appendMarkdown(`**Type:** ${issue.type}  \n`);
      this.tooltip.appendMarkdown(`**Status:** ${issue.status}  \n`);
      this.tooltip.appendMarkdown(`**Priority:** ${issue.priority}  \n`);
      this.tooltip.appendMarkdown(`**Assignee:** ${issue.assignee}  \n`);
      if (issue.description) {
        this.tooltip.appendMarkdown(`\n---\n\n${issue.description.substring(0, 200)}${issue.description.length > 200 ? "..." : ""}`);
      }

      this.description = issue.status;
      this.label = this.getIssueTypeIcon(issue.type) + " " + label;

      // Default click command removed as inline icon is used
    }
  }

  private getIssueTypeIcon(type?: string): string {
    if (!type) return "📋";

    switch (type.toLowerCase()) {
      case "bug":
        return "🐛";
      case "story":
        return "📖";
      case "task":
        return "✅";
      case "epic":
        return "🚀";
      case "sub-task":
        return "📎";
      case "sub-bug":
        return "🪲";
      default:
        return "📋";
    }
  }
}

export class BranchTreeProvider implements vscode.TreeDataProvider<BranchTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<BranchTreeItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private data: Array<{
    name: string;
    jiraKey: string;
    issue?: JiraIssue;
    subIssues?: JiraIssue[];
    isActive?: boolean;
  }> = [];

  refresh(
    branchData: Array<{
      name: string;
      jiraKey: string;
      issue?: JiraIssue;
      subIssues?: JiraIssue[];
      isActive?: boolean;
    }>
  ) {
    this.data = branchData;
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: BranchTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: BranchTreeItem): Thenable<BranchTreeItem[]> {
    if (!element) {
      // Root level - show branches
      return Promise.resolve(
        this.data.map((item) => {
          const label = `${item.jiraKey} - ${item.issue?.summary || item.name}`;
          const branch = new BranchTreeItem(
            item.isActive ? `✨ ${label}` : label,
            item.issue ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
            item.issue,
            item.name,
            item.subIssues,
            "issue"
          );
          if (item.isActive) {
            branch.description = "Current Branch";
          }
          return branch;
        })
      );
    }

    // Show main sections for an issue
    if (element.itemType === "issue") {
      const sections: BranchTreeItem[] = [];

      sections.push(new BranchTreeItem("📋 Details", vscode.TreeItemCollapsibleState.Expanded, element.issue, undefined, undefined, "details"));

      if (element.subIssues && element.subIssues.length > 0) {
        sections.push(new BranchTreeItem("📑 Sub-issues", vscode.TreeItemCollapsibleState.Collapsed, element.issue, undefined, element.subIssues, "subissues"));
      }

      return Promise.resolve(sections);
    }

    // Handle section contents
    switch (element.itemType) {
      case "details":
        if (element.issue) {
          const details: BranchTreeItem[] = [
            new BranchTreeItem(`Type: ${element.issue.type}`, vscode.TreeItemCollapsibleState.None, undefined, undefined, undefined, "detail-item"),
            new BranchTreeItem(`Status: ${element.issue.status}`, vscode.TreeItemCollapsibleState.None, undefined, undefined, undefined, "detail-item"),
            new BranchTreeItem(`Priority: ${element.issue.priority}`, vscode.TreeItemCollapsibleState.None, undefined, undefined, undefined, "detail-item"),
            new BranchTreeItem(`Assignee: ${element.issue.assignee}`, vscode.TreeItemCollapsibleState.None, undefined, undefined, undefined, "detail-item"),
          ];

          if (element.issue.description) {
            details.push(
              new BranchTreeItem(
                `Description: ${element.issue.description}`,
                vscode.TreeItemCollapsibleState.None,
                undefined,
                undefined,
                undefined,
                "detail-item"
              )
            );
          }

          return Promise.resolve(details);
        }
        break;

      case "subissues":
        return Promise.resolve(
          element.subIssues?.map(
            (subIssue) =>
              new BranchTreeItem(`${subIssue.key} - ${subIssue.summary}`, vscode.TreeItemCollapsibleState.None, subIssue, undefined, undefined, "issue")
          ) || []
        );
    }

    return Promise.resolve([]);
  }
}
