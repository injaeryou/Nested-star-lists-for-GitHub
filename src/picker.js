// Part of Nested star lists for GitHub. Loaded in manifest order.
(() => {
  const { MARK, parts, nameNode, rename, mutedTag,
          folderIcon, FOLDER_CLOSED, FOLDER_OPEN } = globalThis.__nsl;

  // The star button's "Add this repository to a list" panel — of which GitHub
  // ships two. On a repo page it is Primer's React SelectPanel; everywhere a
  // repo *row* has a star button (trending, the feed, the stars tab) it is the
  // Catalyst <action-list> dialog. Same lists, different markup, and only one
  // of them objects to having its rows moved.
  const PANELS = [
    {
      row: 'li[data-id^="list-"]',
      label: '[data-component="ActionList.Item.Label"]',
      id: li => li.dataset.id,
      // React re-renders the whole <ul> on every keystroke in its own filter,
      // so a row moved out from under it breaks the reconciler. It does not
      // need moving: that panel already comes sorted by full name.
      sort: false,
      filter: ul => ul.closest('[data-component="SelectPanel"]')
        ?.querySelector('input[aria-label="Filter lists"]'),
    },
    {
      row: 'li.ActionListItem[data-item-id^="user-list-"]',
      label: '.ActionListItem-label',
      id: li => li.dataset.itemId,
      // Server order, which is neither the tree's nor alphabetical — and
      // nothing here owns the rows, so they are ours to sort. No filter box.
      sort: true,
      filter: () => null,
    },
  ];

  const STEP = 16;     // one indent level
  const CARET = 24;    // the caret slot, left empty on a row with no children
  const FOLDER = MARK + 'Folder';
  const LINE = MARK + 'Line';
  const OPEN = MARK + 'Open';

  // Keyed by the row's own data-id: the panel re-renders on every keystroke in
  // its filter and reuses <li> elements, so a row cannot be trusted to still
  // hold the list it held last time.
  const nameById = new Map();
  // Folders the reader closed. Kept for the tab's lifetime — the panel throws
  // its rows away each time it closes, the tree state should not go with them.
  const shut = new Set();

  // aria-hidden, and no tabindex: the listbox owns the keyboard, and a real
  // button inside an option would break its roving focus. This is click-only.
  const caret = () => {
    const c = document.createElement('span');
    c.className = `${MARK}-caret`;
    c.setAttribute('aria-hidden', 'true');
    c.append(folderIcon(`${MARK}-closed`, FOLDER_CLOSED),
             folderIcon(`${MARK}-open`, FOLDER_OPEN));
    // Capture and stop it dead: the row underneath is a checkbox option, and
    // the panel listens on its own root, so an escaping click would tick it.
    // The path is read from the element, not closed over — a re-rendered row
    // can be holding a different list by the time this fires.
    for (const type of ['pointerdown', 'mousedown', 'click'])
      c.addEventListener(type, e => {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (type !== 'click') return;
        const path = c.dataset[FOLDER];
        if (!shut.delete(path)) shut.add(path);
        nestPicker();
      }, true);
    return c;
  };

  // Tree order, compared a segment at a time: a parent lands above its own
  // children whatever "/" is worth in the locale's collation.
  const cmp = (a, b) => {
    const x = parts(a), y = parts(b);
    for (let i = 0; i < Math.min(x.length, y.length); i++) {
      const c = x[i].toLowerCase().localeCompare(y[i].toLowerCase());
      if (c) return c;
    }
    return x.length - y.length;
  };

  const folderRow = path => {
    const li = document.createElement('li');
    li.className = `${MARK}-pick`;
    li.setAttribute('role', 'presentation');   // not an option: nothing to check
    li.dataset[FOLDER] = path;
    const label = document.createElement('span');
    label.className = `${MARK}-picklabel`;
    label.textContent = parts(path).at(-1);    // textContent: names are user input
    label.title = `No list named "${path}" — folder only`;
    if (parts(path).length > 1) label.append(mutedTag(path));
    li.append(label);
    return li;
  };

  // Indent without touching the row's own box: Primer owns the padding on both
  // the row and its content, and overwriting it would move GitHub's layout.
  // One cell per level, so each can carry the guide line of the ancestor it
  // sits under — and a leaf gets one more, the width of the caret it has not
  // got, so names at the same depth line up either way.
  const slots = (host, kinds, tail) => {
    const want = kinds.length + (tail ? 1 : 0);
    const cells = [...host.children].filter(c => c.classList.contains(`${MARK}-indent`));
    while (cells.length > want) cells.pop().remove();
    while (cells.length < want) {
      const s = document.createElement('span');
      s.className = `${MARK}-indent`;
      s.setAttribute('aria-hidden', 'true');
      cells.push(s);
    }
    cells.forEach((s, i) => {
      const w = i < kinds.length ? STEP : tail;
      if (s.style.width !== `${w}px`) s.style.width = `${w}px`;
      const kind = kinds[i] || '';
      if ((s.dataset[LINE] || '') !== kind) {
        if (kind) s.dataset[LINE] = kind; else delete s.dataset[LINE];
      }
      // The cell a leaf spends on the caret it has not got carries the list
      // glyph — the stylesheet's, the same one the profile rows use. A cell can
      // change hands when a row is re-rendered at another depth, so the class
      // is put on and taken off, never assumed.
      s.classList.toggle(`${MARK}-leaf`, i >= kinds.length);
      if (i === 0) { if (host.firstElementChild !== s) host.prepend(s); }
      else if (cells[i - 1].nextElementSibling !== s) cells[i - 1].after(s);
    });
    return cells.at(-1) || null;
  };

  const nestPicker = () => {
    for (const kind of PANELS) {
      const rows = document.querySelectorAll(kind.row);
      // One page can hold many panels — a trending page has two per repo — and
      // each is its own tree, so they are drawn one <ul> at a time.
      for (const ul of new Set([...rows].map(li => li.parentElement))) draw(ul, kind);
    }
  };

  const draw = (ul, kind) => {
    let rows = [...ul.children].filter(c => c.matches(kind.row));
    if (!rows.length) return;

    // Read the whole panel first: only the full set of names tells a folder
    // from a leaf.
    let entries = rows.map(li => {
      const label = li.querySelector(kind.label);
      const node = label && nameNode(label);
      if (!node) return null;
      const txt = node.data.trim();
      // A slash means this is the name as GitHub rendered it — first paint, or
      // a re-render that undid the shortening. Otherwise the row is one this
      // already shortened, and the memo holds what it really is.
      const full = txt.includes('/') ? txt : (nameById.get(kind.id(li)) || txt);
      nameById.set(kind.id(li), full);
      // The row's own content, whatever GitHub built it out of — everything
      // else under the <li> is ours.
      const content = [...li.children]
        .find(c => ![...c.classList].some(n => n.startsWith(MARK))) || li;
      return { el: li, content, path: full, label };
    }).filter(Boolean);

    const all = entries.map(e => e.path);
    if (!all.some(n => n.includes('/'))) return;   // nothing nests: hands off

    // Tree order first, where the panel does not come in it. Write-guarded, or
    // the observer would see a move on every pass and call us forever.
    if (kind.sort) {
      const want = [...entries].sort((a, b) => cmp(a.path, b.path));
      if (want.some((e, i) => e !== entries[i])) {
        const mark = document.createComment(MARK);
        ul.insertBefore(mark, entries[0].el);
        for (const e of want) ul.insertBefore(e.el, mark);
        mark.remove();
        entries = want;
      }
    }

    // Every path in the panel, including the folders no list is named after.
    const nodes = new Set(all);
    for (const n of all)
      for (let i = 1; i < parts(n).length; i++) nodes.add(parts(n).slice(0, i).join('/'));
    const kids = new Map();
    for (const n of nodes) {
      const p = parts(n).slice(0, -1).join('/');
      if (p) kids.set(p, (kids.get(p) || 0) + 1);
    }

    // While GitHub's own filter runs, a closed folder would hide its own
    // matches — so a search sees everything, exactly like the rail's filter.
    const filtering = !!kind.filter(ul)?.value.trim();
    const buried = path => !filtering &&
      parts(path).slice(0, -1).some((_, i, a) => shut.has(a.slice(0, i + 1).join('/')));

    // Place the rows for folders that own no list, deepest first so each lands
    // directly above what it holds.
    const drawn = [];
    const placed = new Set();
    for (const row of entries) {
      const seg = parts(row.path);
      let anchor = row.el;
      for (let i = seg.length - 1; i >= 1; i--) {
        const path = seg.slice(0, i).join('/');
        if (placed.has(path) || all.includes(path)) break;   // done, or a real row heads it
        placed.add(path);
        const ul = anchor.parentElement;
        let v = [...ul.children].find(c => c.dataset?.[FOLDER] === path) || folderRow(path);
        if (v.nextElementSibling !== anchor) anchor.before(v);
        drawn.push({ el: v, content: v, path });
        anchor = v;
      }
      drawn.push(row);
    }
    // GitHub's filter takes rows out of the <ul> and puts them back, so a
    // folder can lose the list it was named after and get it back. A row of
    // ours that is no longer wanted is ours to remove — nothing else will.
    for (const c of [...ul.children])
      if (c.dataset[FOLDER] && !placed.has(c.dataset[FOLDER])) c.remove();

    // The last row under each folder, so a branch knows where to stop: rows
    // are in tree order, so the latest index wins.
    const lastUnder = new Map();
    drawn.forEach(({ path }, i) => {
      const seg = parts(path);
      for (let j = 1; j < seg.length; j++) lastUnder.set(seg.slice(0, j).join('/'), i);
    });

    drawn.forEach(({ el, content, path, label }, i) => {
      if (label) {
        const node = nameNode(label);
        // A re-render can put the full name back with our muted path still
        // there; drop it first so rename() does not leave two.
        if (node.data.includes('/')) {
          label.querySelector(`.${MARK}-path`)?.remove();
          rename(label);
        }
        if (el.title !== path) el.title = path;
      }
      // Primer lays a row out as a CSS grid of named areas, so anything put
      // inside it lands in a cell of its own — the caret below the checkbox,
      // the count on a line by itself. Our parts go on the <li> instead, as a
      // flex line with GitHub's row as the stretchy middle.
      const own = content === el;          // our own folder row: a flex line already
      if (!own) {
        if (el.style.alignItems !== 'center') el.style.alignItems = 'center';
        if (content.style.flex !== '1 1 auto') {
          content.style.flex = '1 1 auto';
          content.style.minWidth = '0';    // or a long name pushes the count off the row
        }
      }
      const folder = kids.has(path);
      // "│" while the ancestor that cell stands for still has rows below,
      // "├"/"└" on the parent's own cell, nothing once the branch is done.
      const seg = parts(path);
      const kinds = seg.slice(0, -1).map((_, j) => {
        const on = lastUnder.get(seg.slice(0, j + 1).join('/')) > i;
        return j === seg.length - 2 ? (on ? 'tee' : 'elbow') : (on ? 'through' : '');
      });
      const s = slots(el, kinds, folder ? 0 : CARET);
      if (folder) {
        let c = [...el.children].find(x => x.classList.contains(`${MARK}-caret`)) || caret();
        if (c.dataset[FOLDER] !== path) c.dataset[FOLDER] = path;
        const open = filtering || !shut.has(path);
        if (open && c.dataset[OPEN] === undefined) c.dataset[OPEN] = '';
        if (!open && c.dataset[OPEN] !== undefined) delete c.dataset[OPEN];
        if (s ? s.nextElementSibling !== c : el.firstElementChild !== c)
          s ? s.after(c) : el.prepend(c);
        // A closed folder still says how much it is holding.
        let n = [...el.children].find(x => x.classList.contains(`${MARK}-pickcount`));
        if (!n) {
          n = document.createElement('span');
          n.className = `Counter ${MARK}-pickcount`;
        }
        if (el.lastElementChild !== n) el.append(n);
        const size = String(kids.get(path));
        if (n.textContent !== size) { n.textContent = size; n.title = `${size} lists inside`; }
      }
      const off = buried(path) ? 'none' : (own ? '' : 'flex');
      if (el.style.display !== off) el.style.display = off;
    });
  };

  Object.assign(globalThis.__nsl, { nestPicker });
})();
