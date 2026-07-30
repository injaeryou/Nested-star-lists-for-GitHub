(() => {
  const SEP = /[/:]/;              // list name: "AI/RAG" or "AI:RAG"
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
  const norm = name => parts(name).join('/');       // ":" and "/" mean the same
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
    tag.className = 'color-fg-muted text-normal';
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
  const style = document.createElement('style');
  style.textContent = `
    details[data-nested-star-list-parent] > summary {
      display: flex; align-items: center; list-style: none; padding: 0;
      cursor: pointer;
    }
    details[data-nested-star-list-parent] > summary::-webkit-details-marker { display: none; }
    details[data-nested-star-list-parent] > summary > * { flex: 1; }

    /* The caret is a real element, not a ::before, so it can own its own hover
       area: hovering the toggle highlights the toggle, hovering the row
       highlights the row. */
    .${MARK}-caret {
      flex: none !important; width: 24px; align-self: stretch; border-radius: 6px;
      display: flex; align-items: center; justify-content: center; cursor: pointer;
    }
    .${MARK}-caret svg { width: 14px; height: 14px; fill: currentColor; opacity: .7; }
    .${MARK}-caret:hover svg { opacity: 1; }
    .${MARK}-caret .${MARK}-open { display: none; }
    details[data-nested-star-list-parent][open] > summary > .${MARK}-caret .${MARK}-open {
      display: block;
    }
    details[data-nested-star-list-parent][open] > summary > .${MARK}-caret .${MARK}-closed {
      display: none;
    }
    .${MARK}-caret:hover,
    .${MARK}-label:hover { background: var(--bgColor-neutral-muted, #6e768118); }
    /* A folder with no list of its own still gets a full row to click on. */
    .${MARK}-label { padding: 8px 16px; }
    .${MARK}-badge { margin-left: 6px; }


    /* 28px indent step + 24px caret slot + the 16px a row pads itself with; a
       folder row gets the last 16px from its own header, so both end up equal. */
    details[data-nested-star-list-parent] > a,
    details[data-nested-star-list-parent] > li { padding-left: 68px; }
    details[data-nested-star-list-parent] > details { padding-left: 28px; }

    /* Folder-tree guides: a stem down the group, an elbow into each child. */
    details[data-nested-star-list-parent] > :not(summary) { position: relative; }
    details[data-nested-star-list-parent] > :not(summary)::before {
      content: ''; position: absolute; left: 30px; top: 0; bottom: 0;
      border-left: 1px solid var(--borderColor-muted, #30363d);
    }
    details[data-nested-star-list-parent] > :not(summary):last-child::before { bottom: 50%; }
    details[data-nested-star-list-parent] > :not(summary)::after {
      content: ''; position: absolute; left: 30px; top: 50%; width: 30px;
      border-top: 1px solid var(--borderColor-muted, #30363d);
    }
    details[data-nested-star-list-parent] > details::after { width: 8px; }`;


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
        d.open = true;
        d.dataset[MARK + 'Parent'] = key;
        const s = document.createElement('summary');
        s.style.fontWeight = '600';
        const caret = document.createElement('span');
        caret.className = `${MARK}-caret`;
        caret.append(folderIcon(`${MARK}-closed`, FOLDER_CLOSED),
                     folderIcon(`${MARK}-open`, FOLDER_OPEN));
        // A span, not bare text: it needs the same left padding a row has, so
        // folder names line up with list names.
        const label = document.createElement('span');
        label.className = `${MARK}-label`;
        label.textContent = seg;   // textContent, not innerHTML: names are user input
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

  // Folders first, then lists, each by name: GitHub's flat sort order stops
  // making sense once the rows become a tree.
  const sortKey = el => {
    if (el.tagName === 'DETAILS') return parts(el.dataset[MARK + 'Parent']).at(-1);
    const a = el.matches('a') ? el : el.querySelector('a');
    return a ? nameOf(a) : el.textContent.trim();
  };
  const sortTree = el => {
    const kids = [...el.children].filter(c => c.tagName !== 'SUMMARY');
    const wanted = [...kids].sort((x, y) =>
      (y.tagName === 'DETAILS') - (x.tagName === 'DETAILS') ||
      sortKey(x).toLowerCase().localeCompare(sortKey(y).toLowerCase()));
    // Only touch the DOM when the order actually changes, or the observer that
    // calls us would fire on our own writes forever.
    if (wanted.some((k, i) => k !== kids[i])) wanted.forEach(k => el.append(k));
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

  const nest = (root = container()) => {
    if (!root) return;
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
      real.addEventListener('click', e => e.stopPropagation()); // follow link, don't toggle
      if (row.parentElement === root && d.parentElement === root) root.insertBefore(d, row);
      s.querySelector(`.${MARK}-label`)?.remove();   // keep the caret, swap the label
      s.append(row);
    }

    for (const d of root.children) if (d.tagName === 'DETAILS') sortTree(d);
    root.querySelectorAll('details[data-nested-star-list-parent]').forEach(countBadge);
  };

  const tick = () => {
    nest();
  };


  const start = () => {
    (document.head || document.documentElement).append(style);
    tick();
    // Watch documentElement: rows get nested as they stream in instead of after
    // the whole page settles. Also covers Turbo swaps.
    new MutationObserver(tick).observe(document.documentElement, { childList: true, subtree: true });
  };

  // At document_start the document can still be empty, and touching a null
  // documentElement would kill the whole script.
  if (document.documentElement) start();
  else document.addEventListener('readystatechange', start, { once: true });

  // test hook
  window.__nestedStarLists = { nest };
})();
