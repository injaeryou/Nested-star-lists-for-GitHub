// Part of Nested star lists for GitHub. Loaded in manifest order.
(() => {
  const { MARK } = globalThis.__nsl;

  // Applied as an attribute so the stylesheet decides what to show, which means
  // the async storage read can land whenever it likes. localStorage is the
  // fallback for running the files outside an extension, e.g. the test page.
  const PATHS_KEY = 'showFullPaths';
  const SORT_KEY = 'sortMode';
  const OPEN_KEY = 'foldersOpen';
  const SUGGEST_KEY = 'suggestFolders';
  // Fold memory is per device — a click per write would also run into
  // storage.sync's write quota — so it lives in storage.local.
  const FOLDS_KEY = 'foldState';
  const applyPaths = on => { document.documentElement.dataset.nslPaths = on ? 'on' : 'off'; };
  const applySort = mode => globalThis.__nsl.setSortMode(mode || 'name');
  const applyOpen = v => globalThis.__nsl.setDefaultOpen(v);
  const applySuggest = v => globalThis.__nsl.setSuggest(v);
  const loadSettings = () => {
    const { setFolds, onSaveFolds } = globalThis.__nsl;
    const store = globalThis.chrome?.storage?.sync;
    if (!store) {
      applyPaths(localStorage.getItem(`${MARK}:${PATHS_KEY}`) === 'true');
      applyOpen(localStorage.getItem(`${MARK}:${OPEN_KEY}`) === 'true');
      applySuggest(localStorage.getItem(`${MARK}:${SUGGEST_KEY}`) !== 'false');
      onSaveFolds(f => localStorage.setItem(`${MARK}:${FOLDS_KEY}`, JSON.stringify(f)));
      setFolds(JSON.parse(localStorage.getItem(`${MARK}:${FOLDS_KEY}`) || '{}'));
      return applySort(localStorage.getItem(`${MARK}:${SORT_KEY}`));
    }
    store.get({ [PATHS_KEY]: false, [SORT_KEY]: 'name', [OPEN_KEY]: false, [SUGGEST_KEY]: true }, v => {
      applyPaths(v[PATHS_KEY]);
      applyOpen(v[OPEN_KEY]);
      applySuggest(v[SUGGEST_KEY]);
      applySort(v[SORT_KEY]);
    });
    onSaveFolds(f => chrome.storage.local.set({ [FOLDS_KEY]: f }));
    chrome.storage.local.get({ [FOLDS_KEY]: {} }, v => setFolds(v[FOLDS_KEY]));
    chrome.storage.onChanged.addListener((c, area) => {
      if (c[PATHS_KEY]) applyPaths(c[PATHS_KEY].newValue);
      if (c[SORT_KEY]) applySort(c[SORT_KEY].newValue);
      if (c[SUGGEST_KEY]) applySuggest(c[SUGGEST_KEY].newValue);
      // A new default should be visible, so it wipes the folds made by hand.
      if (c[OPEN_KEY]) { setFolds({}); applyOpen(c[OPEN_KEY].newValue); chrome.storage.local.remove(FOLDS_KEY); }
      // Another tab's folds — and this tab's own write, which lands as a no-op.
      if (area === 'local' && c[FOLDS_KEY]) setFolds(c[FOLDS_KEY].newValue || {});
    });
  };

  Object.assign(globalThis.__nsl, { loadSettings });
})();
