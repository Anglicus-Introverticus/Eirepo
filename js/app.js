(()=> {
  document.querySelectorAll('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });

  const menuButton = document.querySelector('.hamb');
  const nav = document.querySelector('header nav');
  const groups = [...document.querySelectorAll('.navgroup')];
  if (menuButton && nav) {
    menuButton.setAttribute('aria-controls', 'site-navigation');
    menuButton.setAttribute('aria-label', 'Toggle navigation');
    nav.id = nav.id || 'site-navigation';
    menuButton.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      menuButton.setAttribute('aria-expanded', String(open));
    });
  }
  const closeGroups = (except = null) => groups.forEach(group => {
    if (group === except) return;
    group.classList.remove('open');
    group.querySelector(':scope > button')?.setAttribute('aria-expanded', 'false');
  });
  groups.forEach((group, index) => {
    const button = group.querySelector(':scope > button');
    const dropdown = group.querySelector(':scope > .drop');
    if (!button || !dropdown) return;
    dropdown.id = dropdown.id || 'nav-menu-' + index;
    button.setAttribute('aria-controls', dropdown.id);
    button.setAttribute('aria-haspopup', 'true');
    button.setAttribute('aria-expanded', 'false');
    button.addEventListener('click', event => {
      event.stopPropagation();
      const open = !group.classList.contains('open');
      closeGroups(group);
      group.classList.toggle('open', open);
      button.setAttribute('aria-expanded', String(open));
    });
    button.addEventListener('keydown', event => {
      if (event.key === 'ArrowDown') {
        event.preventDefault(); group.classList.add('open');
        button.setAttribute('aria-expanded', 'true'); dropdown.querySelector('a')?.focus();
      }
    });
    dropdown.addEventListener('keydown', event => {
      if (event.key === 'Escape') { group.classList.remove('open'); button.setAttribute('aria-expanded', 'false'); button.focus(); }
    });
  });
  document.addEventListener('click', event => { if (!event.target.closest('.navgroup')) closeGroups(); });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    closeGroups();
    if (nav && menuButton && nav.classList.contains('open')) {
      nav.classList.remove('open'); menuButton.setAttribute('aria-expanded', 'false'); menuButton.focus();
    }
  });

  // Keep the prototype forms usable while the JSON catalogue is still being built.
  const path = location.pathname.toLowerCase();
  const scopedPage = path.includes('/pages/cc/') || path.includes('/pages/pc/');
  const curriculum = path.includes('/cc/') ? 'CC' : path.includes('/pc/') ? 'PC' : '';
  const category = path.includes('past-papers') ? 'past-paper' : path.includes('books') ? 'book' : path.includes('notes') ? 'notes' : '';
  document.querySelectorAll('form.filters, .search form').forEach(form => {
    form.method = 'get';
    if (scopedPage) {
      form.action = '../search.html';
      [['curriculum', curriculum], ['type', category]].forEach(([name, value]) => {
        if (value && !form.querySelector('[name="' + name + '"]')) {
          const hidden = document.createElement('input'); hidden.type = 'hidden'; hidden.name = name; hidden.value = value; form.append(hidden);
        }
      });
    } else if (path.includes('/pages/tools') || path.includes('/pages/tests') || path.includes('/pages/extras')) {
      form.action = '../search.html';
      const type = path.includes('tools') ? 'tool' : path.includes('tests') ? 'test' : 'extra';
      if (!form.querySelector('[name="type"]')) {
        const hidden = document.createElement('input'); hidden.type = 'hidden'; hidden.name = 'type'; hidden.value = type; form.append(hidden);
      }
    }
    const selects = [...form.querySelectorAll('select')];
    const names = ['subject', 'grade', 'type', 'language'];
    selects.forEach((select, i) => {
      if (!select.name) select.name = names[i] || 'filter' + (i + 1);
      select.setAttribute('aria-label', select.getAttribute('aria-label') || select.name.replace(/-/g, ' '));
      [...select.options].forEach(option => { if (!option.value) option.value = option.textContent.trim(); });
    });
    const searchInput = form.querySelector('input[type="search"]');
    if (searchInput && !searchInput.name) searchInput.name = 'q';
    if (!form.querySelector('button[type="submit"], input[type="submit"]')) {
      const submit = document.createElement('button'); submit.type = 'submit'; submit.textContent = 'Search ↗'; form.append(submit);
    }
  });

  const video = document.querySelector('.owl video'), owl = document.querySelector('.owl');
  if (video && owl) {
    const fallback = () => owl.classList.add('failed');
    video.addEventListener('error', fallback); video.addEventListener('abort', fallback);
    video.addEventListener('loadeddata', () => owl.classList.remove('failed'));
    const playback = video.play();
    if (playback && playback.catch) playback.catch(() => { if (video.error) fallback(); });
  }
})();