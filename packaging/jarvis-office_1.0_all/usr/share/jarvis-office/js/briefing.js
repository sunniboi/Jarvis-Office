// ===== JARVIS DAILY BRIEFING =====

function initBriefing(container) {
  const today = new Date();
  const dateStr = today.toLocaleDateString('de-DE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const settings = JarvisDB.get('settings', {});
  const name = settings.name || 'Master';

  const tasks = JarvisDB.get('briefing_tasks', []);

  container.innerHTML = `
    <div class="app-window briefing-window">
      <div class="app-toolbar">
        <button class="btn btn-ghost btn-sm" onclick="goHome()">← Zurück</button>
        <span class="toolbar-title">Daily Briefing</span>
      </div>

      <div class="briefing-body">
        <div class="briefing-hero">
          <div class="briefing-date">${dateStr}</div>
          <div class="briefing-greeting">Guten Tag, ${name}.</div>
          <div class="briefing-tagline">Was steht heute an?</div>
        </div>

        <div class="briefing-sections">
          <div class="briefing-card" id="briefing-note-card">
            <div class="briefing-card-header">
              <span class="briefing-card-icon">📝</span>
              <span class="briefing-card-title">Tagesnotiz</span>
            </div>
            <textarea id="briefing-note" class="briefing-note-area" placeholder="Was ist heute wichtig…">${JarvisDB.get('briefing_note_' + todayKey(), '')}</textarea>
            <button class="btn btn-primary btn-sm briefing-save-note" onclick="saveBriefingNote()">Speichern</button>
          </div>

          <div class="briefing-card" id="briefing-tasks-card">
            <div class="briefing-card-header">
              <span class="briefing-card-icon">✅</span>
              <span class="briefing-card-title">Aufgaben heute</span>
            </div>
            <div id="briefing-task-list" class="briefing-task-list"></div>
            <div class="briefing-add-task">
              <input type="text" id="briefing-new-task" class="briefing-task-input" placeholder="Neue Aufgabe…" onkeydown="if(event.key==='Enter') addBriefingTask()" />
              <button class="btn btn-primary btn-sm" onclick="addBriefingTask()">+</button>
            </div>
          </div>

          <div class="briefing-card">
            <div class="briefing-card-header">
              <span class="briefing-card-icon">📊</span>
              <span class="briefing-card-title">Statistik</span>
            </div>
            <div class="briefing-stats" id="briefing-stats"></div>
          </div>
        </div>
      </div>
    </div>
  `;

  renderBriefingTasks();
  renderBriefingStats();
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
}

function saveBriefingNote() {
  const val = document.getElementById('briefing-note').value;
  JarvisDB.set('briefing_note_' + todayKey(), val);
  showNotify('Tagesnotiz gespeichert.', 'success');
}

function addBriefingTask() {
  const input = document.getElementById('briefing-new-task');
  const text = input.value.trim();
  if (!text) return;
  const tasks = JarvisDB.get('briefing_tasks_' + todayKey(), []);
  tasks.push({ id: JarvisDB.genId(), text, done: false });
  JarvisDB.set('briefing_tasks_' + todayKey(), tasks);
  input.value = '';
  renderBriefingTasks();
  renderBriefingStats();
}

function toggleBriefingTask(id) {
  const tasks = JarvisDB.get('briefing_tasks_' + todayKey(), []);
  const t = tasks.find(t => t.id === id);
  if (t) t.done = !t.done;
  JarvisDB.set('briefing_tasks_' + todayKey(), tasks);
  renderBriefingTasks();
  renderBriefingStats();
}

function deleteBriefingTask(id) {
  let tasks = JarvisDB.get('briefing_tasks_' + todayKey(), []);
  tasks = tasks.filter(t => t.id !== id);
  JarvisDB.set('briefing_tasks_' + todayKey(), tasks);
  renderBriefingTasks();
  renderBriefingStats();
}

function renderBriefingTasks() {
  const list = document.getElementById('briefing-task-list');
  if (!list) return;
  const tasks = JarvisDB.get('briefing_tasks_' + todayKey(), []);
  if (tasks.length === 0) {
    list.innerHTML = '<div class="briefing-empty">Noch keine Aufgaben für heute.</div>';
    return;
  }
  list.innerHTML = tasks.map(t => `
    <div class="briefing-task-item ${t.done ? 'done' : ''}">
      <input type="checkbox" class="briefing-task-cb" ${t.done ? 'checked' : ''} onchange="toggleBriefingTask('${t.id}')" />
      <span class="briefing-task-text">${escapeHtml(t.text)}</span>
      <button class="briefing-task-del" onclick="deleteBriefingTask('${t.id}')" title="Löschen">✕</button>
    </div>
  `).join('');
}

function renderBriefingStats() {
  const el = document.getElementById('briefing-stats');
  if (!el) return;
  const tasks = JarvisDB.get('briefing_tasks_' + todayKey(), []);
  const done = tasks.filter(t => t.done).length;
  const total = tasks.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  el.innerHTML = `
    <div class="briefing-stat-row">
      <span>Aufgaben erledigt</span>
      <strong>${done} / ${total}</strong>
    </div>
    <div class="briefing-progress-bar">
      <div class="briefing-progress-fill" style="width:${pct}%"></div>
    </div>
    <div class="briefing-stat-pct">${pct}%</div>
  `;
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
