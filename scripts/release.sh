#!/usr/bin/env bash
# Skript pro vydání nové verze Redmine Focus
# Použití: TAURI_SIGNING_PRIVATE_KEY=... TAURI_SIGNING_PRIVATE_KEY_PASSWORD=... APPLE_ID=... APPLE_PASSWORD=... APPLE_TEAM_ID=... ./scripts/release.sh
set -e

export PATH="$PATH:/Users/paveltrnka/Library/Caches/puccinialin/rustup/toolchains/stable-aarch64-apple-darwin/bin/"

VERSION=$(node -p "require('./package.json').version")
echo "Vydávám verzi $VERSION"

# Build s podepisováním updatů a notarizací
npm run tauri build

DMG="src-tauri/target/release/bundle/dmg/Redmine Focus_${VERSION}_aarch64.dmg"
UPDATER_TAR="src-tauri/target/release/bundle/macos/Redmine Focus.app.tar.gz"
UPDATER_SIG="src-tauri/target/release/bundle/macos/Redmine Focus.app.tar.gz.sig"

if [ ! -f "$UPDATER_SIG" ]; then
  echo "CHYBA: .sig soubor nebyl vygenerován. Nastav TAURI_SIGNING_PRIVATE_KEY."
  exit 1
fi

SIG=$(cat "$UPDATER_SIG")
PUB_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Aktualizuj latest.json
cat > docs/latest.json <<EOF
{
  "version": "$VERSION",
  "notes": "Viz https://github.com/trnkapavel/redmine/releases/tag/v$VERSION",
  "pub_date": "$PUB_DATE",
  "platforms": {
    "darwin-aarch64": {
      "signature": "$SIG",
      "url": "https://github.com/trnkapavel/redmine/releases/download/v$VERSION/Redmine.Focus.app.tar.gz"
    }
  }
}
EOF

echo "latest.json aktualizován"

# Commit a push
git add docs/latest.json package.json package-lock.json src-tauri/tauri.conf.json src-tauri/Cargo.toml src-tauri/Cargo.lock
git commit -m "chore: release v$VERSION"
git tag "v$VERSION"
git push && git push origin "v$VERSION"

# GitHub release
gh release create "v$VERSION" \
  "$DMG" \
  "$UPDATER_TAR" \
  "$UPDATER_SIG" \
  --title "v$VERSION" \
  --notes "Viz CHANGELOG nebo GitHub commits"

echo "Hotovo! v$VERSION vydána."
