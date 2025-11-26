#!/bin/bash

# 发布所有平台包到 npm
# 需要先运行 download-binaries.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
PACKAGES_DIR="$ROOT_DIR/packages"

PLATFORMS=(
  "darwin-arm64"
  "darwin-x64"
  # "linux-arm64"
  "linux-x64"
  "win32-x64"
)

DRY_RUN="${DRY_RUN:-true}"

echo "Publishing packages..."
echo ""

if [ "$DRY_RUN" = "true" ]; then
  echo "DRY RUN MODE - use DRY_RUN=false to actually publish"
  echo ""
fi

# 1. 发布平台特定包
echo "=== Publishing platform-specific packages ==="
for pkg_name in "${PLATFORMS[@]}"; do
  pkg_dir="$PACKAGES_DIR/$pkg_name"

  if [ ! -d "$pkg_dir/bin" ]; then
    echo "Warning: $pkg_name binary not found, skipping..."
    continue
  fi

  echo "Publishing @mcp-database/$pkg_name..."

  cd "$pkg_dir"

  if [ "$DRY_RUN" = "true" ]; then
    npm publish --dry-run
  else
    npm publish --access public
  fi

  echo ""
done

# 2. 发布主包
echo "=== Publishing main package (mcp-database) ==="
cd "$ROOT_DIR"

if [ "$DRY_RUN" = "true" ]; then
  npm publish --dry-run
else
  npm publish --access public
fi

echo ""

# 3. 发布 full 包
echo "=== Publishing full package (@mcp-database/full) ==="
cd "$PACKAGES_DIR/full"

if [ ! -d "binaries" ]; then
  echo "Warning: full package binaries not found, skipping..."
else
  if [ "$DRY_RUN" = "true" ]; then
    npm publish --dry-run
  else
    npm publish --access public
  fi
fi

echo ""
echo "Done!"
echo ""
echo "Published packages:"
echo "  - mcp-database (core, ~50KB)"
echo "  - @mcp-database/full (with all binaries, ~60MB)"
for pkg_name in "${PLATFORMS[@]}"; do
  echo "  - @mcp-database/$pkg_name (~15MB)"
done
