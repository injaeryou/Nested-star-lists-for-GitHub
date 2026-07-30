// Part of Nested star lists for GitHub. Loaded in manifest order.
(() => {
  const SEP = /\//;               // list name: "AI/RAG" — only a slash nests
  const MARK = 'nestedStarList';

  // First non-blank text node inside a list link = the list name. GitHub keeps
  // the name and the "N repositories" count in separate nodes, so edit the node
  // itself — assigning a.textContent would wipe the rest of the row.
  const nameNode = a => {
    const w = document.createTreeWalker(a, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) if (n.data.trim()) return n;
    return null;
  };
  const nameOf = a => nameNode(a)?.data.trim() || '';
  const parts = name => name.split(SEP).map(s => s.trim());
  const norm = name => parts(name).join('/');
  const fullOf = a => a.dataset[MARK + 'Full'] || nameOf(a);   // pre-shortening name

  // Primer's file-directory icons: a folder says "group" faster than a triangle,
  // and swapping closed/open carries the state without extra width.
  const FOLDER_CLOSED = 'M1.75 1A1.75 1.75 0 0 0 0 2.75v10.5C0 14.216.784 15 1.75 15h12.5A1.75 1.75 0 0 0 16 13.25v-8.5A1.75 1.75 0 0 0 14.25 3H7.5a.25.25 0 0 1-.2-.1l-.9-1.2A1.75 1.75 0 0 0 5 1H1.75Z';
  const FOLDER_OPEN = 'M0 2.75C0 1.784.784 1 1.75 1H5c.55 0 1.07.26 1.4.7l.9 1.2a.25.25 0 0 0 .2.1h6.75c.966 0 1.75.784 1.75 1.75v.5H0V2.75Zm0 3.5h16l-1.53 6.62A1.75 1.75 0 0 1 12.77 15H3.23a1.75 1.75 0 0 1-1.7-1.13L0 6.25Z';
  const folderIcon = (cls, d) => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 16 16');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('class', cls);
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d);
    svg.append(path);
    return svg;
  };

  const mutedTag = text => {
    const tag = document.createElement('span');
    tag.className = `color-fg-muted text-normal ${MARK}-path`;
    tag.style.cssText = 'margin-left:6px;font-weight:400;font-size:12px';
    tag.textContent = `(${text})`;
    return tag;
  };

  // Show the row under its last path segment, keeping the full list name next to
  // it in muted text so the real name is never hidden.
  const rename = a => {
    const node = nameNode(a);
    const full = node.data.trim();
    a.dataset[MARK] = '1';
    a.dataset[MARK + 'Full'] = full;
    if (parts(full).length < 2) return;      // top-level list: nothing to shorten
    node.data = node.data.replace(full, parts(full).at(-1));
    node.parentElement.append(mutedTag(full));
  };

  // Layout: one indent step per level, plus a fixed caret slot. A folder row
  // spends the slot on its caret and a leaf row leaves it empty, so rows at the
  // same depth line their names up either way.
  const container = () => {
    const box = document.querySelector('#profile-lists-container .Box');
    if (box) return box;
    // Fallback: whichever element holds the most list links. Counted over ALL
    // links (not just unprocessed ones) so the winner is stable on every re-run.
    const count = new Map();
    for (const a of document.querySelectorAll('a[href*="/lists/"]')) {
      const p = a.closest('li')?.parentElement || a.parentElement;
      count.set(p, (count.get(p) || 0) + 1);
    }
    const [root, n] = [...count.entries()].sort((a, b) => b[1] - a[1])[0] || [];
    return n >= 2 ? root : null;   // a single link is never a list sidebar
  };

  // Walk down (creating as needed) the group chain for a path like ["a", "b"],
  // so any depth of "a/b/c/..." nests. `hint` keeps a new top-level group in the
  // slot its first row occupied.
  const group = (root, path, hint) => {
    let parent = root;
    const seen = [];
    for (const seg of path) {
      seen.push(seg);
      const key = seen.join('/');
      let d = [...parent.children].find(el => el.dataset?.[MARK + 'Parent'] === key);
      if (!d) {
        d = document.createElement('details');
        d.open = defaultOpen;
        d.dataset[MARK + 'Parent'] = key;
        d.dataset[MARK + 'Virtual'] = '1';      // no list of its own until promoted
        const s = document.createElement('summary');
        const caret = document.createElement('span');
        caret.className = `${MARK}-caret`;
        caret.append(folderIcon(`${MARK}-closed`, FOLDER_CLOSED),
                     folderIcon(`${MARK}-open`, FOLDER_OPEN));
        // A span, not bare text: it needs the same left padding a row has, so
        // folder names line up with list names.
        const label = document.createElement('span');
        label.className = `${MARK}-label`;
        label.textContent = seg;   // textContent, not innerHTML: names are user input
        label.title = `No list named "${key}" — folder only`;
        if (seen.length > 1) label.append(mutedTag(key));   // same muted path as rows
        s.append(caret, label);
        d.append(s);
        if (parent === root && hint?.parentElement === root) hint.before(d);
        else parent.append(d);
      }
      parent = d;
    }
    return parent;
  };

  // GitHub's flat sort order stops making sense once the rows become a tree.
  // Plain name order by default; the "type" setting groups folders first.
  const sortKey = el => {
    if (el.tagName === 'DETAILS') return parts(el.dataset[MARK + 'Parent']).at(-1);
    const a = el.matches('a') ? el : el.querySelector('a');
    return a ? nameOf(a) : el.textContent.trim();
  };
  // The children that belong to the tree: groups and list rows. Anything else —
  // the rail's header and credit line, GitHub's own "Show all lists..." row —
  // is left alone by every pass below.
  const treeKids = el => [...el.children].filter(c => c.tagName === 'DETAILS' ||
    (c.matches('a, li') &&
      (c.getAttribute('href')?.includes('/lists/') || c.querySelector('a[href*="/lists/"]'))));

  const sortTree = el => {
    // The marker guarantees non-tree children keep their place: the sorted block
    // is put back exactly where its first row was.
    const kids = treeKids(el);
    const wanted = [...kids].sort((x, y) =>
      (foldersFirst ? (y.tagName === 'DETAILS') - (x.tagName === 'DETAILS') : 0) ||
      sortKey(x).toLowerCase().localeCompare(sortKey(y).toLowerCase()));
    // Only touch the DOM when the order actually changes, or the observer that
    // calls us would fire on our own writes forever.
    if (wanted.some((k, i) => k !== kids[i])) {
      const marker = document.createComment(MARK);
      el.insertBefore(marker, kids[0]);
      wanted.forEach(k => el.insertBefore(k, marker));
      marker.remove();
    }
    wanted.filter(k => k.tagName === 'DETAILS').forEach(sortTree);
  };

  // How many lists live directly under a folder, kept next to its name so a
  // collapsed folder still tells you its size.
  const countBadge = d => {
    const kids = [...d.children].filter(c => c.tagName !== 'SUMMARY').length;
    const label = d.querySelector(`:scope > summary > .${MARK}-label`);
    const promoted = d.querySelector(':scope > summary a');
    // On a rail row the name is clipped with an ellipsis, so the badge goes in the
    // row itself, ahead of the repo count.
    const host = label ||
      (promoted?.querySelector(`.${MARK}-name`) ? promoted : nameNode(promoted)?.parentElement);
    if (!host) return;
    let el = host.querySelector(`.${MARK}-badge`);
    if (!el) {
      el = document.createElement('span');
      el.className = `Counter ${MARK}-badge`;
      const num = host.querySelector(`.${MARK}-num`);
      if (num) host.insertBefore(el, num); else host.append(el);
    }
    if (el.textContent !== String(kids)) el.textContent = String(kids);
    el.title = `${kids} lists inside`;
  };

  // Folders start collapsed; the "open" setting flips both future groups and the
  // ones already on the page.
  let defaultOpen = false;
  const setDefaultOpen = v => {
    defaultOpen = !!v;
    for (const d of document.querySelectorAll('details[data-nested-star-list-parent]'))
      d.open = defaultOpen;
    // The async settings read can land after the rail already opened the path
    // to the list being read; that path stays open no matter the default.
    for (let e = document.querySelector(`.${MARK}-current`); e; e = e.parentElement)
      if (e.tagName === 'DETAILS') e.open = true;
  };

  // One button opens or closes every folder under `root`. The icons are the
  // tree's own open/closed folders, so the target state is the picture itself.
  const foldButton = (root, open, withText) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `${MARK}-foldall`;
    b.title = open ? 'Expand all folders' : 'Collapse all folders';
    b.append(folderIcon('', open ? FOLDER_OPEN : FOLDER_CLOSED));
    if (withText) {
      const label = document.createElement('span');
      label.textContent = open ? 'Expand all' : 'Collapse all';
      b.append(label);
    }
    b.addEventListener('click', () => {
      for (const g of root.querySelectorAll('details[data-nested-star-list-parent]')) g.open = open;
    });
    return b;
  };

  let foldersFirst = false;
  const setSortMode = mode => {
    foldersFirst = mode === 'type';
    for (const root of [container(), document.getElementById('nested-children')])
      if (root) sortTree(root);
  };

  const nest = (root = container()) => {
    if (!root) return;
    // GitHub ships overflow rows folded inside its own "Show all lists…"
    // wrapper. Lift them out so the tree owns every row; the wrapper — nothing
    // left in it but the button — hides.
    for (const wrap of root.querySelectorAll(':scope > .js-details-container')) {
      for (const a of wrap.querySelectorAll('a[href*="/lists/"]')) wrap.before(a.closest('li') || a);
      wrap.classList.add(`${MARK}-hide`);
    }
    const links = () => [...root.querySelectorAll('a[href*="/lists/"]')];
    const all = links().map(a => norm(fullOf(a)));
    // "a/b" with "a/b/c" around is a group header, not a leaf: leave it for the
    // promotion pass below, which puts it in its own group's summary.
    const isGroup = n => all.some(o => o.length > n.length && o.startsWith(n + '/'));

    for (const a of links()) {
      if (a.dataset[MARK]) continue;
      const name = nameOf(a);
      if (!SEP.test(name) || isGroup(norm(name))) continue;
      const row = a.closest('li') || a;
      rename(a);
      group(root, parts(name).slice(0, -1), row).append(row);
    }

    // A real list named exactly like a group ("test" next to "test/test2")
    // becomes that group's header row: clickable AND collapsible.
    for (const d of root.querySelectorAll('details[data-nested-star-list-parent]')) {
      const s = d.querySelector('summary');
      if (s.querySelector('a')) continue;
      const key = d.dataset[MARK + 'Parent'];
      const real = links().find(a => !a.dataset[MARK] && norm(fullOf(a)) === key);
      if (!real) continue;
      const row = real.closest('li') || real;
      rename(real);
      delete d.dataset[MARK + 'Virtual'];       // it does have a list after all
      real.addEventListener('click', e => e.stopPropagation()); // follow link, don't toggle
      if (row.parentElement === root && d.parentElement === root) root.insertBefore(d, row);
      s.querySelector(`.${MARK}-label`)?.remove();   // keep the caret, swap the label
      s.append(row);
    }

    // On the profile page the fold-all controls sit beside the "Lists (N)"
    // heading, labelled — there is room. No heading found: top of the box.
    if (root.matches('#profile-lists-container .Box') && !document.querySelector(`.${MARK}-controls`)) {
      const bar = document.createElement('div');
      bar.className = `${MARK}-controls`;
      const top = document.createElement('span');
      top.className = `Counter ${MARK}-topcount`;
      bar.append(foldButton(root, true, true), foldButton(root, false, true));
      const h = [...document.querySelectorAll('h2')].find(e => /^Lists\b/.test(e.textContent.trim()));
      if (h) {
        h.classList.add(`${MARK}-heading`);
        // The pill slips in ahead of GitHub's own "(15)", so both surfaces
        // read the same way: our count first, the total in parentheses after.
        const all = [...h.children].find(e => /^\(\d+\)$/.test(e.textContent.trim()));
        if (all) h.insertBefore(top, all); else h.append(top);
        h.append(bar);
      } else { bar.prepend(top); root.prepend(bar); }
    }

    // The top level follows the same order as the folders.
    sortTree(root);
    truncate(root);
    root.querySelectorAll('details[data-nested-star-list-parent]').forEach(countBadge);

    // GitHub's heading counts every list; the badge next to it counts what the
    // tree actually starts with. (Write-guarded for the observer.)
    if (root.matches('#profile-lists-container .Box')) {
      const topBadge = document.querySelector(`.${MARK}-topcount`);
      const n = String(treeKids(root).length);
      if (topBadge && topBadge.textContent !== n) {
        topBadge.textContent = n;
        topBadge.title = `${n} top-level entries`;
      }
    }
  };

  // Like GitHub's own lists box: past nine top-level entries the rest fold away
  // behind one row, until it is clicked (or the rail gets filtered).
  const TRUNCATE_AT = 9;
  const truncate = root => {
    if (root.dataset[MARK + 'Expanded']) return;
    const kids = treeKids(root);
    kids.forEach((k, i) => k.classList.toggle(`${MARK}-cut`, i >= TRUNCATE_AT));
    let more = root.querySelector(`:scope > .${MARK}-more`);
    if (kids.length <= TRUNCATE_AT) { more?.remove(); return; }
    if (!more) {
      more = document.createElement('button');
      more.type = 'button';
      more.className = `${MARK}-more`;
      more.addEventListener('click', () => expand(root));
    }
    // Write-guarded: this runs from the MutationObserver, and an unconditional
    // move or rewrite would re-trigger it forever.
    const hid = kids.length - TRUNCATE_AT;
    const label = `Show ${hid} more list${hid === 1 ? '' : 's'}`;
    if (more.textContent !== label) more.textContent = label;
    if (more.previousElementSibling !== kids.at(-1)) kids.at(-1).after(more);
  };
  const expand = root => {
    root.dataset[MARK + 'Expanded'] = '1';
    root.querySelectorAll(`.${MARK}-cut`).forEach(k => k.classList.remove(`${MARK}-cut`));
    root.querySelector(`:scope > .${MARK}-more`)?.remove();
  };

  globalThis.__nsl = {
    MARK, SEP, parts, norm, nameNode, nameOf, fullOf, mutedTag, rename,
    folderIcon, FOLDER_CLOSED, FOLDER_OPEN, container, group, sortTree, countBadge, nest,
    setSortMode, setDefaultOpen, treeKids, expand, foldButton,
  };
})();
