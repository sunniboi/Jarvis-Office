#!/bin/bash
set -euo pipefail

# Nur in Remote-Sessions ausführen
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

echo "Jarvis-Office: Session-Start-Hook läuft..."

# Struktur prüfen
REQUIRED_FILES=("index.html" "css/main.css" "js/launcher.js")
for f in "${REQUIRED_FILES[@]}"; do
  if [ ! -f "${CLAUDE_PROJECT_DIR}/${f}" ]; then
    echo "WARNUNG: ${f} fehlt!" >&2
  fi
done

echo "Jarvis-Office: Bereit."
