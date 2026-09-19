# EDHM-UI-Mac

EDHM-UI-Mac is an independent macOS/CrossOver fork of [EDHM-UI](https://github.com/BlueMystical/EDHM_UI), the configuration and theme manager for [EDHM](https://github.com/psychicEgg/EDHM) in Elite Dangerous.

It is intended for **macOS users running the Windows game through CrossOver**. EDHM-UI-Mac itself runs natively on macOS; it is not installed or run inside the Wine prefix (CrossOver bottle). It is not an official upstream macOS release.

![EDHM-UI-Mac running natively on macOS](static/preview.jpg)

> **Using EDHM with CrossOver Preview on Apple Silicon?** [Download the experimental ARM64EC DXMT package.](https://github.com/ProbabilityEngineer/EDHM-UI-Mac/releases/tag/dxmt-arm64ec-7c8dee1) It is for ARM/FEX bottles and installs into a separate CrossOver app copy.

## Release parity and provenance

The current macOS build is based on upstream EDHM-UI **v3.0.70** and bundles the Odyssey EDHM payload **v22.02**. It retains upstream Windows behavior where compatible while adding macOS/CrossOver support for paths, installation, themes, TPMods, and signed/notarized packaging.

The product branch is [`macos`](https://github.com/ProbabilityEngineer/EDHM-UI-Mac/tree/macos); [`main`](https://github.com/ProbabilityEngineer/EDHM-UI-Mac/tree/main) mirrors upstream EDHM-UI. This repository is a fork/adaptation, not an official upstream macOS release. Upstream project and mod credits remain with [Blue Mystic](https://github.com/BlueMystical), [psychicEgg](https://github.com/psychicEgg), and the EDHM contributors.

## Download

Download the ZIP for your Mac from the [GitHub Releases](https://github.com/ProbabilityEngineer/EDHM-UI-Mac/releases):

- **Universal** — Apple Silicon and Intel Macs (recommended)
- **arm64** — Apple Silicon Macs

Releases are Developer ID signed, Apple-notarized, and stapled. After unzipping, move the app to Applications and open it normally in Finder.

## Requirements

- macOS
- [CrossOver](https://www.codeweavers.com/crossover) with Elite Dangerous installed in a CrossOver bottle (Wine prefix)
- Elite Dangerous Horizons or Odyssey installed through CrossOver
- The game must remain a Windows installation; do not copy it to a native macOS location

## Important: native side versus Wine side

| Component | Location |
|---|---|
| EDHM-UI-Mac application | Native macOS app, outside the bottle |
| Elite Dangerous | Windows executable inside the CrossOver bottle |
| EDHM files and DLLs | The Elite game directory inside `drive_c` |
| EDHM-UI-Mac settings/themes | `~/Library/Application Support/EDHM-UI-V3` |
| EDHM-UI-Mac cache/temp files | `~/Library/Caches/EDHM-UI-V3` |

## First-time setup

1. Install and launch Elite Dangerous through CrossOver once.
2. Launch the native EDHM-UI app.
3. Open **Settings**.
4. Set the following independently:
   - **Game folder** — the folder containing `EliteDangerous64.exe` inside the bottle.
   - **CrossOver Bottle Root** — the CrossOver bottle folder containing `drive_c` and `user.reg`.
   - **Player Journal Location** — the folder containing the Elite `Journal.*.log` files.
   - **Graphics Config XML Folder** — the folder containing `GraphicsConfiguration.xml` and/or `GraphicsConfigurationOverride.xml`.
5. You can browse to the executable manually, or use the localization assistant while Elite is running at the main menu. The assistant can infer the bottle root from the running CrossOver process.

The usual bottle layout resembles:

```text
<your bottle>/drive_c/Program Files (x86)/Frontier/EDLaunch/Products/elite-dangerous-odyssey-64
```

Do not assume this exact path; select the path belonging to your own bottle.

## Install EDHM

1. Close Elite Dangerous.
2. In EDHM-UI-Mac, select the configured game instance.
3. Choose **Install EDHM**.
4. Confirm the CrossOver bottle and game paths.
5. The installer copies the bundled EDHM files, creates the required CrossOver-safe links for `EDHM-ini` and `ShaderFixes`, installs themes, and configures the CrossOver DLL overrides when possible.

The installer uses temporary extraction and copies through symlink targets. This is intentional and avoids the macOS/CrossOver failure where archive extraction treats `EDHM-ini` as “not a directory”.

## CrossOver DLL overrides

For the tested CrossOver configuration, set these bottle-level overrides to:

```text
d3d11            native,builtin
d3dcompiler_47  native,builtin
```

EDHM-UI-Mac can configure these from the EDHM DLL override control in Settings. Restart CrossOver/Elite after changing them. These are bottle-level settings and may affect other Windows programs in that bottle; uninstalling EDHM does not remove them automatically.

The tested working renderer is **DXMT**. D3DMetal may launch Elite, but EDHM themes did not apply reliably and could crash in the tested bottle. Steam/Epic launcher combinations and other CrossOver bottles still need separate validation.

## Using themes and TPMods

- Start Elite and leave it at the menus when testing setup.
- Select a theme in EDHM-UI-Mac and choose **Apply Theme**.
- Theme selection supports mouse and keyboard navigation: Arrow keys, Home, End, and Enter.
- The app now reports EDHM status and can enable/disable the paired EDHM proxy DLLs without uninstalling the mod.
- Install TPMods from the TPMods manager after EDHM has been installed for the selected game instance.

Do not delete the CrossOver bottle's unrelated DXMT backup/version files. EDHM uninstall removes EDHM-owned files but intentionally preserves CrossOver DLL override configuration.

## Troubleshooting

### Blank EDHM-UI window

This package is the native macOS build and should not need Wine rendering flags. If you are running the **Windows** EDHM-UI executable inside CrossOver, use:

```text
--use-angle=swiftshader --enable-unsafe-swiftshader --in-process-gpu --no-sandbox
```

Those flags are automatically applied by the Windows build when it detects Wine/CrossOver; they are not applied to the native macOS app.

### EDHM does not appear in game

- Confirm Elite is fully closed before installing or toggling EDHM.
- Confirm `d3d11` and `d3dcompiler_47` are `native,builtin` in the correct CrossOver bottle.
- Use DXMT rather than D3DMetal for the tested setup.
- Verify that the selected game folder is the one containing `EliteDangerous64.exe`.
- Reinstall EDHM from the app if the DLL pair or symlink targets are incomplete.

### Journal or XML settings are not found

Re-open Settings and select the actual host-side folders. The game folder, journal folder, graphics XML folder, and bottle root are separate inputs.

## Development

The current Electron/Vue source is in [`source_v3`](source_v3). Development builds use Node 22:

```bash
cd source_v3
npm install
npx -y -p node@22 -c 'npm run make'
```

## Links

- [EDHM-UI-Mac repository](https://github.com/ProbabilityEngineer/EDHM-UI-Mac)
- [Upstream EDHM-UI](https://github.com/BlueMystical/EDHM_UI)
- [EDHM mod](https://github.com/psychicEgg/EDHM)
- [EDHM website/manual](https://bluemystical.github.io/edhm-api/)
- [Discord support](https://discord.gg/ZaRt6bCXvj)

## License

This project remains licensed under [GPL-3.0+](license.txt).

## CrossOver Preview ARM64EC DXMT for EDHM (experimental)

This optional [DXMT ARM64EC prerelease](https://github.com/ProbabilityEngineer/EDHM-UI-Mac/releases/tag/dxmt-arm64ec-7c8dee1) is for Apple Silicon users running Elite through a CrossOver Preview ARM/FEX bottle with EDHM/3Dmigoto. It packages an unmodified upstream DXMT build with ARM64EC-compatible hook entry points. It was tested only with Elite Dangerous Odyssey + EDHM on CrossOver Preview, so it is not an official or general compatibility guarantee.

It does **not** replace DXMT files in your bottle or your installed CrossOver app. Instead, its installer creates a separate app copy in `~/Applications` with the matched Windows and Unix DXMT modules.

### Install and use it

1. Fully quit Elite and CrossOver.
2. Download [`dxmt-arm64ec-edhm-crossover-7c8dee1.zip`](https://github.com/ProbabilityEngineer/EDHM-UI-Mac/releases/tag/dxmt-arm64ec-7c8dee1) and optionally verify it with the accompanying `.sha256` file.
3. Unzip it and run:

   ```bash
   cd dxmt-arm64ec-edhm-crossover-7c8dee1
   ./install-dxmt-arm64ec-crossover.sh "/Applications/CrossOver Preview.app"
   ```

4. Launch your existing ARM bottle using the new `CrossOver Preview DXMT 7c8dee1 ARM64EC.app` copy in `~/Applications`.
5. For native Retina resolution reporting, import the included `enable-wine-retina-mode.reg` into that bottle, then restart the bottle.
6. Ensure the EDHM bottle overrides remain `d3d11=native,builtin` and `d3dcompiler_47=native,builtin`.

To roll back, quit CrossOver and delete the copied DXMT CrossOver app; the original CrossOver installation and bottle DLLs are unchanged. See [the full package instructions](docs/DXMT_ARM64EC_EDHM.md) for requirements, provenance, troubleshooting, and rollback details.
