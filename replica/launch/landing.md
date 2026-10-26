# Landing Page — Jarvis Office 2

Brand voice: Direct. Calm. Capable.

---

## 1. Hero

**Headline:**  
Your personal office. No account. No internet required.

**Subline:**  
Write, calculate, plan and draw — entirely in your browser, entirely offline.
Nothing leaves your device.

**Button:** Jetzt starten →  
*(links to the app)*

**Visual:** Screenshot S01-launcher.png — the 8-app launcher in dark mode

---

## 2. The Problem

*In the user's words, paraphrased:*

**Web office apps break when you go offline.**  
Google Docs shows a spinner. Notion goes read-only. Every cloud-first tool
assumes you have a connection. You don't always.

**They also know too much.**  
Accounts, tracking, sync — every document you write passes through someone
else's server. Some things are just private.

---

## 3. How It Works

1. **Open the app.** It runs in your browser, no install needed. Or package
   it as a desktop app with the included Debian package.

2. **Work normally.** Write documents, build spreadsheets, take notes,
   manage your calendar. All 8 tools in one place.

3. **It saves locally.** Everything goes into your browser's localStorage.
   Close the tab, reopen it — your work is still there.

---

## 4. Features

### The fixes first

| What was broken | What v2 does |
|-----------------|-------------|
| App crashed on first launch (v1) | Fixed: all 8 modules load correctly |
| Screen reader couldn't navigate | WCAG AA compliant: contrast, ARIA, landmarks |
| Icon-only buttons had no labels | Every button has accessible text |
| Hardcoded colors ignored dark mode | Full CSS token system, zero hardcoded values |

### What you get

- **Write** — WYSIWYG text editor, bold/italic/underline, headings, auto-save
- **Calc** — 26×50 grid, SUM/AVG/MAX/MIN/COUNT formulas, cell references
- **Calendar** — month/week/day views, event create/edit/delete, color labels
- **Notes** — pinned notes, full-text search, instant save
- **Matrix** — smart table with multiple column types and filters
- **Draw** — freehand canvas with stroke and shape tools
- **Present** — slide editor with text elements and export
- **Mail** — local email client for offline reading

---

## 5. Pricing

**Free.** No tiers, no subscription, no account.

Open source. Self-host or run from the repo. The Debian package installs
in one command for permanent offline access.

*(Commercial licensing for redistribution: contact the owner.)*

---

## 6. FAQ

**Does it work without internet?**  
Yes. The entire app is static HTML, CSS and JavaScript. Once loaded, nothing
requires a network connection. localStorage holds all your data.

**Where is my data stored?**  
In your browser's localStorage on your device. It never leaves. No server,
no sync, no cloud backup — which also means: clear your browser data and
it's gone. Export important documents regularly.

**Can I import from Google Docs or Notion?**  
Not yet. Write supports HTML export. Import from other tools is on the roadmap.

**Does it work on mobile?**  
The layout responds to 390px. The editor and calc work. Draw and Present are
better on desktop. No native mobile app exists yet.

**Is there a desktop app?**  
Yes — the included Debian package wraps Chromium in --app mode for a native-
feeling experience on Linux. macOS and Windows wrappers are on the roadmap.

---

## 7. Final CTA

**Jarvis Office is free and runs right now.**  
No signup. No email. No card.

[Jetzt starten →]
