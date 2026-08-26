// Part of Nested star lists for GitHub. Loaded in manifest order.
(() => {
  const { nest, nestPicker, showTree, loadSettings, listColumn, adoptStrays, harvestIndex } = globalThis.__nsl;

  let seen = '';
  const tick = () => {
    nest();
    nestPicker();
    adoptStrays();
    harvestIndex();
    // Wait for the list column: at document_start there is no body yet, and a
    // cached index would otherwise mount the rail with nothing to mount it beside.
    if (!document.getElementById('nested-children')) seen = '';   // a page swap took it
    if (location.pathname !== seen && listColumn()) {
      seen = location.pathname;
      showTree();
    }
  };

  const start = () => {
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

  window.__nestedStarLists = globalThis.__nsl;   // test hook
})();
