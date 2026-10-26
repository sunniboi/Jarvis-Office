/* ===== JARVIS OFFICE v2 — CALENDAR ===== */

function initCalendar(container) {
  let events = JarvisDB.get('cal_events', []);
  let viewDate = new Date();
  let view = 'month'; // month | week | day

  function persist() { JarvisDB.set('cal_events', events); }

  const DOW = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
  const MONTHS = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];

  // ── DOM ──────────────────────────────────────────────────────────────────
  container.innerHTML = `
    <div class="app-chrome cal-app">
      <div class="titlebar">
        <button class="btn-icon back-btn" aria-label="Zurück">${icon('arrowLeft', 18)}</button>
        <span class="app-title">Jarvis Calendar</span>
        <div class="titlebar-actions">
          <button class="btn btn-primary btn-sm" id="cal-new-event">${icon('plus', 15)} Termin</button>
        </div>
      </div>
      <div class="toolbar">
        <div class="toolbar-group">
          <button class="btn btn-ghost btn-sm" id="cal-prev" aria-label="Zurück">${icon('chevronLeft', 15)}</button>
          <button class="btn btn-ghost btn-sm" id="cal-today">Heute</button>
          <button class="btn btn-ghost btn-sm" id="cal-next" aria-label="Weiter">${icon('chevronRight', 15)}</button>
        </div>
        <div class="toolbar-sep"></div>
        <div class="toolbar-group" role="radiogroup" aria-label="Ansicht">
          <button class="btn btn-ghost btn-sm view-btn active" data-view="month">Monat</button>
          <button class="btn btn-ghost btn-sm view-btn" data-view="week">Woche</button>
          <button class="btn btn-ghost btn-sm view-btn" data-view="day">Tag</button>
        </div>
      </div>
      <div class="cal-title-bar" id="cal-title-bar"></div>
      <div class="cal-body" id="cal-body" aria-label="Kalender"></div>
      <div class="statusbar">
        <span id="cal-event-count">0 Termine</span>
      </div>
    </div>
  `;

  const titleBar = container.querySelector('#cal-title-bar');
  const body     = container.querySelector('#cal-body');
  const countEl  = container.querySelector('#cal-event-count');

  // ── Date helpers ──────────────────────────────────────────────────────────
  function isoDate(d) { return d.toISOString().slice(0, 10); }
  function isToday(d) { return isoDate(d) === isoDate(new Date()); }
  function eventsOnDay(dateStr) { return events.filter(e => e.date === dateStr); }

  // ── Render month ──────────────────────────────────────────────────────────
  function renderMonth() {
    const y = viewDate.getFullYear(), m = viewDate.getMonth();
    titleBar.textContent = `${MONTHS[m]} ${y}`;
    body.className = 'cal-body cal-month';

    // day-of-week headers
    let html = '<div class="cal-grid">';
    DOW.forEach(d => { html += `<div class="cal-dow">${d}</div>`; });

    const first = new Date(y, m, 1);
    let dow = (first.getDay() + 6) % 7; // Mon=0
    for (let i = 0; i < dow; i++) html += '<div class="cal-day other"></div>';

    const days = new Date(y, m + 1, 0).getDate();
    for (let d = 1; d <= days; d++) {
      const date = new Date(y, m, d);
      const ds   = isoDate(date);
      const ev   = eventsOnDay(ds);
      const todayCls = isToday(date) ? ' today' : '';
      html += `<div class="cal-day${todayCls}" data-date="${ds}" tabindex="0" role="button" aria-label="${d}. ${MONTHS[m]}">
        <span class="cal-day-num">${d}</span>
        <div class="cal-events-mini">
          ${ev.slice(0, 3).map(e => `<div class="ev-dot" style="background:${e.color||'var(--accent)'}" title="${sanitize(e.title)}">${sanitize(e.title)}</div>`).join('')}
          ${ev.length > 3 ? `<div class="ev-more">+${ev.length - 3}</div>` : ''}
        </div>
      </div>`;
    }
    html += '</div>';
    body.innerHTML = html;
    bindDayClicks();
    updateCount();
  }

  // ── Render week ───────────────────────────────────────────────────────────
  function renderWeek() {
    const dow = (viewDate.getDay() + 6) % 7;
    const monday = new Date(viewDate);
    monday.setDate(viewDate.getDate() - dow);
    titleBar.textContent = `Woche vom ${formatDate(monday)}`;
    body.className = 'cal-body cal-week';

    let html = '<div class="cal-week-grid">';
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday); d.setDate(monday.getDate() + i);
      const ds = isoDate(d);
      const ev = eventsOnDay(ds);
      const todayCls = isToday(d) ? ' today' : '';
      html += `<div class="cal-week-col${todayCls}" data-date="${ds}" tabindex="0" role="button" aria-label="${DOW[i]} ${formatDate(d)}">
        <div class="cal-week-hdr">${DOW[i]}<br><strong>${d.getDate()}</strong></div>
        <div class="cal-week-events">
          ${ev.map(e => `<div class="ev-block" data-id="${e.id}" style="background:${e.color||'var(--accent)'}22;border-left:3px solid ${e.color||'var(--accent)'}">
            <strong>${sanitize(e.title)}</strong>
            ${e.time ? `<br><small>${sanitize(e.time)}</small>` : ''}
          </div>`).join('')}
        </div>
      </div>`;
    }
    html += '</div>';
    body.innerHTML = html;
    bindDayClicks();
    bindEventClicks();
    updateCount();
  }

  // ── Render day ────────────────────────────────────────────────────────────
  function renderDay() {
    const ds = isoDate(viewDate);
    titleBar.textContent = formatDate(viewDate);
    body.className = 'cal-body cal-day-view';
    const ev = eventsOnDay(ds);

    let html = `<div class="cal-day-header${isToday(viewDate) ? ' today' : ''}">
      <span>${formatDate(viewDate)}</span>
      <button class="btn btn-ghost btn-sm" data-date="${ds}" id="add-day-ev">${icon('plus', 14)} Termin</button>
    </div>`;
    if (!ev.length) html += '<div class="cal-no-events">Keine Termine.</div>';
    else ev.forEach(e => {
      html += `<div class="ev-card" data-id="${e.id}" style="border-left:4px solid ${e.color||'var(--accent)'}">
        <div class="ev-card-title">${sanitize(e.title)}</div>
        ${e.time ? `<div class="ev-card-time">${sanitize(e.time)}</div>` : ''}
        ${e.desc ? `<div class="ev-card-desc">${sanitize(e.desc)}</div>` : ''}
        <button class="btn btn-ghost btn-sm ev-edit" data-id="${e.id}" style="margin-top:6px">${icon('settings', 13)} Bearbeiten</button>
        <button class="btn btn-ghost btn-sm ev-del" data-id="${e.id}">${icon('trash', 13)}</button>
      </div>`;
    });
    body.innerHTML = html;
    container.querySelector('#add-day-ev')?.addEventListener('click', () => openEventForm(ds));
    bindEventClicks();
    updateCount();
  }

  // ── Render dispatcher ─────────────────────────────────────────────────────
  function render() {
    if (view === 'month') renderMonth();
    else if (view === 'week') renderWeek();
    else renderDay();
  }

  function bindDayClicks() {
    body.querySelectorAll('[data-date]').forEach(el => {
      el.addEventListener('click', e => {
        if (e.target.closest('.ev-dot, .ev-block')) return;
        openEventForm(el.dataset.date);
      });
      el.addEventListener('keydown', e => { if (e.key === 'Enter') openEventForm(el.dataset.date); });
    });
  }

  function bindEventClicks() {
    body.querySelectorAll('.ev-block, .ev-dot').forEach(el => {
      const id = el.dataset.id || el.closest('[data-id]')?.dataset.id;
      if (id) el.addEventListener('click', e => { e.stopPropagation(); openEventDetail(id); });
    });
    body.querySelectorAll('.ev-edit').forEach(btn => {
      btn.addEventListener('click', () => openEventDetail(btn.dataset.id));
    });
    body.querySelectorAll('.ev-del').forEach(btn => {
      btn.addEventListener('click', () => deleteEvent(btn.dataset.id));
    });
  }

  function updateCount() {
    countEl.textContent = `${events.length} Termin${events.length !== 1 ? 'e' : ''}`;
  }

  // ── Event form ────────────────────────────────────────────────────────────
  function openEventForm(dateStr, existingId = null) {
    const ex = existingId ? events.find(e => e.id === existingId) : null;
    showModal(`
      <h3>${ex ? 'Termin bearbeiten' : 'Neuer Termin'}</h3>
      <div class="form-group"><label>Titel</label><input type="text" id="ev-title" value="${sanitize(ex?.title || '')}" /></div>
      <div class="form-group"><label>Datum</label><input type="date" id="ev-date" value="${ex?.date || dateStr}" /></div>
      <div class="form-group"><label>Uhrzeit</label><input type="time" id="ev-time" value="${ex?.time || ''}" /></div>
      <div class="form-group"><label>Beschreibung</label><textarea id="ev-desc" rows="3">${sanitize(ex?.desc || '')}</textarea></div>
      <div class="form-group">
        <label>Farbe</label>
        <input type="color" id="ev-color" value="${ex?.color || '#7c3aed'}" />
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost btn-cancel">Abbrechen</button>
        ${ex ? `<button class="btn btn-danger btn-del-ev">Löschen</button>` : ''}
        <button class="btn btn-primary btn-ok">${ex ? 'Speichern' : 'Hinzufügen'}</button>
      </div>
    `, (modal) => {
      const title = modal.querySelector('#ev-title').value.trim();
      if (!title) { showNotify('Bitte einen Titel eingeben.', 'warn'); return; }
      const ev = {
        id:    ex?.id || JarvisDB.genId(),
        title,
        date:  modal.querySelector('#ev-date').value || dateStr,
        time:  modal.querySelector('#ev-time').value,
        desc:  modal.querySelector('#ev-desc').value,
        color: modal.querySelector('#ev-color').value,
      };
      if (ex) {
        const idx = events.findIndex(e => e.id === ex.id);
        if (idx !== -1) events[idx] = ev;
      } else {
        events.push(ev);
      }
      persist(); render();
    });
    // delete from form
    setTimeout(() => {
      document.querySelector('.btn-del-ev')?.addEventListener('click', () => {
        if (!confirm('Termin löschen?')) return;
        deleteEvent(existingId);
        document.querySelector('.modal-overlay')?.remove();
      });
    }, 0);
  }

  function openEventDetail(id) { openEventForm(null, id); }

  function deleteEvent(id) {
    events = events.filter(e => e.id !== id);
    persist(); render();
  }

  // ── Nav ───────────────────────────────────────────────────────────────────
  container.querySelector('#cal-prev').addEventListener('click', () => {
    if (view === 'month')  viewDate.setMonth(viewDate.getMonth() - 1);
    else if (view === 'week') viewDate.setDate(viewDate.getDate() - 7);
    else viewDate.setDate(viewDate.getDate() - 1);
    render();
  });
  container.querySelector('#cal-next').addEventListener('click', () => {
    if (view === 'month')  viewDate.setMonth(viewDate.getMonth() + 1);
    else if (view === 'week') viewDate.setDate(viewDate.getDate() + 7);
    else viewDate.setDate(viewDate.getDate() + 1);
    render();
  });
  container.querySelector('#cal-today').addEventListener('click', () => { viewDate = new Date(); render(); });

  container.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      view = btn.dataset.view;
      render();
    });
  });

  container.querySelector('#cal-new-event').addEventListener('click', () => openEventForm(isoDate(viewDate)));
  container.querySelector('.back-btn').addEventListener('click', goHome);

  render();
}
