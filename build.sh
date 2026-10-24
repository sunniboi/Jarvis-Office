#!/usr/bin/env bash
# Jarvis Office — Single-File-Bundle
# Erzeugt jarvis-office.html mit allem inline (CSS + JS).

set -euo pipefail

SRC="${1:-index.html}"
OUT="${2:-jarvis-office.html}"

[[ -f "$SRC" ]] || { echo "Fehler: $SRC nicht gefunden." >&2; exit 1; }

python3 - "$SRC" "$OUT" <<'PYEOF'
import sys, re, pathlib

src_path = pathlib.Path(sys.argv[1])
out_path = pathlib.Path(sys.argv[2])
content  = src_path.read_text(encoding='utf-8')

def inline_css(m):
    tag  = m.group(0)
    href = re.search(r'href="([^"]+)"', tag)
    if not href or href.group(1).startswith('http'):
        return tag
    p = pathlib.Path(href.group(1))
    return f'<style>\n{p.read_text(encoding="utf-8")}\n</style>' if p.exists() else tag

def inline_js(m):
    tag = m.group(0)
    src = re.search(r'src="([^"]+)"', tag)
    if not src or src.group(1).startswith('http'):
        return tag
    p = pathlib.Path(src.group(1))
    return f'<script>\n{p.read_text(encoding="utf-8")}\n</script>' if p.exists() else tag

content = re.sub(r'<link[^>]+rel="stylesheet"[^>]*/?\>', inline_css, content)
content = re.sub(r'<script[^>]+src="[^"]+"[^>]*></script>', inline_js, content)

out_path.write_text(content, encoding='utf-8')
size_kb = out_path.stat().st_size // 1024
print(f"Bundle erstellt: {out_path}  ({size_kb} KB)")
PYEOF
