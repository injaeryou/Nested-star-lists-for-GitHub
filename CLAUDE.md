# Nested star lists for GitHub — working notes

An MV3 extension (Chrome + Firefox, one manifest) that renders GitHub star lists
named `parent/child` as a folder tree, and adds a rail of every list to a single
list's page.

## Ground rules that are easy to get wrong

- **The star-list API exists but is not worth its price here.** GraphQL has
  `User.lists` / `UserList` and create/update/delete mutations — but
  `api.github.com` takes a bearer token, not the session cookie. A PAT with the
  right scope *does* see your own private lists (checked 2026-08-19, community
  discussion #8293); what it actually costs is the zero-storage promise (the
  token has to live somewhere) and works-on-install onboarding (create, scope,
  paste, expire). Far more capability than the read path needs, for a marginal
  gain. Stay on the same-origin `fetch` of the lists index. The mutations are the only thing worth
  wanting (renaming a list into `parent/child` from the UI) — and that's opt-in,
  not a rewrite of how lists are read.
- **The lists index is only `/<user>?tab=stars`.** `/stars/<user>/lists` is not a
  page. The index lives in `#profile-lists-container .Box`.
- **`#user-list-repositories` is the only stable landmark on a list page.** The
  first `h1` inside `main` is the profile name, and "looks like a repo link"
  heuristics hit a hidden report-abuse dialog.
- **Never assign `textContent` to a list row.** A row holds the name, an optional
  description, and the repo count in separate nodes. Edit the name's text node
  (`nameNode`) or the rest of the row is destroyed.
- **The script runs at `document_start`,** where `document.documentElement` can
  still be null. Touching it unguarded kills the whole file.
- **Anything the MutationObserver writes must be idempotent.** The observer calls
  `tick()` on every DOM change, so a write that always happens re-triggers itself
  forever. Compare before you touch (see `sortTree`, `countBadge`, `truncate`).
- **The star button's list panel is React; never reparent its rows.** The
  "Add this repository to a list" picker is a Primer `SelectPanel`: a
  `ul[role=listbox]` of `li[role=option]` with roving `aria-activedescendant`,
  re-rendered whole on every keystroke in its own filter. Moving a row into a
  `<details>` fights the reconciler — the next render calls `insertBefore`
  against a node that is no longer its child — so `picker.js` draws the tree
  *inside* the rows GitHub rendered: an indent slot, a caret, and
  `display:none` on what a closed folder holds. Inserting rows of our own is
  safe (React only ever removes nodes it created), reparenting is not.
  Its rows carry `data-id="list-<id>"`, which is what the name memo is keyed
  on — a re-render reuses a `<li>` for a different list. The hashed `prc-*`
  class names change every build and nothing may key off them.
- **A Primer row is a CSS grid, so nothing of ours goes inside it.** Anything
  appended to `ActionListContent` auto-places into a cell of its own: the
  caret lands under the checkbox, the count wraps onto its own line. The
  caret, the indent slot and the count hang off the `<li>` instead, which
  `picker.js` lays out as a flex line with GitHub's row as the stretchy
  middle. `test.html` mirrors that grid — a fixture that is a plain flex row
  proves nothing.
- **The picker's order is GitHub's, and the tree relies on it.** The panel is
  sorted by full name, and `/` sorts ahead of every letter, so `a/b` already
  lands directly under `a`. Nothing is sorted or moved there; if that order
  ever changes, indentation is the first thing to break.
- **Chrome injects the extension stylesheet before GitHub's own.** Primer
  utilities (`.d-block`, …) carry `!important`, so a rule that ties them on
  specificity wins in Firefox but loses in Chrome. Overriding a utility takes
  the doubled-class trick (see `.nestedStarList-cut.nestedStarList-cut`).

## Layout

| File | Holds |
|---|---|
| `src/core.js` | names, folder icons, the tree (`group`, `nest`, `sortTree`, `countBadge`) |
| `src/settings.js` | the full-path option, applied as `data-nsl-paths` on `<html>` |
| `src/rail.js` | the list-page rail: index cache, rows, mount, filter |
| `src/picker.js` | the star button's "Add to list" panel: in-place tree, fold state |
| `src/boot.js` | `tick()`, the observer, the test hook |
| `styles.css` | injected by the manifest, so rows are styled before they land |
| `options.html`/`options.js` | the popup, also the options page |

They share one namespace, `globalThis.__nsl`, and load in manifest order —
content scripts cannot be ES modules. Each file destructures what it needs at the
top and `Object.assign`s what it adds.

## Testing

`test.html` is the self-check: fixtures that mirror real GitHub markup, then
assertions, printed as `PASS (n checks)` or `FAIL: …`. Run it over http (a
`file://` page cannot load the scripts in some browsers):

```
python3 -m http.server 8731     # then open http://localhost:8731/test.html
```

Check it at a wide **and** a narrow window: the rail switches from a pinned
column to a stacked block at 1011px, and some assertions branch on that.

The fixtures cannot prove the selectors still match GitHub. For that, drive the
real site with the files injected the way the extension injects them:

```js
for (const f of ['src/core.js', 'src/settings.js', 'src/rail.js', 'src/boot.js'])
  await page.addInitScript({ path: f });          // same timing as document_start
await page.goto('https://github.com/<user>?tab=stars');
await page.addStyleTag({ path: 'styles.css' });   // the manifest does this in the extension
```

A public profile works without logging in. Private lists are invisible that way,
so a list that is missing from the rail is not automatically a bug.

Run these checks in a **headless** browser the user never sees — from the MCP
session: `page.context().browser().browserType().launch({ headless: true,
channel: 'chrome' })` (the ms-playwright cache has no downloaded browsers here,
so the system-Chrome channel is the one that launches).

### The harness lies in known ways

Every one of these differences has already shipped a bug that only the user's
real browser caught. Before calling a change verified, walk the ones the change
could touch:

- **CSS order.** `addStyleTag` lands *last* and wins every cascade tie; the
  real Chrome extension injects *first* and loses them. Prepend the sheet to
  `head` (init script) to test the losing order.
- **Settings timing.** `chrome.storage.sync` resolves *after* first paint; the
  localStorage fallback the harness uses is synchronous. Anything the settings
  apply can stomp state the rail set up earlier — test the late arrival.
- **Navigation.** A fresh `goto` is not how users move. Turbo swaps keep our
  DOM alive across pages — click real links in the rail and check the state
  *after* the soft navigation, and again coming back.
- **Data size.** GitHub changes markup at thresholds: ≥9 lists brings its own
  "Show all lists" fold, our truncation starts past nine top-level entries.
  Fixtures and the kalibbe account must sit *above* the thresholds, not below.
- **The observer is running.** test.html calls `nest()` by hand; the extension
  calls it on every mutation. A non-idempotent write that passes the manual
  call loops forever live — assert zero mutations on a re-run.
- **Login.** Anonymous pages miss private lists and owner-only UI. What cannot
  be reproduced logged-out, ask the user to check — with a ready-to-paste
  console snippet, not a guess.

## Conventions

- Comments in English, and only where the code cannot say it — mostly *why*, not
  *what*.
- Reuse GitHub's own classes and CSS variables (`Box`, `Counter`, `--fgColor-*`)
  so the UI follows the user's theme for free.
- Planning notes and the backlog live in `.docs/` (git-ignored).
