import * as vscode from "vscode";
import { JiraService } from "./jiraService";
import { JiraIssue } from "./models";
import { API as GitAPI, Repository, RefType, GitExtension, Branch } from "./types/git";
import { Cache } from "./cache";
import { BranchTreeProvider, BranchTreeItem } from "./branchTreeProvider";

export class GitIntegration {
  private treeProvider: BranchTreeProvider;
  private treeView: vscode.TreeView<BranchTreeItem>;
  private jiraService: JiraService;
  private jiraBranchPattern: RegExp;
  private outputChannel: vscode.OutputChannel;
  private disposables: vscode.Disposable[] = [];
  private jiraCache = new Cache<JiraIssue>();
  private latestBranches?: any[] = undefined;
  private hoverProvider?: vscode.Disposable;
  private stateChangeDisposable?: vscode.Disposable;
  private currentRepository?: Repository;

  constructor(jiraService: JiraService, outputChannel: vscode.OutputChannel) {
    this.jiraService = jiraService;
    this.outputChannel = outputChannel;

    // Load the branch pattern from configuration
    const config = vscode.workspace.getConfiguration("jira-desc");
    const pattern = config.get<string>("branchPattern", "([A-Z]+-\\d+)");
    this.jiraBranchPattern = new RegExp(pattern);

    this.treeProvider = new BranchTreeProvider();
    this.treeView = vscode.window.createTreeView("jira-desc.branchView", {
      treeDataProvider: this.treeProvider,
    });
  }

  public async initialize(): Promise<void> {
    this.outputChannel.appendLine("Initializing GitLens integration");

    try {
      const gitExtension = vscode.extensions.getExtension<GitExtension>("vscode.git");
      if (!gitExtension || !gitExtension.isActive) {
        throw new Error("Git extension is not active");
      }

      const git = gitExtension.exports.getAPI(1);
      if (!git) {
        throw new Error("Git API not available");
      }

      this.setupGitListener(git);

      this.outputChannel.appendLine("GitLens integration initialized successfully");
    } catch (error) {
      this.outputChannel.appendLine(`Failed to initialize: ${error}`);
      throw error;
    }
  }

  private setupGitListener(git: GitAPI) {
    this.outputChannel.appendLine("Setting up Git listener");

    git.onDidOpenRepository((r) => {
      this.outputChannel.appendLine(`Repository opened: ${r.rootUri.fsPath}`);
      this.currentRepository = r;
      this.updateBranchesList(r);
    });

    git.onDidChangeState((e) => {
      this.outputChannel.appendLine(e);
    });

    const repos = git.repositories;
    this.outputChannel.appendLine(`Found ${repos.length} repositories`);

    if (repos && repos.length > 0) {
      const repository = repos[0];
      this.currentRepository = repository;

      this.outputChannel.appendLine(`Repository found at ${repository.rootUri.fsPath}`);
      this.updateBranchesList(repository);
    }
  }

  private updateBranchDataUnique(branchData: any[], newBranch: any): any[] {
    // Remove existing branch if present
    branchData = branchData.filter((b) => b.jiraKey !== newBranch.jiraKey);

    // Add new branch at the correct position (active branches go to top)
    if (newBranch.isActive) {
      branchData.unshift(newBranch);
    } else {
      branchData.push(newBranch);
    }

    return branchData;
  }

  private async updateBranchesList(repository: Repository) {
    try {
      // Cleanup previous listener if exists
      this.stateChangeDisposable?.dispose();

      let branchData: any[] = [];
      let activeBranch: Branch | undefined = repository.state.HEAD;
      const config = vscode.workspace.getConfiguration("jira-desc");
      const maxBranches = config.get<number>("maxBranches", 20);
      const branches = await repository.getBranches({
        remote: false,
        pattern: "heads/[A-Z]*-[0-9]*",
        sort: "committerdate",
        count: maxBranches === 0 ? undefined : maxBranches, // Use undefined for no limit if maxBranches is 0
      });

      // Create new state change listener and store its disposable
      this.stateChangeDisposable = repository.state.onDidChange(async () => {
        const activeBranch = repository.state.HEAD;
        this.outputChannel.appendLine(`Active branch: ${activeBranch?.name}`);

        // Set all branches to inactive
        branchData.forEach((branch) => (branch.isActive = false));

        if (activeBranch && activeBranch.name) {
          const jiraKey = this.extractJiraIssueKey(activeBranch.name);
          if (jiraKey) {
            const issue = await this.getJiraIssue(jiraKey);
            if (issue) {
              const subIssues = await this.jiraService.getSubIssues(jiraKey);
              const newBranch = {
                name: activeBranch.name,
                jiraKey: jiraKey,
                issue: issue,
                subIssues: subIssues,
                isActive: true,
              };
              branchData = this.updateBranchDataUnique(branchData, newBranch);
              this.treeProvider.refresh(branchData);
            }
          }
        }
      });

      // Add to disposables for cleanup
      this.disposables.push(this.stateChangeDisposable);

      this.outputChannel.appendLine(`Found ${branches.length} branches: ${branches.map((b) => b.name).join(", ")}`);

      const jiraBranches = branches
        .filter((b) => b.name && typeof b.name === "string") // ensure name exists and is string
        .map((b) => {
          const jiraKey = this.extractJiraIssueKey(b.name || "");
          return {
            ...b,
            jiraKey,
            isActive: b.name === activeBranch?.name,
          };
        })
        .filter((b) => b.jiraKey); // filter after mapping

      this.outputChannel.appendLine(`Found ${jiraBranches.length} branches with Jira IDs`);

      if (jiraBranches.length > 0) {
        const newBranches = await Promise.all(
          jiraBranches.map(async (b) => {
            try {
              if (!b.jiraKey) {
                return null; // skip if no jiraKey
              }
              const issue = await this.getJiraIssue(b.jiraKey);
              if (!issue) {
                return null; // skip if no issue found
              }
              const subIssues = await this.jiraService.getSubIssues(b.jiraKey);
              return {
                name: b.name || "",
                jiraKey: b.jiraKey,
                issue,
                subIssues,
                isActive: b.isActive,
              };
            } catch (err) {
              this.outputChannel.appendLine(`Error processing branch ${b.name}: ${err}`);
              return null;
            }
          })
        );

        // Filter out null values and add valid branches
        newBranches
          .filter((branch): branch is NonNullable<typeof branch> => branch !== null)
          .forEach((branch) => {
            branchData = this.updateBranchDataUnique(branchData, branch);
          });

        this.treeProvider.refresh(branchData);
      }
    } catch (error) {
      this.outputChannel.appendLine(`Error updating branches: ${error}`);
      // Don't throw, just log the error
    }
  }

  private async getJiraIssue(issueKey: string): Promise<JiraIssue | undefined> {
    // Try cache first
    const cached = this.jiraCache.get(issueKey);
    if (cached) {
      return cached;
    }

    // If not in cache, fetch from Jira
    const issue = await this.jiraService.getIssue(issueKey);
    if (issue) {
      this.jiraCache.set(issueKey, issue);
    }
    return issue;
  }

  public extractJiraIssueKey(text: string): string | undefined {
    const match = text.match(this.jiraBranchPattern);
    return match ? match[1] : undefined;
  }

  public async refreshBranches(): Promise<void> {
    if (this.currentRepository) {
      this.outputChannel.appendLine("Manually refreshing branches");
      // Clear both caches
      this.jiraCache.clear();
      await this.jiraService.clearCache();

      // Force clear branch data and re-fetch
      const branchData: any[] = [];
      this.treeProvider.refresh(branchData);

      // Re-fetch everything
      await this.updateBranchesList(this.currentRepository);
    }
  }

  public dispose() {
    this.stateChangeDisposable?.dispose();
    this.hoverProvider?.dispose();
    this.disposables.forEach((d) => d.dispose());
  }
}
