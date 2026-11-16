/* ===== JARVIS OFFICE v2 — MAIL ===== */

function initMail(container) {
  // Offline mail client — stores messages in localStorage only
  let messages = JarvisDB.get('mail_messages', []);
  let selected = null;
  let currentFolder = 'inbox';

  const FOLDERS = [
    { id: 'inbox',  label: 'Eingang',   icon: 'mail'    },
    { id: 'sent',   label: 'Gesendet',  icon: 'forward' },
    { id: 'drafts', label: 'Entwürfe',  icon: 'save'    },
    { id: 'trash',  label: 'Papierkorb',icon: 'trash'   },
  ];

  // Seed demo messages if empty
  if (!messages.length) {
    messages = [
      { id: JarvisDB.genId(), folder: 'inbox', from: 'jarvis@office.local', to: 'ich@lokal', subject: 'Willkommen bei Jarvis Mail', body: 'Das ist dein lokaler Mail-Client.\n\nNachrichten bleiben auf diesem Gerät.', date: Date.now(), read: false },
    ];
    saveMail();
  }

  function saveMail() { JarvisDB.set('mail_messages', messages); }

  // ── DOM ──────────────────────────────────────────────────────────────────
  container.innerHTML = `
    <div class="app-chrome mail-app">
      <div class="titlebar">
        <button class="btn-icon back-btn" aria-label="Zurück">${icon('arrowLeft', 18)}</button>
        <span class="app-title">Jarvis Mail</span>
        <div class="titlebar-actions">
          <button class="btn btn-primary btn-sm" id="mail-compose">${icon('filePlus', 15)} Neue Mail</button>
        </div>
      </div>
      <div class="mail-layout">
        <nav class="mail-sidebar" role="navigation" aria-label="Ordner">
          ${FOLDERS.map(f => `
            <button class="folder-btn${f.id === currentFolder ? ' active' : ''}" data-folder="${f.id}">
              ${icon(f.icon, 15)} ${f.label}
              <span class="folder-badge" id="badge-${f.id}"></span>
            </button>`).join('')}
        </nav>
        <div class="mail-list-area">
          <div class="mail-list" id="mail-list" role="list" aria-label="Nachrichten"></div>
          <div class="mail-detail" id="mail-detail" aria-live="polite"></div>
        </div>
      </div>
      <div class="statusbar">
        <span id="mail-status">Bereit</span>
      </div>
    </div>
  `;

  const mailList   = container.querySelector('#mail-list');
  const mailDetail = container.querySelector('#mail-detail');
  const statusEl   = container.querySelector('#mail-status');

  // ── Badges ────────────────────────────────────────────────────────────────
  function updateBadges() {
    FOLDERS.forEach(f => {
      const unread = messages.filter(m => m.folder === f.id && !m.read).length;
      const badge = container.querySelector(`#badge-${f.id}`);
      if (badge) { badge.textContent = unread || ''; badge.style.display = unread ? '' : 'none'; }
    });
  }

  // ── Render list ───────────────────────────────────────────────────────────
  function renderList() {
    const folderMsgs = messages.filter(m => m.folder === currentFolder)
      .sort((a, b) => b.date - a.date);
    mailList.innerHTML = '';
    if (!folderMsgs.length) {
      mailList.innerHTML = '<div class="mail-empty">Keine Nachrichten.</div>';
      mailDetail.innerHTML = '';
      return;
    }
    folderMsgs.forEach(m => {
      const div = document.createElement('div');
      div.className = 'mail-item' + (m.read ? '' : ' unread') + (m.id === selected ? ' selected' : '');
      div.setAttribute('role', 'listitem');
      div.setAttribute('tabindex', '0');
      div.innerHTML = `
        <div class="mail-from">${sanitize(m.from)}</div>
        <div class="mail-subject">${sanitize(m.subject)}</div>
        <div class="mail-date">${formatDateTime(new Date(m.date))}</div>
      `;
      div.addEventListener('click', () => openMessage(m.id));
      div.addEventListener('keydown', e => { if (e.key === 'Enter') openMessage(m.id); });
      mailList.appendChild(div);
    });
    statusEl.textContent = `${folderMsgs.length} Nachrichten`;
    updateBadges();
  }

  // ── Open message ──────────────────────────────────────────────────────────
  function openMessage(id) {
    selected = id;
    const m = messages.find(msg => msg.id === id);
    if (!m) return;
    m.read = true;
    saveMail();
    renderList();
    mailDetail.innerHTML = `
      <div class="mail-detail-header">
        <div class="mail-detail-subject">${sanitize(m.subject)}</div>
        <div class="mail-detail-meta">
          <span>Von: ${sanitize(m.from)}</span>
          <span>An: ${sanitize(m.to)}</span>
          <span>${formatDateTime(new Date(m.date))}</span>
        </div>
        <div class="mail-detail-actions">
          <button class="btn btn-ghost btn-sm" id="mail-reply">${icon('reply', 14)} Antworten</button>
          <button class="btn btn-ghost btn-sm" id="mail-forward">${icon('forward', 14)} Weiterleiten</button>
          <button class="btn btn-ghost btn-sm" id="mail-trash-msg">${icon('trash', 14)} Löschen</button>
        </div>
      </div>
      <div class="mail-body">${sanitize(m.body).replace(/\n/g, '<br>')}</div>
    `;
    container.querySelector('#mail-reply')?.addEventListener('click', () => composeReply(m));
    container.querySelector('#mail-forward')?.addEventListener('click', () => composeForward(m));
    container.querySelector('#mail-trash-msg')?.addEventListener('click', () => trashMsg(m.id));
  }

  function trashMsg(id) {
    const m = messages.find(msg => msg.id === id);
    if (!m) return;
    if (m.folder === 'trash') {
      if (!confirm('Endgültig löschen?')) return;
      messages = messages.filter(msg => msg.id !== id);
    } else {
      m.folder = 'trash';
    }
    selected = null;
    saveMail();
    mailDetail.innerHTML = '';
    renderList();
  }

  // ── Compose ───────────────────────────────────────────────────────────────
  function openCompose({ to = '', subject = '', body = '', replyTo = null } = {}) {
    showModal(`
      <h3>Neue Nachricht</h3>
      <div class="form-group"><label>An</label><input type="email" id="comp-to" value="${sanitize(to)}" placeholder="empfaenger@example.com" /></div>
      <div class="form-group"><label>Betreff</label><input type="text" id="comp-subject" value="${sanitize(subject)}" /></div>
      <div class="form-group"><label>Nachricht</label><textarea id="comp-body" rows="8" style="resize:vertical">${sanitize(body)}</textarea></div>
      <div class="modal-actions">
        <button class="btn btn-ghost btn-cancel">Abbrechen</button>
        <button class="btn btn-ghost btn-draft">Entwurf</button>
        <button class="btn btn-primary btn-ok">Senden</button>
      </div>
    `, (modal) => {
      const msg = {
        id: JarvisDB.genId(),
        folder: 'sent',
        from: 'ich@lokal',
        to:   modal.querySelector('#comp-to').value.trim(),
        subject: modal.querySelector('#comp-subject').value.trim() || '(kein Betreff)',
        body: modal.querySelector('#comp-body').value,
        date: Date.now(),
        read: true,
      };
      if (!msg.to) { showNotify('Bitte einen Empfänger angeben.', 'warn'); return; }
      messages.push(msg);
      if (replyTo) { const orig = messages.find(m => m.id === replyTo); if (orig) orig.replied = true; }
      saveMail();
      renderList();
      showNotify('Gesendet.', 'success');
    });

    // Draft button
    setTimeout(() => {
      document.querySelector('.btn-draft')?.addEventListener('click', () => {
        const modal = document.querySelector('.modal');
        if (!modal) return;
        const msg = {
          id: JarvisDB.genId(), folder: 'drafts', from: 'ich@lokal',
          to:      modal.querySelector('#comp-to').value.trim(),
          subject: modal.querySelector('#comp-subject').value.trim() || '(kein Betreff)',
          body:    modal.querySelector('#comp-body').value,
          date: Date.now(), read: true,
        };
        messages.push(msg); saveMail(); renderList();
        document.querySelector('.modal-overlay')?.remove();
        showNotify('Als Entwurf gespeichert.', 'info');
      });
    }, 0);
  }

  function composeReply(orig) {
    openCompose({
      to: orig.from,
      subject: orig.subject.startsWith('Re:') ? orig.subject : 'Re: ' + orig.subject,
      body: `\n\n--- Original ---\nVon: ${orig.from}\n${orig.body}`,
      replyTo: orig.id,
    });
  }

  function composeForward(orig) {
    openCompose({
      subject: orig.subject.startsWith('Fwd:') ? orig.subject : 'Fwd: ' + orig.subject,
      body: `\n\n--- Weitergeleitet von ${orig.from} ---\n${orig.body}`,
    });
  }

  // ── Folder nav ────────────────────────────────────────────────────────────
  container.querySelectorAll('.folder-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.folder-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFolder = btn.dataset.folder;
      selected = null;
      mailDetail.innerHTML = '';
      renderList();
    });
  });

  container.querySelector('#mail-compose').addEventListener('click', () => openCompose());
  container.querySelector('.back-btn').addEventListener('click', goHome);

  updateBadges();
  renderList();
}
