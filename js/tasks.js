/* ===== JARVIS OFFICE v2 — TASK OBSERVER ===== */

function initTasks(container) {
  let tasks    = JarvisDB.get('tasks_list', []);
  let projects = JarvisDB.get('tasks_projects', ['Allgemein', 'Arbeit', 'Privat']);
  let filter   = { project: 'all', status: 'all', search: '' };
  let editId   = null;

  if (!tasks.length) {
    tasks = [
      { id: JarvisDB.genId(), title: 'Willkommen bei Task Observer', project: 'Allgemein', priority: 'normal', status: 'open', due: '', note: 'Klick auf + Neue Aufgabe um loszulegen.', created: Date.now() }
    ];
    persist();
  }

  function persist() {
    JarvisDB.set('tasks_list', tasks);
    JarvisDB.set('tasks_projects', projects);
  }

  // ── DOM ──────────────────────────────────────────────────────────────────
  container.innerHTML = `
    <div class="app-chrome tasks-app">
      <div class="titlebar">
        <button class="btn-icon back-btn" aria-label="Zurück">${icon('arrowLeft', 18)}</button>
        <span class="app-title">Task Observer</span>
        <div class="titlebar-actions">
          <button class="btn btn-primary btn-sm" id="tasks-new">${icon('plus', 15)} Neue Aufgabe</button>
        </div>
      </div>

      <div class="tasks-layout">
        <aside class="tasks-sidebar">
          <div class="tasks-filter-section">
            <div class="tasks-filter-label">Status</div>
            <button class="tasks-filter-btn active" data-status="all">Alle</button>
            <button class="tasks-filter-btn" data-status="open">${icon('circle', 13)} Offen</button>
            <button class="tasks-filter-btn" data-status="wip">${icon('clock', 13)} In Arbeit</button>
            <button class="tasks-filter-btn" data-status="done">${icon('check', 13)} Erledigt</button>
          </div>
          <div class="tasks-filter-section">
            <div class="tasks-filter-label">Projekt</div>
            <button class="tasks-filter-btn active" data-project="all">Alle Projekte</button>
            <div id="tasks-project-list"></div>
            <button class="btn btn-ghost btn-xs" id="tasks-add-project" style="margin-top:6px;width:100%">${icon('plus', 12)} Projekt…</button>
          </div>
          <div class="tasks-stats" id="tasks-stats"></div>
        </aside>

        <main class="tasks-main">
          <div class="tasks-toolbar">
            <input type="search" id="tasks-search" placeholder="Aufgaben suchen…" aria-label="Aufgaben durchsuchen" />
            <select id="tasks-sort" aria-label="Sortierung">
              <option value="created">Erstellt</option>
              <option value="due">Fälligkeit</option>
              <option value="priority">Priorität</option>
              <option value="title">Name</option>
            </select>
          </div>
          <div class="tasks-list" id="tasks-list" role="list" aria-label="Aufgaben"></div>
        </main>
      </div>

      <div class="statusbar">
        <span id="tasks-count">0 Aufgaben</span>
        <span id="tasks-status-msg"></span>
      </div>
    </div>
  `;

  const listEl      = container.querySelector('#tasks-list');
  const searchEl    = container.querySelector('#tasks-search');
  const sortEl      = container.querySelector('#tasks-sort');
  const countEl     = container.querySelector('#tasks-count');
  const statusEl    = container.querySelector('#tasks-status-msg');
  const projListEl  = container.querySelector('#tasks-project-list');
  const statsEl     = container.querySelector('#tasks-stats');

  // ── Filter buttons ────────────────────────────────────────────────────────
  container.querySelectorAll('[data-status]').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('[data-status]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filter.status = btn.dataset.status;
      renderList();
    });
  });

  function setProjectFilter(p) {
    filter.project = p;
    container.querySelectorAll('[data-project]').forEach(b => b.classList.toggle('active', b.dataset.project === p));
    projListEl.querySelectorAll('[data-project]').forEach(b => b.classList.toggle('active', b.dataset.project === p));
    renderList();
  }

  container.querySelector('[data-project="all"]').addEventListener('click', () => setProjectFilter('all'));

  function renderProjectList() {
    projListEl.innerHTML = '';
    projects.forEach(p => {
      const btn = document.createElement('button');
      btn.className = 'tasks-filter-btn' + (filter.project === p ? ' active' : '');
      btn.dataset.project = p;
      btn.textContent = p;
      btn.addEventListener('click', () => setProjectFilter(p));
      projListEl.appendChild(btn);
    });
  }

  container.querySelector('#tasks-add-project').addEventListener('click', () => {
    showModal(`
      <h3>Neues Projekt</h3>
      <div class="form-group">
        <label for="proj-name">Projektname</label>
        <input type="text" id="proj-name" placeholder="Projektname…" autocomplete="off" />
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost btn-cancel">Abbrechen</button>
        <button class="btn btn-primary btn-ok">Erstellen</button>
      </div>
    `, (modal) => {
      const name = modal.querySelector('#proj-name').value.trim();
      if (!name || projects.includes(name)) return;
      projects.push(name);
      persist();
      renderProjectList();
    });
  });

  // ── Sort / Filter logic ───────────────────────────────────────────────────
  const PRIORITY_RANK = { high: 0, normal: 1, low: 2 };

  function filtered() {
    const q = filter.search.toLowerCase();
    return tasks.filter(t => {
      if (filter.status  !== 'all' && t.status  !== filter.status)  return false;
      if (filter.project !== 'all' && t.project !== filter.project) return false;
      if (q && !t.title.toLowerCase().includes(q) && !t.note.toLowerCase().includes(q)) return false;
      return true;
    });
  }

  function sorted(list) {
    const by = sortEl.value;
    return [...list].sort((a, b) => {
      if (by === 'priority') return (PRIORITY_RANK[a.priority] ?? 1) - (PRIORITY_RANK[b.priority] ?? 1);
      if (by === 'due') {
        if (!a.due && !b.due) return 0;
        if (!a.due) return 1;
        if (!b.due) return -1;
        return a.due.localeCompare(b.due);
      }
      if (by === 'title') return a.title.localeCompare(b.title, 'de');
      return b.created - a.created;
    });
  }

  // ── Status helpers ────────────────────────────────────────────────────────
  const STATUS_LABEL = { open: 'Offen', wip: 'In Arbeit', done: 'Erledigt' };
  const STATUS_NEXT  = { open: 'wip',   wip: 'done',      done: 'open' };
  const PRIO_LABEL   = { high: 'Hoch',  normal: 'Normal',  low: 'Niedrig' };

  function isOverdue(t) {
    return t.due && t.status !== 'done' && new Date(t.due) < new Date(new Date().toDateString());
  }

  // ── Render list ───────────────────────────────────────────────────────────
  function renderList() {
    const vis = sorted(filtered());
    listEl.innerHTML = '';

    const total = tasks.length;
    const open  = tasks.filter(t => t.status === 'open').length;
    const wip   = tasks.filter(t => t.status === 'wip').length;
    const done  = tasks.filter(t => t.status === 'done').length;

    countEl.textContent = `${vis.length} von ${total} Aufgabe${total !== 1 ? 'n' : ''}`;
    statsEl.innerHTML = `
      <div class="tasks-stat"><span class="tasks-stat-dot open"></span>${open} Offen</div>
      <div class="tasks-stat"><span class="tasks-stat-dot wip"></span>${wip} In Arbeit</div>
      <div class="tasks-stat"><span class="tasks-stat-dot done"></span>${done} Erledigt</div>
    `;

    if (!vis.length) {
      listEl.innerHTML = '<div class="tasks-empty">Keine Aufgaben gefunden.</div>';
      return;
    }

    vis.forEach(t => {
      const overdue = isOverdue(t);
      const div = document.createElement('div');
      div.className = `task-item status-${t.status} prio-${t.priority}${overdue ? ' overdue' : ''}`;
      div.setAttribute('role', 'listitem');
      div.setAttribute('tabindex', '0');

      div.innerHTML = `
        <button class="task-status-btn" data-id="${t.id}" title="Status ändern: ${STATUS_LABEL[STATUS_NEXT[t.status]]}">
          <span class="task-status-dot ${t.status}"></span>
        </button>
        <div class="task-body">
          <div class="task-title${t.status === 'done' ? ' done-strike' : ''}">${sanitize(t.title)}</div>
          <div class="task-meta">
            <span class="task-project">${sanitize(t.project)}</span>
            <span class="task-prio prio-${t.priority}">${PRIO_LABEL[t.priority]}</span>
            ${t.due ? `<span class="task-due${overdue ? ' overdue' : ''}">${icon('calendarIcon', 11)} ${t.due}</span>` : ''}
            ${t.note ? `<span class="task-has-note" title="${sanitize(t.note)}">${icon('eye', 11)}</span>` : ''}
          </div>
        </div>
        <div class="task-actions">
          <button class="btn-icon task-edit-btn" data-id="${t.id}" title="Bearbeiten">${icon('settings', 14)}</button>
          <button class="btn-icon task-delete-btn" data-id="${t.id}" title="Löschen">${icon('trash', 14)}</button>
        </div>
      `;

      div.querySelector('.task-status-btn').addEventListener('click', e => {
        e.stopPropagation();
        cycleStatus(t.id);
      });
      div.querySelector('.task-edit-btn').addEventListener('click', e => {
        e.stopPropagation();
        openEditModal(t.id);
      });
      div.querySelector('.task-delete-btn').addEventListener('click', e => {
        e.stopPropagation();
        deleteTask(t.id);
      });
      div.addEventListener('keydown', e => {
        if (e.key === 'Enter') openEditModal(t.id);
        if (e.key === ' ') { e.preventDefault(); cycleStatus(t.id); }
      });

      listEl.appendChild(div);
    });
  }

  // ── Actions ───────────────────────────────────────────────────────────────
  function cycleStatus(id) {
    const t = tasks.find(t => t.id === id);
    if (!t) return;
    t.status = STATUS_NEXT[t.status];
    persist();
    flash(`Status: ${STATUS_LABEL[t.status]}`);
    renderList();
  }

  function deleteTask(id) {
    if (!confirm('Aufgabe löschen?')) return;
    tasks = tasks.filter(t => t.id !== id);
    persist();
    renderList();
  }

  function flash(msg) {
    statusEl.textContent = msg;
    setTimeout(() => { statusEl.textContent = ''; }, 1800);
  }

  // ── Edit / Create modal ───────────────────────────────────────────────────
  function openEditModal(id) {
    const t = id ? tasks.find(t => t.id === id) : null;
    const isNew = !t;
    const data = t || { title: '', project: projects[0] || 'Allgemein', priority: 'normal', status: 'open', due: '', note: '' };

    const projOptions = projects.map(p => `<option value="${sanitize(p)}"${p === data.project ? ' selected' : ''}>${sanitize(p)}</option>`).join('');

    showModal(`
      <h3>${isNew ? 'Neue Aufgabe' : 'Aufgabe bearbeiten'}</h3>
      <div class="form-group">
        <label for="task-title-in">Titel *</label>
        <input type="text" id="task-title-in" value="${sanitize(data.title)}" placeholder="Aufgabe…" autocomplete="off" />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="task-project-in">Projekt</label>
          <select id="task-project-in">${projOptions}</select>
        </div>
        <div class="form-group">
          <label for="task-prio-in">Priorität</label>
          <select id="task-prio-in">
            <option value="high"${data.priority === 'high' ? ' selected' : ''}>Hoch</option>
            <option value="normal"${data.priority === 'normal' ? ' selected' : ''}>Normal</option>
            <option value="low"${data.priority === 'low' ? ' selected' : ''}>Niedrig</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="task-status-in">Status</label>
          <select id="task-status-in">
            <option value="open"${data.status === 'open' ? ' selected' : ''}>Offen</option>
            <option value="wip"${data.status === 'wip'  ? ' selected' : ''}>In Arbeit</option>
            <option value="done"${data.status === 'done' ? ' selected' : ''}>Erledigt</option>
          </select>
        </div>
        <div class="form-group">
          <label for="task-due-in">Fällig am</label>
          <input type="date" id="task-due-in" value="${data.due || ''}" />
        </div>
      </div>
      <div class="form-group">
        <label for="task-note-in">Notiz</label>
        <textarea id="task-note-in" rows="3" placeholder="Optionale Beschreibung…">${sanitize(data.note)}</textarea>
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost btn-cancel">Abbrechen</button>
        <button class="btn btn-primary btn-ok">${isNew ? 'Erstellen' : 'Speichern'}</button>
      </div>
    `, (modal) => {
      const title = modal.querySelector('#task-title-in').value.trim();
      if (!title) { showNotify('Titel fehlt.', 'warn'); return; }
      const payload = {
        title,
        project:  modal.querySelector('#task-project-in').value,
        priority: modal.querySelector('#task-prio-in').value,
        status:   modal.querySelector('#task-status-in').value,
        due:      modal.querySelector('#task-due-in').value,
        note:     modal.querySelector('#task-note-in').value.trim(),
      };
      if (isNew) {
        tasks.unshift({ id: JarvisDB.genId(), created: Date.now(), ...payload });
        flash('Aufgabe erstellt.');
      } else {
        Object.assign(t, payload);
        flash('Gespeichert.');
      }
      persist();
      renderList();
    });
  }

  // ── Wiring ────────────────────────────────────────────────────────────────
  container.querySelector('#tasks-new').addEventListener('click', () => openEditModal(null));
  searchEl.addEventListener('input', () => { filter.search = searchEl.value; renderList(); });
  sortEl.addEventListener('change', renderList);
  container.querySelector('.back-btn').addEventListener('click', goHome);

  renderProjectList();
  renderList();
}
