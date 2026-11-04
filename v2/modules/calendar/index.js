import Store from '../../core/store.js';
import { uid, toast, el } from '../../core/utils.js';

const STORAGE_KEY = 'jarvis_events';
const DOW = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const MONTHS = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
const COLORS = ['#7c3aed','#3b82f6','#10b981','#f59e0b','#ec4899','#ef4444'];

function isoDate(d) { return d.toISOString().slice(0, 10); }
function isToday(d) { return isoDate(d) === isoDate(new Date()); }
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

function formatDate(d) {
  return `${d.getDate()}. ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

const ICON_BACK = `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4L6 9l5 5"/></svg>`;
const ICON_PREV = `<svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 3L5 7.5 9 12"/></svg>`;
const ICON_NEXT = `<svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 3l4 4.5L6 12"/></svg>`;
const ICON_PLUS = `<svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M7.5 2v11M2 7.5h11"/></svg>`;

export default {
  id: 'calendar',
  label: 'Calendar',
  color: 'var(--app-calendar)',
  icon: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="4" width="16" height="14" rx="2"/><path d="M6 2v4M14 2v4M2 9h16"/></svg>`,

  _state: null,
  _listeners: [],

  mount(container) {
    let events = Store.get(STORAGE_KEY, []);
    let viewDate = new Date();
    let view = 'month';
    let modalEl = null;
    const listeners = [];

    function persist() { Store.set(STORAGE_KEY, events); }
    function eventsOn(ds) { return events.filter(e => e.date === ds); }

    function on(el, type, fn) {
      el.addEventListener(type, fn);
      listeners.push({ el, type, fn });
    }

    // ── Layout ────────────────────────────────────────────────────────────────
    container.innerHTML = `
      <div class="cal-app" style="display:flex;flex-direction:column;height:100%;background:var(--bg)">
        <div class="titlebar" style="display:flex;align-items:center;gap:8px;height:var(--h-titlebar);padding:0 12px;background:var(--bg-elevated);border-bottom:1px solid var(--border);flex-shrink:0">
          <button id="cal-back" class="btn-icon" aria-label="Zurück" style="background:none;border:none;cursor:pointer;color:var(--text);display:flex;align-items:center;padding:4px">${ICON_BACK}</button>
          <span style="font-size:var(--text-lg);font-weight:600;color:var(--text);flex:1">Jarvis Calendar</span>
          <button id="cal-new" style="display:flex;align-items:center;gap:5px;padding:5px 10px;background:var(--accent);color:var(--on-accent);border:none;border-radius:var(--r-md);cursor:pointer;font-size:var(--text-sm)">${ICON_PLUS} Termin</button>
        </div>
        <div style="display:flex;align-items:center;gap:6px;padding:6px 12px;background:var(--bg-elevated);border-bottom:1px solid var(--border);flex-shrink:0">
          <button id="cal-prev" style="background:none;border:1px solid var(--border);border-radius:var(--r-sm);cursor:pointer;color:var(--text);padding:3px 7px;display:flex;align-items:center">${ICON_PREV}</button>
          <button id="cal-today" style="background:none;border:1px solid var(--border);border-radius:var(--r-sm);cursor:pointer;color:var(--text);padding:3px 10px;font-size:var(--text-sm)">Heute</button>
          <button id="cal-next" style="background:none;border:1px solid var(--border);border-radius:var(--r-sm);cursor:pointer;color:var(--text);padding:3px 7px;display:flex;align-items:center">${ICON_NEXT}</button>
          <span id="cal-title" style="font-size:var(--text-md);color:var(--text);font-weight:500;margin-left:4px"></span>
          <span style="flex:1"></span>
          ${['month','week','day','list'].map(v => `<button class="view-btn" data-view="${v}" style="background:none;border:1px solid var(--border);border-radius:var(--r-sm);cursor:pointer;color:var(--text-muted);padding:3px 10px;font-size:var(--text-sm)">${{month:'Monat',week:'Woche',day:'Tag',list:'Liste'}[v]}</button>`).join('')}
        </div>
        <div style="display:flex;flex:1;overflow:hidden">
          <aside style="width:200px;flex-shrink:0;background:var(--bg-elevated);border-right:1px solid var(--border);overflow-y:auto;padding:12px">
            <div id="mini-cal"></div>
            <div style="margin-top:16px">
              <div style="font-size:var(--text-xs);color:var(--text-faint);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">Farben</div>
              ${COLORS.map(c => `<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px"><span style="width:10px;height:10px;border-radius:50%;background:${c};display:inline-block"></span><span style="font-size:var(--text-xs);color:var(--text-muted)">${c}</span></div>`).join('')}
            </div>
          </aside>
          <main id="cal-body" style="flex:1;overflow:auto;padding:0"></main>
        </div>
        <div style="height:var(--h-statusbar);display:flex;align-items:center;padding:0 12px;background:var(--bg-elevated);border-top:1px solid var(--border);font-size:var(--text-xs);color:var(--text-muted)">
          <span id="cal-count"></span>
        </div>
      </div>
    `;

    const body = container.querySelector('#cal-body');
    const titleEl = container.querySelector('#cal-title');
    const countEl = container.querySelector('#cal-count');

    // ── Mini calendar ─────────────────────────────────────────────────────────
    function renderMini() {
      const mc = container.querySelector('#mini-cal');
      const y = viewDate.getFullYear(), m = viewDate.getMonth();
      let h = `<div style="font-size:var(--text-xs);font-weight:600;color:var(--text);text-align:center;margin-bottom:6px">${MONTHS[m].slice(0,3)} ${y}</div>`;
      h += `<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:1px">`;
      DOW.forEach(d => { h += `<div style="font-size:9px;color:var(--text-faint);text-align:center;padding:2px">${d[0]}</div>`; });
      const first = new Date(y, m, 1);
      let dow = (first.getDay() + 6) % 7;
      for (let i = 0; i < dow; i++) h += '<div></div>';
      const days = new Date(y, m + 1, 0).getDate();
      for (let d = 1; d <= days; d++) {
        const date = new Date(y, m, d);
        const ds = isoDate(date);
        const today = isToday(date);
        const hasEv = eventsOn(ds).length > 0;
        h += `<div class="mini-day" data-date="${ds}" style="font-size:9px;text-align:center;padding:2px;border-radius:3px;cursor:pointer;position:relative;${today ? 'background:var(--accent);color:#fff;' : 'color:var(--text-muted);'}">${d}${hasEv && !today ? '<span style="position:absolute;bottom:1px;left:50%;transform:translateX(-50%);width:3px;height:3px;border-radius:50%;background:var(--accent)"></span>' : ''}</div>`;
      }
      h += '</div>';
      mc.innerHTML = h;
      mc.querySelectorAll('.mini-day').forEach(d => {
        on(d, 'click', () => {
          viewDate = new Date(d.dataset.date + 'T00:00:00');
          view = 'day';
          updateViewBtns();
          render();
        });
      });
    }

    function updateViewBtns() {
      container.querySelectorAll('.view-btn').forEach(b => {
        b.style.color = b.dataset.view === view ? 'var(--text)' : 'var(--text-muted)';
        b.style.borderColor = b.dataset.view === view ? 'var(--accent)' : 'var(--border)';
      });
    }

    // ── Render month ──────────────────────────────────────────────────────────
    function renderMonth() {
      const y = viewDate.getFullYear(), m = viewDate.getMonth();
      titleEl.textContent = `${MONTHS[m]} ${y}`;
      let h = `<div style="display:grid;grid-template-columns:repeat(7,1fr);border-bottom:1px solid var(--border)">`;
      DOW.forEach(d => { h += `<div style="padding:6px;font-size:var(--text-xs);font-weight:600;color:var(--text-faint);text-align:center;border-right:1px solid var(--border)">${d}</div>`; });
      h += '</div><div style="display:grid;grid-template-columns:repeat(7,1fr);flex:1">';
      const first = new Date(y, m, 1);
      let dow = (first.getDay() + 6) % 7;
      for (let i = 0; i < dow; i++) h += `<div style="border-right:1px solid var(--border);border-bottom:1px solid var(--border);min-height:90px;background:var(--bg-sunken)"></div>`;
      const days = new Date(y, m + 1, 0).getDate();
      for (let d = 1; d <= days; d++) {
        const date = new Date(y, m, d);
        const ds = isoDate(date);
        const ev = eventsOn(ds);
        const today = isToday(date);
        h += `<div class="cal-day-cell" data-date="${ds}" style="border-right:1px solid var(--border);border-bottom:1px solid var(--border);min-height:90px;padding:4px;cursor:pointer;${today ? 'background:rgba(124,58,237,.08)' : ''}">
          <span style="display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;font-size:var(--text-xs);font-weight:${today?'700':'400'};${today ? 'background:var(--accent);color:#fff' : 'color:var(--text-muted)'}">${d}</span>
          <div style="margin-top:2px">
            ${ev.slice(0,3).map(e => `<div class="ev-badge" data-id="${e.id}" style="background:${e.color||'var(--accent)'}22;border-left:2px solid ${e.color||'var(--accent)'};padding:1px 4px;border-radius:2px;font-size:9px;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:1px;cursor:pointer">${esc(e.title)}</div>`).join('')}
            ${ev.length > 3 ? `<div style="font-size:9px;color:var(--text-faint)">+${ev.length - 3}</div>` : ''}
          </div>
        </div>`;
      }
      h += '</div>';
      body.innerHTML = `<div style="display:flex;flex-direction:column;min-height:100%">${h}</div>`;
      body.querySelectorAll('.cal-day-cell').forEach(cell => {
        on(cell, 'click', e => {
          if (e.target.closest('.ev-badge')) return;
          openForm(cell.dataset.date);
        });
      });
      body.querySelectorAll('.ev-badge').forEach(badge => {
        on(badge, 'click', e => { e.stopPropagation(); openForm(null, badge.dataset.id); });
      });
    }

    // ── Render week ───────────────────────────────────────────────────────────
    function renderWeek() {
      const dow = (viewDate.getDay() + 6) % 7;
      const monday = new Date(viewDate);
      monday.setDate(viewDate.getDate() - dow);
      titleEl.textContent = `Woche vom ${formatDate(monday)}`;
      let h = `<div style="display:grid;grid-template-columns:50px repeat(7,1fr);position:sticky;top:0;background:var(--bg-elevated);border-bottom:1px solid var(--border);z-index:1">
        <div></div>`;
      for (let i = 0; i < 7; i++) {
        const d = new Date(monday); d.setDate(monday.getDate() + i);
        const today = isToday(d);
        h += `<div style="padding:6px;text-align:center;font-size:var(--text-xs);${today ? 'color:var(--accent);font-weight:700' : 'color:var(--text-muted)'}">
          ${DOW[i]}<br><span style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;${today ? 'background:var(--accent);color:#fff' : ''}">${d.getDate()}</span>
        </div>`;
      }
      h += '</div><div style="display:grid;grid-template-columns:50px repeat(7,1fr)">';
      for (let hour = 0; hour < 24; hour++) {
        const hStr = String(hour).padStart(2,'0') + ':00';
        h += `<div style="font-size:9px;color:var(--text-faint);padding:2px 4px;text-align:right;border-right:1px solid var(--border);border-bottom:1px solid var(--border);height:40px">${hStr}</div>`;
        for (let i = 0; i < 7; i++) {
          const d = new Date(monday); d.setDate(monday.getDate() + i);
          const ds = isoDate(d);
          const ev = eventsOn(ds).filter(e => e.time && parseInt(e.time) === hour);
          h += `<div class="week-slot" data-date="${ds}" data-hour="${hour}" style="border-right:1px solid var(--border);border-bottom:1px solid var(--border);height:40px;padding:1px;cursor:pointer">
            ${ev.map(e => `<div class="ev-week" data-id="${e.id}" style="background:${e.color||'var(--accent)'}33;border-left:2px solid ${e.color||'var(--accent)'};padding:1px 3px;font-size:9px;border-radius:2px;overflow:hidden;cursor:pointer">${esc(e.title)}</div>`).join('')}
          </div>`;
        }
      }
      h += '</div>';
      body.innerHTML = h;
      body.querySelectorAll('.week-slot').forEach(slot => {
        on(slot, 'click', e => {
          if (e.target.closest('.ev-week')) return;
          const h = slot.dataset.hour.padStart(2,'0') + ':00';
          openForm(slot.dataset.date, null, h);
        });
      });
      body.querySelectorAll('.ev-week').forEach(b => {
        on(b, 'click', e => { e.stopPropagation(); openForm(null, b.dataset.id); });
      });
    }

    // ── Render day ────────────────────────────────────────────────────────────
    function renderDay() {
      const ds = isoDate(viewDate);
      titleEl.textContent = formatDate(viewDate);
      let h = `<div style="padding:12px">`;
      for (let hour = 0; hour < 24; hour++) {
        const hStr = String(hour).padStart(2,'0') + ':00';
        const ev = eventsOn(ds).filter(e => e.time && parseInt(e.time) === hour);
        h += `<div style="display:flex;min-height:48px;border-bottom:1px solid var(--border)">
          <div style="width:50px;padding:4px;font-size:9px;color:var(--text-faint);flex-shrink:0">${hStr}</div>
          <div class="day-slot" data-date="${ds}" data-hour="${hour}" style="flex:1;padding:2px;cursor:pointer">
            ${ev.map(e => `<div class="ev-day" data-id="${e.id}" style="background:${e.color||'var(--accent)'}22;border-left:3px solid ${e.color||'var(--accent)'};padding:4px 8px;border-radius:var(--r-sm);margin-bottom:2px;cursor:pointer">
              <div style="font-size:var(--text-sm);font-weight:500;color:var(--text)">${esc(e.title)}</div>
              ${e.location ? `<div style="font-size:var(--text-xs);color:var(--text-muted)">${esc(e.location)}</div>` : ''}
              ${e.desc ? `<div style="font-size:var(--text-xs);color:var(--text-muted)">${esc(e.desc)}</div>` : ''}
            </div>`).join('')}
          </div>
        </div>`;
      }
      h += '</div>';
      body.innerHTML = h;
      body.querySelectorAll('.day-slot').forEach(slot => {
        on(slot, 'click', e => {
          if (e.target.closest('.ev-day')) return;
          const h = slot.dataset.hour.padStart(2,'0') + ':00';
          openForm(slot.dataset.date, null, h);
        });
      });
      body.querySelectorAll('.ev-day').forEach(b => {
        on(b, 'click', e => { e.stopPropagation(); openForm(null, b.dataset.id); });
      });
    }

    // ── Render list ───────────────────────────────────────────────────────────
    function renderList() {
      titleEl.textContent = 'Alle Termine';
      const upcoming = [...events].sort((a, b) => a.date.localeCompare(b.date));
      let h = '<div style="padding:12px">';
      if (!upcoming.length) {
        h += '<div style="color:var(--text-muted);font-size:var(--text-md);padding:32px;text-align:center">Keine Termine vorhanden.</div>';
      } else {
        upcoming.forEach(e => {
          h += `<div class="ev-list-item" data-id="${e.id}" style="display:flex;align-items:center;gap:10px;padding:10px;border-bottom:1px solid var(--border);cursor:pointer;border-radius:var(--r-sm)">
            <div style="width:4px;height:40px;background:${e.color||'var(--accent)'};border-radius:2px;flex-shrink:0"></div>
            <div style="flex:1">
              <div style="font-size:var(--text-md);font-weight:500;color:var(--text)">${esc(e.title)}</div>
              <div style="font-size:var(--text-xs);color:var(--text-muted)">${e.date}${e.time ? ' · ' + e.time : ''}${e.location ? ' · ' + esc(e.location) : ''}</div>
            </div>
          </div>`;
        });
      }
      h += '</div>';
      body.innerHTML = h;
      body.querySelectorAll('.ev-list-item').forEach(item => {
        on(item, 'click', () => openForm(null, item.dataset.id));
      });
    }

    function render() {
      renderMini();
      countEl.textContent = `${events.length} Termin${events.length !== 1 ? 'e' : ''}`;
      if (view === 'month') renderMonth();
      else if (view === 'week') renderWeek();
      else if (view === 'day') renderDay();
      else renderList();
    }

    // ── Event form modal ──────────────────────────────────────────────────────
    function openForm(dateStr, existingId = null, prefillTime = '') {
      const ex = existingId ? events.find(e => e.id === existingId) : null;
      if (modalEl) modalEl.remove();
      modalEl = document.createElement('div');
      modalEl.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;z-index:1000';
      modalEl.innerHTML = `
        <div style="background:var(--bg-elevated);border:1px solid var(--border);border-radius:var(--r-lg);padding:24px;width:380px;max-width:95vw;box-shadow:var(--shadow-lg)">
          <h3 style="margin:0 0 16px;font-size:var(--text-xl);color:var(--text)">${ex ? 'Termin bearbeiten' : 'Neuer Termin'}</h3>
          <div style="margin-bottom:12px"><label style="font-size:var(--text-xs);color:var(--text-muted);display:block;margin-bottom:4px">Titel *</label>
            <input id="ev-title" type="text" value="${esc(ex?.title||'')}" placeholder="Terminbezeichnung" style="width:100%;box-sizing:border-box;background:var(--bg-sunken);border:1px solid var(--border);border-radius:var(--r-sm);padding:7px 10px;color:var(--text);font-size:var(--text-md)"></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
            <div><label style="font-size:var(--text-xs);color:var(--text-muted);display:block;margin-bottom:4px">Datum</label>
              <input id="ev-date" type="date" value="${ex?.date||dateStr||isoDate(new Date())}" style="width:100%;box-sizing:border-box;background:var(--bg-sunken);border:1px solid var(--border);border-radius:var(--r-sm);padding:7px 10px;color:var(--text);font-size:var(--text-sm)"></div>
            <div><label style="font-size:var(--text-xs);color:var(--text-muted);display:block;margin-bottom:4px">Uhrzeit</label>
              <input id="ev-time" type="time" value="${ex?.time||prefillTime||''}" style="width:100%;box-sizing:border-box;background:var(--bg-sunken);border:1px solid var(--border);border-radius:var(--r-sm);padding:7px 10px;color:var(--text);font-size:var(--text-sm)"></div>
          </div>
          <div style="margin-bottom:12px"><label style="font-size:var(--text-xs);color:var(--text-muted);display:block;margin-bottom:4px">Dauer (Minuten)</label>
            <input id="ev-dur" type="number" value="${ex?.duration||60}" min="5" step="5" style="width:100%;box-sizing:border-box;background:var(--bg-sunken);border:1px solid var(--border);border-radius:var(--r-sm);padding:7px 10px;color:var(--text);font-size:var(--text-sm)"></div>
          <div style="margin-bottom:12px"><label style="font-size:var(--text-xs);color:var(--text-muted);display:block;margin-bottom:4px">Ort</label>
            <input id="ev-loc" type="text" value="${esc(ex?.location||'')}" placeholder="Optional" style="width:100%;box-sizing:border-box;background:var(--bg-sunken);border:1px solid var(--border);border-radius:var(--r-sm);padding:7px 10px;color:var(--text);font-size:var(--text-md)"></div>
          <div style="margin-bottom:12px"><label style="font-size:var(--text-xs);color:var(--text-muted);display:block;margin-bottom:4px">Beschreibung</label>
            <textarea id="ev-desc" rows="2" placeholder="Optional" style="width:100%;box-sizing:border-box;background:var(--bg-sunken);border:1px solid var(--border);border-radius:var(--r-sm);padding:7px 10px;color:var(--text);font-size:var(--text-md);resize:vertical">${esc(ex?.desc||'')}</textarea></div>
          <div style="margin-bottom:16px"><label style="font-size:var(--text-xs);color:var(--text-muted);display:block;margin-bottom:6px">Farbe</label>
            <div style="display:flex;gap:8px">
              ${COLORS.map(c => `<button class="color-pick" data-color="${c}" style="width:24px;height:24px;border-radius:50%;background:${c};border:2px solid ${(ex?.color||COLORS[0])===c ? '#fff' : 'transparent'};cursor:pointer"></button>`).join('')}
            </div>
          </div>
          <div style="display:flex;gap:8px;justify-content:flex-end">
            ${ex ? `<button id="ev-del" style="background:var(--danger);color:#fff;border:none;border-radius:var(--r-sm);padding:7px 14px;cursor:pointer;font-size:var(--text-sm)">Löschen</button>` : ''}
            <button id="ev-cancel" style="background:none;border:1px solid var(--border);border-radius:var(--r-sm);padding:7px 14px;cursor:pointer;color:var(--text);font-size:var(--text-sm)">Abbrechen</button>
            <button id="ev-save" style="background:var(--accent);color:#fff;border:none;border-radius:var(--r-sm);padding:7px 14px;cursor:pointer;font-size:var(--text-sm)">${ex ? 'Speichern' : 'Hinzufügen'}</button>
          </div>
        </div>`;

      let selectedColor = ex?.color || COLORS[0];
      modalEl.querySelectorAll('.color-pick').forEach(btn => {
        btn.addEventListener('click', () => {
          selectedColor = btn.dataset.color;
          modalEl.querySelectorAll('.color-pick').forEach(b => b.style.borderColor = 'transparent');
          btn.style.borderColor = '#fff';
        });
      });
      modalEl.querySelector('#ev-cancel').addEventListener('click', () => { modalEl.remove(); modalEl = null; });
      modalEl.querySelector('#ev-del')?.addEventListener('click', () => {
        events = events.filter(e => e.id !== existingId);
        persist(); modalEl.remove(); modalEl = null; render();
      });
      modalEl.querySelector('#ev-save').addEventListener('click', () => {
        const title = modalEl.querySelector('#ev-title').value.trim();
        if (!title) { toast('Bitte einen Titel eingeben.', 'warn'); return; }
        const ev = {
          id: ex?.id || uid(),
          title,
          date: modalEl.querySelector('#ev-date').value || isoDate(new Date()),
          time: modalEl.querySelector('#ev-time').value,
          duration: parseInt(modalEl.querySelector('#ev-dur').value) || 60,
          color: selectedColor,
          location: modalEl.querySelector('#ev-loc').value.trim(),
          desc: modalEl.querySelector('#ev-desc').value.trim(),
        };
        if (ex) {
          const idx = events.findIndex(e => e.id === ex.id);
          if (idx !== -1) events[idx] = ev; else events.push(ev);
        } else {
          events.push(ev);
        }
        persist(); modalEl.remove(); modalEl = null; render();
      });
      modalEl.addEventListener('click', e => { if (e.target === modalEl) { modalEl.remove(); modalEl = null; } });
      document.body.appendChild(modalEl);
      modalEl.querySelector('#ev-title').focus();
    }

    // ── Navigation ────────────────────────────────────────────────────────────
    on(container.querySelector('#cal-back'), 'click', () => window.__jarvis?.showLauncher());
    on(container.querySelector('#cal-prev'), 'click', () => {
      if (view === 'month') viewDate.setMonth(viewDate.getMonth() - 1);
      else if (view === 'week') viewDate.setDate(viewDate.getDate() - 7);
      else viewDate.setDate(viewDate.getDate() - 1);
      render();
    });
    on(container.querySelector('#cal-next'), 'click', () => {
      if (view === 'month') viewDate.setMonth(viewDate.getMonth() + 1);
      else if (view === 'week') viewDate.setDate(viewDate.getDate() + 7);
      else viewDate.setDate(viewDate.getDate() + 1);
      render();
    });
    on(container.querySelector('#cal-today'), 'click', () => { viewDate = new Date(); render(); });
    on(container.querySelector('#cal-new'), 'click', () => openForm(isoDate(viewDate)));

    container.querySelectorAll('.view-btn').forEach(btn => {
      on(btn, 'click', () => { view = btn.dataset.view; updateViewBtns(); render(); });
    });

    updateViewBtns();
    render();

    this._state = { listeners, modalEl: () => modalEl };
  },

  unmount() {
    if (this._state) {
      const { listeners } = this._state;
      listeners.forEach(({ el, type, fn }) => el.removeEventListener(type, fn));
      const modal = document.querySelector('[data-cal-modal]');
      if (modal) modal.remove();
      this._state = null;
    }
  }
};
