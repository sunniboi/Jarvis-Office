# Parity Report — Jarvis Office v2

Generated: 2026-10-26

## Overall Score: 56.9 / 100

**Status: NOT SHIPPABLE** — 12 must-have features are incomplete.

---

## Feature Score

| Metric | Value |
|--------|-------|
| Overall parity | 56.9 / 100 |
| Must-haves done | 27 of 39 |
| Should-haves done | ~9 of 25 |

Scoring: must × 3, should × 2, could × 1, partial = 0.5

---

## By Area (weakest first)

| Area | Score | Features |
|------|-------|----------|
| Matrix | 34.6 | 13 features |
| Draw | 40.0 | 12 features |
| Present | 50.0 | 8 features |
| Calc | 54.2 | 15 features |
| Write | 56.4 | 16 features |
| Calendar | 69.4 | 9 features |
| Mail | 76.5 | 8 features |
| Notes | 88.2 | 8 features |
| Launcher | 100.0 | 3 features |

---

## Layout Diff

No original reference screenshots available (Jarvis Office is a new product,
not a replica of an existing service). Clone screenshots saved in
`replica/clone-screens/` for regression comparison.

| Screen | Screenshot | Notes |
|--------|-----------|-------|
| S01 Launcher | S01-launcher.png | 8 app cards, clock, settings |
| S02 Write | S02-write.png | Toolbar, editor, statusbar |
| S03 Calc | S03-calc.png | Grid, formula bar, toolbar |
| S04 Calendar | S04-calendar.png | Month view, toolbar, day cells |
| S05 Notes | S05-notes.png | Sidebar list, editor |
| S06 Matrix | S06-matrix.png | Table with column types |
| S07 Draw | S07-draw.png | Canvas, tool panel |

---

## Behaviour Diff

Since this is a greenfield product (not a replica of an existing app),
behaviour is compared against the spec in `replica/recon.md`.

| Flow | Spec says | Clone does | Fix or Keep |
|------|-----------|------------|-------------|
| Write: text entry | Full WYSIWYG | Bold/italic/underline via execCommand | Partial — lists missing |
| Write: save | Named docs, list | Works with localStorage | ✅ Keep |
| Calc: formulas | SUM/AVG/MAX/MIN/COUNT | All implemented + cell refs | ✅ Keep |
| Calc: grid size | 26×100 | 26×50 | Fix: increase ROWS to 100 |
| Calendar: CRUD | Create/read/update/delete | All implemented | ✅ Keep |
| Calendar: mini-sidebar | Navigation aid | Not implemented | Fix (BUG-005) |
| Notes: pin | Top of list | Working | ✅ Keep |
| Draw: shapes | Freehand + shapes | Freehand only | Fix — shapes missing |
| Present: drag | Move elements | Not implemented | Fix |
| Matrix: column types | 12 types | Partial | Fix |

---

## Missing Must-Haves (build order)

1. **Draw: Pen/Freehand** — core tool not working (S1)
2. **Present: Drag-to-move** — elements are static
3. **Write: Listen (ul/ol)** — bullet + numbered lists missing
4. **Calc: 100 rows** — currently 50
5. **Calendar: Termin CRUD partial** — edit/delete from month view missing
6. **Draw: Rectangle/Circle/Line/Arrow** — shape tools missing
7. **Draw: Select/Move** — selection missing
8. **Matrix: 12 column types** — partial implementation
9. **Matrix: Filter per column** — not implemented
10. **Present: Element types** — only text, missing rect/circle/line/image
11. **Write: Bold/Italic/Underline/Strike** — strike-through missing
12. **Write: Headings H1–H4** — H4 missing (H1–H3 present)

---

## Verdict

**Not shippable.** 12 must-have features are incomplete. The app is functional
for basic use (notes, calendar, simple write, simple calc) but core modules
(Draw, Present, Matrix) are significantly incomplete.

**Path to shippable:**
1. Fix Draw pen tool (currently broken)
2. Add shape tools to Draw
3. Add list support to Write
4. Expand Calc to 100 rows
5. Add drag-to-move to Present
6. Complete Matrix column types

Estimated: ~40% more build work on the weakest 4 modules.

**What's better than spec:**
- WCAG AA accessible (contrast, ARIA roles, landmarks) — most office apps fail this
- Offline-first localStorage (no server needed)
- Keyboard navigation throughout
- Clean dark theme with design tokens
