# Nested star lists for GitHub

GitHub star lists are one level deep. This browser extension (Chrome + Firefox,
Manifest V3) reads a naming convention — `parent/child` — and draws your star
lists as a collapsible folder tree: on the profile's stars tab, and as a pinned
rail of every list beside a single list's page.

Nothing is stored anywhere and no list is modified: your lists keep their real
names, and the tree is built in the page from them.

## Naming

Name a list `parent/child` and it nests — any depth, and only a slash nests:

```
parent                    →  parent
parent/child              →  └ child
parent/child/grandchild   →     └ grandchild
```

A list named exactly like a folder (`parent` next to `parent/child`) becomes
that folder's own clickable row.

## Install

Not on the stores yet, so load it unpacked:

- **Chrome** — `chrome://extensions` → *Developer mode* → *Load unpacked* →
  pick this folder.
- **Firefox** — `about:debugging#/runtime/this-firefox` → *Load Temporary
  Add-on* → pick `manifest.json`.

Then open your stars: `github.com/<you>?tab=stars`. Settings — sort order,
folders expanded by default, full list names — live behind the toolbar icon.

## Licence

[Apache-2.0](LICENSE).
