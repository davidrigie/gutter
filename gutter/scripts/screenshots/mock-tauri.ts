/**
 * Generates a JS string to inject via page.addInitScript() that mocks
 * all Tauri v2 internals so the app boots in a plain browser.
 */

import { SAMPLE_FILES, SAMPLE_FILE_TREE, SAMPLE_COMMENTS, SNAPSHOT_SHOWCASE_MD } from "./sample-data";

export function buildMockScript(): string {
  const filesJson = JSON.stringify(SAMPLE_FILES);
  const treeJson = JSON.stringify(SAMPLE_FILE_TREE);
  const commentsJson = JSON.stringify(SAMPLE_COMMENTS);
  const snapshotContentJson = JSON.stringify(SNAPSHOT_SHOWCASE_MD);

  return `
(function() {
  // --- Sample data ---
  const FILES = ${filesJson};
  const TREE = ${treeJson};
  const COMMENTS = ${commentsJson};
  const SNAPSHOT_CONTENT = ${snapshotContentJson};

  // --- Callback registry for event system ---
  let _cbId = 0;
  const _callbacks = {};

  // --- Settings defaults ---
  const SETTINGS = JSON.stringify({
    theme: "light",
    fontSize: 16,
    fontFamily: "serif",
    autoSaveInterval: 2000,
    panelWidths: { fileTree: 224, comments: 288 },
    recentFiles: [],
    spellCheckEnabled: false,
    defaultAuthor: "Author",
    editorWidth: "medium",
    lineHeight: "comfortable",
    accentColor: "indigo"
  });

  // --- History snapshots sample ---
  const SNAPSHOTS = [
    { id: "s1739500000", timestamp: ${Math.floor(Date.now() / 1000) - 3600}, content_hash: "abc123", name: "Initial draft", description: null, pinned: true, size_bytes: 2048 },
    { id: "s1739503600", timestamp: ${Math.floor(Date.now() / 1000) - 1800}, content_hash: "def456", name: null, description: null, pinned: false, size_bytes: 2150 },
    { id: "s1739507200", timestamp: ${Math.floor(Date.now() / 1000) - 600}, content_hash: "ghi789", name: null, description: "Added cost model section", pinned: false, size_bytes: 2340 },
  ];

  const GIT_COMMITS = [
    { hash: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2", short_hash: "a1b2c3d", message: "Add knowledge management essay", author: "Elena Voss", timestamp: ${Math.floor(Date.now() / 1000) - 86400}, path: "guides/Showcase.md" },
    { hash: "b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3", short_hash: "b2c3d4e", message: "Initial commit", author: "Elena Voss", timestamp: ${Math.floor(Date.now() / 1000) - 172800}, path: "guides/Showcase.md" },
  ];

  // --- Mock __TAURI_INTERNALS__ ---
  window.__TAURI_INTERNALS__ = {
    metadata: {
      currentWindow: { label: "main" },
      currentWebview: { label: "main", windowLabel: "main" },
    },

    transformCallback: function(callback, once) {
      const id = ++_cbId;
      _callbacks[id] = { callback, once: !!once };
      return id;
    },

    convertFileSrc: function(path, protocol) {
      // Return a data URI or dummy URL — images won't render but that's fine
      return "asset://localhost/" + encodeURIComponent(path);
    },

    invoke: async function(cmd, args) {
      // Normalize args — Tauri sends payload inside __tauriModule sometimes
      args = args || {};

      switch (cmd) {
        // --- Settings ---
        case "read_settings":
          return SETTINGS;
        case "write_settings":
          return;

        // --- File I/O ---
        case "read_file":
          return FILES[args.path] || FILES[Object.keys(FILES).find(k => args.path?.endsWith(k)) || ""] || "";
        case "write_file":
          return;
        case "file_exists":
          return true;
        case "create_file":
        case "create_directory":
        case "delete_file":
        case "delete_path":
        case "rename_path":
        case "copy_image":
        case "open_url":
          return;

        // --- Workspace ---
        case "read_directory":
          return TREE;
        case "get_parent_dir":
          return "/mock/workspace";

        // --- Comments ---
        case "read_comments": {
          const p = args.path || "";
          const key = Object.keys(COMMENTS).find(k => p.endsWith(k));
          return key ? JSON.stringify(COMMENTS[key]) : "";
        }
        case "write_comments":
        case "delete_comments":
        case "write_companion":
        case "delete_companion":
          return;

        // --- History ---
        case "list_snapshots":
          return SNAPSHOTS;
        case "list_git_history":
          return GIT_COMMITS;
        case "read_snapshot":
          return SNAPSHOT_CONTENT;
        case "read_git_version":
          return SNAPSHOT_CONTENT;
        case "save_snapshot":
          return SNAPSHOTS[0];
        case "update_snapshot_metadata":
        case "delete_snapshot":
          return;

        // --- Search ---
        case "search_workspace":
          return [];

        // --- Watcher ---
        case "start_watcher":
        case "stop_watcher":
          return;

        // --- Export ---
        case "export_html":
          return;

        // --- Templates ---
        case "init_default_templates":
          return;
        case "list_templates":
          return [];
        case "read_template":
          return "";
        case "save_template":
        case "delete_template":
          return;

        // --- Startup ---
        case "get_open_file_path":
          return null;

        // --- Plugin: event system ---
        case "plugin:event|listen":
          return _cbId;
        case "plugin:event|unlisten":
          return;

        // --- Plugin: dialog ---
        case "plugin:dialog|open":
          return null;
        case "plugin:dialog|save":
          return null;
        case "plugin:dialog|ask":
          return false;
        case "plugin:dialog|message":
          return;
        case "plugin:dialog|confirm":
          return false;

        // --- Plugin: window ---
        case "plugin:webview|get_all_webviews":
          return [{ label: "main", windowLabel: "main" }];
        case "plugin:window|get_all_windows":
          return [{ label: "main" }];

        default:
          // Catch-all for any unknown commands
          if (cmd.startsWith("plugin:")) return;
          console.warn("[mock-tauri] Unhandled invoke:", cmd, args);
          return;
      }
    }
  };

  // --- Mock event plugin internals (used by listen/unlisten cleanup) ---
  window.__TAURI_EVENT_PLUGIN_INTERNALS__ = {
    unregisterListener: function(_event, _id) {
      // no-op — we don't actually track listeners
    }
  };
})();
`;
}
