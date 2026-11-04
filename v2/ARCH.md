# Jarvis Office v2 — Architektur

## Verzeichnisse
```
v2/
  index.html          — Shell, lädt core + router
  css/main.css        — Tokens + globale Styles
  core/
    store.js          — localStorage-Wrapper (Store.get/set/remove/keys)
    utils.js          — uid, now, qs, qsa, el, toast, debounce
  modules/
    write/index.js    — Write-Modul (mount/unmount)
    calc/index.js     — Calc-Modul
    matrix/index.js   — Matrix-Modul
    draw/index.js     — Draw-Modul
    present/index.js  — Present-Modul
    notes/index.js    — Notes-Modul
    calendar/index.js — Calendar-Modul
    mail/index.js     — Mail-Modul
```

## Modul-Interface
Jedes Modul exportiert:
```js
export default {
  id: 'write',          // eindeutig, kebab-case
  label: 'Write',
  color: 'var(--app-write)',
  icon: '<svg>...</svg>',
  mount(container),     // rendert in container, registriert Events
  unmount()             // räumt auf (Event-Listener, Timer)
}
```

## Storage Keys
- `jarvis_write_docs`   — { [id]: { id, name, html, modified } }
- `jarvis_calc_docs`    — { [id]: { id, name, cells:{}, modified } }
- `jarvis_matrix_docs`  — { [id]: { id, name, columns:[], rows:[], modified } }
- `jarvis_draw_docs`    — { [id]: { id, name, elements:[], modified } }
- `jarvis_present_docs` — { [id]: { id, name, slides:[], modified } }
- `jarvis_notes`        — [{ id, title, body, pinned, created, modified }]
- `jarvis_events`       — [{ id, title, date, time, duration, color, location, desc }]
- `jarvis_mails`        — { inbox:[], sent:[], drafts:[], starred:[], trash:[] }
- `jarvis_settings`     — { name, fontSize }

## Design-Tokens
Quelle: `replica/design/tokens.css` — wird 1:1 übernommen in `css/main.css`.
Schriftart: Inter (Google Fonts)
Icon-System: Inline SVG (kein Font, kein Emoji)

## Regeln
- Kein globaler Namespace — alles ES-Module, `type="module"`
- Kein Framework — Vanilla JS + DOM-API
- localStorage als einziger Persistence-Layer
- Jedes Modul ist vollständig eigenständig (kein Cross-Import zwischen Modulen)
- Performance: kein komplettes Re-Render bei jedem Tastendruck
