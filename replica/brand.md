# Brand — Jarvis Office v2

Generated: 2026-10-26

---

## Name

**Jarvis Office** — retained from v1. This is the user's own established
product, not a clone of a third-party app. No rename is needed or appropriate.

The name is short, pronounceable, and says what it does (office tools). "Jarvis"
references the AI assistant archetype, consistent with the offline-first,
personal-assistant positioning.

**Name availability:** already registered by the owner (sunniboi).
Trademark search is the owner's responsibility before commercial launch.

---

## Angle

> **Offline-first personal office suite.**
> No account. No cloud. Runs in the browser, works without internet.

This is the core differentiator: Google Docs, Notion, and every web office app
requires a server. Jarvis Office stores everything in localStorage and runs
entirely client-side. It works on a plane, in a basement, behind a firewall.

---

## Palette

| Token | Value | Role |
|-------|-------|------|
| `--bg` | `#0d0d1a` | Page background |
| `--bg-elevated` | `#161628` | Panels, sidebars |
| `--surface` | `#1c1c36` | Cards, cells |
| `--surface-hi` | `#242448` | Hover state |
| `--border` | `#2a2a50` | Dividers |
| `--text` | `#e2e8f0` | Primary text — 13.7:1 on bg |
| `--text-muted` | `#8b9cb5` | Secondary text — 5.9:1 on surface |
| `--text-faint` | `#8499b0` | Metadata — 5.0:1 on surface-hi ✅ |
| `--accent` | `#7c3aed` | Purple — brand primary |
| `--accent-hi` | `#a870f7` | Accent on dark — 5.0:1 on surface ✅ |
| `--on-accent` | `#ffffff` | Text on accent buttons |
| `--success` | `#22c55e` | Confirmation green |
| `--warn` | `#f59e0b` | Warning amber |
| `--danger` | `#ef4444` | Error red |

All foreground/background pairs pass WCAG AA (4.5:1 for normal text, 3:1 for
large text). Verified by axe-core in e2e suite.

**Hue rationale:** Deep purple (#7c3aed) is uncommon in office software (most
use blue). It reads as technical and personal, fitting the v2 dark-UI aesthetic.

---

## Logo Brief

**Idea:** A geometric diamond/rhombus (already in v1 SVG) containing a glowing
dot — represents a "focusing lens" for personal productivity.

**Mark type:** Symbol + wordmark. Symbol alone works at favicon size.

**Requirements:**
- Works at 16px (favicon) as a solid purple square with white dot
- Works at 1024px (app icon, solid background — no transparency for iOS)
- Wordmark: "Jarvis Office" in Inter 700, next to the mark
- Must not resemble any major office suite logo (Google Docs blue/white, 
  Microsoft Office coloured squares, Notion black circle)

**Deliverables:**
- `assets/logo.svg` — full mark + wordmark, scalable
- `assets/icon-1024.png` — app icon, purple bg, no transparency
- `assets/favicon.ico` — 16/32/48 multi-size
- `assets/og-1200x630.png` — social preview: dark bg, logo, tagline

**Current v1 SVG** (in index.html) is a good starting point:
```svg
<rect width="40" height="40" rx="10" fill="var(--accent)"/>
<path d="M10 20 L20 10 L30 20 L20 30 Z" fill="rgba(255,255,255,0.25)"/>
<circle cx="20" cy="20" r="5" fill="#fff"/>
```
Refine this — the diamond needs more contrast and the white circle should pulse
the brand color, not generic white.

---

## Voice

**Three words:** Direct. Calm. Capable.

- **Direct** — not terse; says what it does without filler
- **Calm** — not clinical; no exclamation marks, no urgency theater
- **Capable** — not boastful; confidence through specifics, not claims

**Do / Don't:**

| Do | Don't |
|----|-------|
| "Saved." | "Your document has been successfully saved!" |
| "Nothing here yet." | "Looks like you haven't created anything yet 👀" |
| "Delete this note?" | "Are you absolutely sure you want to permanently delete this?" |
| "No internet needed." | "Works completely offline with cutting-edge local storage technology!" |
| "Can't open file." | "Oops! Something went wrong while trying to open your file." |

**10 rewritten strings:**

| Context | Old | New |
|---------|-----|-----|
| Empty notes list | (none) | "Nothing here yet." |
| Save confirmation | "Gespeichert: [title]" | "Gespeichert." |
| Unsaved changes prompt | "Ungespeicherte Änderungen verwerfen?" | "Änderungen verwerfen?" |
| Delete confirm | "Termin löschen?" | "Löschen?" |
| No events | "Keine Termine." | "Kein Termin an diesem Tag." |
| New doc default title | "Unbenannt" | "Neues Dokument" |
| Word count | "0 Wörter" | "Leer" (when 0) |
| App footer | "Jarvis Office v2.0" | "Jarvis Office 2" |
| Statusbar dirty | "● Ungespeichert" | "Ungespeichert" |
| Statusbar clean | "Gespeichert" | "Gespeichert ✓" |

---

## Sweep result

Hardcoded `#7c3aed` hex values found and fixed in v2 source:
- `js/draw.js` — default stroke color now reads from CSS `--accent` token
- `js/calendar.js` — default event color now reads from CSS `--accent` token

Remaining hardcoded `#7c3aed` in `packaging/` (v1 package) — not v2 source,
acceptable for now (v1 package is a historical artifact).

No third-party brand names or colors present in v2 source.
