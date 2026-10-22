# Theme saves and recoverable migration

These changes are included in the refreshed arm64 and universal 3.1.4
downloads built from `f47e401`. The standalone x64 download has been removed
from 3.1.4; Intel users should choose universal.

## Saving XML changes

The XML editor saves to **Current Settings**, not to the selected library
theme. Use **Apply Theme** to write the changes to the game.

- **Overwrite Theme** explicitly confirms before replacing the selected
  library theme with Current Settings.
- **Save Copy** (the two-page toolbar icon) saves Current Settings as a new
  library theme. It does not apply the theme to the game. Existing names,
  including case-only variations and symlinks, are refused. Cancel does not
  write anything. Copies without artwork use the normal fallback thumbnail.
- The XML panel preview uses a HUD mask so the surrounding scene is not
  recolored.

## Legacy migration backups

The updater hotfix pass processes each configured game instance separately.
Manual EDHM installation also performs the migration for that instance.
Close Elite before installing or updating EDHM.

Only the curated Odyssey legacy shader files and old CockpitPaintMod/
BiomeOverlayMod folders are retired. They are absent from the bundled v22.04
payload. The old blanket removal of DLLs and library themes is not performed.
Wine DLL overrides are unchanged.

Backups are stored under the instance's game directory:

```text
EDHM-UI-Backups/legacy-hotfix/ShaderFixes/...
EDHM-UI-Backups/legacy-hotfix/EDHM-ini/3rdPartyMods/...
```

This location is outside the active recursive INI includes. Existing backups
are preserved with numeric suffixes. Symlinks are archived as links, without
deleting their targets. If app data and the bottle are on different volumes,
the migration copies the backup successfully before removing the obsolete
source. A failed copy leaves the source in place and reports the error.

To recover a file, quit the game and UI, then move the relevant backup back
to its original relative path under that **same instance**. Do not overwrite
a newer file without first backing it up. Relative symlinks retain their
original link text and should be restored at their original location.
Restoring obsolete shaders or mods may reintroduce rendering problems.

The two previously implemented v22.04 shader backups remain beside their
original shader files with `.pre-v22.04[.N].bak` suffixes.
