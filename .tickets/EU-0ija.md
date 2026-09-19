---
id: EU-0ija
status: closed
deps: []
links: []
created: 2026-06-20T05:37:54Z
type: epic
priority: 2
assignee: Samuel Collins
tags: [macos, electron, planning, refactor]
---
# Plan macOS-native refactor for EDHM_UI v3

Inspect EDHM_UI v3 Electron app, initialize tickets, and produce a phased plan to support native macOS builds and CrossOver/Wine Elite installs.


## Notes

**2026-06-20T06:08:57Z**

Initial macOS refactor review of source_v3 complete. Findings: (1) packaging is Windows-first in source_v3/forge.config.js with no active mac target; commented Linux config suggests intended multi-platform support. (2) Runtime already partially supports darwin/linux in Electron main process and FileHelper path resolution, but many defaults still hard-code Windows env vars (%USERPROFILE%, %LOCALAPPDATA%) and Windows install layout. (3) Game instance detection in SettingsHelper.addNewInstance() infers publisher from path substrings like steamapps/Epic Games/Frontier and maps by Windows-style install folder names. (4) Mod install/uninstall logic assumes Windows game process names and paths, creates symlinks with junction type, and uses Windows-specific hotfix/UI exe paths. (5) FileHelper has mixed platform coverage: openPathInExplorer supports darwin, terminateProgram supports non-Windows via pgrep/kill, but runInstaller supports only win32/linux and runScripOrProgram supports only win32/linux. Recommended phases: A) introduce platform services for app-data/temp/desktop/game-root paths and process launching; B) make forge config platform-aware and add mac packaging/assets; C) add CrossOver/Wine game-instance discovery/provider layer; D) remove Windows-only assumptions from install/hotfix/uninstall flows; E) validate native mac app against a CrossOver bottle.

**2026-06-20T06:24:48Z**

Implemented first macOS path pass in source_v3 as proof of concept. Added FileHelper helpers getAppDataRoot/getCacheRoot/getTempRoot and env vars %EDHM_APPDATA%/%EDHM_CACHEDATA%/%EDHM_TEMPDATA%. Moved program settings root to app-specific platform paths (mac: ~/Library/Application Support/EDHM-UI-V3, cache/temp under ~/Library/Caches/EDHM-UI-V3). Updated SettingsHelper, ThemeHelper, LoggingHelper, and default Settings.json to use the app-data root instead of hard-coded %USERPROFILE%\\EDHM_UI and %LOCALAPPDATA% temp paths. Left broader game-discovery/install abstraction for follow-up; current goal is minimal mac proof of concept.

**2026-06-20T06:31:21Z**

Added proof-of-concept manual path UX for mac/CrossOver in source_v3 SettingsEditor. New config field PlayerConfigFolder defaults to the Windows Elite graphics config folder path. Settings UI now exposes separate fields for Player Journal Location and Elite Config XML Folder, with browse actions and Windows default guidance text. Game executable browse flow now prompts for missing journal/config folders after manual executable selection, and the localization wizard messaging now explicitly mentions manual setup on mac/CrossOver. Also updated user-data relocation to write primary settings under %EDHM_APPDATA% rather than hard-coded %LOCALAPPDATA%\\EDHM-UI-V3. This is still a minimal PoC; PlayerConfigFolder is collected and persisted but not yet consumed by downstream XML-mod logic.

**2026-06-20T06:36:08Z**

Wired the new PlayerConfigFolder into XML file resolution at the FileHelper layer. Added getConfiguredGraphicsFolder() and resolveXmlFilePath() so read-xml-file/write-xml-file now redirect GraphicsConfiguration.xml and GraphicsConfigurationOverride.xml to the configured Elite graphics folder when callers pass a non-existent or bare path. This is a minimal PoC approach that avoids broader mod-data/path abstraction changes for now; follow-up could make XML-aware callers explicit rather than relying on helper-level redirection.

**2026-06-20T06:39:35Z**

Added minimal mac packaging support in source_v3/forge.config.js. Config is now platform-aware: Windows keeps the Squirrel maker and .ico icon, while mac uses a generated .icns asset and the generic zip maker. Generated a proof-of-concept mac icon at source_v3/src/images/EDHM-UI-V3.icns from the existing PNG art. Packaging is not fully validated yet because source_v3 dependencies are not installed in this environment (requiring forge plugins fails until npm install is run).

**2026-06-20T06:49:29Z**

Packaging follow-up: trimmed packager copy scope by adding packagerConfig.ignore for /out, /build, /.vite, and /.git in source_v3/forge.config.js. Rationale: package was hanging during Electron Packager 'Copying files'; these generated directories should not be copied into the app source payload because settings_window is already re-added explicitly through extraResource and build artifacts are transient. This is a pragmatic PoC packaging optimization, not a final packaging audit.

**2026-06-20T06:55:58Z**

Successfully built a packaged mac app after debugging packaging. Root cause was running the Electron Forge packaging stack under Node 26; packaging exited prematurely during/after Electron extraction with no output bundle. Re-running under Node 22 via `npx -y -p node@22 -c 'DEBUG=electron-forge:*,electron-packager npm run package'` completed successfully and produced `source_v3/out/EDHM-UI-V3-darwin-arm64/EDHM-UI-V3.app`. Also reverted the custom packager ignore override and let @electron-forge/plugin-vite supply its expected ignore function.

**2026-06-20T06:59:51Z**

Adjusted packaged app UI density for mac proof-of-concept without touching HUD graphics. In source_v3/src/index.css, reduced default --user-font-size from 14px to 12px, removed body max-width/padding, and tightened Bootstrap-derived button/nav/form control paddings via CSS variables. This should shrink oversized text and control chrome while leaving image/canvas HUD graphics unchanged.

**2026-06-20T07:21:37Z**

Adjusted mac UI scaling logic in source_v3/src/main.js. The app had been applying Electron zoomFactor equal to the macOS Retina display scaleFactor (e.g. 2x), which made the entire UI huge. Automatic scaling on darwin now defaults to zoomFactor 1 unless the user explicitly sets UiScaleFactor.

**2026-06-20T07:27:29Z**

Removed the non-useful blue/green toast guidance from the settings dialog on mac PoC. In source_v3/src/SettingsWindow/SettingsEditor.vue, the first-run info toast and game localization assistant info/success RoastMe notifications were removed so the settings UI opens cleanly without overlay boxes.

**2026-06-20T07:33:03Z**

Removed legacy Custom Icon UI/code from the in-app settings modal (src/MainWindow/SettingsEditor.vue) and stripped the non-useful green/blue RoastMe notifications from that modal's first-run and game localization assistant flow. This addresses the remaining popups the user was seeing in the packaged app.

**2026-06-20T07:37:31Z**

Beginning repo workflow hardening follow-up: refine repo AGENTS.md, then align/publish the current jj change, and reconfigure remotes into a fork-style setup so upstream remains the original BlueMystical repo while origin can point to the user's fork.

**2026-06-20T07:39:38Z**

Refined repo-local AGENTS.md with stronger EDHM-specific guidance for source_v3 focus, jj-first workflow, ticket/turnlog usage, fork-style remote expectations, and mac/CrossOver packaging notes. Also initialized jj local identity and added upstream as an explicit Git remote alias. Publishing is currently blocked because the authenticated GitHub account (ProbabilityEngineer) does not yet appear to have a fork at github.com/ProbabilityEngineer/EDHM_UI.

**2026-06-20T07:42:16Z**

Fork now exists at github.com/ProbabilityEngineer/EDHM_UI. Repointing origin to the fork, keeping upstream on BlueMystical, and aligning/publishing the current jj workflow setup changes.

**2026-06-20T07:47:10Z**

Reworked the fork layout for easier upstream sync. Instead of carrying the mac/workflow changes directly on main, created a dedicated feature branch/bookmark `macos-crossover-poc` at the current work, then moved fork `main` back to match upstream `main` (v3.0.66). Pushed both so origin/main now mirrors upstream and origin/macos-crossover-poc holds the ongoing mac port work.

**2026-06-20T07:49:22Z**

Extended AGENTS.md with an explicit fork/upstream sync workflow: keep main aligned with upstream/main, keep ongoing mac work on macos-crossover-poc, and refresh by fetching upstream, moving main to upstream/main, rebasing the feature branch, then pushing both to the fork.

**2026-06-20T07:50:37Z**

Finalizing the latest workflow cleanup: committing the AGENTS upstream-sync guidance and matching ticket note updates onto macos-crossover-poc, then pushing the feature branch with an empty jj working copy on top.

**2026-06-20T08:03:27Z**

Diagnosed the lingering first-start blue/green boxes: they were still being emitted from source_v3/src/MainWindow/App.vue, not the settings editors. Removed the two startup RoastMe welcome/instruction toasts there while leaving the settings window auto-open and the localization wizard logic intact.

**2026-06-20T08:14:32Z**

User confirmed the first-start blue/green boxes are gone and settings still auto-open. Investigating the Game Localization Wizard next because clicking it appears to do nothing on macOS/CrossOver even with Elite already running at the menus.

**2026-06-20T08:16:20Z**

Confirmed the Game Localization Wizard is genuinely broken on macOS/CrossOver, not just silent. EliteDangerous64.exe is visible in the host process list, but FileHelper.detectProgram uses a Linux-style /proc lookup on non-Windows platforms and reads cwd instead of an executable path, so detection fails on mac. Implementing a mac-specific detection fix next.

**2026-06-20T08:18:32Z**

After the mac-specific process detection fix, the wizard still appears inert. Investigating the next likely CrossOver-specific failure: Windows-style executable paths are being passed back into renderer-side path.dirname on macOS, which would collapse to '.' instead of the game folder.

**2026-06-20T08:18:54Z**

Found a second mac/CrossOver wizard failure after process detection: preload.js used path.dirname() on a Windows-style executable path, which resolves to '.' on macOS. Updated getParentFolder() to detect Windows-style paths and use path.win32.dirname() so the wizard can derive the actual Elite folder from CrossOver process paths.

**2026-06-20T08:34:34Z**

User confirmed the wizard now detects/populates the game path on mac/CrossOver, but the current behavior of forcibly closing Elite is too abrupt. Updating the wizard UX to explain what the green button does, require Elite to be running first, and use modal confirmation/guidance before closing the game.

**2026-06-20T08:35:29Z**

Updated both settings-window wizard flows to use modal guidance instead of silent/background behavior. The green button now explains that Elite should already be running at the main menu, warns what the wizard is for, shows a clear 'not detected' modal if the game is not running, and asks whether to close Elite after detecting/populating the game folder instead of forcibly terminating it immediately.

**2026-06-20T08:53:36Z**

Renaming the user-facing label for SavesToRemember to the simpler wording the user requested: 'Number of Themes to Save'.

**2026-06-20T09:12:11Z**

Implemented initial CrossOver bottle-path support for non-standard bottle locations. Added CrossOverBottlePath to settings and both settings UIs, updated env/path resolution so %USERPROFILE%, %PROGRAMFILES%, and related Windows-style paths can resolve inside the configured bottle on mac, and made the wizard auto-infer the publisher from the detected game path when possible.

**2026-06-20T09:18:03Z**

User found two follow-up issues: the new wizard close/leave modal still results in Elite closing regardless of button choice, and Hide to Tray on close should be removed for mac because it does not apply. Also clarifying that CrossOver Bottle Root currently does not auto-populate; investigating whether to add detection or keep it manual for now.

**2026-06-20T09:26:55Z**

Wizard 'Leave Elite Running' now behaves correctly. Follow-up fix: CrossOverBottlePath inference likely suffers from Vue 2 reactivity because the property may not exist on already-loaded settings objects, so the textbox does not update even when inference runs. Initializing the property up front next.

**2026-06-20T09:31:43Z**

User reports two more follow-ups: the Clean Install button did not behave as expected and should be renamed to Reset, and CrossOver Bottle Root still did not auto-populate. Fixing the reset flow and making bottle-root inference run during settings initialization from an existing detected game path as well as during wizard/manual path updates.

**2026-06-20T09:48:38Z**

Applying two more mac-focused simplifications: remove the Themes & User's Data field from the settings UIs, and tighten CrossOver bottle-root inference so it derives directly from the host-side EliteDangerous64.exe path before the path is reduced to the game folder.

**2026-06-20T09:50:57Z**

Removed the Themes & User's Data control from both settings UIs so EDHM app data stays fixed to ~/Library/Application Support/EDHM-UI-V3. Also updated bottle-root inference to derive from the actual host executable path (translated from the detected Windows path first) instead of only from the reduced game folder, and made Reset clear the visible journal/config/bottle/game-path fields in the open form.

**2026-06-20T09:55:56Z**

Adjusted mac settings UX based on test feedback: Reset now clears PlayerJournal and PlayerConfigFolder to empty visible values instead of repopulating Windows defaults, MainWindow journal field now spans the full row from the left edge like the bottle-root field, and mac process detection now infers the CrossOver bottle root from the host-side /drive_c path embedded in the running process command line so detected exe paths can translate even before CrossOverBottlePath is configured.

**2026-06-20T09:59:52Z**

Follow-up on wizard regression: added a main-process bottle-path inference IPC that derives bottle user profile, journal folder, and graphics-config folder from a detected CrossOver bottle root. Both settings editors now call this during manual exe selection and wizard detection so the wizard can repopulate PlayerJournal/PlayerConfigFolder and CrossOverBottlePath from the detected game executable instead of relying on saved settings state.

**2026-06-20T10:33:38Z**

Reset auto-restart initially relaunched into a blank packaged window. Switched restart flow to a more graceful relaunch using app.relaunch({ execPath, args }) + app.quit(), tearing down tray/shortcuts and removing close listeners from all windows first. Also added main-window did-fail-load/render-process-gone logging to help capture any remaining packaged relaunch failures.

**2026-06-20T10:35:33Z**

Likely cause of blank post-reset relaunch is single-instance interference during self-restart on mac: the newly relaunched process may race the old one and get treated as a second instance, leaving the old process/window in a bad state. Updated restart flow to release the single-instance lock before relaunch, schedule relaunch on the next tick, and explicitly close all open windows before exiting.

**2026-06-20T10:41:07Z**

Self-relaunch is still broken via Electron's normal relaunch path on packaged mac builds, so reset now uses a mac-specific detached shell helper for packaged apps: it waits briefly, runs `open -n <App.app>`, and then the current process exits. Also renamed the Reset button to 'Reset & Relaunch' in both settings UIs.

**2026-06-20T10:50:35Z**

Polished main-window UX: main window now persists width/height across launches via app-data WindowState.json; NavBars footer now pre-hydrates its app/mod version text and game-instance dropdown directly from current settings instead of depending only on a later event; game dropdown now lists all configured instances instead of only those with non-empty paths; history options now use a plain array instead of a nested ref; and the Apply Theme button styling was normalized so it matches neighboring button height.

**2026-06-20T11:14:43Z**

Renamed settings label from 'CrossOver Bottle Root' to the shorter 'Bottle Root' in both settings UIs. User also reported bottle-root auto-detect still failing and asked whether pid-following could be used; likely next step is stronger pid/process-tree based inference rather than relying only on current command-line parsing.

**2026-06-20T11:26:50Z**

Improved graceful failure for unconfigured instances: 3PMods manager now detects missing game path or missing EDHM-ini/3rdPartyMods folder and shows a warning instead of throwing a red error dialog. Also strengthened mac process parsing for bottle detection by preferring a direct host-side executable path from the process command line before falling back to Windows-path translation.

**2026-06-20T11:38:26Z**

Bottle-root detection still failed; live ps/lsof inspection showed the Elite PID has a reliable cwd under the bottle drive_c path even though ps command lines expose only Windows C:\ paths. Added mac-specific lsof cwd fallback in detectProgram(): for each candidate PID, use lsof -a -p <pid> -d cwd and if it points inside /drive_c, return cwd/EliteDangerous64.exe. This should populate both game path and Bottle Root from the running Elite process without needing a preconfigured bottle root.

**2026-06-20T11:44:24Z**

Bottle root detection finally succeeded via lsof cwd. Verified screenshot paths: game path points inside bottle drive_c Products/elite-dangerous-odyssey-64 and Bottle Root points to the containing bottle. Updated settings inference so default %USERPROFILE% PlayerJournal/PlayerConfigFolder placeholders are overwritten with absolute host paths when a bottle root is inferred, improving mac clarity and avoiding reliance on later env expansion.

**2026-06-20T11:58:23Z**

Addressed latest test blockers: Save Changes no longer auto-installs EDHM files (prevents installEDHMmod during setup save); mac zip extraction now uses /usr/bin/ditto instead of zip-lib to avoid false path-traversal errors with game paths containing spaces; Reset now clears path fields and relaunches regardless of whether settings files already existed; bottom game dropdown now shows disabled 'No game configured' when no configured paths exist; window state now persists x/y as well as width/height; SettingsWindow removed Custom Icon/Start minimized UI and renamed Elite Config XML Folder to Graphics Config XML Folder.

**2026-06-20T12:12:54Z**

Addressed latest mac/CrossOver test feedback: added a dxmt GPU renderer option in the settings window, and changed mac EDHM mod install to extract the mod zip into a temp folder first, then copy root files to the game folder while copying EDHM-ini and ShaderFixes contents into the app-owned symlink targets. This avoids ditto extracting through existing symlinks in the game folder. Rebuilt successfully with Node 22 package command.

**2026-06-20T13:07:01Z**

CrossOver EDHM runtime confirmed working after user set d3d11 DLL override to native,builtin, then added d3dcompiler_47 native,builtin. Themes now apply in-game immediately on Apply Theme. Remaining UI issue: EDHM_UI does not visually update theme preview/selection correctly; selected indicator appears stuck on wrong theme and preview panel does not reflect selected/applied theme.

**2026-06-20T13:16:08Z**

Patched theme UI refresh after Apply Theme. App.vue now reinitializes PropertiesTabEx when OnThemeApplied fires, so the properties/preview side reflects applied theme data. ThemeTab.vue now updates the synthetic Current Settings entry, moves the visible selected thumbnail marker to the theme that was actually applied, refreshes filtered theme images, and adds an explicit Selected badge for clarity. Rebuilt successfully with Node 22 package command.

**2026-06-20T13:32:02Z**

Patched theme preview UX: selecting a theme now shows its preview image in the main left panel, and right-click Theme Preview displays the preview inside EDHM_UI instead of opening the file/URL externally in Apple Preview. Clarified/reworked the top-right theme badge: it is a Favorite marker, not selection; replaced ambiguous triangle/star icon with an explicit '★ Favorite' badge. Added source_v3/scripts/crossover-edhm-dll-overrides.py to automate setting CrossOver/Wine user.reg DLL overrides for d3d11 and d3dcompiler_47 to native,builtin with backup. Rebuilt successfully.

**2026-06-20T14:22:43Z**

Follow-up from testing: removed redundant Theme Preview context-menu item because single-click now previews inside EDHM_UI. ThemeTab now reads current EDHM-ini/ThemeSettings.json on load, labels Current Settings with the applied theme name, uses the applied theme thumbnail for Current Settings when matched, and auto-selects the last selected theme per active instance using localStorage, falling back to the applied theme. Applying a theme now updates the remembered selected theme too. Rebuilt successfully.

**2026-06-20T14:36:49Z**

Integrated CrossOver DLL override handling into the app: Install EDHM now sets d3d11 and d3dcompiler_47 to native,builtin when a Bottle Root is configured on macOS; settings UIs now include a 'Set EDHM DLL Overrides' button beside Bottle Root; the game localization wizard offers to set overrides when it detects a CrossOver bottle. Package validation passed.

**2026-06-20T14:53:18Z**

Rearranged settings layout: Player Journal, Bottle Root, and Graphics Config XML Folder now each use their own full-width line where available; DLL override action moved to its own small button below Bottle Root; removed the printed Windows default Graphics XML path hint; Number of Themes to Save is now a compact numeric input with spinner controls and range 1-999. Rebuilt successfully.

**2026-06-20T14:53:57Z**

User reported Shipyard main menu appears to work, but selecting the download/export arrow button shows red error box: 'No shipyard-v2 file found'. Need inspect ShipyardUI/import/export action routing and make missing legacy v2 import a non-error/no-op or clarify button behavior.

**2026-06-20T14:55:09Z**

Fixed Shipyard legacy import button behavior: missing V2 shipyard file is now an informational no-op/status message instead of a red error, and the UI only reloads/claims import success when a legacy file was actually imported. Rebuilt successfully.

**2026-06-20T15:28:18Z**

User hit 3PMod install failure for ED-GT GraphicTweaks on mac/CrossOver: TPMods download uses decompress-file directly into game path; ditto refuses EDHM-ini symlink path with 'Not a directory' and 'Unknown compression type'. Need mirror EDHM install strategy: extract 3PMod zip to temp on darwin and copy EDHM-ini/ShaderFixes contents into symlink targets rather than extracting through symlinks.

**2026-06-20T15:29:42Z**

Fixed mac/CrossOver 3PMod install extraction: TPMods now call a new installTPModArchive IPC instead of decompressing directly into the game path. On darwin, the helper extracts zip to temp then copies EDHM-ini/ShaderFixes contents into their symlink targets, avoiding ditto 'EDHM-ini: Not a directory' errors. Rebuilt successfully.

**2026-06-20T15:43:40Z**

Reduced startup preview flash: App no longer emits InitializeHUDimage immediately on startup/game-instance reload, and HudImage no longer seeds the default HUD image on mount. The preview area now shows a neutral 'Loading theme preview…' placeholder until ThemeTab finishes loading and emits the applied/remembered theme preview. Rebuilt successfully.

**2026-06-20T15:51:02Z**

Suppressed misleading startup update prompt on macOS: AnalyseUpdate now checks platform before showing the download dialog and returns silently for non-Windows/Linux when upstream has an update but no supported updater artifact. Rebuilt successfully.

**2026-06-20T16:08:10Z**

Packaged and published experimental macOS/CrossOver PoC release to GitHub: https://github.com/ProbabilityEngineer/EDHM_UI/releases/tag/macos-crossover-poc-2026-06-20. Artifact: EDHM-UI-V3-macos-crossover-poc-darwin-arm64.zip, built from macos-crossover-poc at d9f67e9e after Node 22 Forge package validation.

**2026-06-20T18:32:35Z**

Published point prerelease including only the post-release keyboard-navigation change for ThemeTab. Commit: 507c7903 Add keyboard navigation for theme selection. Release: https://github.com/ProbabilityEngineer/EDHM_UI/releases/tag/macos-crossover-poc-2026-06-20.1 with artifact EDHM-UI-V3-macos-crossover-poc-darwin-arm64-2026-06-20.1.zip.

**2026-08-30T16:30:45Z**

Fetched upstream: origin/main is 31 commits behind upstream/main. Audited all 31 commits. Upstream has useful theme-apply reliability, EDHM status/toggle, mixed-DLL recovery, notification, and XML-preview improvements, but wholesale merge is unsafe: it removes CrossOver DLL override script, mac icon, and ticket/agent files; replaces mac-aware SettingsWindow paths/UI; reverts TPMods symlink-safe installTPModArchive to decompressFile; and rewrites path/helper files. Preserve mac branch and selectively port/adapt candidates.
