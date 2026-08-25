# Repository contract

This repository owns the BF Labs Studio runtime theme for WorkBuddy Desktop.

## Invariants

- BF Labs UI is the brand source of truth. Apple design guidance owns interaction discipline only.
- Preserve WorkBuddy layout, controls, hit areas, routes, accounts, tasks, and data.
- Never edit `app.asar`, integrity metadata, or the signed application bundle.
- Bind CDP to `127.0.0.1` only.
- Own one style element and two body attributes. Restore removes only those owned values.
- Theme packages contain no credentials, real task content, account identifiers, private screenshots, logs, or runtime state.
- The exact BF Mark geometry must not be redrawn or approximated.
- Release evidence distinguishes static validation, preview rendering, real application, and full route compatibility.

## Verification

```bash
npm run check
npm run preview
npm run build:release
```

Publishing and release creation are separate external actions.
