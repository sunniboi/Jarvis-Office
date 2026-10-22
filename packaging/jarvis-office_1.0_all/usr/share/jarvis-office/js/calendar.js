// ===== JARVIS CALENDAR =====

function initCalendar(container) {
  let currentDate = new Date();
  let events = JarvisDB.get('calendar_events', []);
  let view = 'month';

  const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
  const MONTHS = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
  const COLORS = ['#7c3aed','#3b82f6','#10b981','#f59e0b','#ef4444','#ec4899','#06b6d4','#f97316'];

  container.innerHTML = `
    <div class="app-titlebar">
      <button class="back-btn" onclick="goHome()">←</button>
      <span class="app-title" style="color:var(--calendar)">📅 Jarvis Calendar</span>
      <div class="titlebar-actions">
        <button class="tb-btn" onclick="calAddEvent()">+ Termin</button>
        <button class="tb-btn" onclick="calExport()">⬇ Export</button>
        <button class="tb-btn" onclick="calImport()">⬆ Import</button>
      </div>
    </div>
    <div class="calendar-layout">
      <div class="calendar-sidebar2">
        <div class="mini-cal" id="mini-cal"></div>
        <div style="border-top:1px solid var(--border);padding-top:12px;">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text3);margin-bottom:10px;">Kalender</div>
          ${['Persönlich','Arbeit','Geburtstage','Feiertage'].map((c,i)=>`<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;cursor:pointer;font-size:13px;"><div style="width:12px;height:12px;border-radius:3px;background:${COLORS[i]};flex-shrink:0;"></div>${c}</div>`).join('')}
          <div style="border-top:1px solid var(--border);margin:12px 0;"></div>
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text3);margin-bottom:10px;">Bevorstehend</div>
          <div id="upcoming-events"></div>
        </div>
      </div>
      <div class="calendar-main">
        <div class="calendar-nav">
          <button class="tb-btn" onclick="calPrev()">← Zurück</button>
          <button class="tb-btn" onclick="calToday()">Heute</button>
          <span class="calendar-title" id="cal-title"></span>
          <button class="tb-btn" onclick="calNext()">Vor →</button>
          <div style="margin-left:auto;display:flex;gap:4px;">
            <button class="tb-btn${view==='month'?' active':''}" onclick="calSetView('month')">Monat</button>
            <button class="tb-btn${view==='week'?' active':''}" onclick="calSetView('week')">Woche</button>
            <button class="tb-btn${view==='day'?' active':''}" onclick="calSetView('day')">Tag</button>
            <button class="tb-btn${view==='list'?' active':''}" onclick="calSetView('list')">Liste</button>
          </div>
        </div>
        <div class="calendar-grid" id="cal-grid"></div>
      </div>
    </div>
    <div class="statusbar">
      <span id="cal-event-count">Termine: ${events.length}</span>
      <span style="margin-left:auto" id="cal-today-date">${formatDate()}</span>
    </div>
  `;

  function renderMiniCal() {
    const mini = document.getElementById('mini-cal');
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const today = new Date();
    let html = `<div class="mini-cal-header">
      <button onclick="calPrev()" style="background:none;border:none;color:var(--text2);cursor:pointer;font-size:16px;">‹</button>
      <span>${MONTHS[d.getMonth()].substring(0,3)} ${d.getFullYear()}</span>
      <button onclick="calNext()" style="background:none;border:none;color:var(--text2);cursor:pointer;font-size:16px;">›</button>
    </div>`;
    html += `<div class="mini-cal-grid">${WEEKDAYS.map(w=>`<div class="mini-day-name">${w}</div>`).join('')}`;
    const firstDay = (d.getDay() + 6) % 7;
    for (let i = 0; i < firstDay; i++) html += '<div></div>';
    const daysInMonth = new Date(d.getFullYear(), d.getMonth()+1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const isToday = day === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
      const hasEvent = events.some(e => { const ed = new Date(e.start); return ed.getDate()===day && ed.getMonth()===d.getMonth() && ed.getFullYear()===d.getFullYear(); });
      html += `<div class="mini-day${isToday?' today':''}" onclick="calJumpTo(${d.getFullYear()},${d.getMonth()},${day})" style="${hasEvent&&!isToday?'color:var(--accent2);font-weight:600':''}">`;
      html += day + '</div>';
    }
    html += '</div>';
    mini.innerHTML = html;
  }

  function renderUpcoming() {
    const el = document.getElementById('upcoming-events');
    const now = new Date();
    const upcoming = events.filter(e => new Date(e.start) >= now).sort((a,b) => new Date(a.start)-new Date(b.start)).slice(0,5);
    el.innerHTML = upcoming.length ? upcoming.map(e => `
      <div style="margin-bottom:8px;cursor:pointer;" onclick="calEditEvent('${e.id}')">
        <div style="display:flex;align-items:center;gap:6px;">
          <div style="width:8px;height:8px;border-radius:50%;background:${e.color||'var(--accent)'};flex-shrink:0;"></div>
          <span style="font-size:12px;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${sanitize(e.title)}</span>
        </div>
        <div style="font-size:10px;color:var(--text3);margin-left:14px;">${new Date(e.start).toLocaleDateString('de-DE',{weekday:'short',day:'2-digit',month:'2-digit'})} ${new Date(e.start).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})}</div>
      </div>
    `).join('') : '<p style="color:var(--text3);font-size:11px">Keine bevorstehenden Termine.</p>';
  }

  function renderMonth() {
    const year = currentDate.getFullYear(), month = currentDate.getMonth();
    document.getElementById('cal-title').textContent = `${MONTHS[month]} ${year}`;
    const grid = document.getElementById('cal-grid');
    const firstDay = (new Date(year, month, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(year, month+1, 0).getDate();
    const today = new Date();

    let html = `<div class="cal-week-header">${WEEKDAYS.map(w=>`<div class="cal-day-name">${w}</div>`).join('')}</div>`;
    html += '<div class="cal-days">';

    // Prev month days
    const prevDays = new Date(year, month, 0).getDate();
    for (let i = firstDay-1; i >= 0; i--) {
      html += `<div class="cal-day other-month"><div class="cal-day-num">${prevDays-i}</div></div>`;
    }

    // Current month
    for (let day = 1; day <= daysInMonth; day++) {
      const isToday = day===today.getDate() && month===today.getMonth() && year===today.getFullYear();
      const dayEvents = events.filter(e => { const d=new Date(e.start); return d.getDate()===day && d.getMonth()===month && d.getFullYear()===year; });
      html += `<div class="cal-day${isToday?' today':''}" onclick="calDayClick(${year},${month},${day})">
        <div class="cal-day-num">${day}</div>
        ${dayEvents.slice(0,3).map(e=>`<div class="cal-event" style="background:${e.color||'var(--accent)'};" onclick="event.stopPropagation();calEditEvent('${e.id}')" title="${sanitize(e.title)}">${new Date(e.start).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})} ${sanitize(e.title)}</div>`).join('')}
        ${dayEvents.length>3?`<div style="font-size:9px;color:var(--text3);padding:1px 4px;">+${dayEvents.length-3} mehr</div>`:''}
      </div>`;
    }

    // Next month
    const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
    for (let i = 1; i <= totalCells - firstDay - daysInMonth; i++) {
      html += `<div class="cal-day other-month"><div class="cal-day-num">${i}</div></div>`;
    }
    html += '</div>';
    grid.innerHTML = html;
  }

  function renderWeek() {
    const year = currentDate.getFullYear(), month = currentDate.getMonth(), day = currentDate.getDate();
    const weekStart = new Date(year, month, day);
    weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
    const days = Array(7).fill(0).map((_, i) => { const d = new Date(weekStart); d.setDate(d.getDate()+i); return d; });
    document.getElementById('cal-title').textContent = `Woche vom ${days[0].toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit'})} – ${days[6].toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'})}`;

    const grid = document.getElementById('cal-grid');
    const today = new Date();
    const HOURS = Array(24).fill(0).map((_,i)=>i);

    let html = `<div style="display:grid;grid-template-columns:50px repeat(7,1fr);gap:0;overflow:auto;height:100%;">`;
    html += '<div style="position:sticky;top:0;background:var(--bg2);z-index:2;"></div>';
    days.forEach(d => {
      const isToday = d.toDateString() === today.toDateString();
      html += `<div style="text-align:center;padding:6px;background:var(--bg2);font-size:11px;color:${isToday?'var(--accent2)':'var(--text2)'};font-weight:${isToday?700:400};border-bottom:1px solid var(--border);">${WEEKDAYS[(d.getDay()+6)%7]}<br/><strong>${d.getDate()}</strong></div>`;
    });

    HOURS.forEach(h => {
      html += `<div style="font-size:10px;color:var(--text3);padding:2px 4px;border-bottom:1px solid var(--border);height:40px;line-height:36px;text-align:right;">${h}:00</div>`;
      days.forEach(d => {
        const dayEvents = events.filter(e => {
          const ed = new Date(e.start);
          return ed.toDateString()===d.toDateString() && ed.getHours()===h;
        });
        html += `<div style="border-bottom:1px solid var(--border);border-left:1px solid var(--border);height:40px;padding:2px;cursor:pointer;position:relative;" onclick="calDayClick(${d.getFullYear()},${d.getMonth()},${d.getDate()},${h})">
          ${dayEvents.map(e=>`<div style="background:${e.color||'var(--accent)'};color:#fff;border-radius:3px;padding:1px 4px;font-size:10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer;" onclick="event.stopPropagation();calEditEvent('${e.id}')">${sanitize(e.title)}</div>`).join('')}
        </div>`;
      });
    });
    html += '</div>';
    grid.innerHTML = html;
  }

  function renderDay() {
    const d = currentDate;
    document.getElementById('cal-title').textContent = d.toLocaleDateString('de-DE',{weekday:'long',day:'2-digit',month:'long',year:'numeric'});
    const grid = document.getElementById('cal-grid');
    const dayEvents = events.filter(e => new Date(e.start).toDateString()===d.toDateString()).sort((a,b)=>new Date(a.start)-new Date(b.start));
    const HOURS = Array(24).fill(0).map((_,i)=>i);

    let html = '<div style="display:grid;grid-template-columns:60px 1fr;overflow:auto;height:100%;">';
    HOURS.forEach(h => {
      const hEvents = dayEvents.filter(e => new Date(e.start).getHours()===h);
      html += `<div style="font-size:11px;color:var(--text3);padding:4px 8px;border-bottom:1px solid var(--border);height:60px;line-height:52px;text-align:right;">${h}:00</div>`;
      html += `<div style="border-bottom:1px solid var(--border);border-left:1px solid var(--border);height:60px;padding:4px;cursor:pointer;" onclick="calDayClick(${d.getFullYear()},${d.getMonth()},${d.getDate()},${h})">
        ${hEvents.map(e=>`<div style="background:${e.color||'var(--accent)'};color:#fff;border-radius:4px;padding:2px 8px;font-size:12px;cursor:pointer;margin-bottom:2px;" onclick="event.stopPropagation();calEditEvent('${e.id}')">${new Date(e.start).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})} ${sanitize(e.title)}</div>`).join('')}
      </div>`;
    });
    html += '</div>';
    grid.innerHTML = html;
  }

  function renderList() {
    document.getElementById('cal-title').textContent = 'Alle Termine';
    const grid = document.getElementById('cal-grid');
    const sorted = [...events].sort((a,b)=>new Date(a.start)-new Date(b.start));
    if (!sorted.length) { grid.innerHTML = '<div style="padding:20px;color:var(--text3);">Keine Termine vorhanden.</div>'; return; }
    let html = '<div style="overflow-y:auto;height:100%;">';
    let lastDay = '';
    sorted.forEach(e => {
      const d = new Date(e.start);
      const day = d.toLocaleDateString('de-DE',{weekday:'long',day:'2-digit',month:'long',year:'numeric'});
      if (day !== lastDay) {
        html += `<div style="padding:8px 16px;background:var(--bg3);font-size:12px;font-weight:700;color:var(--text2);border-bottom:1px solid var(--border);border-top:1px solid var(--border);">${day}</div>`;
        lastDay = day;
      }
      html += `<div style="display:flex;align-items:center;gap:12px;padding:10px 16px;border-bottom:1px solid var(--border);cursor:pointer;" onclick="calEditEvent('${e.id}')">
        <div style="width:12px;height:12px;border-radius:50%;background:${e.color||'var(--accent)'};flex-shrink:0;"></div>
        <div style="flex:1">
          <div style="font-size:13px;font-weight:600">${sanitize(e.title)}</div>
          <div style="font-size:11px;color:var(--text2)">${d.toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})}${e.end?' – '+new Date(e.end).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'}):''} ${e.location?'| '+sanitize(e.location):''}</div>
          ${e.description?`<div style="font-size:11px;color:var(--text3)">${sanitize(e.description)}</div>`:''}
        </div>
        <button onclick="event.stopPropagation();calDeleteEvent('${e.id}')" style="background:none;border:none;color:var(--text3);cursor:pointer;">🗑</button>
      </div>`;
    });
    html += '</div>';
    grid.innerHTML = html;
  }

  function render() {
    $$('.tb-btn').forEach(b => b.classList.remove('active'));
    renderMiniCal();
    renderUpcoming();
    if (view === 'month') { renderMonth(); }
    else if (view === 'week') { renderWeek(); }
    else if (view === 'day') { renderDay(); }
    else if (view === 'list') { renderList(); }
    document.getElementById('cal-event-count').textContent = `Termine: ${events.length}`;
  }

  function saveEvents() { JarvisDB.set('calendar_events', events); }

  function eventForm(opts = {}) {
    const colorOpts = COLORS.map((c,i) => `<option value="${c}"${(opts.color||COLORS[0])===c?' selected':''}>${['Lila','Blau','Grün','Gelb','Rot','Pink','Cyan','Orange'][i]}</option>`).join('');
    return `
      <div class="form-group"><label>Titel *</label><input type="text" id="ev-title" value="${sanitize(opts.title||'')}" placeholder="Terminbezeichnung"/></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <div class="form-group"><label>Start</label><input type="datetime-local" id="ev-start" value="${opts.start ? new Date(opts.start).toISOString().slice(0,16) : new Date().toISOString().slice(0,16)}"/></div>
        <div class="form-group"><label>Ende</label><input type="datetime-local" id="ev-end" value="${opts.end ? new Date(opts.end).toISOString().slice(0,16) : ''}"/></div>
      </div>
      <div class="form-group"><label>Ort</label><input type="text" id="ev-location" value="${sanitize(opts.location||'')}" placeholder="Optional"/></div>
      <div class="form-group"><label>Beschreibung</label><textarea id="ev-desc" style="height:70px">${sanitize(opts.description||'')}</textarea></div>
      <div class="form-group"><label>Farbe</label><select id="ev-color">${colorOpts}</select></div>
      <div class="form-group"><label>Wiederholung</label><select id="ev-repeat"><option value="">Keine</option><option value="daily"${opts.repeat==='daily'?' selected':''}>Täglich</option><option value="weekly"${opts.repeat==='weekly'?' selected':''}>Wöchentlich</option><option value="monthly"${opts.repeat==='monthly'?' selected':''}>Monatlich</option></select></div>
    `;
  }

  window.calAddEvent = (preDate = null) => {
    showModal(`<h3>+ Neuer Termin</h3>${eventForm({ start: preDate })}
      <div class="modal-actions"><button class="btn btn-ghost btn-cancel">Abbrechen</button><button class="btn btn-primary btn-ok">Speichern</button></div>
    `, (modal) => {
      const title = modal.querySelector('#ev-title').value.trim();
      if (!title) return showNotify('Titel ist Pflicht.', 'warn');
      const start = modal.querySelector('#ev-start').value;
      const end = modal.querySelector('#ev-end').value;
      const location = modal.querySelector('#ev-location').value;
      const description = modal.querySelector('#ev-desc').value;
      const color = modal.querySelector('#ev-color').value;
      const repeat = modal.querySelector('#ev-repeat').value;
      events.push({ id: 'ev'+Date.now(), title, start: start || new Date().toISOString(), end: end||null, location, description, color, repeat });
      saveEvents();
      render();
    });
  };

  window.calEditEvent = (id) => {
    const ev = events.find(e => e.id === id);
    if (!ev) return;
    showModal(`<h3>✏ Termin bearbeiten</h3>${eventForm(ev)}
      <div class="modal-actions">
        <button class="btn btn-danger" onclick="calDeleteEvent('${id}');document.querySelector('.modal-overlay')?.remove()">Löschen</button>
        <button class="btn btn-ghost btn-cancel">Abbrechen</button>
        <button class="btn btn-primary btn-ok">Speichern</button>
      </div>
    `, (modal) => {
      const title = modal.querySelector('#ev-title').value.trim();
      if (!title) return showNotify('Titel ist Pflicht.', 'warn');
      ev.title = title;
      ev.start = modal.querySelector('#ev-start').value || ev.start;
      ev.end = modal.querySelector('#ev-end').value || null;
      ev.location = modal.querySelector('#ev-location').value;
      ev.description = modal.querySelector('#ev-desc').value;
      ev.color = modal.querySelector('#ev-color').value;
      ev.repeat = modal.querySelector('#ev-repeat').value;
      saveEvents();
      render();
    });
  };

  window.calDeleteEvent = (id) => {
    events = events.filter(e => e.id !== id);
    saveEvents();
    render();
    showNotify('Termin gelöscht.', 'info');
  };

  window.calDayClick = (y, m, d, h = 9) => {
    const dt = new Date(y, m, d, h, 0);
    calAddEvent(dt.toISOString());
  };

  window.calJumpTo = (y, m, d) => { currentDate = new Date(y, m, d); render(); };
  window.calPrev = () => {
    if (view === 'month') currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth()-1, 1);
    else if (view === 'week') currentDate.setDate(currentDate.getDate()-7);
    else currentDate.setDate(currentDate.getDate()-1);
    render();
  };
  window.calNext = () => {
    if (view === 'month') currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth()+1, 1);
    else if (view === 'week') currentDate.setDate(currentDate.getDate()+7);
    else currentDate.setDate(currentDate.getDate()+1);
    render();
  };
  window.calToday = () => { currentDate = new Date(); render(); };
  window.calSetView = (v) => { view = v; render(); };

  window.calExport = () => {
    let ics = 'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Jarvis Office//Calendar//DE\n';
    events.forEach(e => {
      const toICS = d => d ? new Date(d).toISOString().replace(/[-:]/g,'').split('.')[0]+'Z' : null;
      ics += 'BEGIN:VEVENT\n';
      ics += `DTSTART:${toICS(e.start)}\n`;
      if (e.end) ics += `DTEND:${toICS(e.end)}\n`;
      ics += `SUMMARY:${e.title}\n`;
      if (e.description) ics += `DESCRIPTION:${e.description.replace(/\n/g,'\\n')}\n`;
      if (e.location) ics += `LOCATION:${e.location}\n`;
      ics += `UID:${e.id}@jarvis\nEND:VEVENT\n`;
    });
    ics += 'END:VCALENDAR';
    downloadFile(ics, 'kalender.ics', 'text/calendar');
  };

  window.calImport = () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.ics,.csv';
    input.onchange = e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        const text = ev.target.result;
        let imported = 0;
        if (file.name.endsWith('.ics')) {
          const vevents = text.split('BEGIN:VEVENT').slice(1);
          vevents.forEach(block => {
            const get = (key) => { const m = block.match(new RegExp(key+'[^:]*:(.+)')); return m ? m[1].trim() : ''; };
            const title = get('SUMMARY');
            const start = get('DTSTART');
            if (!title || !start) return;
            const parseICS = s => s ? new Date(s.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/, '$1-$2-$3T$4:$5:$6')).toISOString() : null;
            events.push({ id: 'ev'+Date.now()+imported, title, start: parseICS(start), color: COLORS[imported % COLORS.length] });
            imported++;
          });
        }
        saveEvents();
        render();
        showNotify(`${imported} Termine importiert.`, 'success');
      };
      reader.readAsText(file);
    };
    input.click();
  };

  // Add some sample events
  if (!events.length) {
    const today = new Date();
    events = [
      { id: 'ev1', title: 'Team-Meeting', start: new Date(today.getFullYear(),today.getMonth(),today.getDate(),10,0).toISOString(), end: new Date(today.getFullYear(),today.getMonth(),today.getDate(),11,0).toISOString(), color: '#3b82f6', location: 'Zoom', description: 'Wöchentliches Team-Standup' },
      { id: 'ev2', title: 'Kundengespräch', start: new Date(today.getFullYear(),today.getMonth(),today.getDate()+2,14,30).toISOString(), end: new Date(today.getFullYear(),today.getMonth(),today.getDate()+2,15,30).toISOString(), color: '#10b981', location: 'Büro' },
      { id: 'ev3', title: 'Projektabgabe', start: new Date(today.getFullYear(),today.getMonth(),today.getDate()+5,9,0).toISOString(), color: '#ef4444', description: 'Deadline für Q4-Bericht' },
      { id: 'ev4', title: 'Geburtstag: Max', start: new Date(today.getFullYear(),today.getMonth()+1,15,0,0).toISOString(), color: '#f59e0b' },
    ];
    saveEvents();
  }

  render();
}
