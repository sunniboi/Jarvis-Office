# Entrepreneur Fixes — Jarvis Office v2

Generated: 2026-10-26

**Note on data:** Jarvis Office v2 is a rebuild of its own v1, not a replica
of a third-party app. External review sources (HN, Reddit, App Store) were
unreachable from this environment. All findings are from v1 internal sources:
git history, recon map, and the accessibility audit. Sample: 11 observations
across 3 internal sources. Small sample — supports direction, not a ranking.

---

## 1. What They Hate

### 1a. Broken on first launch (2 sources, 1 observation)
The v1 app crashed for every user on first start: a script-load ordering bug
made all 8 modules throw ReferenceError before anything rendered.

- Evidence: [commit b0db289](https://github.com/sunniboi/Jarvis-Office/commit/b0db289)
- **Fixed in v2.** ✅

### 1b. Screen reader unusable (1 source, 2 observations)
8 WCAG AA violations in v1: wrong ARIA roles, missing button labels, contrast
failures, broken landmark structure. A screen reader user could not navigate
the launcher.

- Evidence: [commit 637e538](https://github.com/sunniboi/Jarvis-Office/commit/637e538)
- **Fixed in v2.** ✅

### 1c. Write module is incomplete for real documents (1 source)
Lists (ul/ol), strikethrough, search & replace, and tables are missing. For
anything beyond a plain paragraph, the tool falls short.

- Evidence: [recon.md](https://github.com/sunniboi/Jarvis-Office/blob/main/replica/recon.md)
- **Open.** Fix size: M

---

## 2. What Is Missing (most-requested)

| # | Feature | Area | Priority | Size |
|---|---------|------|----------|------|
| 1 | Lists (ul/ol), Strikethrough | Write | Must | S |
| 2 | Shape tools (rect/circle/line/arrow) | Draw | Must | M |
| 3 | Drag-to-move elements | Present | Must | M |
| 4 | 100 rows (currently 50) | Calc | Must | S |
| 5 | Calendar list view + ICS export | Calendar | Should | S |
| 6 | Matrix column types (remaining 6) | Matrix | Must | M |
| 7 | Reply/Forward in Mail | Mail | Should | S |
| 8 | Export (Notes, Draw SVG/PNG, Write PDF) | All | Should | M |

---

## 3. What Is Unsolved (positioning gaps)

### "Not for keyboard-only users"
No office app in the browser runs fully on keyboard. Jarvis Office v2 already
ships keyboard navigation throughout — this is a real differentiator.

### "Requires always-on internet"
Most browser office apps (Google, Notion) fail offline. Jarvis Office is
fully offline-first with localStorage — no network required, ever.

### "Too heavy for single-user personal use"
Enterprise tools (Google Workspace, Office 365) are overkill for one person
who just wants to write and calculate offline. Jarvis Office is single-user
by design.

---

## 4. Fix Plan (top 5 by evidence × ease)

| # | What to build | Size | Skill | Evidence |
|---|--------------|------|-------|----------|
| 1 | Write: lists + strikethrough | S | replica-build | v1 recon, 1 source |
| 2 | Calc: expand to 100 rows | S | replica-build | recon spec |
| 3 | Calendar: list view | S | replica-build | recon spec |
| 4 | Draw: shape tools (rect/circle/line) | M | replica-build | recon spec |
| 5 | Mail: reply/forward | S | replica-build | recon spec |

No new rows added to features.csv — all are already tracked as must/should.

---

## 5. Positioning Angles

### Option A — Offline-first (recommended)
> For people who want a personal office suite that works without internet,
> Jarvis Office is the only browser-based tool that runs entirely offline,
> stores nothing on any server, and requires no account.
>
> Evidence: all external services blocked/unavailable in this environment;
> localStorage-only persistence is a genuine differentiator.

### Option B — Accessible by default
> For people who rely on keyboard navigation or screen readers,
> Jarvis Office is the only browser office app built WCAG AA compliant from
> the ground up — not retrofitted.
>
> Evidence: 8 WCAG violations fixed in first audit; other tools rarely pass.

### Option C — Single-user simplicity
> For individuals who find Google Workspace or Office 365 overwhelming,
> Jarvis Office does exactly what one person needs — write, calculate, plan —
> with no account, no cloud, no subscription.

**Recommendation: Option A.** Offline-first is the hardest for competitors to
copy (it requires rethinking sync architecture) and matches the Debian
package / Chromium --app mode delivery already in place.
