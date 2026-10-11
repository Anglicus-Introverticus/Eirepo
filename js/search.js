(() => {
  const form = document.querySelector('#catalogue-search-form');
  const resultsNode = document.querySelector('#catalogue-results');
  const statusNode = document.querySelector('#search-status');
  const countNode = document.querySelector('#results-count');
  if (!form || !resultsNode || !statusNode || !countNode) return;

  const params = new URLSearchParams(location.search);
  const fields = ['curriculum', 'type', 'grade', 'subject', 'language', 'year'];
  const normalise = value => String(value ?? '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().trim();
  const typeLabels = {
    book: 'Book', 'past-paper': 'Past paper', notes: 'Notes / self-study',
    extra: 'Extra resource', tool: 'Tool', test: 'Test'
  };
  const curriculumLabels = { CC: 'Current curriculum', PC: 'Previous curriculum', BOTH: 'Both curricula' };

  function valuesFor(resources, key) {
    return [...new Set(resources.map(item => item[key]).filter(value => value !== null && value !== undefined && String(value).trim() !== '').map(String))]
      .sort((a, b) => key === 'grade' || key === 'year' ? Number(a) - Number(b) : a.localeCompare(b));
  }

  function fillOptions(select, values, placeholder) {
    const selected = params.get(select.name) || '';
    select.replaceChildren(new Option(placeholder, ''));
    values.forEach(value => select.add(new Option(value, value)));
    if (values.includes(selected)) select.value = selected;
  }

  function searchableText(item) {
    const references = Array.isArray(item.references) ? item.references : [];
    return normalise([
      item.id, item.title, item.description, item.curriculum,
      curriculumLabels[item.curriculum] || '', item.type, typeLabels[item.type] || '',
      item.grade ? 'grade ' + item.grade : '', item.grade, item.subject, item.language,
      item.year, item.author, item.publisher, item.exam, item.tags,
      references.map(ref => [ref.subject, ref.grade, ref.syllabus, ref.page, ref.note].join(' ')).join(' ')
    ].filter(Boolean).join(' '));
  }

  function matches(item, filters, queryWords) {
    if (filters.curriculum && item.curriculum !== filters.curriculum && item.curriculum !== 'BOTH') return false;
    if (filters.type && normalise(item.type) !== normalise(filters.type)) return false;
    for (const key of ['grade', 'subject', 'language', 'year']) {
      if (filters[key] && normalise(item[key]) !== normalise(filters[key])) return false;
    }
    const haystack = searchableText(item);
    return queryWords.every(word => haystack.includes(word));
  }

  function safeWebUrl(value) {
    if (!value || typeof value !== 'string') return '';
    try {
      const url = new URL(value, location.href);
      return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : '';
    } catch {
      return '';
    }
  }

  function addText(parent, tag, className, value) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    node.textContent = value;
    parent.append(node);
    return node;
  }

  function renderCard(item) {
    const card = document.createElement('article');
    card.className = 'resource-card';
    const meta = document.createElement('div');
    meta.className = 'resource-meta';
    addText(meta, 'span', 'resource-pill', typeLabels[item.type] || item.type || 'Resource');
    addText(meta, 'span', 'resource-pill muted-pill', curriculumLabels[item.curriculum] || item.curriculum || 'Unspecified curriculum');
    card.append(meta);
    addText(card, 'h3', 'resource-title', item.title || 'Untitled resource');

    const details = [item.grade ? 'Grade ' + item.grade : '', item.subject || '', item.language || '', item.year ? String(item.year) : '']
      .filter(Boolean).join(' · ');
    if (details) addText(card, 'p', 'resource-details', details);
    if (item.description) addText(card, 'p', 'resource-description', item.description);
    if (Array.isArray(item.tags) && item.tags.includes('demo')) {
      addText(card, 'p', 'resource-demo-note', 'Demo entry · not a verified official resource');
    }

    const actions = document.createElement('div');
    actions.className = 'resource-actions';
    const downloadUrl = safeWebUrl(item.url);
    const sourceUrl = safeWebUrl(item.sourceUrl);
    if (downloadUrl) {
      const link = addText(actions, 'a', 'resource-link', 'Open resource ↗');
      link.href = downloadUrl; link.target = '_blank'; link.rel = 'noopener noreferrer';
    } else {
      addText(actions, 'span', 'resource-unavailable', 'Resource link not added yet');
    }
    if (sourceUrl && sourceUrl !== downloadUrl) {
      const link = addText(actions, 'a', 'resource-source', 'Source page ↗');
      link.href = sourceUrl; link.target = '_blank'; link.rel = 'noopener noreferrer';
    }
    card.append(actions);
    return card;
  }

  async function init() {
    params.forEach((value, key) => {
      if (key === 'q' && form.elements.q) form.elements.q.value = value;
    });
    try {
      const response = await fetch('../data/resources.json', { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error('Catalogue request failed (' + response.status + ').');
      const resources = await response.json();
      if (!Array.isArray(resources)) throw new Error('The catalogue format is not a resource list.');

      fillOptions(form.elements.grade, valuesFor(resources, 'grade'), 'Any grade');
      fillOptions(form.elements.subject, valuesFor(resources, 'subject'), 'Any subject');
      fillOptions(form.elements.year, valuesFor(resources, 'year'), 'Any year');
      for (const key of fields) {
        const select = form.elements[key];
        const value = params.get(key);
        if (select && value && [...select.options].some(option => option.value === value)) select.value = value;
      }

      const filters = Object.fromEntries(fields.map(key => [key, (params.get(key) || '').trim()]));
      const query = normalise(params.get('q') || '');
      const queryWords = query.split(/\s+/).filter(Boolean);
      const matchesList = resources.filter(item => item && matches(item, filters, queryWords));
      resultsNode.replaceChildren();
      if (matchesList.length) matchesList.forEach(item => resultsNode.append(renderCard(item)));
      else {
        const empty = document.createElement('div');
        empty.className = 'empty-results';
        addText(empty, 'h3', '', 'No matching resources yet');
        addText(empty, 'p', '', 'Try a shorter search, remove a filter, or browse another curriculum. The catalogue is still growing.');
        resultsNode.append(empty);
      }
      countNode.textContent = matchesList.length + (matchesList.length === 1 ? ' result' : ' results');
      statusNode.textContent = 'Showing ' + matchesList.length + ' of ' + resources.length + ' catalogue entries' + (query ? ' for “' + params.get('q') + '”' : '') + '.';
    } catch (error) {
      resultsNode.replaceChildren();
      addText(resultsNode, 'p', 'empty-results', 'The catalogue could not be loaded. Please refresh and try again.');
      statusNode.textContent = error.message || 'Could not load the catalogue.';
      countNode.textContent = '';
    }
  }

  init();
})();