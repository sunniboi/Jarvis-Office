# Jarvis Office v2 — Component Specs

Contrast: 9 pairs, 0 AA failures (contrast.py, 2026-10-26).
Tokens: `replica/design/tokens.json` + `tokens.css`.
Icons: SVG inline (kein Emoji, kein externen Icon-Font).

---

## AppCard
```
variants   write, calc, matrix, draw, present, mail, notes, calendar
           (je eigene --app-* Farbe für Icon-Hintergrund)
size       flex column, min 140px, padding 22px 14px
states     default, hover (translateY -2px + shadow-md + border accent),
           active (translateY 0), focus-visible (2px solid accent, offset 2px)
tokens     bg surface, border border, radius lg, hover bg surface-hi
a11y       <button role="listitem">, aria-label="<Name> öffnen", visible focus
used on    S01 Launcher
```

## Launcher
```
layout     header (h 68px) + grid (4 Spalten, gap 16px, pad 28px) + footer
header     bg bg-elevated, border-bottom border
footer     bg bg-elevated, border-top border, text text-faint, text-xs
clock      font-mono, tabular-nums, text-muted
settings   btn-icon oben rechts
empty      kein leerer State (8 Karten immer vorhanden)
used on    S01
```

## Titlebar
```
height     --h-titlebar (38px)
slots      back-btn (links) | app-name + filename | titlebar-actions (rechts)
bg         bg-elevated, border-bottom border
back-btn   btn-icon, hover bg surface, focus-visible 2px accent
filename   text-muted, text-sm, contenteditable=true zum Umbenennen
used on    S02–S09
```

## Toolbar
```
height     --h-toolbar (44px)
bg         bg-sunken, border-bottom border
overflow   overflow-x auto (scrollt bei schmalen Fenstern)
gap        1px zwischen Buttons, 3px Separator-Margin
used on    S02–S09
```

## TbBtn (Toolbar-Button)
```
variants   icon-only, text+icon
size       h 32px, padding 5px 7px
states     default (text-muted), hover (text + bg surface),
           active (text accent-hi + bg surface-hi), focus-visible (2px accent offset 1px),
           disabled (opacity .4, cursor not-allowed)
tokens     radius sm, font-sm/500
icon-size  15×15px SVG
a11y       <button>, aria-label für icon-only, aria-pressed für toggle-States
used on    alle App-Toolbars
```

## TbSep (Toolbar-Separator)
```
1px × 22px, bg border, margin 0 3px
used on    alle Toolbars
```

## TbSelect
```
height     28px
states     default (border), focus (border accent), disabled (opacity .4)
tokens     bg surface, border border, radius sm, text-sm
used on    S02 Write (Schriftart, Schriftgröße), S03 Calc (Schriftart, Schriftgröße)
```

## Button
```
variants   primary  — bg accent, text on-accent, hover bg accent-hi
           secondary — wie primary, aber lighter (kann accent-hi sein)
           ghost    — bg none, border border, text text-muted, hover bg surface text
           danger   — bg danger, text on-danger
           icon     — 32×32px quadratisch, kein border, color text-muted
size       sm h28 / md h36 (default) / lg h44, padding proportional
states     default, hover, active (brightness .9), focus-visible (2px accent offset 2px),
           disabled (opacity .4 + cursor not-allowed),
           loading (Spinner ersetzt Icon, label bleibt für Screen Reader als aria-label)
tokens     radius md, font-md/500
a11y       <button type="button">, aria-disabled statt disabled wo nötig,
           aria-label bei icon-only, aria-busy+aria-label bei loading
used on    alle Screens, Modals, Toolbars
```

## Modal
```
variants   form (Settings, Neues Dokument, Termin-Editor),
           list (Dokument öffnen), confirm (Löschen bestätigen)
overlay    bg rgba(0,0,0,.65) + backdrop-filter blur(3px), fade-in 150ms
dialog     bg surface, border border-hi, radius lg, shadow-lg, slide-up 180ms
           min-w 340px, max-w 92vw, padding 22px
heading    text-md 15px/600, margin-bottom 16px
actions    flex end, gap 8px, margin-top 18px (immer: Cancel + Primary)
focus trap ja — Tab cycled durch interaktive Elemente, Esc schließt
a11y       role="dialog", aria-modal="true", aria-labelledby heading-id,
           focus auf ersten Input beim Öffnen, bei Schließen zurück auf Trigger
used on    S01 Settings, S02–S09 Dokument-Dialoge, S09 Termin-Modal
```

## Toast / Notification
```
variants   info (border-left accent), success (border-left success),
           warning (border-left warning), error (border-left danger)
position   bottom-right, fixed, z 999, max-w 360px
animation  slide-in-right 200ms, auto-dismiss 3500ms (error: 6000ms)
stack      max 3 gleichzeitig, älteste zuerst raus
a11y       role="status" (info/success) | role="alert" (warning/error), aria-live
used on    global
```

## Statusbar
```
height     --h-statusbar (22px)
bg         bg-elevated, border-top border
text       text-faint, text-xs, tabular-nums
slots      variabel je App (Write: Wörter/Zeichen | Calc: Summe/Avg/Count)
used on    S02 Write, S03 Calc, global möglich
```

## Sidebar
```
width      --w-sidebar (220px) | Mail 180px | Notes 240px
bg         bg-elevated, border-right border
header     text-faint, text-xs, uppercase, letter-spacing .8px, border-bottom
items      → SidebarItem
```

## SidebarItem
```
padding    7px 10px, margin 2px 4px
states     default (text-muted), hover (bg surface text), active (bg surface-hi text accent-hi)
icon       16×16px inline-SVG, flex-shrink 0
badge      bg accent, on-accent, radius full, padding 1px 7px, text-xs/600
a11y       <button> oder <a>, aria-current="page" auf active
used on    S07 Mail (Ordner), S08 Notes (Sortiermodus)
```

## FormulaBar
```
height     32px, bg bg-sunken, border-bottom border
slots      cell-ref (60px, font-mono, center) | separator | formula-input (flex 1, font-mono)
formula-input: focus border accent
used on    S03 Calc
```

## CalcCell
```
size       w 90–180px (min-width), h 22px
states     default (bg bg, cursor cell),
           hover (bg surface),
           selected (bg accent/12, outline 2px accent offset -2px),
           in-range (bg accent/7),
           editing (bg bg + outline 2px accent-hi, inline <input>),
           formula (color app-calc),
           error (color danger),
           number (text-align right)
font       font-mono, text-sm
a11y       role="gridcell", aria-selected, aria-readonly wo nötig
used on    S03 Calc
```

## DrawToolBtn
```
size       32×32px
states     default (text-muted), hover (bg surface text), active (bg surface-hi text accent-hi),
           focus-visible (2px accent offset 1px)
separator  28px × 1px, bg border, margin 3px 0
used on    S05 Draw
```

## SlideThumbnail
```
aspect     16/9
bg         surface, border 2px border, radius sm
states     default, hover (border-color border-hi), active/selected (border-color accent)
thumb-num  absolute bottom-right, text-faint, text-xs, bg rgba(0,0,0,.5)
used on    S06 Present
```

## ProgressBar
```
track      bg bg-sunken, radius sm, h 8px
fill       bg accent, radius sm, transition width 200ms
range      0–100 (vom Zellwert)
a11y       role="progressbar", aria-valuenow, aria-valuemin="0", aria-valuemax="100"
used on    S04 Matrix (Spaltentyp progress)
```

## StarRating
```
chars      5 Sterne (★/☆), color warning
interactive ja — Klick setzt Wert 1–5
a11y       role="spinbutton" oder 5×radio in fieldset
used on    S04 Matrix (Spaltentyp rating)
```

## CalendarDay
```
size       min-h 80px
states     default (bg surface), hover (bg surface-hi), today (border accent),
           other-month (opacity .35, pointer-events none)
day-num    text-xs/600, text-muted; today: accent-hi/700
event-dot  radius 2px, padding 1px 4px, text-xs, text #fff (Farbwert aus Event-Daten)
used on    S09 Calendar Monatsansicht
```

## CalendarEvent
```
variants   dot (Monats-Mini), block (Wochen/Tagesansicht), card (Listenansicht)
color      aus Event-Daten (CSS-Hex), text immer #fff
click      öffnet Termin-Modal
a11y       role="button" oder <button>, aria-label "<Titel>, <Datum> <Uhrzeit>"
used on    S09 Calendar
```

## MailItem (Liste)
```
states     default, hover (bg surface), selected (bg surface-hi + border-left 3px accent),
           unread (.mail-from font-700 text)
overflow   text-overflow ellipsis auf alle Textzeilen
badge/date float right, text-faint, text-xs
used on    S07 Mail
```

## NoteCard (Liste)
```
states     default, hover (bg surface), active (bg surface-hi border-left 3px accent),
           pinned (title color accent-hi)
overflow   ellipsis, 1 Zeile je Textfeld
used on    S08 Notes
```

## ComposeWindow
```
position   fixed bottom-right, z 500, w 540px, shadow-lg, radius lg
header     draggable (cursor move), bg surface-hi, border-bottom
fields     To / CC / Subject — slim row mit border-bottom, kein border-Rahmen
textarea   min-h 180px, resize none
footer     flex, gap 8px, border-top border
close      btn-icon oben rechts
a11y       role="dialog", aria-label "Neue Nachricht", focus auf ersten Input beim Öffnen
used on    S07 Mail
```

## Form-Controls (global)
```
input/textarea/select
  bg surface, border border, radius md, padding 7px 10px, text-md
  focus: outline none + border accent + box-shadow 0 0 0 3px accent/18
  placeholder: text-faint
label     text-sm, text-muted, display block, margin-bottom 4px
form-group margin-bottom 14px
```

---

## Animations

| Name      | Duration | Easing  | Zweck                    |
|-----------|----------|---------|--------------------------|
| fadeIn    | 150ms    | ease    | Modal-Overlay            |
| slideUp   | 180ms    | ease    | Modal-Dialog             |
| slideInRight | 200ms | ease-out | Toast                  |
| hover-lift | 150ms   | ease    | AppCard hover            |

Keine Transition > 300ms. `prefers-reduced-motion`: alle Transitions auf 0ms.

---

## Kontrast-Report (2026-10-26)

```
AAA  15.63:1  text         on bg
AAA  13.43:1  text         on surface
AAA  14.44:1  text         on bg-elevated
AA    6.90:1  text-muted   on bg
AA    5.93:1  text-muted   on surface
AA    3.40:1  text-faint   on bg        (large)
AA    5.70:1  on-accent    on accent
AA    5.74:1  on-danger    on danger
AAA   7.13:1  on-success   on success

9 pairs · 0 AA-Fehler
```

Nächster Schritt: `/replica-build`
