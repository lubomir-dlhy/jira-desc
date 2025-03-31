export interface JiraIssue {
  id: string;
  key: string;
  summary: string;
  description?: string;
  status: string;
  assignee: string;
  type: string;
  priority: string;
}

export interface BranchJiraInfo {
  branchName: string;
  issueKey?: string;
  issueDetails?: JiraIssue;
}
