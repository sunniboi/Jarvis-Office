#!/bin/bash
# Startet Jarvis Office direkt aus diesem Ordner (ohne Installation).
JARVIS_OFFICE_DIR="$(cd "$(dirname "$0")" && pwd)" exec bash "$(dirname "$0")/packaging/deb/usr/bin/jarvis-office"
