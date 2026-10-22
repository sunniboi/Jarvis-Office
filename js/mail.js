// ===== JARVIS MAIL =====

function initMail(container) {
  let activeFolder = 'inbox';
  let activeMailId = null;
  let composing = false;

  const folders = [
    { id: 'inbox', name: '📥 Posteingang', badge: 3 },
    { id: 'sent', name: '📤 Gesendet', badge: 0 },
    { id: 'drafts', name: '📝 Entwürfe', badge: 1 },
    { id: 'starred', name: '⭐ Markiert', badge: 0 },
    { id: 'trash', name: '🗑 Papierkorb', badge: 0 },
  ];

  const sampleMails = {
    inbox: [
      { id: 'm1', from: 'Max Mustermann', email: 'max@example.de', subject: 'Willkommen bei Jarvis Office!', preview: 'Hallo, ich wollte nur kurz...', body: 'Hallo!\n\nIch wollte nur kurz sagen: Jarvis Office ist wirklich beeindruckend. Alle Module funktionieren hervorragend.\n\nViele Grüße\nMax', date: '22.10.2026', unread: true, starred: false },
      { id: 'm2', from: 'Erika Musterfrau', email: 'erika@example.de', subject: 'Projektbericht Oktober', preview: 'Anbei der Bericht für...', body: 'Hallo,\n\nanbei der Projektbericht für Oktober. Bitte prüfen Sie die Zahlen in der Anlage.\n\nMit freundlichen Grüßen\nErika Musterfrau', date: '21.10.2026', unread: true, starred: true },
      { id: 'm3', from: 'Hans Schmidt', email: 'hans@example.de', subject: 'Meeting Donnerstag', preview: 'Können wir das Meeting...', body: 'Hallo,\n\nkönnen wir das Meeting auf 14 Uhr verschieben? Mir kommt etwas dazwischen.\n\nDanke!\nHans', date: '20.10.2026', unread: false, starred: false },
      { id: 'm4', from: 'Newsletter', email: 'news@example.de', subject: 'Neuigkeiten dieser Woche', preview: 'Die wichtigsten Nachrichten...', body: 'Hier sind die wichtigsten Nachrichten dieser Woche...', date: '19.10.2026', unread: true, starred: false },
    ],
    sent: [
      { id: 's1', from: 'Du', email: 'du@jarvis.de', subject: 'Re: Projektbericht Oktober', preview: 'Danke, ich schaue es mir an...', body: 'Danke, ich schaue es mir an.', date: '21.10.2026', unread: false, starred: false },
    ],
    drafts: [
      { id: 'd1', from: 'Du', email: '', subject: 'Entwurf: Angebot Q4', preview: 'Sehr geehrte Damen und Herren...', body: 'Sehr geehrte Damen und Herren,\n\nim Anhang finden Sie unser Angebot...', date: '20.10.2026', unread: false, starred: false },
    ],
    starred: [],
    trash: [],
  };

  // Load from storage or use samples
  let mails = JarvisDB.get('mail_data', null) || sampleMails;

  container.innerHTML = `
    <div class="app-titlebar">
      <button class="back-btn" onclick="goHome()">←</button>
      <span class="app-title" style="color:var(--mail)">✉ Jarvis Mail</span>
      <div class="titlebar-actions">
        <button class="tb-btn" onclick="mailCompose()">✉ Neue E-Mail</button>
        <button class="tb-btn" onclick="mailRefresh()">↻ Aktualisieren</button>
        <input type="text" id="mail-search" placeholder="🔍 E-Mails durchsuchen..." style="background:var(--surface);border:1px solid var(--border);color:var(--text);border-radius:var(--radius);padding:4px 10px;font-size:12px;width:200px;" />
      </div>
    </div>
    <div class="mail-layout">
      <div class="mail-sidebar" id="mail-sidebar"></div>
      <div class="mail-list" id="mail-list"></div>
      <div class="mail-view" id="mail-view">
        <div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text3);font-size:14px;">
          Wähle eine E-Mail aus.
        </div>
      </div>
    </div>
  `;

  function renderFolders() {
    const sidebar = document.getElementById('mail-sidebar');
    sidebar.innerHTML = folders.map(f => `
      <div class="mail-folder${f.id === activeFolder ? ' active' : ''}" onclick="mailSetFolder('${f.id}')">
        ${f.name}
        ${(mails[f.id]||[]).filter(m=>m.unread).length ? `<span class="badge">${(mails[f.id]||[]).filter(m=>m.unread).length}</span>` : ''}
      </div>
    `).join('');
    sidebar.innerHTML += '<div style="border-top:1px solid var(--border);margin:8px 0;"></div>';
    sidebar.innerHTML += '<div style="padding:4px 10px;font-size:11px;color:var(--text3);font-weight:600;text-transform:uppercase;">Aktionen</div>';
    sidebar.innerHTML += '<div class="mail-folder" onclick="mailMarkAllRead()">✓ Alle gelesen</div>';
    sidebar.innerHTML += '<div class="mail-folder" onclick="mailEmptyTrash()">🗑 Papierkorb leeren</div>';
  }

  function renderList(q = '') {
    const list = document.getElementById('mail-list');
    let items = mails[activeFolder] || [];
    if (q) items = items.filter(m => m.subject.toLowerCase().includes(q) || m.from.toLowerCase().includes(q) || m.body.toLowerCase().includes(q));
    list.innerHTML = items.length ? items.map(m => `
      <div class="mail-item${m.id === activeMailId ? ' active' : ''}${m.unread ? ' unread' : ''}" onclick="mailOpen('${m.id}')">
        <div style="display:flex;justify-content:space-between;">
          <span class="mail-sender">${m.starred ? '⭐ ' : ''}${sanitize(m.from)}</span>
          <span class="mail-date">${m.date}</span>
        </div>
        <div class="mail-subject">${sanitize(m.subject)}</div>
        <div class="mail-preview-text">${sanitize(m.preview)}</div>
      </div>
    `).join('') : '<div style="padding:20px;color:var(--text3);font-size:13px;text-align:center;">Keine E-Mails.</div>';
  }

  function renderView(mail) {
    const view = document.getElementById('mail-view');
    if (!mail) { view.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text3);">Wähle eine E-Mail aus.</div>'; return; }
    view.innerHTML = `
      <div class="mail-view-header">
        <div class="mail-view-subject">${sanitize(mail.subject)}</div>
        <div class="mail-view-meta">
          <strong>${sanitize(mail.from)}</strong> &lt;${sanitize(mail.email)}&gt;
          <span style="margin-left:12px;color:var(--text3)">${mail.date}</span>
        </div>
        <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn btn-ghost" onclick="mailReply('${mail.id}')" style="font-size:12px">↩ Antworten</button>
          <button class="btn btn-ghost" onclick="mailReplyAll('${mail.id}')" style="font-size:12px">↩↩ Allen antworten</button>
          <button class="btn btn-ghost" onclick="mailForward('${mail.id}')" style="font-size:12px">↪ Weiterleiten</button>
          <button class="btn btn-ghost" onclick="mailToggleStar('${mail.id}')" style="font-size:12px">${mail.starred?'☆ Markierung entfernen':'⭐ Markieren'}</button>
          <button class="btn btn-ghost" onclick="mailDelete('${mail.id}')" style="font-size:12px;color:var(--danger)">🗑 Löschen</button>
        </div>
      </div>
      <div class="mail-view-body">
        <pre style="white-space:pre-wrap;font-family:var(--font);font-size:14px;line-height:1.7;">${sanitize(mail.body)}</pre>
      </div>
    `;
  }

  window.mailSetFolder = (id) => { activeFolder = id; activeMailId = null; renderFolders(); renderList(); renderView(null); };

  window.mailOpen = (id) => {
    const mail = (mails[activeFolder]||[]).find(m => m.id === id);
    if (!mail) return;
    activeMailId = id;
    mail.unread = false;
    saveMails();
    renderFolders();
    renderList();
    renderView(mail);
  };

  window.mailCompose = (opts = {}) => {
    if (document.getElementById('mail-compose')) return;
    const div = document.createElement('div');
    div.id = 'mail-compose';
    div.className = 'mail-compose';
    div.innerHTML = `
      <div class="compose-header">
        <span>✉ Neue E-Mail</span>
        <button onclick="document.getElementById('mail-compose')?.remove()" style="background:none;border:none;color:var(--text2);cursor:pointer;font-size:18px;">✕</button>
      </div>
      <div class="compose-body">
        <div class="compose-field"><span class="compose-label">An:</span><input class="compose-input" id="comp-to" value="${sanitize(opts.to||'')}" placeholder="empfänger@example.de" /></div>
        <div class="compose-field"><span class="compose-label">CC:</span><input class="compose-input" id="comp-cc" value="" placeholder="Optional" /></div>
        <div class="compose-field"><span class="compose-label">Betreff:</span><input class="compose-input" id="comp-subj" value="${sanitize(opts.subject||'')}" placeholder="Betreff" /></div>
        <textarea class="compose-textarea" id="comp-body">${sanitize(opts.body||'')}</textarea>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px;">
          <button class="btn btn-ghost" onclick="mailSaveDraft()" style="font-size:12px">💾 Entwurf</button>
          <button class="btn btn-primary" onclick="mailSend()" style="font-size:12px">➤ Senden</button>
        </div>
      </div>
    `;
    // Make draggable
    const header = div.querySelector('.compose-header');
    let dx, dy, dragging = false;
    header.addEventListener('mousedown', e => { dragging = true; dx = e.clientX - div.offsetLeft; dy = e.clientY - div.offsetTop; });
    document.addEventListener('mousemove', e => { if (dragging) { div.style.left = (e.clientX-dx)+'px'; div.style.bottom = 'auto'; div.style.top = (e.clientY-dy)+'px'; } });
    document.addEventListener('mouseup', () => { dragging = false; });
    document.body.append(div);
  };

  window.mailSend = () => {
    const to = document.getElementById('comp-to')?.value;
    const subj = document.getElementById('comp-subj')?.value;
    const body = document.getElementById('comp-body')?.value;
    if (!to || !subj) return showNotify('An und Betreff ausfüllen!', 'warn');
    const mail = { id: 's'+Date.now(), from: 'Du', email: to, subject: subj, body, preview: body.substring(0,50), date: new Date().toLocaleDateString('de-DE'), unread: false, starred: false };
    mails.sent = mails.sent || [];
    mails.sent.unshift(mail);
    saveMails();
    document.getElementById('mail-compose')?.remove();
    showNotify('E-Mail gesendet.', 'success');
    if (activeFolder === 'sent') renderList();
  };

  window.mailSaveDraft = () => {
    const subj = document.getElementById('comp-subj')?.value || 'Entwurf';
    const body = document.getElementById('comp-body')?.value || '';
    const mail = { id: 'd'+Date.now(), from: 'Du', email: '', subject: subj, body, preview: body.substring(0,50), date: new Date().toLocaleDateString('de-DE'), unread: false, starred: false };
    mails.drafts = mails.drafts || [];
    mails.drafts.unshift(mail);
    saveMails();
    document.getElementById('mail-compose')?.remove();
    showNotify('Als Entwurf gespeichert.', 'info');
  };

  window.mailReply = (id) => {
    const mail = (mails[activeFolder]||[]).find(m=>m.id===id);
    if (!mail) return;
    mailCompose({ to: mail.email, subject: 'Re: '+mail.subject, body: '\n\n--- Original ---\n'+mail.body });
  };

  window.mailReplyAll = (id) => { mailReply(id); };

  window.mailForward = (id) => {
    const mail = (mails[activeFolder]||[]).find(m=>m.id===id);
    if (!mail) return;
    mailCompose({ subject: 'Fwd: '+mail.subject, body: '\n\n--- Weitergeleitet ---\nVon: '+mail.from+'\n'+mail.body });
  };

  window.mailToggleStar = (id) => {
    const mail = (mails[activeFolder]||[]).find(m=>m.id===id);
    if (!mail) return;
    mail.starred = !mail.starred;
    if (mail.starred) { mails.starred = mails.starred||[]; if (!mails.starred.find(m=>m.id===id)) mails.starred.push(mail); }
    else { mails.starred = (mails.starred||[]).filter(m=>m.id!==id); }
    saveMails();
    renderFolders(); renderList(); renderView(mail);
  };

  window.mailDelete = (id) => {
    const idx = (mails[activeFolder]||[]).findIndex(m=>m.id===id);
    if (idx < 0) return;
    const [mail] = (mails[activeFolder]||[]).splice(idx, 1);
    if (activeFolder !== 'trash') { mails.trash = mails.trash||[]; mails.trash.unshift(mail); }
    activeMailId = null;
    saveMails();
    renderFolders(); renderList(); renderView(null);
    showNotify('Gelöscht.', 'info');
  };

  window.mailMarkAllRead = () => {
    (mails[activeFolder]||[]).forEach(m => m.unread = false);
    saveMails(); renderFolders(); renderList();
  };

  window.mailEmptyTrash = () => {
    mails.trash = [];
    saveMails();
    if (activeFolder === 'trash') renderList();
    renderFolders();
    showNotify('Papierkorb geleert.', 'info');
  };

  window.mailRefresh = () => { renderFolders(); renderList(); showNotify('Aktualisiert.', 'info'); };

  document.getElementById('mail-search').addEventListener('input', debounce(e => renderList(e.target.value.toLowerCase()), 250));

  function saveMails() { JarvisDB.set('mail_data', mails); }

  renderFolders();
  renderList();
}
