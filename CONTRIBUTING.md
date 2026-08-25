# Contributing

1. Open an issue describing the WorkBuddy version, operating system, affected route, and expected visual behavior.
2. Keep visual changes scoped under `body[data-workbuddy-theme="bflabs-studio"]`.
3. Do not hide, move, resize, or intercept native controls.
4. Do not add remote styles, scripts, fonts, or images.
5. Increment `theme.json` after every visible change.
6. Run `npm run check` and verify both desktop and 375px previews.
7. Never commit real WorkBuddy screenshots containing accounts, task titles, conversations, or customer data.

Pull requests do not authorize a release. Tags and public releases remain maintainer actions.
