#!/bin/bash

# 发布所有平台包到 npm
# 需要先运行 download-binaries.sh

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

  echo "Publishing @adversity/mcp-database-$pkg_name..."

  cd "$pkg_dir"

  if [ "$DRY_RUN" = "true" ]; then
    npm publish --dry-run || echo "Failed to publish @adversity/mcp-database-$pkg_name, continuing..."
  else
    npm publish --access public || echo "Failed to publish @adversity/mcp-database-$pkg_name, continuing..."
  fi

  echo ""
done

# 2. 发布主包
echo "=== Publishing main package (@adversity/mcp-database) ==="
cd "$ROOT_DIR"

if [ "$DRY_RUN" = "true" ]; then
  npm publish --dry-run || echo "Failed to publish @adversity/mcp-database, continuing..."
else
  npm publish --access public || echo "Failed to publish @adversity/mcp-database, continuing..."
fi

echo ""

echo "Done!"
echo ""
echo "Published packages:"
echo "  - @adversity/mcp-database"
for pkg_name in "${PLATFORMS[@]}"; do
  echo "  - @adversity/mcp-database-$pkg_name"
done
