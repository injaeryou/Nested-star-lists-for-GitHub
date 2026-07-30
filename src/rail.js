// Part of Nested star lists for GitHub. Loaded in manifest order.
(() => {
  const { MARK, nameOf, nest, expand, foldButton, treeKids } = globalThis.__nsl;

  const APP_NAME = 'Nested star lists for GitHub';
  const REPO_URL = 'https://github.com/injaeryou/nested-star-lists-for-github';
  const LIST_HREF = /^\/stars\/[^/]+\/lists\/[^/]+$/;

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

  // The column a list page renders into. GitHub swaps its body — repositories, or
  // an empty state when nothing is starred yet — but the column stays, so that is
  // what the rail mounts beside.
  const slug = text => text.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const listColumn = (root = document) => {
    const repos = root?.querySelector('#user-list-repositories');
    if (repos) return repos.parentElement;
    const here = location.pathname.split('/').pop();
    const title = [...(root?.querySelectorAll('h1') || [])].find(h => slug(h.textContent) === here);
    // The title sits two blocks deep in the column (flex row, then the title
    // block); the column itself also holds the back link and the page body.
    return title?.closest('div')?.parentElement?.parentElement || null;
  };

  // Put the box beside the whole list column, in a flex row of our own — that
  // column is a plain block, so there is no existing column to drop into. The
  // entire column moves left (title included) so the box starts at the title,
  // not below it.
  const mountBeside = (box, col) => {
    let wrap = col.querySelector(`:scope > .${MARK}-wrap`);
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

  // GitHub can render into the column after the wrap exists — the empty-state
  // "Nothing starred yet" Box does. Pull any stray sibling into the left cell so
  // the rail keeps its place beside the content.
  const adoptStrays = () => {
    const wrap = document.querySelector(`.${MARK}-wrap`);
    if (!wrap) return;
    const main = wrap.querySelector(`:scope > .${MARK}-main`);
    for (const c of [...wrap.parentElement.children]) if (c !== wrap) main.append(c);
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
    box.dataset[`${MARK}Path`] = location.pathname;
    // A revalidation remount keeps what the reader did: the filter text (below)
    // and an expanded truncation — set before nest() so it never re-folds.
    if (old?.dataset[`${MARK}Expanded`]) box.dataset[`${MARK}Expanded`] = '1';
    const filter = box.querySelector(`.${MARK}-filter`);
    const total = box.querySelector('.Counter');

    if (old) old.replaceWith(box);
    else {
      const col = listColumn();
      if (col) mountBeside(box, col);
      else (document.querySelector('main') || document.body).prepend(box);
    }
    nest(box);                     // same folder tree as the lists page

    // Pill first, total after, the same order as the page heading: the Counter
    // holds the top-level entries, the muted "(n)" every list. While a filter
    // runs, the pill shows its match count instead.
    const count = n => {
      const all = box.querySelector(`.${MARK}-alltotal`);
      if (filter.value.trim()) {
        total.textContent = String(n);
        total.title = `${n} lists match`;
        all.textContent = '';
      } else {
        const top = treeKids(box).length;
        total.textContent = String(top);
        total.title = `${top} top-level entries`;
        all.textContent = `(${data.length})`;
        all.title = `${data.length} lists`;
      }
    };
    filter.addEventListener('input', () => {
      if (filter.value.trim()) expand(box);   // a search must see past the truncation
      filterRail(box, filter.value, count);
    });
    if (query) { filter.value = query; filterRail(box, query, count); }
    else count(data.length);

    // The list you are on is always in view: its folders open, the rail (not the
    // page) scrolled to it.
    const here = box.querySelector(`.${MARK}-current`);
    for (let e = here; e; e = e.parentElement) if (e.tagName === 'DETAILS') e.open = true;
    if (here) box.scrollTop = here.offsetTop - box.clientHeight / 2;
    return box;
  };

  const showTree = async () => {
    const m = location.pathname.match(/^\/stars\/([^/]+)\/lists\/[^/]+$/);
    if (!m) return;
    // A Turbo swap can keep the rail alive across a navigation: same box, wrong
    // page. Mount marks the box with its pathname; a stale mark means remount.
    const cur = document.getElementById('nested-children');
    if (cur?.dataset[`${MARK}Path`] === location.pathname) return;
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
    const all = document.createElement('span');
    all.className = `${MARK}-alltotal`;

    header.append(filter, foldButton(box, true), foldButton(box, false), total, all);

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

  Object.assign(globalThis.__nsl, {
    indexData, railRows, railBox, listColumn, mountBeside, adoptStrays, filterRail, showTree, mountRail,
  });
})();
