/* ===== JARVIS OFFICE v2 — AGENTEN OFFICE ===== */

const AGENT_ROUTES = [
  { skill: 'deep-research',        label: 'Recherche',            words: ['recherchier', 'forsch nach', 'finde heraus', 'marktüberblick', 'vergleich', 'welche anbieter', 'was gibt es für', 'was weiß man'] },
  { skill: 'code-review',          label: 'Code-Prüfung',         words: ['review', 'prüf den code', 'schau dir den code an', 'was ist falsch', 'funktioniert das nicht', 'code checken'] },
  { skill: 'simplify',             label: 'Code vereinfachen',    words: ['vereinfach', 'refactor', 'sauberer', 'zu komplex', 'kürzen', 'optimier'] },
  { skill: 'learn',                label: 'Erklären',             words: ['erkläre', 'erklär', 'bring mir bei', 'versteh das nicht', 'unterschied zwischen', 'für anfänger', 'einfach erklärt'] },
  { skill: 'artifact-diagramming', label: 'Diagramm',             words: ['zeichne', 'diagramm', 'visualisiere', 'flowchart', 'ablaufdiagramm', 'als grafik'] },
  { skill: 'dataviz',              label: 'Datenvisualisierung',  words: ['chart', 'graph', 'plot', 'dashboard', 'statistik'] },
  { skill: 'web-artifacts-builder', label: 'Web-App',             words: ['baue eine app', 'web-app', 'webapp', 'react', 'interaktives tool', 'interface', 'baue mir eine seite'] },
  { skill: 'doc-coauthoring',      label: 'Dokumentation',        words: ['doku', 'spezifikation', 'tech spec', 'proposal', 'dokument für'] },
  { skill: 'internal-comms',       label: 'Interne Mitteilung',   words: ['status-report', 'statusbericht', 'newsletter', 'incident', 'interne mitteilung', 'update für'] },
  { skill: 'security-review',      label: 'Sicherheitsprüfung',   words: ['ist das sicher', 'sicherheitslücke', 'security', 'gehackt', 'xss', 'sql injection'] },
  { skill: 'run',                  label: 'App starten',          words: ['starte die app', 'starte den server', 'teste ob das läuft', 'screenshot', 'wie das aussieht'] },
  { skill: 'update-config',        label: 'Einstellungen',        words: ['ab jetzt immer', 'jedes mal wenn', 'automatisch wenn', 'berechtigung', 'konfiguriere', 'hook'] },
  { skill: 'docx',                 label: 'Word-Dokument',        words: ['word', '.docx'] },
  { skill: 'xlsx',                 label: 'Excel-Tabelle',        words: ['excel', '.xlsx', 'spreadsheet', 'erstelle eine tabelle'] },
  { skill: 'pptx',                 label: 'PowerPoint',           words: ['powerpoint', '.pptx', 'folien', 'präsentation als datei'] },
  { skill: 'pdf',                  label: 'PDF',                  words: ['pdf'] },
  { skill: 'mcp-builder',          label: 'MCP-Server',           words: ['mcp'] },
  { skill: 'skill-creator',        label: 'Skill erstellen',      words: ['neuen skill', 'eigenen skill', 'skill bauen'] },
  { skill: 'morning',              label: 'Tagesüberblick',       words: ['guten morgen', 'tagesüberblick', 'was steht heute an', 'briefing'] },
  { skill: 'loop',                 label: 'Wiederkehrende Aufgabe', words: ['minuten', 'wiederhole', 'im hintergrund', 'monitore', 'regelmäßig'] },
];

const AGENT_TEAM = [
  { role: 'Hauptagent', task: 'Wählt Skill und Team, verteilt die Aufträge, prüft am Ende selbst nach.' },
  { role: 'Arbeiter A', task: 'Setzt den Auftrag um – erster Ansatz.' },
  { role: 'Arbeiter B', task: 'Setzt den Auftrag um – unabhängiger zweiter Ansatz.' },
  { role: 'Prüfer',     task: 'Prüft A gegen B. Jeder Befund braucht einen Beleg.' },
];

function routeAgentTask(text) {
  const t = text.toLowerCase();
  return AGENT_ROUTES
    .map(r => {
      const hits = r.words.filter(w => t.includes(w));
      return { ...r, hits, score: hits.reduce((s, w) => s + w.length, 0) };
    })
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score);
}

function initAgents(container) {
  container.innerHTML = `
    <div class="app-chrome agents-app">
      <div class="titlebar">
        <button class="btn-icon back-btn" aria-label="Zurück">${icon('arrowLeft', 18)}</button>
        <span class="app-title">Jarvis Agenten Office</span>
      </div>
      <div class="agents-layout">
        <section class="agents-input" aria-label="Auftrag">
          <label for="agents-task">Auftrag</label>
          <textarea id="agents-task" placeholder="Was soll erledigt werden? Zum Beispiel: Recherchiere, welche Anbieter es für … gibt."></textarea>
          <button class="btn btn-primary" id="agents-go">Team zusammenstellen</button>
          <p class="agents-hint">Diese Seite plant nur. Ausgeführt wird der Auftrag in Claude Code – den fertigen Befehl dort einfügen.</p>
        </section>
        <section class="agents-result" id="agents-result" aria-live="polite">
          <p class="agents-empty">Noch kein Auftrag.</p>
        </section>
      </div>
      <div class="statusbar">
        <span>${AGENT_ROUTES.length} Skills im Routing</span>
        <span id="agents-status"></span>
      </div>
    </div>
  `;

  const taskEl   = container.querySelector('#agents-task');
  const resultEl = container.querySelector('#agents-result');
  const statusEl = container.querySelector('#agents-status');

  taskEl.value = JarvisDB.get('agents_task', '');

  function plan() {
    const text = taskEl.value.trim();
    if (!text) { showNotify('Bitte zuerst einen Auftrag eingeben.', 'info'); return; }
    JarvisDB.set('agents_task', text);

    const matches = routeAgentTask(text);
    const best = matches[0];
    const command = '/jarvis-agenten-office ' + text.replace(/\s+/g, ' ');

    resultEl.innerHTML = `
      <h3>Skill</h3>
      <div class="agents-skill">
        ${best
          ? `<strong>${sanitize(best.label)}</strong><code>${sanitize(best.skill)}</code>
             <span>Erkannt an: ${best.hits.map(sanitize).join(', ')}</span>`
          : `<strong>Kein einzelner Skill passt</strong>
             <span>Der Hauptagent entscheidet beim Start selbst.</span>`}
      </div>
      ${matches.length > 1
        ? `<p class="agents-also">Danach in Frage: ${matches.slice(1, 4).map(m => sanitize(m.label)).join(', ')}</p>`
        : ''}
      <h3>Team</h3>
      <ol class="agents-team">
        ${AGENT_TEAM.map(a => `<li><strong>${a.role}</strong><span>${a.task}</span></li>`).join('')}
      </ol>
      <h3>Befehl für Claude Code</h3>
      <div class="agents-command">
        <code id="agents-command"></code>
        <button class="btn btn-ghost btn-sm" id="agents-copy">Kopieren</button>
      </div>
    `;
    resultEl.querySelector('#agents-command').textContent = command;
    resultEl.querySelector('#agents-copy').addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(command);
        showNotify('Befehl kopiert.', 'success');
      } catch {
        showNotify('Kopieren nicht möglich – bitte den Befehl von Hand markieren.', 'error');
      }
    });
    statusEl.textContent = best ? 'Skill: ' + best.skill : 'Skill: offen';
  }

  container.querySelector('#agents-go').addEventListener('click', plan);
  taskEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) plan();
  });
  container.querySelector('.back-btn').addEventListener('click', goHome);
}
