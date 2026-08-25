// Part of Nested star lists for GitHub. Loaded in manifest order.
(() => {
  const { MARK, parts, nameNode, rename, mutedTag,
          folderIcon, FOLDER_CLOSED, FOLDER_OPEN } = globalThis.__nsl;

  // The star button's "Add this repository to a list" panel. Its rows are
  // options, not links, so nest() never sees them — and they must not be moved
  // out of GitHub's <ul> (see CLAUDE.md). The tree is drawn in place instead:
  // an indent slot and a caret inside the row GitHub rendered, and a row of our
  // own for a folder that has no list of its own.
  const ROW = 'ul[data-component="ActionList"] > li[data-id^="list-"]';
  const LABEL = '[data-component="ActionList.Item.Label"]';
  const FILTER = 'input[aria-label="Filter lists"]';
  const STEP = 16;     // one indent level
  const CARET = 24;    // the caret slot, left empty on a row with no children
  const FOLDER = MARK + 'Folder';
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
    // React listens on the panel root, so an escaping click would tick it.
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
  const slot = (host, w) => {
    let s = [...host.children].find(c => c.classList.contains(`${MARK}-indent`));
    if (!s) {
      s = document.createElement('span');
      s.className = `${MARK}-indent`;
      s.setAttribute('aria-hidden', 'true');
    }
    if (s.style.width !== `${w}px`) s.style.width = `${w}px`;
    if (host.firstElementChild !== s) host.prepend(s);
    return s;
  };

  const nestPicker = () => {
    const rows = [...document.querySelectorAll(ROW)];
    if (!rows.length) return;

    // Read the whole panel first: only the full set of names tells a folder
    // from a leaf.
    const entries = rows.map(li => {
      const label = li.querySelector(LABEL);
      const node = label && nameNode(label);
      if (!node) return null;
      const txt = node.data.trim();
      // A slash means this is the name as GitHub rendered it — first paint, or
      // a re-render that undid the shortening. Otherwise the row is one this
      // already shortened, and the memo holds what it really is.
      const full = txt.includes('/') ? txt : (nameById.get(li.dataset.id) || txt);
      nameById.set(li.dataset.id, full);
      return { el: li, content: li.querySelector(':scope > div') || li, path: full, label };
    }).filter(Boolean);

    const all = entries.map(e => e.path);
    if (!all.some(n => n.includes('/'))) return;   // nothing nests: hands off

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
    const filtering = !!document.querySelector(FILTER)?.value.trim();
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
    for (const c of [...rows[0].parentElement.children])
      if (c.dataset[FOLDER] && !placed.has(c.dataset[FOLDER])) c.remove();

    for (const { el, content, path, label } of drawn) {
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
      const s = slot(el, (parts(path).length - 1) * STEP + (folder ? 0 : CARET));
      if (folder) {
        let c = [...el.children].find(x => x.classList.contains(`${MARK}-caret`)) || caret();
        if (c.dataset[FOLDER] !== path) c.dataset[FOLDER] = path;
        const open = filtering || !shut.has(path);
        if (open && c.dataset[OPEN] === undefined) c.dataset[OPEN] = '';
        if (!open && c.dataset[OPEN] !== undefined) delete c.dataset[OPEN];
        if (s.nextElementSibling !== c) s.after(c);
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
    }
  };

  Object.assign(globalThis.__nsl, { nestPicker });
})();
