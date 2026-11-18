#!/bin/bash
# Installiert Jarvis Agenten Office (Skill und Agenten) benutzerweit (~/.claude), damit sie in jedem Projekt gelten.
set -euo pipefail

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/.claude"
DEST="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"

if ! command -v claude >/dev/null 2>&1; then
  echo "Claude Code fehlt. Installation: https://code.claude.com/docs/en/setup" >&2
  exit 1
fi

mkdir -p "$DEST/skills" "$DEST/agents"
cp -r "$SRC/skills/." "$DEST/skills/"
cp -r "$SRC/agents/." "$DEST/agents/"

echo "Installiert nach $DEST:"
ls "$DEST/skills" "$DEST/agents"
