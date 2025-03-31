import * as vscode from "vscode";
import axios from "axios";
import { JiraIssue } from "./models";

interface CachedIssue {
  issue: JiraIssue;
  timestamp: number;
}

interface CachedData {
  issues: { [key: string]: CachedIssue };
  subIssues: { [key: string]: { items: JiraIssue[]; timestamp: number } };
}

export class JiraService {
  private baseUrl: string | undefined;
  private username: string | undefined;
  private apiToken: string | undefined;
  private issueCache: Map<string, JiraIssue> = new Map();
  private subIssuesCache: Map<string, JiraIssue[]> = new Map();
  private outputChannel: vscode.OutputChannel;
  private ongoingRequests: Set<string> = new Set();
  private context: vscode.ExtensionContext;
  private cacheEnabled: boolean = true;
  private cacheDuration: number = 86400; // 24h in seconds

  constructor(outputChannel: vscode.OutputChannel, context: vscode.ExtensionContext) {
    this.outputChannel = outputChannel;
    this.context = context;
    this.loadConfiguration();
  }

  private loadConfiguration() {
    const config = vscode.workspace.getConfiguration("jira-desc");
    this.baseUrl = config.get<string>("url");
    this.username = config.get<string>("username");
    this.apiToken = config.get<string>("apiToken");
    this.cacheEnabled = config.get<boolean>("cache.enabled", true);
    this.cacheDuration = config.get<number>("cache.duration", 86400);
  }

  private async loadFromPersistentCache(issueKey: string): Promise<JiraIssue | undefined> {
    if (!this.cacheEnabled || !issueKey) return undefined;

    try {
      const cache = await this.context.globalState.get<CachedData>("jira-cache");
      if (!cache || !cache.issues) return undefined;

      const cached = cache.issues[issueKey];
      if (!cached || !cached.issue) return undefined;

      const age = (Date.now() - (cached.timestamp || 0)) / 1000;
      if (age < this.cacheDuration) {
        this.outputChannel.appendLine(`Loading ${issueKey} from persistent cache (age: ${Math.round(age)}s)`);
        return cached.issue;
      }
    } catch (error) {
      this.outputChannel.appendLine(`Error loading from persistent cache: ${error}`);
    }
    return undefined;
  }

  private async loadSubIssuesFromCache(issueKey: string): Promise<JiraIssue[] | undefined> {
    if (!this.cacheEnabled || !issueKey) return undefined;

    try {
      // Check memory cache first
      const memCached = this.subIssuesCache.get(issueKey);
      if (memCached) return memCached;

      // Check persistent cache
      const cache = await this.context.globalState.get<CachedData>("jira-cache");
      if (!cache || !cache.subIssues) return undefined;

      const cached = cache.subIssues[issueKey];
      if (!cached || !cached.items) return undefined;

      const age = (Date.now() - (cached.timestamp || 0)) / 1000;
      if (age < this.cacheDuration) {
        this.outputChannel.appendLine(`Loading sub-issues for ${issueKey} from persistent cache (age: ${Math.round(age)}s)`);
        this.subIssuesCache.set(issueKey, cached.items);
        return cached.items;
      }
    } catch (error) {
      this.outputChannel.appendLine(`Error loading sub-issues from persistent cache: ${error}`);
    }
    return undefined;
  }

  private async saveToPersistentCache(issueKey: string, issue: JiraIssue) {
    if (!this.cacheEnabled || !issueKey || !issue) return;

    try {
      const cache = (await this.context.globalState.get<CachedData>("jira-cache")) || { issues: {}, subIssues: {} };
      cache.issues = cache.issues || {};
      cache.issues[issueKey] = {
        issue,
        timestamp: Date.now(),
      };
      await this.context.globalState.update("jira-cache", cache);
    } catch (error) {
      this.outputChannel.appendLine(`Error saving to persistent cache: ${error}`);
    }
  }

  private async saveSubIssuesToCache(parentKey: string, subIssues: JiraIssue[]) {
    if (!this.cacheEnabled || !parentKey) return;

    try {
      const cache = (await this.context.globalState.get<CachedData>("jira-cache")) || { issues: {}, subIssues: {} };
      // Ensure subIssues object exists
      cache.subIssues = cache.subIssues || {};

      // Add the new sub-issues
      cache.subIssues[parentKey] = {
        items: subIssues,
        timestamp: Date.now(),
      };

      // Update memory cache
      this.subIssuesCache.set(parentKey, subIssues);

      // Save to persistent storage
      await this.context.globalState.update("jira-cache", cache);
    } catch (error) {
      this.outputChannel.appendLine(`Error saving sub-issues to cache for ${parentKey}: ${error}`);
    }
  }

  public isConfigured(): boolean {
    return !!(this.baseUrl && this.username && this.apiToken);
  }

  public async getIssue(issueKey: string): Promise<JiraIssue | undefined> {
    if (!this.isConfigured()) {
      vscode.window.showWarningMessage('Jira is not configured. Run "Configure Jira Integration" command.');
      return undefined;
    }

    // Try memory cache first
    const memCached = this.issueCache.get(issueKey);
    if (memCached) return memCached;

    // Try persistent cache
    const persistentCached = await this.loadFromPersistentCache(issueKey);
    if (persistentCached) {
      this.issueCache.set(issueKey, persistentCached);
      return persistentCached;
    }

    if (this.ongoingRequests.has(issueKey)) {
      this.outputChannel.appendLine(`Request already in progress for: ${issueKey}`);
      return undefined;
    }

    try {
      this.ongoingRequests.add(issueKey);
      this.outputChannel.appendLine(`Fetching Jira issue from API: ${issueKey}`);
      const response = await axios.get(`${this.baseUrl}/rest/api/2/issue/${issueKey}`, {
        auth: {
          username: this.username!,
          password: this.apiToken!,
        },
        headers: {
          "Content-Type": "application/json",
        },
      });

      const issue: JiraIssue = {
        id: response.data.id,
        key: response.data.key,
        summary: response.data.fields.summary,
        description: response.data.fields.description,
        status: response.data.fields.status.name,
        assignee: response.data.fields.assignee?.displayName || "Unassigned",
        type: response.data.fields.issuetype.name,
        priority: response.data.fields.priority?.name || "None",
      };

      this.issueCache.set(issueKey, issue);
      await this.saveToPersistentCache(issueKey, issue);
      return issue;
    } catch (error) {
      console.error(`Error fetching Jira issue ${issueKey}:`, error);
      vscode.window.showErrorMessage(`Failed to fetch Jira issue ${issueKey}.`);
      return undefined;
    } finally {
      this.ongoingRequests.delete(issueKey);
    }
  }

  async getSubIssues(issueKey: string): Promise<JiraIssue[]> {
    // Try cache first
    const cached = await this.loadSubIssuesFromCache(issueKey);
    if (cached) return cached;

    try {
      this.outputChannel.appendLine(`Fetching sub-issues for: ${issueKey}`);
      const response = await axios.get(`${this.baseUrl}/rest/api/2/search`, {
        auth: {
          username: this.username!,
          password: this.apiToken!,
        },
        headers: {
          "Content-Type": "application/json",
        },
        params: {
          jql: `parent = ${issueKey}`,
          fields: "summary,status,description,issuetype,priority,assignee",
        },
      });

      const subIssues = response.data.issues.map((issue: any) => ({
        id: issue.id,
        key: issue.key,
        summary: issue.fields.summary,
        description: issue.fields.description,
        status: issue.fields.status.name,
        type: issue.fields.issuetype?.name || "Unknown",
        priority: issue.fields.priority?.name || "None",
        assignee: issue.fields.assignee?.displayName || "Unassigned",
      }));

      // Save to cache
      await this.saveSubIssuesToCache(issueKey, subIssues);
      return subIssues;
    } catch (error) {
      this.outputChannel.appendLine(`Error fetching sub-issues for ${issueKey}: ${error}`);
      return [];
    }
  }

  public async clearCache() {
    try {
      this.outputChannel.appendLine("Clearing all Jira caches");
      this.issueCache.clear();
      this.subIssuesCache.clear();
      this.ongoingRequests.clear();
      await this.context.globalState.update("jira-cache", { issues: {}, subIssues: {} });
    } catch (error) {
      this.outputChannel.appendLine(`Error clearing cache: ${error}`);
    }
  }

  /**
   * Returns the URL to view an issue in Jira
   */
  public getIssueUrl(issueKey: string): string {
    if (this.baseUrl) {
      return `${this.baseUrl}/browse/${issueKey}`;
    }
    return "#";
  }
}
