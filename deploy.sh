#!/usr/bin/env bash
#
# Deploy StormExplorer to concord-consortium/demos.
#
#   - Builds this app.
#   - Publishes it to the ROLLING branch `storm-explorer-multirun` (the "latest" URL).
#   - Cuts a PERMANENT version-pinned branch `storm-explorer-multirun-v0.X` so every
#     version stays live at its own shareable URL.
#
# It pushes ONLY to the demos repo — never to this repo's `upstream` (hurricane-model),
# which is the wrong deploy target.
#
# Usage:
#   ./deploy.sh              # version read from src/components/top-bar/top-bar.tsx
#   ./deploy.sh v0.5         # override the version
#   ./deploy.sh -y           # skip the confirmation prompt
#   DEMOS_DIR=/path ./deploy.sh   # point at a different demos clone
#
set -euo pipefail

SE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEMOS_DIR="${DEMOS_DIR:-$HOME/Desktop/Projects/demos}"
ROLLING_BRANCH="storm-explorer-multirun"
BASE_URL="https://models-resources.concord.org/demos/branch"

# ---- args ----
ASSUME_YES=0
VERSION=""
for arg in "$@"; do
  case "$arg" in
    -y|--yes) ASSUME_YES=1 ;;
    v[0-9]*)  VERSION="$arg" ;;
    *) echo "!! unknown arg: $arg"; exit 1 ;;
  esac
done

# ---- version (single source of truth: top-bar.tsx, unless overridden) ----
if [ -z "$VERSION" ]; then
  VERSION="$(grep -oE 'v[0-9]+\.[0-9]+' "$SE_DIR/src/components/top-bar/top-bar.tsx" | head -1 || true)"
fi
[ -n "$VERSION" ] || { echo "!! Could not determine version. Pass it, e.g. ./deploy.sh v0.5"; exit 1; }
PINNED_BRANCH="${ROLLING_BRANCH}-${VERSION}"
[ -d "$DEMOS_DIR/.git" ] || { echo "!! demos repo not found at $DEMOS_DIR (set DEMOS_DIR=...)"; exit 1; }

echo "StormExplorer deploy"
echo "  version : $VERSION"
echo "  rolling : $ROLLING_BRANCH   -> $BASE_URL/$ROLLING_BRANCH/?mode=storm"
echo "  pinned  : $PINNED_BRANCH -> $BASE_URL/$PINNED_BRANCH/?mode=storm"
echo "  demos   : $DEMOS_DIR"
if [ "$ASSUME_YES" -ne 1 ]; then
  read -r -p "Proceed with build + push to concord/demos? [y/N] " ans
  case "$ans" in y|Y|yes|YES) ;; *) echo "aborted."; exit 1 ;; esac
fi

# ---- build ----
echo "==> Building…"
( cd "$SE_DIR" && npm run build )
[ -f "$SE_DIR/dist/index.html" ] || { echo "!! build produced no dist/index.html"; exit 1; }

# ---- isolated worktree on the rolling branch (never disturbs the demos checkout) ----
WT="$(mktemp -d /tmp/se-deploy-wt.XXXXXX)"
cleanup() { git -C "$DEMOS_DIR" worktree remove --force "$WT" >/dev/null 2>&1 || rm -rf "$WT"; }
trap cleanup EXIT
echo "==> Preparing demos worktree…"
git -C "$DEMOS_DIR" fetch -q origin "$ROLLING_BRANCH"
git -C "$DEMOS_DIR" worktree add -B "$ROLLING_BRANCH" "$WT" "origin/$ROLLING_BRANCH" >/dev/null

# ---- swap in the fresh build, preserving deploy infrastructure ----
echo "==> Swapping in build (keeping .github/ + README.md)…"
( cd "$WT" && find . -maxdepth 1 -mindepth 1 -not -name .git -not -name .github -not -name README.md -exec rm -rf {} + )
cp -R "$SE_DIR/dist/." "$WT/"

# ---- commit + push rolling branch ----
git -C "$WT" add -A
if git -C "$WT" diff --cached --quiet; then
  echo "==> No changes vs current $ROLLING_BRANCH — skipping rolling push."
else
  git -C "$WT" commit -q -m "Deploy Storm Explorer Multi-track $VERSION"
  echo "==> Pushing ${ROLLING_BRANCH}..."
  git -C "$WT" push origin "$ROLLING_BRANCH"
fi

# ---- cut the permanent, immutable version-pinned branch (only if new) ----
if git -C "$DEMOS_DIR" ls-remote --exit-code --heads origin "$PINNED_BRANCH" >/dev/null 2>&1; then
  echo "==> NOTE: $PINNED_BRANCH already exists (pinned versions are immutable)."
  echo "          Bump the version in top-bar.tsx for a new pinned release."
else
  echo "==> Cutting pinned branch ${PINNED_BRANCH}..."
  git -C "$WT" push origin "HEAD:refs/heads/$PINNED_BRANCH"
fi

# ---- Sync SOURCE to the prototype handoff branch ---------------------------------------------
# Commit any pending source in THIS repo, then push it to the developer's readable-source branch on
# hurricane-model (the open "do not merge" PR updates automatically). This is a SOURCE branch, NOT a
# deploy — the app only deploys to concord/demos above. A push failure here is non-fatal (the deploy
# already succeeded); just re-run the printed command.
PROTOTYPE_BRANCH="storm-explorer-multirun-prototype"
echo "==> Syncing source to ${PROTOTYPE_BRANCH}…"
git -C "$SE_DIR" add -A
if git -C "$SE_DIR" diff --cached --quiet; then
  echo "    (no source changes to commit)"
else
  git -C "$SE_DIR" commit -q -m "Deploy Storm Explorer Multi-track $VERSION (source)"
  echo "    committed source on $(git -C "$SE_DIR" branch --show-current)"
fi
if git -C "$SE_DIR" push upstream "HEAD:$PROTOTYPE_BRANCH"; then
  echo "    pushed source -> $PROTOTYPE_BRANCH (PR updates automatically)"
else
  echo "    !! source push failed — re-run:  git -C \"$SE_DIR\" push upstream HEAD:$PROTOTYPE_BRANCH"
fi

echo ""
echo "==> Done. concord/demos CI is deploying now (~2-3 min):"
echo "    latest : $BASE_URL/$ROLLING_BRANCH/?mode=storm"
echo "    $VERSION  : $BASE_URL/$PINNED_BRANCH/?mode=storm"
echo "    source : github.com/concord-consortium/hurricane-model/tree/$PROTOTYPE_BRANCH (PR auto-updates)"
