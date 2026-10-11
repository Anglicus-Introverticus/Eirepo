(()=> {
  document.querySelectorAll('[data-year]').forEach(el => {
    el.textContent = new Date().getFullYear();
  });

  const menuButton = document.querySelector('.hamb');
  const nav = document.querySelector('header nav');
  const groups = [...document.querySelectorAll('.navgroup')];

  if (menuButton && nav) {
    menuButton.setAttribute('aria-controls', 'site-navigation');
    nav.id = nav.id || 'site-navigation';
    menuButton.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('open');
      menuButton.setAttribute('aria-expanded', String(isOpen));
    });
  }

  const closeGroups = (except = null) => {
    groups.forEach(group => {
      if (group === except) return;
      group.classList.remove('open');
      const button = group.querySelector(':scope > button');
      if (button) button.setAttribute('aria-expanded', 'false');
    });
  };

  groups.forEach(group => {
    const button = group.querySelector(':scope > button');
    const dropdown = group.querySelector(':scope > .drop');
    if (!button || !dropdown) return;

    const dropdownId = dropdown.id || 'menu-' + Math.random().toString(36).slice(2, 9);
    dropdown.id = dropdownId;
    button.setAttribute('aria-controls', dropdownId);
    button.setAttribute('aria-haspopup', 'true');
    button.setAttribute('aria-expanded', 'false');

    button.addEventListener('click', event => {
      event.stopPropagation();
      const willOpen = !group.classList.contains('open');
      closeGroups(group);
      group.classList.toggle('open', willOpen);
      button.setAttribute('aria-expanded', String(willOpen));
    });

    button.addEventListener('keydown', event => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        group.classList.add('open');
        button.setAttribute('aria-expanded', 'true');
        dropdown.querySelector('a')?.focus();
      }
    });

    dropdown.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        group.classList.remove('open');
        button.setAttribute('aria-expanded', 'false');
        button.focus();
      }
    });
  });

  document.addEventListener('click', event => {
    if (!event.target.closest('.navgroup')) closeGroups();
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      closeGroups();
      if (nav && menuButton && nav.classList.contains('open')) {
        nav.classList.remove('open');
        menuButton.setAttribute('aria-expanded', 'false');
        menuButton.focus();
      }
    }
  });

  const video = document.querySelector('.owl video');
  const owl = document.querySelector('.owl');
  if (video && owl) {
    const showFallback = () => owl.classList.add('failed');
    video.addEventListener('error', showFallback);
    video.addEventListener('abort', showFallback);
    video.addEventListener('loadeddata', () => owl.classList.remove('failed'));
    const playback = video.play();
    if (playback && playback.catch) playback.catch(() => {
      if (video.error) showFallback();
    });
  }
})();