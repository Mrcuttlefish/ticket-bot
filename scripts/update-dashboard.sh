#!/usr/bin/env sh
# Rebuild the web dashboard from Mrcuttlefish/ticket-portal and copy it into dashboard/.
# Usage: scripts/update-dashboard.sh [git ref]   (default: main)
# Needs git, Node 22 and pnpm (corepack enable).
set -eu

REF="${1:-main}"
REPO="${DASHBOARD_REPO:-https://github.com/Mrcuttlefish/ticket-portal.git}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

git clone --quiet "$REPO" "$TMP/portal"
cd "$TMP/portal"
git checkout --quiet "$REF"
COMMIT="$(git rev-parse HEAD)"
pnpm install --frozen-lockfile
pnpm run build

rm -rf "$ROOT/dashboard/build"
mkdir -p "$ROOT/dashboard"
cp -R build "$ROOT/dashboard/build"
# source maps aren't needed at runtime and double the size
find "$ROOT/dashboard/build" -name '*.map' -delete
printf '%s\n' "$COMMIT" > "$ROOT/dashboard/COMMIT"
echo "dashboard/ updated to $REPO@$COMMIT"
