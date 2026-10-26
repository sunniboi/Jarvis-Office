# Launch Plan — Jarvis Office 2

Generated: 2026-10-26

---

## Before launch

- [ ] All 12 open must-have features resolved (see parity.md)
- [ ] Landing page live (build from landing.md)
- [ ] Privacy policy URL working
- [ ] Support contact URL working
- [ ] Analytics (Plausible or Fathom — privacy-respecting, no cookies)
- [ ] Error tracking (Sentry or self-hosted Glitchtip)
- [ ] OG image + favicon complete (see brand.md logo brief)
- [ ] Debian package updated to v2

---

## Where the target users are

Jarvis Office is for people who want offline-first personal tools. Communities:

| Community | Channel | What to say |
|-----------|---------|-------------|
| r/selfhosted | Reddit | "Local-first office suite — no server required" |
| r/privacy | Reddit | "Browser office suite, nothing leaves your device" |
| r/linuxquestions | Reddit | "Debian package, runs in Chromium --app mode" |
| Hacker News | Show HN | Lead with the offline angle and the WCAG story |
| Fosstodon | Mastodon | Open source, offline-first, FOSS community |

**Do not mention competitor names** in the post titles or store listings.

---

## Product Hunt / Hacker News post

**Draft Show HN:**

> Show HN: Jarvis Office 2 – offline-first browser suite (write, calc,
> calendar, draw) that runs without an account or internet connection
>
> Built as a Chromium --app mode desktop app for Linux. All data in
> localStorage. WCAG AA accessible. Free and open source.
>
> What's new in v2: full design system with CSS tokens, WCAG AA fixes
> (8 violations resolved), formula engine, calendar CRUD, dark theme.
>
> [link to the app]

Lead with the differentiator (offline, no account), not the feature list.

---

## First 10 users to talk to

1. The owner themselves — use every module for a real week
2. A Linux power user (r/linuxquestions audience)
3. A privacy-conscious user (r/privacy audience)
4. Someone who uses a screen reader
5. A keyboard-only user
6. A mobile user (390px test)
7. A non-technical user (plain language test on UI copy)
8. A user with calendar-heavy workflow
9. A user who writes long documents
10. A user who needs spreadsheet formulas regularly

Ask each: what's the first thing that felt wrong or missing?

---

## Analytics events to instrument

- App opened (module name)
- Document saved
- Event created (calendar)
- Formula entered (calc)
- Draw export (when implemented)
- Settings opened
- Back to launcher

Keep event names generic — do not log document content.

---

## Error tracking

Wrap the global error handler and log:
- Uncaught JS errors (module, message, stack)
- localStorage quota exceeded (storage full)
- Missing module (should never happen post-fix)

Log to console in dev, to a self-hosted endpoint in production.
