# Experimental DXMT ARM64EC package for EDHM on CrossOver

This package is a locally built, **unmodified upstream DXMT** revision [`7c8dee1`](https://github.com/3Shain/dxmt/commit/7c8dee1c2d73415301ceb7d1fa810861cef4cd67), packaged for Apple Silicon CrossOver ARM bottles using FEX/ARM64EC.

It was tested only with Elite Dangerous Odyssey, EDHM, and CrossOver Preview 27.0.0.40921 on a 3024×1964 panel. It is **experimental**, is not an official DXMT, CrossOver, CodeWeavers, EDHM, or Frontier release, and is not a general compatibility claim.

## What is included

- ARM64X `d3d11.dll`, `dxgi.dll`, `winemetal.dll`, and `d3d10core.dll`
- arm64 `winemetal.so`
- DXMT source provenance and the LGPL-2.1-or-later license
- `enable-wine-retina-mode.reg`
- a macOS installer that creates a separate CrossOver app copy

The DXGI factory and D3D11 swapchain entry points in this upstream revision are ARM64EC hotpatchable. That is relevant to x64 hook DLLs such as EDHM/3Dmigoto, but it does not guarantee compatibility with every EDHM version, CrossOver release, or overlay.

## Prerequisites

- Apple Silicon Mac
- CrossOver with an ARM bottle and Elite Dangerous already working
- EDHM installed in the Elite game directory
- EDHM bottle overrides:

  ```text
  d3d11            native,builtin
  d3dcompiler_47  native,builtin
  ```

- All CrossOver and Elite processes closed before installation

## Install

1. Download the `dxmt-arm64ec-edhm-crossover-7c8dee1.zip` prerelease asset.
2. Verify its SHA-256 using the release checksum file.
3. Unzip it, then run:

   ```bash
   cd dxmt-arm64ec-edhm-crossover-7c8dee1
   ./install-dxmt-arm64ec-crossover.sh "/Applications/CrossOver Preview.app"
   ```

   Pass your own CrossOver app path if its name differs.

4. The script creates a new app under `~/Applications`, named like:

   ```text
   CrossOver Preview DXMT 7c8dee1 ARM64EC.app
   ```

   It does **not** modify the original CrossOver app or copy DLLs into the bottle.

5. Launch the existing ARM bottle through the new copied CrossOver app. Do not run the game while installing or replacing modules.

## Enable Retina display reporting

For a Retina panel, import `enable-wine-retina-mode.reg` into the **target bottle** using CrossOver's Regedit/Run Command interface, then fully restart that bottle.

It adds only:

```text
HKEY_CURRENT_USER\Software\Wine\Mac Driver
RetinaMode = y
```

This makes Wine report the native panel mode to Windows applications. It is separate from Windows DPI scaling. In the tested setup, DPI remained at 96.

## Rollback

1. Fully quit Elite and CrossOver.
2. Move the copied `CrossOver … DXMT 7c8dee1 ARM64EC.app` from `~/Applications` to the Trash.
3. Launch the bottle through the original CrossOver app.
4. Optional: remove `RetinaMode` from the bottle registry if native-resolution reporting is unwanted.

No bottle DXMT modules are overwritten by this package, so no DLL restore step is required.

## Support and reporting

Include your macOS version, CrossOver version, whether the bottle is ARM/FEX, EDHM version, game branch, panel resolution, the SHA-256 of the ZIP, and whether RetinaMode is enabled. Do not report this issue to CodeWeavers or DXMT upstream as though it were an official build.

## License and source

DXMT is Copyright © 2023–2026 Feifan He for CodeWeavers and licensed LGPL-2.1-or-later. The ZIP includes the license text and build provenance. Source: <https://github.com/3Shain/dxmt/tree/7c8dee1c2d73415301ceb7d1fa810861cef4cd67>.
