---
id: eum-5iqb
status: in_progress
deps: []
links: []
created: 2026-09-19T14:17:04Z
type: bug
priority: 0
assignee: ProbabilityEngineer
tags: [macos, electron, crash, release]
---
# Fix Electron startup crash on macOS 27

Investigate EDHM-UI-Mac 3.1.0 launch crash: EXC_BREAKPOINT/SIGTRAP in Electron Framework before renderer startup on macOS 27. Update or patch runtime packaging as needed, preserve notarization.

## Acceptance Criteria

App launches on affected Apple Silicon macOS 27 system or a documented runtime-compatible replacement is released; arm64/universal builds pass signing/notarization validation.

