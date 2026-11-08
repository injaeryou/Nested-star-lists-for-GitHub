// Part of Nested star lists for GitHub. Loaded in manifest order.
(() => {
  const { MARK, parts, fullOf, container, folderIcon, FOLDER_CLOSED, panelNames } = globalThis.__nsl;

  // GitHub's create/edit list dialog: its name field offers the folders already
  // in use, so "AI/" is a pick rather than a convention to remember. Three
  // dialogs ask for a name — Catalyst on the stars tab and the feed, React on a
  // repo page — and the placeholder is the one thing all three share.
  const FIELD = 'input[name="user_list[name]"], input[placeholder$="Name this list"]';

  let suggesting = true;

  // The lists are the reader's own, so a star panel on the page — the dialog
  // is opened from one — is the source. Without one (the stars tab's own
  // "Create list" button), the lists on the page are.
  const folders = () => {
    let names = panelNames();
    if (!names.length)
      names = [container(), document.getElementById('nested-children')]
        .flatMap(root => [...root?.querySelectorAll('a[href*="/lists/"]') || []].map(fullOf));
    const paths = new Set();
    for (const n of names) {
      const segs = parts(n);
      for (let i = 1; i < segs.length; i++)
        if (segs.slice(0, i).every(Boolean)) paths.add(segs.slice(0, i).join('/') + '/');
    }
    return [...paths].sort((a, b) => a.localeCompare(b));
  };

  // One menu, moved into whichever dialog is asking: a modal dialog makes
  // everything outside it inert, and a popover inside it still rises to the
  // top layer, so the dialog's scrolling body cannot clip it.
  const menu = document.createElement('ul');
  menu.id = `${MARK}-folders`;
  menu.className = `${MARK}-suggest`;
  menu.setAttribute('role', 'listbox');
  menu.setAttribute('aria-label', 'Folders');
  menu.popover = 'manual';
  let field = null;     // the input the menu is open for
  let active = -1;

  const items = () => [...menu.children];
  const isOpen = () => !!field;

  const close = () => {
    if (!field) return;
    field.removeAttribute('aria-activedescendant');
    field.setAttribute('aria-expanded', 'false');
    field = null;
    active = -1;
    if (menu.matches(':popover-open')) menu.hidePopover();
  };

  const place = () => {
    const r = field.getBoundingClientRect();
    menu.style.left = `${r.left}px`;
    menu.style.top = `${r.bottom + 4}px`;
    menu.style.width = `${r.width}px`;
  };

  const mark = i => {
    active = i;
    items().forEach((li, j) => li.setAttribute('aria-selected', String(j === i)));
    if (i < 0) field.removeAttribute('aria-activedescendant');
    else {
      field.setAttribute('aria-activedescendant', items()[i].id);
      items()[i].scrollIntoView({ block: 'nearest' });
    }
  };

  // What the field still lacks: every folder that starts with what is typed,
  // the folder already typed out in full excluded.
  const open = input => {
    if (!suggesting) return close();
    const q = input.value.toLowerCase();
    const want = folders().filter(f => f.toLowerCase().startsWith(q) && f.toLowerCase() !== q);
    if (!want.length) return close();
    const host = input.closest('dialog, [role="dialog"]') || document.body;
    if (menu.parentElement !== host) {
      if (menu.matches(':popover-open')) menu.hidePopover();
      host.append(menu);
    }
    menu.replaceChildren(...want.map((path, i) => {
      const li = document.createElement('li');
      li.id = `${MARK}-folder-${i}`;
      li.setAttribute('role', 'option');
      li.dataset[MARK + 'Path'] = path;
      const label = document.createElement('span');
      label.textContent = path;      // textContent: names are user input
      li.append(folderIcon('', FOLDER_CLOSED), label);
      return li;
    }));
    field = input;
    input.setAttribute('role', 'combobox');   // or the aria-* below mean nothing
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-controls', menu.id);
    input.setAttribute('aria-expanded', 'true');
    if (!menu.matches(':popover-open')) menu.showPopover();
    place();
    // The dialog may still be animating in when its field takes focus: measure
    // again once it has moved.
    requestAnimationFrame(() => { if (field) place(); });
    mark(-1);
  };

  // React owns the repo page's field: its value only counts if it arrives the
  // way typing does, through the native setter and an input event.
  const pick = path => {
    const input = field;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, path);
    input.dispatchEvent(new Event('input', { bubbles: true }));   // reopens one level down
  };

  const own = e => e.target instanceof HTMLInputElement && e.target.matches(FIELD);
  document.addEventListener('focusin', e => { if (own(e)) open(e.target); });
  document.addEventListener('input', e => { if (own(e)) open(e.target); });
  document.addEventListener('focusout', e => { if (e.target === field) close(); });
  document.addEventListener('scroll', () => { if (field) place(); }, true);
  window.addEventListener('resize', () => { if (field) place(); });

  // Captured on the document, ahead of the dialog's own handlers: Enter would
  // submit the form and Escape would close the whole dialog. Keys that finish
  // an IME composition (Hangul, kana) belong to the composition.
  document.addEventListener('keydown', e => {
    if (!own(e) || e.isComposing) return;
    const n = items().length;
    if (e.key === 'ArrowDown' && !isOpen()) { open(e.target); return e.preventDefault(); }
    if (!isOpen()) return;
    if (e.key === 'ArrowDown') mark((active + 1) % n);
    else if (e.key === 'ArrowUp') mark(active <= 0 ? n - 1 : active - 1);
    else if (e.key === 'Enter' && active >= 0) pick(items()[active].dataset[MARK + 'Path']);
    else if (e.key === 'Escape') close();
    else return;
    e.preventDefault();
    e.stopImmediatePropagation();
  }, true);

  // A press would take focus off the field and close the menu before the click.
  menu.addEventListener('mousedown', e => e.preventDefault());
  menu.addEventListener('click', e => {
    const li = e.target.closest('li');
    if (li) pick(li.dataset[MARK + 'Path']);
  });
  menu.addEventListener('mousemove', e => {
    const i = items().indexOf(e.target.closest('li'));
    if (i >= 0 && i !== active) mark(i);
  });

  const setSuggest = v => { suggesting = !!v; if (!suggesting) close(); };

  Object.assign(globalThis.__nsl, { setSuggest });
})();
