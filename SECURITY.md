# Security

## Supported release

Security fixes currently target the latest release only.

## Runtime boundary

- The debugging endpoint binds to `127.0.0.1` only.
- The runtime does not edit or unpack `app.asar`.
- The runtime does not inspect credentials, tasks, conversations, databases, cookies, local storage, or MCP configuration.
- Imported theme CSS is local and validated. Remote URLs, broad global selectors, hidden controls, and unresolved asset placeholders are rejected.
- Save active WorkBuddy tasks before authorizing the first restart.
- Quit and reopen WorkBuddy normally to close the debugging endpoint.

Do not run untrusted local software while a debugging endpoint is open. Any local process owned by the same user may be able to connect to loopback services.

## Reporting

Report security issues privately to `hello@bflabs.cn`. Do not include credentials, private conversations, or customer data in a public issue.
