# Windows App Icon Debugging

Windows caches icons aggressively at the OS level. Even if the .exe has the correct icon embedded, Explorer and the taskbar may show a stale/generic icon until the cache is cleared.

## Verifying the icon is embedded correctly

1. **Resource Hacker** (free) — open the built `.exe`, expand `Icon Group`. If the icon is there, it's a cache problem, not a build problem.
2. **PowerShell** — quick check that the .exe has icon resources:
   ```powershell
   [System.Drawing.Icon]::ExtractAssociatedIcon("C:\path\to\gutter.exe") | Out-Null
   # No error = icon exists in the binary
   ```

## Clearing the Windows icon cache

Any of these should work:

```powershell
# Option 1: Reset icon cache (no reboot)
ie4uinit.exe -show

# Option 2: Delete cache files and restart Explorer
taskkill /f /im explorer.exe
del /a /q "%localappdata%\IconCache.db"
del /a /f /q "%localappdata%\Microsoft\Windows\Explorer\iconcache*"
start explorer.exe

# Option 3: Just reboot
shutdown /r /t 0
```

## Tauri-specific notes

- Icon source: `src-tauri/icons/` — Tauri generates platform-specific icons from these
- The `icon.ico` file must be a valid multi-resolution `.ico` (16, 32, 48, 256px)
- Rust build profile `strip = "debuginfo"` preserves PE resources (icons). Using `strip = true` or `strip = "symbols"` can remove them.
- Tauri embeds the icon via `winres` crate during Cargo build — check `src-tauri/target/release/build/` for `winres` output if debugging

## What we've tried

- Switched from `strip = true` to `strip = "debuginfo"` in Cargo.toml release profile to preserve PE resources
- Verified icon files exist in `src-tauri/icons/`
- Multiple rebuild attempts

If the icon shows correctly in Resource Hacker but not in Explorer/taskbar, it's 100% a Windows icon cache issue.
