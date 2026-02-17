import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "katex/dist/katex.min.css";
import "@fontsource-variable/inter";
import "@fontsource-variable/source-serif-4";
import "./styles/theme.css";

if (import.meta.env.DEV) {
  // Expose Zustand stores for Playwright screenshot automation
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  w.__STORES__ = {};
  Promise.all([
    import("./stores/editorStore"),
    import("./stores/settingsStore"),
    import("./stores/workspaceStore"),
    import("./stores/commentStore"),
    import("./stores/tagStore"),
  ]).then(([e, s, ws, c, t]) => {
    w.__STORES__ = {
      editor: e.useEditorStore,
      settings: s.useSettingsStore,
      workspace: ws.useWorkspaceStore,
      comments: c.useCommentStore,
      tags: t.useTagStore,
    };
  });
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
