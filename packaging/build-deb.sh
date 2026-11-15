#!/bin/bash
# Baut jarvis-office_<Version>_all.deb aus dem aktuellen Stand des Repos.
set -euo pipefail
cd "$(dirname "$0")/.."
VERSION=$(sed -n 's/^Version: //p' packaging/deb/DEBIAN/control)
STAGE=$(mktemp -d)
trap 'rm -rf "$STAGE"' EXIT
PKG="$STAGE/jarvis-office_${VERSION}_all"
mkdir -p "$PKG/usr/share/jarvis-office"
cp -r packaging/deb/DEBIAN packaging/deb/usr "$PKG/"
cp -r index.html css js server "$PKG/usr/share/jarvis-office/"
find "$PKG" -name '__pycache__' -prune -exec rm -rf {} +
chmod 755 "$PKG/DEBIAN/postinst" "$PKG/DEBIAN/postrm" "$PKG/DEBIAN/prerm" "$PKG/usr/bin/jarvis-office"
SIZE=$(du -sk "$PKG/usr" | cut -f1)
sed -i "s/^Installed-Size: .*/Installed-Size: $SIZE/" "$PKG/DEBIAN/control"
rm -f jarvis-office_*_all.deb
dpkg-deb --build --root-owner-group "$PKG" "jarvis-office_${VERSION}_all.deb"
