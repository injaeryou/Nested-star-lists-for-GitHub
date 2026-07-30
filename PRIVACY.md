# Privacy

Nested star lists for GitHub collects nothing.

- **No data leaves your browser.** The extension reads the GitHub pages you are
  already looking at and rearranges them locally. There is no server, no
  analytics, no telemetry, and no network request to anything but
  `github.com` — and those are the same-origin requests the page itself could
  make.
- **Settings stay yours.** The three options (sort order, folders expanded,
  full list names) are stored with your browser's own extension-settings
  storage (`storage.sync`), which your browser may sync between your devices.
  Nothing else is stored.
- **A per-tab cache.** The parsed list index is kept in the tab's
  `sessionStorage` so the rail paints instantly; it dies with the tab.

Questions: open an issue at
<https://github.com/injaeryou/Nested-star-lists-for-GitHub>.
