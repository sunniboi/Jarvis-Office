#!/bin/sh
# Baut jarvis-office_<VERSION>_all.deb aus dem aktuellen Quellcode.
# Aufruf:  sh packaging/build-deb.sh [VERSION]
set -eu

VERSION="${1:-2.0}"
REPO="$(cd "$(dirname "$0")/.." && pwd)"
TEMPLATE="$REPO/packaging/debian-template"
BUILD="$(mktemp -d)"
trap 'rm -rf "$BUILD"' EXIT
PKG="$BUILD/jarvis-office"

cp -r "$TEMPLATE" "$PKG"
mkdir -p "$PKG/usr/share/jarvis-office" "$PKG/usr/share/doc/jarvis-office"
cp "$REPO/index.html" "$PKG/usr/share/jarvis-office/"
cp -r "$REPO/css" "$REPO/js" "$PKG/usr/share/jarvis-office/"

cat > "$PKG/usr/share/doc/jarvis-office/copyright" <<EOF
Format: https://www.debian.org/doc/packaging-manuals/copyright-format/1.0/
Upstream-Name: jarvis-office
Source: https://github.com/sunniboi/Jarvis-Office

Files: *
Copyright: $(date +%Y) sunniboi
License: proprietary
 Alle Rechte vorbehalten.
EOF

# Rechte setzen: Verzeichnisse 755, Dateien 644, Skripte 755
find "$PKG" -type d -exec chmod 755 {} +
find "$PKG" -type f -exec chmod 644 {} +
chmod 755 "$PKG/usr/bin/jarvis-office" "$PKG/DEBIAN/postinst" "$PKG/DEBIAN/postrm"

SIZE="$(du -sk --exclude=DEBIAN "$PKG" | cut -f1)"
sed -i "s/@VERSION@/$VERSION/g; s/@INSTALLED_SIZE@/$SIZE/g" "$PKG/DEBIAN/control" "$PKG/DEBIAN/postinst"
sed -i "s/Jarvis Office v[0-9.]*</Jarvis Office v$VERSION</" "$PKG/usr/share/jarvis-office/index.html"

OUT="$REPO/jarvis-office_${VERSION}_all.deb"
dpkg-deb --root-owner-group --build "$PKG" "$OUT"
echo "Gebaut: $OUT"
