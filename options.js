// The popup's own theme: localStorage, not chrome.storage, because the storage
// read is async and the popup would paint light before it lands. It is a
// per-device look, so there is nothing to sync either.
const THEME_KEY = 'theme';
const THEMES = ['system', 'light', 'dark'];
const TITLES = { system: 'follows the system', light: 'light', dark: 'dark' };
const applyTheme = t => {
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
  else delete document.documentElement.dataset.theme;
};
applyTheme(localStorage.getItem(THEME_KEY));

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

const themeButton = document.getElementById('theme');
const showTheme = t => { themeButton.title = `Popup theme: ${TITLES[t]}`; applyTheme(t); };
showTheme(THEMES.includes(localStorage.getItem(THEME_KEY)) ? localStorage.getItem(THEME_KEY) : 'system');
themeButton.addEventListener('click', () => {
  const cur = THEMES.indexOf(localStorage.getItem(THEME_KEY));   // -1 (unset) cycles like system
  const next = THEMES[(Math.max(cur, 0) + 1) % THEMES.length];
  localStorage.setItem(THEME_KEY, next);
  showTheme(next);
});
