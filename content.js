(() => {
  const SEP = /[/:]/;              // list name: "AI/RAG" or "AI:RAG"
  const MARK = 'nestedStarList';
  const APP_NAME = 'Nested star lists for GitHub';
  const REPO_URL = 'https://github.com/injaeryou/nested-star-lists-for-github';
  const LIST_HREF = /^\/stars\/[^/]+\/lists\/[^/]+$/;

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

    /* The tree already shows where a list sits, so the full path is opt-in. */
    .${MARK}-path { display: none; }
    :root[data-nsl-paths="on"] .${MARK}-path { display: inline; }

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
    details[data-nested-star-list-parent] > details::after { width: 8px; }

    /* Repositories left, lists right, pinned so they stay reachable while the
       repositories scroll. */
    .${MARK}-wrap { display: flex; gap: 16px; align-items: flex-start; }
    .${MARK}-main { flex: 1; min-width: 0; }
    #nested-children {
      flex: none; width: 320px; align-self: start;
      position: sticky; top: 16px;
      max-height: calc(100vh - 32px);
      /* Names already ellipsis, so nothing needs a horizontal scrollbar. */
      overflow: hidden auto;
      container-type: inline-size;
    }
    @media (max-width: 1011px) {
      .${MARK}-wrap { flex-direction: column; }
      #nested-children { width: 100%; position: static; }
    }
    .${MARK}-current {
      background: var(--bgColor-accent-muted, #388bfd1a);
      box-shadow: inset 2px 0 0 var(--fgColor-accent, #4493f8);
    }
    /* --- the rail: one line per list, styled like GitHub's file explorer ---- */
    #nested-children [hidden] { display: none !important; }
    #nested-children .Box-header {
      position: sticky; top: 0; z-index: 1; padding: 9px 10px;
      background: var(--bgColor-muted, #f6f8fa);
      display: flex; align-items: center; gap: 8px;
    }
    #nested-children .${MARK}-filter {
      flex: 1; min-width: 0; border: 0; background: transparent; outline: 0;
      font-size: 12px; line-height: 22px; padding: 1px 4px;
      color: var(--fgColor-default, #1f2328);
    }
    #nested-children .${MARK}-filter::placeholder { color: var(--fgColor-muted, #59636e); }
    /* Depth is carried by indentation and weight; connector lines at 12px are
       noise, so the rail drops the ones the full-width page uses. */
    #nested-children details[data-nested-star-list-parent] > :not(summary)::before,
    #nested-children details[data-nested-star-list-parent] > :not(summary)::after {
      content: none;
    }
    /* Folders read as structure, lists as destinations. */
    #nested-children details[data-nested-star-list-parent] > summary { font-weight: 600; }
    #nested-children .${MARK}-label { cursor: default; }
    #nested-children .${MARK}-row .${MARK}-name { color: var(--fgColor-muted, #59636e); }
    #nested-children .${MARK}-row:hover .${MARK}-name,
    #nested-children summary .${MARK}-row .${MARK}-name { color: var(--fgColor-default, #1f2328); }
    #nested-children .${MARK}-current .${MARK}-name {
      color: var(--fgColor-accent, #0969da); font-weight: 600;
    }
    #nested-children .${MARK}-row {
      display: flex; align-items: center; gap: 8px;
      margin: 1px 4px; padding: 3px 8px; border-radius: 6px;
      font-size: 12px; line-height: 20px; border: 0;
      color: var(--fgColor-default, #1f2328); text-decoration: none;
    }
    #nested-children .${MARK}-row:hover { background: var(--bgColor-neutral-muted, #6e768118); }
    /* Shrink-only, so the child-count badge sits against the name instead of
       being pushed to the far edge; the repo count keeps the right edge. */
    #nested-children .${MARK}-name {
      flex: 0 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    #nested-children .${MARK}-num {
      flex: none; margin-left: auto; font-size: 11px; font-variant-numeric: tabular-nums;
      color: var(--fgColor-muted, #59636e);
    }
    /* The tree already shows the path, and the row title carries the full name. */
    #nested-children .color-fg-muted { display: none; }
    #nested-children .${MARK}-badge { margin-left: 0; }   /* the flex gap is enough */
    #nested-children .${MARK}-label { padding: 3px 8px; font-size: 12px; }
    /* A little air around the folder glyph: it is the only icon in the rail. */
    #nested-children .${MARK}-caret { width: 20px; margin-left: 2px; border-radius: 4px; }
    #nested-children .${MARK}-row, #nested-children .${MARK}-label { gap: 10px; }
    /* Tighter indent than the full-width page: 16px a level. */
    #nested-children > .${MARK}-row { padding-left: 24px; }
    #nested-children details[data-nested-star-list-parent] > a { padding-left: 40px; }
    #nested-children details[data-nested-star-list-parent] > details { padding-left: 16px; }
    /* Credit line: one 11px row, pinned to the bottom of the rail. */
    #nested-children .${MARK}-foot {
      position: sticky; bottom: 0; z-index: 1;
      padding: 5px 10px; font-size: 11px; line-height: 16px;
      border-top: 1px solid var(--borderColor-muted, #d1d9e0);
      background: var(--bgColor-muted, #f6f8fa);
    }
    #nested-children .${MARK}-foot a {
      color: var(--fgColor-muted, #59636e); text-decoration: none;
    }
    #nested-children .${MARK}-foot a:hover {
      color: var(--fgColor-accent, #0969da); text-decoration: underline;
    }
    @container (max-width: 230px) { #nested-children .${MARK}-num { display: none; } }`;

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

  // --- the same tree, on a single list's page ------------------------------

  // Pure part, so it is testable without network or navigation: every list on the
  // index, rebuilt as one compact line each. GitHub's own list rows are page-width
  // cards (big bold title, description, "N repositories") — three of them fill a
  // 320px rail, so the rail gets its own row: name, then the repo count.
  const indexData = doc => {
    const seen = new Set();
    return [...doc.querySelectorAll('a[href*="/lists/"]')]
      .filter(a => {
        const href = a.getAttribute('href') || '';
        return LIST_HREF.test(href) && !seen.has(href) && seen.add(href);
      })
      .map(a => ({
        href: a.getAttribute('href'),
        name: nameOf(a),
        repos: a.textContent.match(/(\d[\d,]*)\s+repositor/)?.[1] || '',
      }));
  };

  const railRows = (data, pathname) =>
      data.map(({ href, name: full, repos }) => {
        const row = document.createElement('a');
        row.className = `${MARK}-row`;
        row.setAttribute('href', href);
        row.title = repos ? `${full} — ${repos} repositories` : full;
        if (href === pathname) row.classList.add(`${MARK}-current`);
        const nm = document.createElement('span');
        nm.className = `${MARK}-name`;
        nm.textContent = full;
        const num = document.createElement('span');
        num.className = `${MARK}-num`;
        num.textContent = repos;
        row.append(nm, num);
        return row;
      });

  // The list page's repository list. Everything is mounted relative to it: it is
  // the one stable landmark on the page.
  const repoList = root => root.querySelector('#user-list-repositories');

  // Put the box beside the whole list column, in a flex row of our own — that
  // column is a plain block, so there is no existing column to drop into. The
  // entire column moves left (title included) so the box starts at the title,
  // not below it.
  const mountBeside = (box, repos) => {
    const col = repos.parentElement;
    let wrap = repos.closest(`.${MARK}-wrap`);
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = `${MARK}-wrap`;
      const left = document.createElement('div');
      left.className = `${MARK}-main`;
      while (col.firstChild) left.append(col.firstChild);
      wrap.append(left);
      col.append(wrap);
    }
    wrap.append(box);
  };

  // Typing beats scrolling in a 320px rail: hide the rows that do not match, and
  // open every folder that still has one.
  const filterRail = (box, query, onCount) => {
    const q = query.trim().toLowerCase();
    let shown = 0;
    for (const row of box.querySelectorAll(`.${MARK}-row`)) {
      const hit = !q || (row.title || '').toLowerCase().includes(q);
      row.hidden = !hit;
      if (hit) shown++;
    }
    // Deepest first, so a folder sees its children's final state.
    for (const d of [...box.querySelectorAll('details')].reverse()) {
      d.hidden = !d.querySelector(`.${MARK}-row:not([hidden])`);
      // A surviving folder keeps its own row on screen even when the name missed:
      // it is the path to the match, and its summary would be an empty caret.
      if (!d.hidden) {
        const own = d.querySelector(`:scope > summary .${MARK}-row`);
        if (own) own.hidden = false;
      }
      if (q) {
        if (d.dataset[MARK + 'Was'] === undefined) d.dataset[MARK + 'Was'] = d.open ? '1' : '0';
        d.open = true;
      } else if (d.dataset[MARK + 'Was'] !== undefined) {
        d.open = d.dataset[MARK + 'Was'] === '1';
        delete d.dataset[MARK + 'Was'];
      }
    }
    onCount(shown);
  };

  // Which folders the user left closed, so the rail looks the same next page.
  const closedKey = user => `${MARK}:closed:${user}`;
  const readClosed = user => {
    try { return new Set(JSON.parse(localStorage.getItem(closedKey(user)) || '[]')); }
    catch { return new Set(); }
  };
  const rememberClosed = (box, user) => {
    const closed = [...box.querySelectorAll('details[data-nested-star-list-parent]')]
      .filter(d => !d.open && d.dataset[MARK + 'Was'] === undefined)
      .map(d => d.dataset[MARK + 'Parent']);
    try { localStorage.setItem(closedKey(user), JSON.stringify(closed)); } catch {}
  };

  const fetchDoc = async url => {
    const res = await fetch(url);
    if (!res.ok) return null;
    return new DOMParser().parseFromString(await res.text(), 'text/html');
  };

  // The index is the same for every list page, so keep it for the tab's lifetime:
  // the rail can then render at once and check for changes afterwards.
  const cacheKey = user => `${MARK}:index:${user}`;
  const readIndex = user => {
    try { return JSON.parse(sessionStorage.getItem(cacheKey(user)) || 'null'); }
    catch { return null; }
  };
  const writeIndex = (user, data) => {
    try { sessionStorage.setItem(cacheKey(user), JSON.stringify(data)); } catch {}
  };

  const mountRail = (data, user) => {
    const old = document.getElementById('nested-children');
    const query = old?.querySelector(`.${MARK}-filter`)?.value || '';
    const box = railBox(railRows(data, location.pathname));
    const filter = box.querySelector(`.${MARK}-filter`);
    const total = box.querySelector('.Counter');

    if (old) old.replaceWith(box);
    else {
      const main = document.querySelector('main') || document.body;
      const repos = repoList(main);
      if (repos) mountBeside(box, repos); else main.prepend(box);
    }
    nest(box);                     // same folder tree as the lists page

    const closed = readClosed(user);
    for (const d of box.querySelectorAll('details[data-nested-star-list-parent]'))
      if (closed.has(d.dataset[MARK + 'Parent'])) d.open = false;
    box.addEventListener('toggle', () => rememberClosed(box, user), true);

    const count = n => {
      total.textContent = String(n);
      total.title = filter.value.trim() ? `${n} lists match` : `${n} lists`;
    };
    filter.addEventListener('input', () => filterRail(box, filter.value, count));
    if (query) { filter.value = query; filterRail(box, query, count); }

    // Scroll the rail (not the page) so the list you are on is in view.
    const here = box.querySelector(`.${MARK}-current`);
    if (here) box.scrollTop = here.offsetTop - box.clientHeight / 2;
    return box;
  };

  const showTree = async () => {
    const m = location.pathname.match(/^\/stars\/([^/]+)\/lists\/[^/]+$/);
    if (!m || document.getElementById('nested-children')) return;
    const user = m[1];

    const cached = readIndex(user);
    if (cached?.length) mountRail(cached, user);

    // The lists index only exists on the profile stars tab — /stars/<user>/lists
    // is not a page.
    const doc = await fetchDoc(`/${user}?tab=stars`);
    const fresh = doc ? indexData(doc) : [];
    if (!fresh.length) {
      if (!cached?.length) console.debug('[nested star lists] no lists found');
      return;
    }
    writeIndex(user, fresh);
    // Only touch the DOM again if the lists actually changed.
    if (JSON.stringify(cached) !== JSON.stringify(fresh)) mountRail(fresh, user);
  };

  // Reuse GitHub's own Box classes so the rail looks like the rest of the page:
  // filter on top, lists in the middle, credit pinned at the bottom.
  const railBox = rows => {
    const box = document.createElement('div');
    box.id = 'nested-children';
    box.className = 'Box mb-3';
    const header = document.createElement('div');
    header.className = 'Box-header';
    const filter = document.createElement('input');
    filter.className = `${MARK}-filter`;
    filter.type = 'search';
    filter.placeholder = 'Filter lists';
    filter.setAttribute('aria-label', 'Filter lists');
    const total = document.createElement('span');
    total.className = 'Counter';
    total.textContent = String(rows.length);
    total.title = `${rows.length} lists`;   // a bare number begs the question
    header.append(filter, total);

    const foot = document.createElement('div');
    foot.className = `${MARK}-foot`;
    const credit = document.createElement('a');
    credit.href = REPO_URL;
    credit.target = '_blank';
    credit.rel = 'noopener noreferrer';
    credit.textContent = APP_NAME;
    foot.append(credit);

    box.append(header, ...rows, foot);
    return box;
  };

  let seen = '';
  const tick = () => {
    nest();
    if (location.pathname !== seen) { seen = location.pathname; showTree(); }
  };

  // Settings live in extension storage when there is one, and in localStorage for
  // the userscript build. Applied as an attribute so the CSS above decides, which
  // means the async read can land whenever it likes.
  const PATHS_KEY = 'showFullPaths';
  const applyPaths = on => { document.documentElement.dataset.nslPaths = on ? 'on' : 'off'; };
  const loadSettings = () => {
    const store = globalThis.chrome?.storage?.sync;
    if (!store) return applyPaths(localStorage.getItem(`${MARK}:${PATHS_KEY}`) === 'true');
    store.get({ [PATHS_KEY]: false }, v => applyPaths(v[PATHS_KEY]));
    chrome.storage.onChanged.addListener(c => {
      if (c[PATHS_KEY]) applyPaths(c[PATHS_KEY].newValue);
    });
  };

  const start = () => {
    (document.head || document.documentElement).append(style);
    loadSettings();
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
  window.__nestedStarLists =
    { indexData, railRows, railBox, repoList, mountBeside, nest, filterRail };
})();
