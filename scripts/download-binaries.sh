#!/bin/bash

# 下载所有平台的 genai-toolbox 二进制文件
# 用于构建 npm 包前的准备工作

set -e

VERSION="${TOOLBOX_VERSION:-0.21.0}"
BASE_URL="https://storage.googleapis.com/genai-toolbox/v${VERSION}"

PLATFORMS=(
  "darwin:arm64:darwin-arm64:toolbox"
  "darwin:amd64:darwin-x64:toolbox"
  # "linux:arm64:linux-arm64:toolbox"
  "linux:amd64:linux-x64:toolbox"
  "windows:amd64:win32-x64:toolbox.exe"
)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
PACKAGES_DIR="$ROOT_DIR/packages"
BINARIES_DIR="$ROOT_DIR/binaries"
FULL_PKG_DIR="$PACKAGES_DIR/full/binaries"

echo "Downloading genai-toolbox v${VERSION} binaries..."
echo ""

# 创建目录
mkdir -p "$BINARIES_DIR"
mkdir -p "$FULL_PKG_DIR"

for platform_info in "${PLATFORMS[@]}"; do
  IFS=':' read -r os arch pkg_name binary_name <<< "$platform_info"

  url="${BASE_URL}/${os}/${arch}/${binary_name}"
  pkg_dir="$PACKAGES_DIR/$pkg_name/bin"
  all_dir="$BINARIES_DIR/${pkg_name}"
  full_dir="$FULL_PKG_DIR/${pkg_name}"

  echo "Downloading ${os}/${arch}..."

  # 下载到平台特定包
  mkdir -p "$pkg_dir"
  curl -fsSL "$url" -o "$pkg_dir/$binary_name"
  chmod +x "$pkg_dir/$binary_name"

  # 复制到主包 binaries 目录
  mkdir -p "$all_dir"
  cp "$pkg_dir/$binary_name" "$all_dir/$binary_name"

  # 复制到 full 包
  mkdir -p "$full_dir"
  cp "$pkg_dir/$binary_name" "$full_dir/$binary_name"

  echo "  -> $pkg_dir/$binary_name"
  echo "  -> $all_dir/$binary_name"
  echo "  -> $full_dir/$binary_name"
done

echo ""
echo "All binaries downloaded successfully!"
echo ""
echo "Platform packages (for lightweight install):"
for platform_info in "${PLATFORMS[@]}"; do
  IFS=':' read -r os arch pkg_name binary_name <<< "$platform_info"
  size=$(du -h "$PACKAGES_DIR/$pkg_name/bin/$binary_name" | cut -f1)
  echo "  @mcp-database/$pkg_name: $size"
done

echo ""
echo "Main package (binaries/):"
main_size=$(du -sh "$BINARIES_DIR" | cut -f1)
echo "  Total size: $main_size"

echo ""
echo "Full package (packages/full/binaries/):"
full_size=$(du -sh "$FULL_PKG_DIR" | cut -f1)
echo "  Total size: $full_size"
