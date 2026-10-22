#!/bin/bash
# Package an existing verified build; never build or deploy into CrossOver here.
set -euo pipefail
build_dir=${1:?Usage: package-dxmt-arm64ec.sh BUILD_DIRECTORY OUTPUT_DIRECTORY}
output_dir=${2:?Specify an output directory}
repo=$(cd "$(dirname "$0")/.." && pwd)
build_dir=$(cd "$build_dir" && pwd)
name=dxmt-arm64ec-edhm-crossover-50102f99-nvext
mkdir -p "$output_dir"
output_dir=$(cd "$output_dir" && pwd)
package="$output_dir/$name"
[[ ! -e "$package" && ! -e "$package.zip" ]] || { echo "Output already exists" >&2; exit 1; }
grep -q '50102f994b406f58f56d5d09f2ad20f9b90390a2' "$build_dir/BUILD-INFO.txt"
(cd "$build_dir" && shasum -a 256 -c SHA256SUMS)
mkdir -p "$package/dxmt/aarch64-windows" "$package/dxmt/aarch64-unix" "$package/licenses"
for name in d3d11 dxgi winemetal d3d10core nvapi64 nvngx; do
  cp "$build_dir/aarch64-windows/$name.dll" "$package/dxmt/aarch64-windows/"
done
cp "$build_dir/aarch64-unix/winemetal.so" "$package/dxmt/aarch64-unix/"
cp "$build_dir/LICENSE" "$package/licenses/DXMT-LICENSE"
cp "$build_dir/COPYING.LIB" "$package/licenses/LGPL-2.1"
cp "$build_dir/BUILD-INFO.txt" "$package/BUILD-PROVENANCE.txt"
cp "$repo/docs/DXMT_ARM64EC_EDHM.md" "$package/README.md"
cp "$repo/tools/install-dxmt-arm64ec-crossover.sh" "$package/"
cp "$repo/tools/enable-wine-retina-mode.reg" "$package/"
chmod +x "$package/install-dxmt-arm64ec-crossover.sh"
(cd "$package" && find . -type f ! -name SHA256SUMS -print | LC_ALL=C sort | while IFS= read -r file; do
  shasum -a 256 "$file"
done > SHA256SUMS)
COPYFILE_DISABLE=1 ditto -c -k --keepParent "$package" "$package.zip"
(cd "$output_dir" && shasum -a 256 "$(basename "$package").zip" > "$(basename "$package").zip.sha256")
printf 'Created %s.zip\n' "$package"
