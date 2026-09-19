#!/bin/bash
# Install the matching DXMT modules into a NEW CrossOver application copy.
# It deliberately never changes the selected bottle or the original CrossOver app.
set -euo pipefail

script_dir=$(cd "$(dirname "$0")" && pwd)
source_app=${1:-"/Applications/CrossOver Preview.app"}
revision=7c8dee1

if [[ ! -d "$source_app/Contents/SharedSupport/CrossOver/lib/dxmt" ]]; then
  echo "CrossOver app not found or has no DXMT directory: $source_app" >&2
  echo "Usage: $0 '/Applications/CrossOver Preview.app'" >&2
  exit 1
fi

base=$(basename "$source_app" .app)
target_app="$HOME/Applications/${base} DXMT ${revision} ARM64EC.app"
target_dxmt="$target_app/Contents/SharedSupport/CrossOver/lib/dxmt"

if [[ -e "$target_app" ]]; then
  echo "Refusing to replace existing copy: $target_app" >&2
  echo "Remove that copied app first, or choose a different source app name." >&2
  exit 1
fi

for file in \
  dxmt/aarch64-windows/d3d11.dll \
  dxmt/aarch64-windows/dxgi.dll \
  dxmt/aarch64-windows/winemetal.dll \
  dxmt/aarch64-windows/d3d10core.dll \
  dxmt/aarch64-unix/winemetal.so; do
  [[ -f "$script_dir/$file" ]] || { echo "Package is incomplete: $file" >&2; exit 1; }
done

mkdir -p "$HOME/Applications"
ditto "$source_app" "$target_app"
cp "$script_dir/dxmt/aarch64-windows/d3d11.dll" "$target_dxmt/aarch64-windows/d3d11.dll"
cp "$script_dir/dxmt/aarch64-windows/dxgi.dll" "$target_dxmt/aarch64-windows/dxgi.dll"
cp "$script_dir/dxmt/aarch64-windows/winemetal.dll" "$target_dxmt/aarch64-windows/winemetal.dll"
cp "$script_dir/dxmt/aarch64-windows/d3d10core.dll" "$target_dxmt/aarch64-windows/d3d10core.dll"
cp "$script_dir/dxmt/aarch64-unix/winemetal.so" "$target_dxmt/aarch64-unix/winemetal.so"

printf '\nInstalled a separate CrossOver copy:\n  %s\n\n' "$target_app"
printf '%s\n' 'Launch your existing ARM bottle through that copied app.'
printf '%s\n' 'Rollback: quit CrossOver, then move this copied app to the Trash.'
printf '%s\n' 'The original CrossOver app and all bottle DXMT files were not changed.'
