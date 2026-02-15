# Image Insertion Fix Plan

This plan addresses the issue where images inserted via paste/drop fail to render or appear as broken links in the editor.

## The Problems

1. **Protocol Mismatch:** The backend returns a relative path (e.g., `./assets/img.png`), but the webview requires an absolute `asset://` URL (via `convertFileSrc`) to render local files.
2. **Missing Context:** The `parseMarkdown` function is called without `fileDirPath` in `GutterEditor.tsx`, so existing images in saved files never have their paths resolved.
3. **Pasted Image Resolution:** When an image is pasted, the editor is updated with the relative path immediately, which the browser cannot resolve relative to `localhost:1421`.
4. **Binary Overload:** Sending images as `number[]` via JSON is inefficient and can crash the Tauri bridge for large files.

## Proposed Fixes

### 1. Update `handleImageInsert` in `GutterEditor.tsx`

Modify the handler to convert the path to a displayable URL immediately after saving:

```typescript
// Current:
const relativePath = await invoke<string>("save_image", { ... });
editorRef.current?.chain().focus().setImage({ src: relativePath }).run();

// Proposed:
const relativePath = await invoke<string>("save_image", { ... });
const absolutePath = joinPath(dirPath, relativePath);
const displayUrl = convertFileSrc(absolutePath);
// We store the absolute URL in the editor for display, 
// the serializer already converts it back to relative for Markdown.
editorRef.current?.chain().focus().setImage({ src: displayUrl }).run();
```

### 2. Provide Context to Parser

Update `GutterEditor.tsx` to pass the directory path whenever content is parsed:

```typescript
// In useEffect and onUpdate
const dirPath = filePath ? parentDir(filePath) : undefined;
const doc = parseMarkdown(content, dirPath);
```

### 3. Improve Path Resolution in `parser.ts`

The current `resolveImagePaths` is brittle. It should use a more robust way to handle `../` and absolute paths:

```typescript
function resolveImagePaths(node: JSONContent, dirPath: string) {
  if (node.type === "image" && node.attrs?.src) {
    const src = node.attrs.src as string;
    if (src.startsWith("./") || src.startsWith("../")) {
      // In a real fix, we'd use a more robust path joiner or 
      // handle the ../ segments properly.
      const absolute = joinPath(dirPath, src);
      node.attrs.src = convertFileSrc(absolute);
    }
  }
  // ... recursive call
}
```

### 4. Optimize Binary Transfer (Optional but Recommended)

Instead of `Array.from(new Uint8Array(buffer))`, use `Uint8Array` directly if the Tauri version and transport support it (Tauri 2.0 does), or use Base64 for more reliable (though less efficient) string transport.

## Verification Plan

1. **Pasting:** Paste an image into a saved `.md` file; verify it appears immediately in the WYSIWYG view.
2. **Reloading:** Save the file, close the tab, and re-open it; verify the image still renders.
3. **Serialization:** Verify that the saved `.md` file contains the relative path `![alt](./assets/image.png)` and not the `asset://` URL.
4. **Subdirectories:** Test image insertion in a file located in a deep subdirectory.


