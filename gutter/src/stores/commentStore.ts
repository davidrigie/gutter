import { create } from "zustand";
import type { CommentThread, CommentsFile } from "../types/comments";

function generateId(): string {
  return "m_" + Math.random().toString(36).substring(2, 10);
}

interface CommentState {
  threads: Record<string, CommentThread>;
  filePath: string | null;

  setFilePath: (path: string | null) => void;
  loadComments: (data: CommentsFile) => void;
  getCommentsFile: () => CommentsFile;
  getThreadIds: () => string[];
  getNextCommentId: () => string;

  addThread: (commentId: string, author: string, body: string) => void;
  addReply: (commentId: string, author: string, body: string) => void;
  resolveThread: (commentId: string, author: string) => void;
  unresolveThread: (commentId: string) => void;
  deleteThread: (commentId: string) => void;
  clearAll: () => void;
}

export const useCommentStore = create<CommentState>((set, get) => ({
  threads: {},
  filePath: null,

  setFilePath: (path) => set({ filePath: path }),

  loadComments: (data) => {
    set({ threads: data.comments || {} });
  },

  getCommentsFile: (): CommentsFile => {
    return {
      version: 1,
      comments: get().threads,
    };
  },

  getThreadIds: (): string[] => {
    const ids = Object.keys(get().threads);
    // Sort by comment number
    return ids.sort((a, b) => {
      const numA = parseInt(a.replace("c", ""), 10);
      const numB = parseInt(b.replace("c", ""), 10);
      return numA - numB;
    });
  },

  getNextCommentId: (): string => {
    const ids = Object.keys(get().threads);
    if (ids.length === 0) return "c1";
    const maxNum = Math.max(
      ...ids.map((id) => parseInt(id.replace("c", ""), 10)),
    );
    return `c${maxNum + 1}`;
  },

  addThread: (commentId, author, body) => {
    const now = new Date().toISOString();
    set((state) => ({
      threads: {
        ...state.threads,
        [commentId]: {
          thread: [
            {
              id: generateId(),
              author,
              timestamp: now,
              body,
            },
          ],
          resolved: false,
          createdAt: now,
        },
      },
    }));
  },

  addReply: (commentId, author, body) => {
    const now = new Date().toISOString();
    set((state) => {
      const thread = state.threads[commentId];
      if (!thread) return state;
      return {
        threads: {
          ...state.threads,
          [commentId]: {
            ...thread,
            thread: [
              ...thread.thread,
              {
                id: generateId(),
                author,
                timestamp: now,
                body,
              },
            ],
          },
        },
      };
    });
  },

  resolveThread: (commentId, author) => {
    const now = new Date().toISOString();
    set((state) => {
      const thread = state.threads[commentId];
      if (!thread) return state;
      return {
        threads: {
          ...state.threads,
          [commentId]: {
            ...thread,
            resolved: true,
            resolvedBy: author,
            resolvedAt: now,
          },
        },
      };
    });
  },

  unresolveThread: (commentId) => {
    set((state) => {
      const thread = state.threads[commentId];
      if (!thread) return state;
      return {
        threads: {
          ...state.threads,
          [commentId]: {
            ...thread,
            resolved: false,
            resolvedBy: undefined,
            resolvedAt: undefined,
          },
        },
      };
    });
  },

  deleteThread: (commentId) => {
    set((state) => {
      const { [commentId]: _, ...rest } = state.threads;
      return { threads: rest };
    });
  },

  clearAll: () => set({ threads: {}, filePath: null }),
}));
