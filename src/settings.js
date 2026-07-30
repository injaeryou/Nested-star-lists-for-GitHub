// Part of Nested star lists for GitHub. Loaded in manifest order.
(() => {
  const { MARK } = globalThis.__nsl;

  // Applied as an attribute so the stylesheet decides what to show, which means
  // the async storage read can land whenever it likes. localStorage is the
  // fallback for running the files outside an extension, e.g. the test page.
  const PATHS_KEY = 'showFullPaths';
  const SORT_KEY = 'sortMode';
  const OPEN_KEY = 'foldersOpen';
  const applyPaths = on => { document.documentElement.dataset.nslPaths = on ? 'on' : 'off'; };
  const applySort = mode => globalThis.__nsl.setSortMode(mode || 'name');
  const applyOpen = v => globalThis.__nsl.setDefaultOpen(v);
  const loadSettings = () => {
    const store = globalThis.chrome?.storage?.sync;
    if (!store) {
      applyPaths(localStorage.getItem(`${MARK}:${PATHS_KEY}`) === 'true');
      applyOpen(localStorage.getItem(`${MARK}:${OPEN_KEY}`) === 'true');
      return applySort(localStorage.getItem(`${MARK}:${SORT_KEY}`));
    }
    store.get({ [PATHS_KEY]: false, [SORT_KEY]: 'name', [OPEN_KEY]: false }, v => {
      applyPaths(v[PATHS_KEY]);
      applyOpen(v[OPEN_KEY]);
      applySort(v[SORT_KEY]);
    });
    chrome.storage.onChanged.addListener(c => {
      if (c[PATHS_KEY]) applyPaths(c[PATHS_KEY].newValue);
      if (c[SORT_KEY]) applySort(c[SORT_KEY].newValue);
      if (c[OPEN_KEY]) applyOpen(c[OPEN_KEY].newValue);
    });
  };

  Object.assign(globalThis.__nsl, { loadSettings });
})();
