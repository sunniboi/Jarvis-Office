#!/bin/bash
mkdir -p ~/.config/autostart
cat > ~/.config/autostart/obsidian.desktop << 'EOF'
[Desktop Entry]
Type=Application
Name=Obsidian
Exec=obsidian
Hidden=false
NoDisplay=false
X-GNOME-Autostart-enabled=true
EOF
echo "Obsidian Autostart eingerichtet."
