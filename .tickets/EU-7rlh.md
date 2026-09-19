---
id: EU-7rlh
status: closed
deps: []
links: []
created: 2026-09-03T23:52:47Z
type: feature
priority: 2
assignee: ProbabilityEngineer
tags: [macos, electron, menu, settings]
---
# Add native macOS application menu Settings item

Expose EDHM-UI's existing Settings window through the standard macOS application menu bar. Preserve the existing in-app settings control and Windows/Linux behavior.

## Design

Build a native Electron application menu on macOS with the standard application menu and a Settings… item using the existing settings-window flow. Avoid duplicate settings windows and keep menu behavior platform-scoped.

## Acceptance Criteria

On macOS, the app menu bar contains a standard Settings… command that opens/focuses the existing Settings window; existing in-app settings still works; Windows/Linux behavior is unchanged; source build/lint validation passes.


## Notes

**2026-09-03T23:53:55Z**

Implemented macOS-only native Electron application menu with standard app/edit/window/help roles and Settings… (Command+,) command routed to the existing renderer settings flow. Added preload listener lifecycle and preserved existing in-app menu/platform behavior. npm run package passed; Vue LSP unavailable, JS diagnostics clean.

**2026-09-04T00:10:34Z**

Follow-up fixes restored explicit Settings… label and File/View/Help native menus, and moved update checking to EDHM mod payload versions. Tracked separately under new ticket.
