import Store from '../../core/store.js';
import { uid, toast } from '../../core/utils.js';

const STORAGE_KEY = 'jarvis_mails';
const ICON_BACK = `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4L6 9l5 5"/></svg>`;
const ICON_COMPOSE = `<svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M2 10L10 2l3 3L5 13H2v-3z"/></svg>`;
const ICON_REPLY = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M5 3L1 7l4 4M1 7h9a3 3 0 010 6H8"/></svg>`;
const ICON_FWD = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M9 3l4 4-4 4M13 7H4a3 3 0 100 6h2"/></svg>`;
const ICON_TRASH = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M2 4h10M5 4V2h4v2M6 7v4M8 7v4M3 4l1 8h6l1-8"/></svg>`;
const ICON_STAR = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M7 1l1.8 3.6L13 5.3l-3 2.9.7 4.1L7 10.4 3.3 12.3 4 8.2 1 5.3l4.2-.7z"/></svg>`;
const ICON_SPAM = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="7" cy="7" r="6"/><path d="M7 4v4M7 9.5v.5"/></svg>`;

const DEMO_MAILS = [
  { id: uid(), from: 'jarvis@office.local', to: 'ich@lokal', subject: 'Willkommen bei Jarvis Mail', body: 'Hallo!\n\nDas ist dein lokaler Mail-Client. Alle Nachrichten bleiben auf diesem Gerät gespeichert — nichts wird nach draußen gesendet.\n\nViel Spaß!', date: new Date().toISOString(), read: false, starred: false, spam: false },
  { id: uid(), from: 'noreply@example.com', to: 'ich@lokal', subject: 'Deine erste Nachricht', body: 'Jarvis Mail ist ein Offline-Demo-Client.\n\nDu kannst Nachrichten verfassen, beantworten, weiterleiten und in den Papierkorb verschieben.', date: new Date(Date.now() - 3600000).toISOString(), read: false, starred: true, spam: false },
  { id: uid(), from: 'info@jarvisoffice.local', to: 'ich@lokal', subject: 'Tipps für den Start', body: 'Klicke auf "Neue Mail", um eine Nachricht zu verfassen.\n\nSterne markieren wichtige Mails. Spam-Mails landen in einem separaten Ordner.', date: new Date(Date.now() - 7200000).toISOString(), read: true, starred: false, spam: false },
];

function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function formatDate(d) {
  const date = new Date(d);
  return date.toLocaleDateString('de-DE', { day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit' });
}
function preview(body, len = 60) { return body.replace(/\n/g, ' ').slice(0, len) + (body.length > len ? '…' : ''); }

export default {
  id: 'mail',
  label: 'Mail',
  color: 'var(--app-mail)',
  icon: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="4" width="16" height="12" rx="2"/><path d="M2 7l8 5 8-5"/></svg>`,

  _state: null,

  mount(container) {
    // Load or seed data
    let data = Store.get(STORAGE_KEY);
    if (!data) {
      data = { inbox: [...DEMO_MAILS], sent: [], drafts: [], starred: [], trash: [], spam: [] };
      Store.set(STORAGE_KEY, data);
    }

    let currentFolder = 'inbox';
    let selectedId = null;
    let searchQuery = '';
    let modalEl = null;
    const listeners = [];

    function persist() { Store.set(STORAGE_KEY, data); }
    function on(el, type, fn) { el.addEventListener(type, fn); listeners.push({ el, type, fn }); }

    function allMails() {
      return Object.values(data).flat();
    }

    // ── Layout ────────────────────────────────────────────────────────────────
    container.innerHTML = `
      <div style="display:flex;flex-direction:column;height:100%;background:var(--bg)">
        <div style="display:flex;align-items:center;gap:8px;height:var(--h-titlebar);padding:0 12px;background:var(--bg-elevated);border-bottom:1px solid var(--border);flex-shrink:0">
          <button id="mail-back" style="background:none;border:none;cursor:pointer;color:var(--text);display:flex;align-items:center;padding:4px">${ICON_BACK}</button>
          <span style="font-size:var(--text-lg);font-weight:600;color:var(--text);flex:1">Jarvis Mail</span>
          <input id="mail-search" type="search" placeholder="Suchen…" style="background:var(--bg-sunken);border:1px solid var(--border);border-radius:var(--r-md);padding:5px 10px;color:var(--text);font-size:var(--text-sm);width:180px">
          <button id="mail-compose" style="display:flex;align-items:center;gap:5px;padding:5px 10px;background:var(--accent);color:#fff;border:none;border-radius:var(--r-md);cursor:pointer;font-size:var(--text-sm)">${ICON_COMPOSE} Neue Mail</button>
        </div>
        <div style="display:flex;flex:1;overflow:hidden">
          <nav id="mail-folders" style="width:160px;flex-shrink:0;background:var(--bg-elevated);border-right:1px solid var(--border);overflow-y:auto;padding:8px 0"></nav>
          <div id="mail-list" style="width:280px;flex-shrink:0;border-right:1px solid var(--border);overflow-y:auto;background:var(--bg)"></div>
          <div id="mail-viewer" style="flex:1;overflow-y:auto;background:var(--bg)"></div>
        </div>
        <div style="height:var(--h-statusbar);display:flex;align-items:center;padding:0 12px;background:var(--bg-elevated);border-top:1px solid var(--border);font-size:var(--text-xs);color:var(--text-muted)">
          <span id="mail-status"></span>
        </div>
      </div>
    `;

    const foldersEl = container.querySelector('#mail-folders');
    const listEl = container.querySelector('#mail-list');
    const viewerEl = container.querySelector('#mail-viewer');
    const statusEl = container.querySelector('#mail-status');

    // ── Folders ───────────────────────────────────────────────────────────────
    const FOLDER_DEF = [
      { id: 'inbox',   label: 'Eingang'  },
      { id: 'sent',    label: 'Gesendet' },
      { id: 'drafts',  label: 'Entwürfe' },
      { id: 'starred', label: 'Markiert' },
      { id: 'spam',    label: 'Spam'     },
      { id: 'trash',   label: 'Papierkorb' },
    ];

    function renderFolders() {
      foldersEl.innerHTML = FOLDER_DEF.map(f => {
        const mails = data[f.id] || [];
        const unread = mails.filter(m => !m.read).length;
        const active = f.id === currentFolder;
        return `<button class="folder-btn" data-folder="${f.id}" style="display:flex;align-items:center;justify-content:space-between;width:100%;padding:8px 12px;background:${active ? 'rgba(124,58,237,.15)' : 'none'};border:none;border-left:2px solid ${active ? 'var(--accent)' : 'transparent'};cursor:pointer;color:${active ? 'var(--accent)' : 'var(--text-muted)'};font-size:var(--text-sm);text-align:left">
          <span>${f.label}</span>
          ${unread ? `<span style="background:var(--accent);color:#fff;border-radius:var(--r-full);padding:1px 6px;font-size:9px">${unread}</span>` : ''}
        </button>`;
      }).join('');
      foldersEl.querySelectorAll('.folder-btn').forEach(btn => {
        on(btn, 'click', () => {
          currentFolder = btn.dataset.folder;
          selectedId = null;
          searchQuery = '';
          container.querySelector('#mail-search').value = '';
          viewerEl.innerHTML = '';
          renderFolders();
          renderList();
        });
      });
    }

    // ── Mail list ─────────────────────────────────────────────────────────────
    function getVisible() {
      let mails = data[currentFolder] || [];
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        mails = allMails().filter(m =>
          m.subject?.toLowerCase().includes(q) ||
          m.body?.toLowerCase().includes(q) ||
          m.from?.toLowerCase().includes(q)
        );
      }
      return [...mails].sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    function renderList() {
      const mails = getVisible();
      statusEl.textContent = `${mails.length} Nachricht${mails.length !== 1 ? 'en' : ''}`;
      if (!mails.length) {
        listEl.innerHTML = '<div style="padding:24px;text-align:center;color:var(--text-muted);font-size:var(--text-sm)">Keine Nachrichten.</div>';
        return;
      }
      listEl.innerHTML = mails.map(m => `
        <div class="mail-item" data-id="${m.id}" style="padding:10px 12px;border-bottom:1px solid var(--border);cursor:pointer;background:${m.id === selectedId ? 'rgba(124,58,237,.12)' : 'none'};border-left:2px solid ${m.id === selectedId ? 'var(--accent)' : 'transparent'}">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
            ${!m.read ? '<span style="width:7px;height:7px;border-radius:50%;background:var(--accent);flex-shrink:0"></span>' : '<span style="width:7px"></span>'}
            <span style="font-size:var(--text-sm);font-weight:${m.read ? '400' : '600'};color:var(--text);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(m.from)}</span>
            <span style="font-size:9px;color:var(--text-faint);flex-shrink:0">${formatDate(m.date)}</span>
          </div>
          <div style="font-size:var(--text-sm);color:${m.read ? 'var(--text-muted)' : 'var(--text)'};font-weight:${m.read ? '400' : '500'};overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(m.subject)}</div>
          <div style="font-size:var(--text-xs);color:var(--text-faint);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(preview(m.body))}</div>
        </div>`).join('');
      listEl.querySelectorAll('.mail-item').forEach(item => {
        on(item, 'click', () => openMail(item.dataset.id));
      });
    }

    // ── Mail viewer ───────────────────────────────────────────────────────────
    function findMail(id) {
      for (const folder of Object.values(data)) {
        const m = folder.find(m => m.id === id);
        if (m) return m;
      }
      return null;
    }

    function openMail(id) {
      selectedId = id;
      const m = findMail(id);
      if (!m) return;
      m.read = true;
      persist();
      renderFolders();
      renderList();

      const isStarred = m.starred;
      viewerEl.innerHTML = `
        <div style="padding:20px">
          <div style="margin-bottom:16px">
            <div style="font-size:var(--text-xl);font-weight:600;color:var(--text);margin-bottom:10px">${esc(m.subject)}</div>
            <div style="display:flex;flex-direction:column;gap:3px;font-size:var(--text-sm);color:var(--text-muted)">
              <div>Von: <span style="color:var(--text)">${esc(m.from)}</span></div>
              <div>An: <span style="color:var(--text)">${esc(m.to)}</span></div>
              <div>Datum: <span style="color:var(--text)">${formatDate(m.date)}</span></div>
            </div>
          </div>
          <div style="display:flex;gap:6px;margin-bottom:20px;flex-wrap:wrap">
            <button id="v-reply" style="display:flex;align-items:center;gap:4px;padding:5px 10px;background:none;border:1px solid var(--border);border-radius:var(--r-sm);cursor:pointer;color:var(--text);font-size:var(--text-sm)">${ICON_REPLY} Antworten</button>
            <button id="v-fwd" style="display:flex;align-items:center;gap:4px;padding:5px 10px;background:none;border:1px solid var(--border);border-radius:var(--r-sm);cursor:pointer;color:var(--text);font-size:var(--text-sm)">${ICON_FWD} Weiterleiten</button>
            <button id="v-star" style="display:flex;align-items:center;gap:4px;padding:5px 10px;background:none;border:1px solid ${isStarred ? 'var(--warning)' : 'var(--border)'};border-radius:var(--r-sm);cursor:pointer;color:${isStarred ? 'var(--warning)' : 'var(--text)'};font-size:var(--text-sm)">${ICON_STAR} ${isStarred ? 'Stern entfernen' : 'Markieren'}</button>
            <button id="v-spam" style="display:flex;align-items:center;gap:4px;padding:5px 10px;background:none;border:1px solid var(--border);border-radius:var(--r-sm);cursor:pointer;color:var(--text);font-size:var(--text-sm)">${ICON_SPAM} Als Spam</button>
            <button id="v-trash" style="display:flex;align-items:center;gap:4px;padding:5px 10px;background:none;border:1px solid var(--border);border-radius:var(--r-sm);cursor:pointer;color:var(--danger);font-size:var(--text-sm)">${ICON_TRASH} Löschen</button>
          </div>
          <div style="background:var(--bg-elevated);border:1px solid var(--border);border-radius:var(--r-md);padding:16px;font-size:var(--text-md);color:var(--text);line-height:1.6;white-space:pre-wrap">${esc(m.body)}</div>
        </div>`;

      on(viewerEl.querySelector('#v-reply'), 'click', () => openCompose({ to: m.from, subject: m.subject.startsWith('Re:') ? m.subject : 'Re: ' + m.subject, body: '\n\n---\nVon: ' + m.from + '\n' + m.body }));
      on(viewerEl.querySelector('#v-fwd'), 'click', () => openCompose({ subject: m.subject.startsWith('Fwd:') ? m.subject : 'Fwd: ' + m.subject, body: '\n\n--- Weitergeleitet von ' + m.from + ' ---\n' + m.body }));
      on(viewerEl.querySelector('#v-star'), 'click', () => {
        m.starred = !m.starred;
        // also keep starred folder in sync
        if (m.starred) {
          if (!data.starred.find(s => s.id === m.id)) data.starred.push(m);
        } else {
          data.starred = data.starred.filter(s => s.id !== m.id);
        }
        persist(); openMail(id);
      });
      on(viewerEl.querySelector('#v-spam'), 'click', () => moveMail(m, 'spam'));
      on(viewerEl.querySelector('#v-trash'), 'click', () => {
        if (currentFolder === 'trash') {
          // permanent delete
          for (const folder of Object.values(data)) {
            const idx = folder.findIndex(x => x.id === id);
            if (idx !== -1) folder.splice(idx, 1);
          }
        } else {
          moveMail(m, 'trash');
        }
      });
    }

    function moveMail(mail, targetFolder) {
      // remove from all folders
      for (const key of Object.keys(data)) {
        data[key] = data[key].filter(m => m.id !== mail.id);
      }
      data[targetFolder] = data[targetFolder] || [];
      data[targetFolder].push(mail);
      selectedId = null;
      viewerEl.innerHTML = '';
      persist();
      renderFolders();
      renderList();
      toast(`In "${FOLDER_DEF.find(f => f.id === targetFolder)?.label || targetFolder}" verschoben.`, 'info');
    }

    // ── Compose modal ─────────────────────────────────────────────────────────
    function openCompose({ to = '', subject = '', body = '' } = {}) {
      if (modalEl) modalEl.remove();
      modalEl = document.createElement('div');
      modalEl.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;z-index:1000';
      modalEl.innerHTML = `
        <div style="background:var(--bg-elevated);border:1px solid var(--border);border-radius:var(--r-lg);padding:24px;width:520px;max-width:95vw;box-shadow:var(--shadow-lg)">
          <h3 style="margin:0 0 16px;font-size:var(--text-xl);color:var(--text)">Neue Nachricht</h3>
          <div style="margin-bottom:10px"><label style="font-size:var(--text-xs);color:var(--text-muted);display:block;margin-bottom:4px">An</label>
            <input id="c-to" type="email" value="${esc(to)}" placeholder="empfaenger@example.com" style="width:100%;box-sizing:border-box;background:var(--bg-sunken);border:1px solid var(--border);border-radius:var(--r-sm);padding:7px 10px;color:var(--text);font-size:var(--text-md)"></div>
          <div style="margin-bottom:10px"><label style="font-size:var(--text-xs);color:var(--text-muted);display:block;margin-bottom:4px">Betreff</label>
            <input id="c-sub" type="text" value="${esc(subject)}" style="width:100%;box-sizing:border-box;background:var(--bg-sunken);border:1px solid var(--border);border-radius:var(--r-sm);padding:7px 10px;color:var(--text);font-size:var(--text-md)"></div>
          <div style="margin-bottom:16px"><label style="font-size:var(--text-xs);color:var(--text-muted);display:block;margin-bottom:4px">Nachricht</label>
            <textarea id="c-body" rows="8" style="width:100%;box-sizing:border-box;background:var(--bg-sunken);border:1px solid var(--border);border-radius:var(--r-sm);padding:7px 10px;color:var(--text);font-size:var(--text-md);resize:vertical">${esc(body)}</textarea></div>
          <div style="display:flex;gap:8px;justify-content:flex-end">
            <button id="c-draft" style="background:none;border:1px solid var(--border);border-radius:var(--r-sm);padding:7px 14px;cursor:pointer;color:var(--text);font-size:var(--text-sm)">Entwurf</button>
            <button id="c-cancel" style="background:none;border:1px solid var(--border);border-radius:var(--r-sm);padding:7px 14px;cursor:pointer;color:var(--text);font-size:var(--text-sm)">Abbrechen</button>
            <button id="c-send" style="background:var(--accent);color:#fff;border:none;border-radius:var(--r-sm);padding:7px 14px;cursor:pointer;font-size:var(--text-sm)">Senden</button>
          </div>
        </div>`;

      const getForm = () => ({
        to: modalEl.querySelector('#c-to').value.trim(),
        subject: modalEl.querySelector('#c-sub').value.trim() || '(kein Betreff)',
        body: modalEl.querySelector('#c-body').value,
      });

      modalEl.querySelector('#c-cancel').addEventListener('click', () => { modalEl.remove(); modalEl = null; });
      modalEl.querySelector('#c-draft').addEventListener('click', () => {
        const f = getForm();
        const msg = { id: uid(), from: 'ich@lokal', to: f.to, subject: f.subject, body: f.body, date: new Date().toISOString(), read: true, starred: false, spam: false };
        data.drafts.push(msg);
        persist(); modalEl.remove(); modalEl = null;
        toast('Als Entwurf gespeichert.', 'info');
        renderFolders(); renderList();
      });
      modalEl.querySelector('#c-send').addEventListener('click', () => {
        const f = getForm();
        if (!f.to) { toast('Bitte einen Empfänger angeben.', 'warn'); return; }
        const msg = { id: uid(), from: 'ich@lokal', to: f.to, subject: f.subject, body: f.body, date: new Date().toISOString(), read: true, starred: false, spam: false };
        data.sent.push(msg);
        persist(); modalEl.remove(); modalEl = null;
        toast('Gesendet.', 'success');
        renderFolders(); renderList();
      });
      modalEl.addEventListener('click', e => { if (e.target === modalEl) { modalEl.remove(); modalEl = null; } });
      document.body.appendChild(modalEl);
      modalEl.querySelector('#c-to').focus();
    }

    // ── Search ────────────────────────────────────────────────────────────────
    const searchInput = container.querySelector('#mail-search');
    let searchTimer;
    on(searchInput, 'input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        searchQuery = searchInput.value.trim();
        selectedId = null;
        viewerEl.innerHTML = '';
        renderList();
      }, 200);
    });

    on(container.querySelector('#mail-back'), 'click', () => window.__jarvis?.showLauncher());
    on(container.querySelector('#mail-compose'), 'click', () => openCompose());

    this._state = { listeners };
    renderFolders();
    renderList();
  },

  unmount() {
    if (this._state) {
      this._state.listeners.forEach(({ el, type, fn }) => el.removeEventListener(type, fn));
      this._state = null;
    }
    document.querySelectorAll('[data-mail-modal]').forEach(m => m.remove());
  }
};
