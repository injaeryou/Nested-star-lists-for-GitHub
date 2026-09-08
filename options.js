const defaults = { showFullPaths: false, sortMode: 'name', foldersOpen: false, suggestFolders: true };
const paths = document.getElementById('showFullPaths');
const open = document.getElementById('foldersOpen');
const suggest = document.getElementById('suggestFolders');

chrome.storage.sync.get(defaults, v => {
  paths.checked = v.showFullPaths;
  open.checked = v.foldersOpen;
  suggest.checked = v.suggestFolders;
  document.querySelector(`input[name="sortMode"][value="${v.sortMode}"]`).checked = true;
});
paths.addEventListener('change', () => chrome.storage.sync.set({ showFullPaths: paths.checked }));
open.addEventListener('change', () => chrome.storage.sync.set({ foldersOpen: open.checked }));
suggest.addEventListener('change', () => chrome.storage.sync.set({ suggestFolders: suggest.checked }));
for (const r of document.querySelectorAll('input[name="sortMode"]'))
  r.addEventListener('change', () => chrome.storage.sync.set({ sortMode: r.value }));
