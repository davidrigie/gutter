export interface CommentMessage {
  id: string;
  author: string;
  timestamp: string; // ISO 8601 UTC
  body: string;
}

export interface CommentThread {
  thread: CommentMessage[];
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: string; // ISO 8601 UTC
  createdAt: string; // ISO 8601 UTC
}

export interface CommentsFile {
  version: 1;
  comments: Record<string, CommentThread>;
}
