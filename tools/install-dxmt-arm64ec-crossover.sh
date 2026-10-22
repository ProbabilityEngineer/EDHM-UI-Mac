#!/bin/bash
# Install the matching DXMT modules into a NEW CrossOver application copy.
# It deliberately never changes the selected bottle or the original CrossOver app.
set -euo pipefail

script_dir=$(cd "$(dirname "$0")" && pwd)
source_app=${1:-"/Applications/CrossOver Preview.app"}
revision=50102f99

if [[ ! -d "$source_app/Contents/SharedSupport/CrossOver/lib/dxmt" ]]; then
  echo "CrossOver app not found or has no DXMT directory: $source_app" >&2
  echo "Usage: $0 '/Applications/CrossOver Preview.app'" >&2
  exit 1
fi

base=$(basename "$source_app" .app)
target_app="$HOME/Applications/${base} DXMT ${revision} ARM64EC NVEXT.app"
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
  dxmt/aarch64-windows/nvapi64.dll \
  dxmt/aarch64-windows/nvngx.dll \
  dxmt/aarch64-unix/winemetal.so; do
  [[ -f "$script_dir/$file" ]] || { echo "Package is incomplete: $file" >&2; exit 1; }
done

# Verify the complete distribution before copying or modifying an app.
[[ -f "$script_dir/SHA256SUMS" ]] || { echo "Package has no SHA256SUMS" >&2; exit 1; }
(cd "$script_dir" && shasum -a 256 -c SHA256SUMS)

for directory in aarch64-windows aarch64-unix; do
  [[ -d "$source_app/Contents/SharedSupport/CrossOver/lib/dxmt/$directory" ]] || {
    echo "CrossOver lacks ARM DXMT support: $directory" >&2; exit 1;
  }
done

mkdir -p "$HOME/Applications"
ditto "$source_app" "$target_app"
# Refuse linked destinations rather than risk following a link out of the copy.
for directory in "$target_app/Contents" "$target_app/Contents/SharedSupport" \
  "$target_app/Contents/SharedSupport/CrossOver" \
  "$target_app/Contents/SharedSupport/CrossOver/lib" "$target_dxmt" \
  "$target_dxmt/aarch64-windows" "$target_dxmt/aarch64-unix"; do
  [[ ! -L "$directory" ]] || { echo "Refusing linked destination: $directory" >&2; exit 1; }
done
for file in aarch64-windows/{d3d11,dxgi,winemetal,d3d10core,nvapi64,nvngx}.dll aarch64-unix/winemetal.so; do
  [[ ! -L "$target_dxmt/$file" ]] || { echo "Refusing linked module: $file" >&2; exit 1; }
  cp "$script_dir/dxmt/$file" "$target_dxmt/$file"
done

printf '\nInstalled a separate CrossOver copy:\n  %s\n\n' "$target_app"
printf '%s\n' 'Launch your existing ARM bottle through that copied app.'
printf '%s\n' 'Rollback: quit CrossOver, then move this copied app to the Trash.'
printf '%s\n' 'The original CrossOver app and all bottle DXMT files were not changed.'
printf '%s\n' 'NVAPI/NGX modules are included; no bottle overrides or upscaling settings were changed.'
