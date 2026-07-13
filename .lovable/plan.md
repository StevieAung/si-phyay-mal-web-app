## Issue

The preview shows a blank/broken screen because of a React hydration mismatch on `<html>`, `<head>`, and `<body>` in `src/routes/__root.tsx`. The server-rendered HTML reports `data-tsd-source="/src/routes/__root.tsx:108:5"` while the client renders `:125:10`. That means the SSR bundle and the client bundle were built from different versions of `__root.tsx` — a stale SSR chunk is being served, and React aborts hydration.

This is not a code bug in `__root.tsx` itself; the file is fine. It's a stale build state in the sandbox dev server after the recent edits to that file.

## Fix

1. Restart the Vite dev server so SSR and client bundles are rebuilt from the same source.
2. Reload the preview and confirm the hydration warning is gone and Discover renders.
3. If it still fails, inspect dev-server logs (`/tmp/dev-server-logs/dev-server.log` and the sqlite daemon log) for a real SSR error, and re-check `__root.tsx` for any newly introduced non-deterministic rendering (none is expected — no `Date.now`, `Math.random`, or `typeof window` branches are in the current file).

No source file changes are planned unless step 3 uncovers a real issue.
