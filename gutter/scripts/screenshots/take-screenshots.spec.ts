import { test } from "@playwright/test";
import { buildMockScript } from "./mock-tauri";
import {
  WORKSPACE_PATH,
  SAMPLE_FILES,
  SAMPLE_FILE_TREE,
  SAMPLE_COMMENTS,
  SAMPLE_TAGS,
} from "./sample-data";

const SCREENSHOT_DIR = "screenshots";
const SHOWCASE_PATH = `${WORKSPACE_PATH}/guides/Showcase.md`;
const CODE_MATH_PATH = `${WORKSPACE_PATH}/guides/Code and Math.md`;

// ── Helpers ──────────────────────────────────────────────────────────

async function bootApp(page: import("@playwright/test").Page) {
  // Listen for console errors for debugging
  page.on("pageerror", (err) => console.error("[PAGE ERROR]", err.message));

  await page.addInitScript(buildMockScript());
  await page.goto("http://localhost:1421");
  // Wait for React app to mount (WelcomeScreen appears first)
  await page.waitForSelector("[data-testid='status-bar'], .h-screen", {
    timeout: 15_000,
  });
  // Wait for custom fonts to load
  await page.evaluate(() => document.fonts.ready);
}

/** Wait for stores to be exposed by main.tsx dev-only code */
async function waitForStores(page: import("@playwright/test").Page) {
  await page.waitForFunction(
    () => {
      const s = (window as any).__STORES__;
      return s && s.editor && s.workspace && s.comments && s.settings && s.tags;
    },
    { timeout: 10_000 },
  );
}

/** Open a file by manipulating stores (simulates handleFileTreeOpen) */
async function openFile(
  page: import("@playwright/test").Page,
  filePath: string,
) {
  const fileName = filePath.split("/").pop() || "Untitled";
  const content = SAMPLE_FILES[filePath] || "";
  const commentsData = SAMPLE_COMMENTS[filePath] || {
    version: 1,
    comments: {},
  };

  await page.evaluate(
    ({ filePath, fileName, content, commentsData, workspacePath }) => {
      const stores = (window as any).__STORES__;

      // Set workspace
      stores.workspace.setState({
        workspacePath,
        activeTabPath: filePath,
        openTabs: [
          { path: filePath, name: fileName, isDirty: false, isPinned: false },
        ],
      });

      // Set editor content — this triggers re-mount via contentVersion bump
      stores.editor.setState({
        filePath,
        fileName,
        content,
        isDirty: false,
        contentVersion: stores.editor.getState().contentVersion + 1,
      });

      // Load comments
      stores.comments.getState().loadComments(commentsData);
      stores.comments.getState().setFilePath(filePath);
    },
    {
      filePath,
      fileName,
      content,
      commentsData,
      workspacePath: WORKSPACE_PATH,
    },
  );

  // Wait for editor to mount with content
  await page.waitForSelector(".ProseMirror", { timeout: 15_000 });
}

/** Set tag store data */
async function loadTags(page: import("@playwright/test").Page) {
  await page.evaluate((tags) => {
    const store = (window as any).__STORES__.tags;
    const tagToFiles = new Map<string, Set<string>>();
    for (const [tag, files] of Object.entries(tags.tagToFiles)) {
      tagToFiles.set(tag, new Set(files as string[]));
    }
    const fileToTags = new Map<string, Set<string>>();
    for (const [file, fileTags] of Object.entries(tags.fileToTags)) {
      fileToTags.set(file, new Set(fileTags as string[]));
    }
    store.setState({ tagToFiles, fileToTags, loading: false });
  }, SAMPLE_TAGS);
}

/** Toggle a panel via the editor store */
async function setPanel(
  page: import("@playwright/test").Page,
  panel: string,
  visible: boolean,
) {
  await page.evaluate(
    ({ panel, visible }) => {
      const store = (window as any).__STORES__.editor;
      const state = store.getState();
      const key = `show${panel.charAt(0).toUpperCase() + panel.slice(1)}`;
      if (state[key] !== visible) {
        store.setState({ [key]: visible });
      }
    },
    { panel, visible },
  );
}

/** Set theme */
async function setTheme(
  page: import("@playwright/test").Page,
  theme: "light" | "dark",
) {
  await page.evaluate((theme) => {
    const store = (window as any).__STORES__.settings;
    store.getState().setTheme(theme);
  }, theme);
  // Let theme transition complete
  await page.waitForTimeout(150);
}

/** Wait for rich content to render (mermaid, katex) */
async function waitForRichContent(
  page: import("@playwright/test").Page,
  opts: { mermaid?: boolean; math?: boolean } = {},
) {
  if (opts.mermaid) {
    await page
      .waitForSelector(".mermaid-block svg, .mermaid svg", { timeout: 15_000 })
      .catch(() => {
        // Mermaid may not render in all cases
      });
  }
  if (opts.math) {
    await page
      .waitForSelector(".katex", { timeout: 10_000 })
      .catch(() => {
        // KaTeX may not render in all cases
      });
  }
  // Settle time for CSS transitions and rendering
  await page.waitForTimeout(400);
}

/**
 * Force App's markdownRef to sync with editor content.
 * TipTap's onUpdate doesn't fire on initial mount, so markdownRef.current
 * stays empty. A tiny edit + undo triggers onUpdate, populating the ref.
 * This is needed by ReadingMode and VersionPreview which read markdownRef.
 */
async function syncMarkdownRef(page: import("@playwright/test").Page) {
  await page.click(".ProseMirror");
  await page.keyboard.press("End");
  await page.keyboard.type(" ");
  await page.keyboard.press("Meta+z");
  await page.waitForTimeout(200);
  // Reset dirty state caused by the edit
  await page.evaluate(() => {
    (window as any).__STORES__.editor.setState({ isDirty: false });
  });
}

/** Capture screenshot */
async function screenshot(
  page: import("@playwright/test").Page,
  name: string,
) {
  await page.screenshot({
    path: `${SCREENSHOT_DIR}/${name}.png`,
    fullPage: false,
  });
}

// ── Test scenarios ───────────────────────────────────────────────────

test.describe("Screenshots", () => {
  test.beforeEach(async ({ page }) => {
    await bootApp(page);
    await waitForStores(page);
  });

  test("hero-light — FileTree + Editor + Comments (light theme)", async ({
    page,
  }) => {
    await openFile(page, SHOWCASE_PATH);
    await setPanel(page, "fileTree", true);
    await setPanel(page, "comments", true);
    await setPanel(page, "history", false);
    await setPanel(page, "tags", false);
    await setPanel(page, "outline", false);
    await setTheme(page, "light");
    await waitForRichContent(page, { mermaid: true, math: true });
    // Activate a comment to show highlight + active thread
    await page.evaluate(() => {
      (window as any).__STORES__.editor.setState({ activeCommentId: "c1" });
    });
    await page.waitForTimeout(150);
    await screenshot(page, "hero-light");
  });

  test("hero-dark — FileTree + Editor + Comments (dark theme)", async ({
    page,
  }) => {
    await openFile(page, SHOWCASE_PATH);
    await setPanel(page, "fileTree", true);
    await setPanel(page, "comments", true);
    await setPanel(page, "history", false);
    await setPanel(page, "tags", false);
    await setPanel(page, "outline", false);
    await setTheme(page, "dark");
    await waitForRichContent(page, { mermaid: true, math: true });
    // Activate a comment to show highlight + active thread
    await page.evaluate(() => {
      (window as any).__STORES__.editor.setState({ activeCommentId: "c1" });
    });
    await page.waitForTimeout(150);
    await screenshot(page, "hero-dark");
  });

  test("rich-content — FileTree + Editor with code, math, diagrams", async ({
    page,
  }) => {
    await openFile(page, CODE_MATH_PATH);
    await setPanel(page, "fileTree", true);
    await setPanel(page, "comments", false);
    await setPanel(page, "history", false);
    await setPanel(page, "tags", false);
    await setPanel(page, "outline", false);
    await setTheme(page, "light");
    await waitForRichContent(page, { mermaid: true, math: true });
    await screenshot(page, "rich-content");
  });

  test("reading-mode — Full-width reading view", async ({ page }) => {
    await openFile(page, SHOWCASE_PATH);
    await setTheme(page, "light");
    await waitForRichContent(page, { mermaid: true, math: true });
    // Sync markdownRef so ReadingMode has content to render
    await syncMarkdownRef(page);
    // Populate commentTexts so margin annotations show quoted text, then switch
    await page.evaluate(() => {
      const store = (window as any).__STORES__.editor;
      store.setState({
        isReadingMode: true,
        commentTexts: {
          c1: "challenge is building something that feels like writing on paper but has the structure of a knowledge base",
          c2: "serializer must reproduce the original markdown byte-for-byte",
        },
        activeCommentId: "c1",
      });
    });
    // Wait for reading mode to render
    await page.waitForTimeout(1500);
    await screenshot(page, "reading-mode");
  });

  test("history-panel — FileTree + Editor + History sidebar", async ({
    page,
  }) => {
    await openFile(page, SHOWCASE_PATH);
    await setPanel(page, "fileTree", true);
    await setPanel(page, "comments", false);
    await setPanel(page, "history", true);
    await setPanel(page, "tags", false);
    await setPanel(page, "outline", false);
    await setTheme(page, "light");
    await waitForRichContent(page, { mermaid: true, math: true });
    // Sync markdownRef so VersionPreview has currentContent for diff
    await syncMarkdownRef(page);
    // Click the pinned "Initial draft" snapshot to trigger diff view
    await page.getByText("Initial draft").click();
    // Wait for VersionPreview ProseMirror to mount and render diff blocks
    await page
      .waitForSelector(".version-preview-content .ProseMirror", { timeout: 10_000 })
      .catch(() => {});
    await page
      .waitForSelector(".diff-block-added, .diff-block-removed", { timeout: 10_000 })
      .catch(() => {});
    // Let mermaid/math render inside diff view
    await page.waitForTimeout(2000);
    await screenshot(page, "history-panel");
  });

  test("tag-browser — FileTree + Editor + Tags sidebar", async ({ page }) => {
    await openFile(page, SHOWCASE_PATH);
    await loadTags(page);
    await setPanel(page, "fileTree", true);
    await setPanel(page, "comments", false);
    await setPanel(page, "history", false);
    await setPanel(page, "tags", true);
    await setPanel(page, "outline", false);
    await setTheme(page, "light");
    await waitForRichContent(page, { math: true });
    await screenshot(page, "tag-browser");
  });

  test("outline — FileTree + Outline + Editor", async ({ page }) => {
    await openFile(page, CODE_MATH_PATH);
    await setPanel(page, "fileTree", true);
    await setPanel(page, "comments", false);
    await setPanel(page, "history", false);
    await setPanel(page, "tags", false);
    await setPanel(page, "outline", true);
    await setTheme(page, "light");
    await waitForRichContent(page, { math: true });
    await screenshot(page, "outline");
  });

  test("command-palette — Unified search overlay", async ({ page }) => {
    await openFile(page, SHOWCASE_PATH);
    await setPanel(page, "fileTree", true);
    await setPanel(page, "comments", false);
    await setPanel(page, "history", false);
    await setPanel(page, "tags", false);
    await setPanel(page, "outline", false);
    await setTheme(page, "light");
    await loadTags(page);
    // Populate file tree + recent files so the search shows file results
    await page.evaluate(
      ({ tree, recentFiles }) => {
        (window as any).__STORES__.workspace.setState({ fileTree: tree });
        (window as any).__STORES__.settings.setState({ recentFiles });
      },
      {
        tree: SAMPLE_FILE_TREE,
        recentFiles: [
          `${WORKSPACE_PATH}/guides/Showcase.md`,
          `${WORKSPACE_PATH}/projects/Design System.md`,
          `${WORKSPACE_PATH}/projects/Gutter Roadmap.md`,
        ],
      },
    );
    await waitForRichContent(page, { mermaid: true, math: true });
    // Open unified search and type a query that shows mixed results
    await page.keyboard.press("Meta+k");
    await page
      .waitForSelector("input[placeholder]", { state: "visible", timeout: 5000 })
      .catch(() => {});
    await page.waitForTimeout(200);
    await page.keyboard.type("file");
    await page.waitForTimeout(500);
    await screenshot(page, "command-palette");
  });
});
