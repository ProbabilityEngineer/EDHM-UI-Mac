# AGENTS.md

## Scope

These instructions apply to the entire `EDHM_UI` repo.

## Project focus

- Prioritize the Electron/Vue app in `source_v3/` for current macOS work.
- Current macOS proof-of-concept targets native app packaging plus manual CrossOver bottle paths.
- Prefer minimal, working mac fixes over broad architecture cleanup unless the user asks for a refactor.
- Keep Windows behavior intact where practical; mac work should be additive unless replacing clearly broken assumptions.

## Working norms

- Start with the most specific code-intelligence tool available.
- Use explicit repo-relative paths in reads, searches, and edits.
- For syntax-shaped requests, prefer AST/LSP before broad text search.
- For behavior or intent requests, prefer Semble or semantic/code-intelligence search before file listing.
- Use diagnostics before broad builds when an LSP is available.
- Be careful not to mix the legacy `source/` app and the current `source_v3/` Electron app unless the task explicitly spans both.

## Structural edits

- Prefer ast-grep for simple structural replacements.
- Use precise text edits for complex multi-line changes.
- For packaged Electron output, edit source files first and rebuild rather than patching packaged artifacts directly.

## Work tracking with clu

- Use `clu` as the authoritative source for tasks, notes, dependencies, and work state.
- At the start of substantial work, run `clu ready`; claim the relevant issue with `clu claim <id>` when one exists, then read it with `clu show <id>`.
- Put newly discovered work, decisions, blockers, and follow-up tasks in `clu` using `clu note`, `clu update`, or `clu create` rather than Markdown todo lists.
- Keep dependencies accurate with `clu dep`/`clu link`.
- Close completed issues with `clu close <id>` only after validation. Leave incomplete or blocked work open and record the reason in `clu`.
- Do not use the retired `tk` workflow or create new ticket records under `.tickets/`; preserve any existing `.tickets/` files as historical data.
- Treat `.clu/config.yaml` and `.clu/templates/` as portable project configuration. Keep `.clu/data.sqlite`, WAL/SHM files, backups, and other mutable local state out of commits.

## Turnlog

- Record meaningful repo work in turnlog, especially code changes, packaging/debugging, ticket updates, VCS operations, and workflow setup.
- Before final VCS publication of a coherent change, record what changed, validation performed, and any ticket touched.
- Keep `.turnlog/` out of GitHub unless this repo explicitly chooses to track it.

## Git version control

- Use standard Git workflows; Git is the repository's VCS.
- Before editing, inspect `git status` and preserve pre-existing modifications. Before committing, inspect `git diff`, `git diff --check`, and the complete staged diff.
- Keep commits focused and use descriptive commit messages. Do not rewrite history, force-push, or push unrelated changes.
- Push only the intended branch and only when explicitly requested or when the task's workflow requires it.


## Remote layout

- Treat this repo as a fork-style checkout.
- `upstream` refers to the original BlueMystical repository.
- `origin` refers to the user's fork.
- Avoid pushing directly to upstream unless the user explicitly asks for it.
- Keep `main` aligned with `upstream/main` whenever practical.
- Keep ongoing mac port work on `macos-crossover-poc` or a similarly named feature branch/bookmark rather than directly on `main`.
- Preferred upstream sync flow:
  1. fetch upstream
  2. move local/fork `main` to `upstream/main`
  3. rebase `macos-crossover-poc` onto the refreshed `main`
  4. push `main` and the feature branch/bookmark to the fork

## Shell

- Prefer explicit paths for file operations.
- Avoid interactive prompts in automation.
- Ask before deleting files or directories.
- Set `HOMEBREW_NO_AUTO_UPDATE=1` for Homebrew commands.

## macOS / CrossOver guidance

- Use mac-standard app data at `~/Library/Application Support/EDHM-UI-V3`.
- Use cache/temp at `~/Library/Caches/EDHM-UI-V3`.
- Treat these as separate user inputs when relevant:
  - game install folder
  - Player Journal folder
  - Elite config XML folder
- The XML folder is the folder containing `GraphicsConfiguration.xml` and/or `GraphicsConfigurationOverride.xml`.
- CrossOver bottles come first; generic Wine support can follow later.
- For UI work on macOS, watch for Retina scaling issues before changing component CSS.

## Packaging

- For `source_v3`, prefer Node 22 for Forge package work.
- When validating packaging changes, prefer a fresh `npm run package` over dev-only validation.
- If a packaged mac app behaves oddly, verify source settings/bootstrap logic before assuming packaging corruption.
