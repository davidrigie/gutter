import { describe, it, expect, beforeEach } from "vitest";
import { useCommentStore } from "../src/stores/commentStore";

describe("Comment Store", () => {
  beforeEach(() => {
    useCommentStore.getState().clearAll();
  });

  it("adds a new thread", () => {
    const store = useCommentStore.getState();
    store.addThread("c1", "Dave", "This needs work");
    const threads = useCommentStore.getState().threads;
    expect(threads.c1).toBeDefined();
    expect(threads.c1.thread).toHaveLength(1);
    expect(threads.c1.thread[0].author).toBe("Dave");
    expect(threads.c1.thread[0].body).toBe("This needs work");
    expect(threads.c1.resolved).toBe(false);
  });

  it("adds a reply to a thread", () => {
    const store = useCommentStore.getState();
    store.addThread("c1", "Dave", "This needs work");
    store.addReply("c1", "Sarah", "Agreed, let me fix it");
    const threads = useCommentStore.getState().threads;
    expect(threads.c1.thread).toHaveLength(2);
    expect(threads.c1.thread[1].author).toBe("Sarah");
    expect(threads.c1.thread[1].body).toBe("Agreed, let me fix it");
  });

  it("resolves a thread", () => {
    const store = useCommentStore.getState();
    store.addThread("c1", "Dave", "Fix this");
    store.resolveThread("c1", "Sarah");
    const threads = useCommentStore.getState().threads;
    expect(threads.c1.resolved).toBe(true);
    expect(threads.c1.resolvedBy).toBe("Sarah");
    expect(threads.c1.resolvedAt).toBeDefined();
  });

  it("unresolves a thread", () => {
    const store = useCommentStore.getState();
    store.addThread("c1", "Dave", "Fix this");
    store.resolveThread("c1", "Sarah");
    store.unresolveThread("c1");
    const threads = useCommentStore.getState().threads;
    expect(threads.c1.resolved).toBe(false);
    expect(threads.c1.resolvedBy).toBeUndefined();
  });

  it("deletes a thread", () => {
    const store = useCommentStore.getState();
    store.addThread("c1", "Dave", "Delete me");
    store.addThread("c2", "Dave", "Keep me");
    store.deleteThread("c1");
    const threads = useCommentStore.getState().threads;
    expect(threads.c1).toBeUndefined();
    expect(threads.c2).toBeDefined();
  });

  it("generates correct next comment ID", () => {
    const store = useCommentStore.getState();
    expect(store.getNextCommentId()).toBe("c1");
    store.addThread("c1", "Dave", "First");
    expect(useCommentStore.getState().getNextCommentId()).toBe("c2");
    store.addThread("c3", "Dave", "Skipped c2");
    expect(useCommentStore.getState().getNextCommentId()).toBe("c4");
  });

  it("returns thread IDs in order", () => {
    const store = useCommentStore.getState();
    store.addThread("c3", "Dave", "Third");
    store.addThread("c1", "Dave", "First");
    store.addThread("c2", "Dave", "Second");
    const ids = useCommentStore.getState().getThreadIds();
    expect(ids).toEqual(["c1", "c2", "c3"]);
  });

  it("generates valid CommentsFile", () => {
    const store = useCommentStore.getState();
    store.addThread("c1", "Dave", "Hello");
    const file = useCommentStore.getState().getCommentsFile();
    expect(file.version).toBe(1);
    expect(file.comments.c1).toBeDefined();
    expect(file.comments.c1.thread[0].body).toBe("Hello");
  });

  it("loads comments from CommentsFile", () => {
    const store = useCommentStore.getState();
    store.loadComments({
      version: 1,
      comments: {
        c1: {
          thread: [
            {
              id: "m_test1",
              author: "Dave",
              timestamp: "2026-02-13T10:00:00Z",
              body: "Loaded comment",
            },
          ],
          resolved: false,
          createdAt: "2026-02-13T10:00:00Z",
        },
      },
    });
    const threads = useCommentStore.getState().threads;
    expect(threads.c1.thread[0].body).toBe("Loaded comment");
  });
});
