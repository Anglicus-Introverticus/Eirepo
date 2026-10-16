(() => {
  const form = document.querySelector('#catalogue-search-form');
  const resultsNode = document.querySelector('#catalogue-results');
  const statusNode = document.querySelector('#search-status');
  const countNode = document.querySelector('#results-count');
  if (!form || !resultsNode || !statusNode || !countNode) return;

  const params = new URLSearchParams(location.search);
  const fields = ['curriculum', 'type', 'grade', 'subject', 'language', 'year', 'subtype'];
  const normalise = value => String(value ?? '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().trim();
  const typeLabels = {
    book: 'Book', 'past-paper': 'Past paper', notes: 'Notes / self-study',
    extra: 'Extra resource', tool: 'Tool', test: 'Test'
  };
  const curriculumLabels = { CC: 'Current curriculum', PC: 'Previous curriculum', BOTH: 'Both curricula' };

  const inventorySheetId = '1uNcoLBXMbVNtMzqq-dM7nPHbi-YVUxiCDJOvt8EauY8';

  function titleFromFilename(filename) {
    return String(filename || '').replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ')
      .replace(/\bnew syllabus\b/ig, '').replace(/\s+/g, ' ').trim()
      .replace(/\b(part) (i|ii|iii|iv)\b/ig, (_, part, roman) => part + ' ' + roman.toUpperCase())
      .replace(/\b([a-z])([a-z]+)\b/gi, word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
  }

  function inferSubject(filename) {
    const f = String(filename || '').toLowerCase().replace(/[_-]+/g, ' ');
    const subjects = [
      ['English Literature', /english literature|literature in english/],
      ['Mathematics', /mathematics|maths|math/],
      ['Science', /science/], ['Sinhala', /sinhala/], ['Tamil', /tamil/],
      ['English', /english/], ['History', /history/], ['Geography', /geography/],
      ['Buddhism', /buddhism|buddhist/], ['Christianity', /christianity|christian/],
      ['Catholicism', /catholic/], ['Islam', /islam|islamic/],
      ['Hinduism', /hinduism|hindu/], ['Civic Education', /civic/],
      ['Health and Physical Education', /health|physical education/],
      ['Practical and Technical Skills', /practical|technical skills/],
      ['Information and Communication Technology', /information.*technology|\bict\b/],
      ['Commerce', /commerce/], ['Business Studies', /business studies/],
      ['Agriculture', /agriculture/], ['Art', /art/], ['Music', /music/],
      ['Dancing', /dancing|dance/], ['Drama and Theatre', /drama|theatre/],
      ['Pali', /pali/], ['Arabic', /arabic/], ['French', /french/],
      ['Japanese', /japanese/], ['German', /german/], ['Russian', /russian/],
      ['Korean', /korean/], ['Chinese', /chinese/], ['Spanish', /spanish/],
      ['Entrepreneurship Studies', /entrepreneurship/], ['Economics', /economics/],
      ['Media Studies', /media studies/], ['Design and Technology', /design.*technology/]
    ];
    return (subjects.find(([_, pattern]) => pattern.test(f)) || [null])[0] || 'Other / check title';
  }

  function loadDriveInventory() {
    return new Promise((resolve, reject) => {
      const callbackName = '__eirepoInventoryResponse';
      const script = document.createElement('script');
      let settled = false;
      const finish = (fn, value) => {
        if (settled) return;
        settled = true;
        delete window[callbackName];
        script.remove();
        fn(value);
      };
      window[callbackName] = payload => {
        const rows = payload && payload.table && Array.isArray(payload.table.rows) ? payload.table.rows : [];
        if (!rows.length) return finish(reject, new Error('The Drive inventory returned no rows.'));
        const records = rows.map((row, index) => {
          const cells = (row.c || []).map(cell => cell && cell.v != null ? String(cell.v) : '');
          const folder = cells[0] || '';
          const filename = cells[1] || '';
          const fileType = cells[2] || '';
          const size = Number(cells[3]) || 0;
          const driveUrl = cells[4] || '';
          const gradeMatch = folder.match(/\bGr(\d+)\b/i);
          const mediumMatch = folder.match(/\b(EM|SM|TM)gr\d+\b/i);
          const language = mediumMatch ? ({ EM: 'English', SM: 'Sinhala', TM: 'Tamil' }[mediumMatch[1].toUpperCase()]) : '';
          const grade = gradeMatch ? gradeMatch[1] : '';
          const title = titleFromFilename(filename);
          const subject = inferSubject(filename);
          const partMatch = title.match(/\bPart (I|II|III|IV)\b/i);
          return {
            id: 'lk-book-' + String(index + 1).padStart(3, '0'),
            title: (grade ? 'Grade ' + grade + ' ' : '') + title,
            description: 'Sri Lankan school textbook from the EIRepo shared Drive inventory. PDF file. ' + (size ? 'File size: ' + size.toFixed(2) + ' MB.' : ''),
            curriculum: 'CC', type: 'book', format: 'Textbook PDF',
            grade, subject, language, year: null,
            tags: ['textbook', 'drive-inventory', 'grade-' + grade, 'medium-' + (mediumMatch ? mediumMatch[1].toLowerCase() : 'unknown'), fileType],
            url: driveUrl, sourceUrl: driveUrl, filename, folderPath: folder, fileSizeMB: size,
            inventoryStatus: 'Imported from shared textbook inventory'
          };
        }).filter(item => item.filename && item.url);
        finish(resolve, records);
      };
      script.onerror = () => finish(reject, new Error('Could not load the shared textbook inventory.'));
      script.src = 'https://docs.google.com/spreadsheets/d/' + inventorySheetId +
        '/gviz/tq?tqx=out:json;responseHandler=' + callbackName + '&sheet=Sheet1';
      document.head.append(script);
    });
  }

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
    if (filters.subtype) {
      const categories = [item.subtype, item.category, item.format, item.tags, item.type].filter(Boolean).flat().map(normalise);
      if (!categories.some(value => value === normalise(filters.subtype) || value.includes(normalise(filters.subtype)))) return false;
    }
    const haystack = searchableText(item);
    return queryWords.every(word => haystack.includes(word));
  }

  function safeWebUrl(value) {
    if (!value || typeof value !== 'string') return '';
    try {
      const root = new URL('../', location.href);
      const url = new URL(value, root);
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
      const baseResources = await response.json();
      if (!Array.isArray(baseResources)) throw new Error('The catalogue format is not a resource list.');
      let inventoryResources = [];
      try {
        inventoryResources = await loadDriveInventory();
      } catch (inventoryError) {
        console.warn('EIRepo Drive inventory unavailable; showing the local catalogue only.', inventoryError);
      }
      const resources = [...inventoryResources, ...baseResources.filter(item => !(item && item.tags && item.tags.includes('demo')))];


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
      const queryWords = query.split(/\s+/).filter(Boolean).map(word => ({ maths: 'mathematics', math: 'mathematics' }[word] || word));
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
      statusNode.textContent = 'Showing ' + matchesList.length + ' of ' + resources.length + ' catalogue entries' + (inventoryResources.length ? ' (including ' + inventoryResources.length + ' textbooks)' : '') + (query ? ' for “' + params.get('q') + '”' : '') + '.';
    } catch (error) {
      resultsNode.replaceChildren();
      addText(resultsNode, 'p', 'empty-results', 'The catalogue could not be loaded. Please refresh and try again.');
      statusNode.textContent = error.message || 'Could not load the catalogue.';
      countNode.textContent = '';
    }
  }

  init();
})();