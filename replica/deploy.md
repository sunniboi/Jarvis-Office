# Deploy Checklist — Jarvis Office 2

Generated: 2026-10-26

---

## Preflight Results

### ✅ Test suite
```
26 passed, 1 skipped (F06-H5 mini-calendar — S4 cosmetic, BUG-005)
0 failed
```

### ⚠️ Parity: 56.9 / 100 — NOT SHIPPABLE YET
```
Must-haves done: 27 of 39
12 must-have features incomplete (see parity.md for full list)
```
**Deploy is blocked** until the 12 must-haves are resolved.
See `replica/parity.md` — missing features in build order.

### ✅ Brand sweep
```
sweep: nothing to look for (own product, no third-party brand to avoid)
No third-party names or colors in v2 source.
```

### ✅ Store listing
```
App Store: 0 errors, 0 warnings
Google Play: 0 errors, 0 warnings
```

### No build step
Static HTML/CSS/JS — no build tool, no compilation needed. Files are
served directly. Production = the repo root.

---

## Open bugs

| ID | Severity | Status |
|----|----------|--------|
| BUG-001 | S3 | Fixed |
| BUG-002 | S3 | Fixed |
| BUG-003 | S3 | Fixed |
| BUG-004 | S3 | Fixed |
| BUG-005 | S4 | Open (mini-calendar sidebar missing) |
| BUG-006 | S4 | Open (by design: "Hinzufügen" vs "Speichern") |

**No open S1 or S2 bugs.** Deploy is blocked by parity, not by bugs.

---

## Deploy plan (when parity is reached)

### Host recommendation: Cloudflare Pages

Reason: static site with no server-side logic, no database. Cloudflare Pages
is free for unlimited bandwidth, deploys from Git, and serves from edge nodes
worldwide. No Vercel needed.

**Alternative:** GitHub Pages (simpler, also free, slower deploys).

### Steps — user does these

1. Push the branch `claude/replika-skill-install-8e5qyd` to `main` (or
   create a PR and merge it).

2. At [pages.cloudflare.com](https://pages.cloudflare.com):
   - Connect the GitHub repo `sunniboi/Jarvis-Office`
   - Build command: *(leave blank — static site)*
   - Build output directory: `/` (repo root)
   - Deploy

3. The live URL will be `jarvis-office.pages.dev` or a custom domain.

### Custom domain (after the user buys it)

DNS records at the registrar:

| Record | Name | Value |
|--------|------|-------|
| CNAME | `www` | `jarvis-office.pages.dev` |
| CNAME or A | `@` | Cloudflare handles apex — follow their UI |
| TXT | `@` | Cloudflare verification value (shown in Pages settings) |

HTTPS is automatic on Cloudflare Pages.

Set canonical URL to `www.yourdomain.com` and redirect apex `@` to `www`.

### Email DNS (if email sending is added later)

| Record | Type | Name | Value |
|--------|------|------|-------|
| SPF | TXT | `@` | `v=spf1 include:_spf.yourmailprovider.com ~all` |
| DKIM | CNAME | `mail._domainkey` | provided by mail provider |
| DMARC | TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com` |

Tighten DMARC to `p=quarantine` after 2 weeks of clean reports.

---

## No production services needed

| Service | Status | Reason |
|---------|--------|--------|
| Database | Not needed | localStorage, no server |
| Stripe | Not needed | Free product, no payments |
| OAuth | Not needed | No accounts |
| Email | Not needed | No transactional email |
| Env vars | None | No secrets, pure client-side |

---

## What to watch in the first week

### Uptime
Set a free uptime monitor (UptimeRobot, Better Uptime) on the landing page
URL. Alert to email or phone on downtime > 2 min.

### Analytics
Add Plausible or Fathom (privacy-friendly, no cookies, no EU cookie banner
needed). Track:
- Page views on `landing.html` and `index.html`
- Custom events: module opened, document saved (via a JS snippet)

### Error tracking
Add a global error handler to `js/utils.js`:
```javascript
window.addEventListener('unhandledrejection', e => {
  console.error('unhandled rejection:', e.reason);
  // send to self-hosted Sentry or Glitchtip
});
```

### First-week checklist (user)
- [ ] Open the app on a phone (390px test)
- [ ] Try every module for 5 minutes each
- [ ] Turn off wifi, confirm everything still works
- [ ] Check the landing page on a phone
- [ ] Share with 3 real users and read their reactions

---

## What needs to ship before a public announcement

| # | Feature | Parity target |
|---|---------|--------------|
| 1 | Write: lists (ul/ol) + strikethrough | must-have |
| 2 | Calc: expand to 100 rows | must-have |
| 3 | Draw: shape tools | must-have |
| 4 | Present: drag-to-move | must-have |
| 5 | Matrix: remaining column types | must-have |
| 6 | Calendar: mini-sidebar or list view | partial |
| 7 | Mail: reply/forward | should-have |

Use `/replica-build` to work through these in order.

---

## Privacy & legal (user responsibility)

- [ ] Privacy policy page (what is stored: localStorage only, nothing sent)
- [ ] No cookie banner needed (no non-essential cookies, no tracking by default)
- [ ] Account deletion: N/A (no accounts)
- [ ] Support contact: add a GitHub Issues link or email
- [ ] Age rating: suitable for all ages (no user-generated content shared)
- [ ] Data safety form (Play): "No data collected or shared"
