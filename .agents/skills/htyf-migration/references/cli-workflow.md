# CLI template initialization and migration commands

Read this before initializing a migration target or invoking HTYF CLI commands.
The source/target boundary and template selection are defined in
[migration-rules.md](migration-rules.md).

## Resolve a non-interactive CLI

Use `htyf --help` to check that the available CLI exposes `init`, `build`,
`debug`, `clean`, `sync-deps`, and `--project`. A bare `htyf` starts the human
menu; agents use explicit subcommands and never simulate menu keystrokes.

If the installed CLI lacks these commands, locate the current workspace's
`htyf-cli/packages/cli/src/index.mjs` (or `packages/cli/src/index.mjs` inside
that repository) and use `node /absolute/path/to/index.mjs --help`. Use that
verified entrypoint for subsequent commands. The workspace implementation may
not yet be published: do not assume `npx @htyf-mp/cli` has the same features.
When using a published version, first verify its help with
`npx --yes @htyf-mp/cli --help`. If no suitable CLI is available, report the
missing capability rather than falling back to modifying the source in place.

The examples use `htyf`; replace it with the verified local Node entrypoint or
published invocation as needed. Quote all paths. `--project` resolves before
project modules load; other relative paths are relative to that directory.

## Generate the template, then migrate into it

Resolve the absolute source path and target first. If the user omitted the
target, it is exactly `<source>/HTYF`, with the template files directly inside
`HTYF/`, not another application directory underneath it.

For a new target:

1. Verify the destination is absent, including dangling symlinks. For an
   existing destination, follow the reuse/collision rules in migration-rules;
   do not initialize or move a new template over it.
2. Select `game` for Godot, `taro` for an explicitly requested non-Godot Taro
   target, or `app` for a direct React Native target. Choose a valid lowercase
   application name and a 2–10 character Chinese/alphanumeric display name
   from the source metadata. Use `migrated-app` and `迁移应用` if suitable source
   names are unavailable; these names do not determine the final directory.
3. Create a fresh staging directory outside the source tree and run the CLI.
   For example, with a verified absolute source path:

   ```bash
   source_root='/absolute/path/to/source'
   target_root="$source_root/HTYF"
   staging_root=$(mktemp -d)
   htyf init --non-interactive --project "$staging_root" \
     --name migrated-app --display-name 迁移应用 --template app
   ```

   Substitute the selected template and names. The CLI downloads the official
   template and generates the target identity/configuration; this is part of
   the requested migration and requires no extra download confirmation. This
   authorization concerns the official template, not unrelated third-party
   code or changing the source checkout.
4. Continue only on exit code 0 and after inspecting the generated template.
   The CLI's `--name` cannot be `HTYF` because its name validator accepts only
   lowercase names. Move the generated `staging_root/migrated-app` directory
   itself to the resolved `target_root`, retaining its generated package name
   and HTYF identity. Recheck that the destination is absent immediately before
   moving; never merge, nest, or overwrite it. Remove only the staging directory
   created by this run. For an explicit custom target, use that exact path in
   place of `source_root/HTYF`.
5. Verify `target_root/app.json` and template-specific files: `package.json`
   for application/Taro targets; `project.godot`, `_HTYF_SDK/`, and the
   `HtyfSdk` autoload for Godot. Record the CLI entrypoint/version when available,
   selected template, and a deterministic template manifest before editing.
6. Migrate source features into this generated target. Preserve template
   configuration, pinned dependencies, and SDK integration. Run dependency
   installation and build commands with the target as the working directory.
   Keep reports and migration state inside the target as well.

A failed initialization is a concrete blocker to template-based implementation;
continue read-only source inventory if useful. Do not use the source tree as an
alternate destination. On repeated migrations, reuse the recorded target and
its baseline without rerunning `init` or replacing its template/SDK.

## Build and verify without prompts

```bash
htyf build --non-interactive --project '/absolute/source/HTYF' --version 1.0.0 --platform ios
htyf build --non-interactive --project '/absolute/source/HTYF'
htyf build --non-interactive --project '/absolute/source/HTYF' --platform android \
  --godot-bin '/absolute/path/to/godot' --godot-preset Android
```

`--version` updates `app.json`'s `htyf.version`; omit it to retain an existing
valid version. A newly initialized template may have no version, so provide
one for its first build. For Godot, use the engine version required by the
migration rules; `--godot-project` can select an internal game directory.
Godot binary resolution uses `--godot-bin`, `GODOT_EDITOR`, cache, then default,
and fails without prompting when the binary is unusable.

For Taro, inspect the generated `package.json` and run its HTYF-specific build
script as required by migration-rules. Do not substitute the direct RN CLI
build for Taro's platform build. Packaging or successful compilation does not
replace target-host acceptance.

Additional commands, only when needed for the target:

```bash
htyf sync-deps --non-interactive --project '/absolute/source/HTYF'
htyf clean build --non-interactive --project '/absolute/source/HTYF'
htyf debug --non-interactive --project '/absolute/source/HTYF'
```

`sync-deps` writes target dependency versions; install dependencies afterward
in the target and preserve branch-specific dependency rules. `clean` directly
deletes the selected target output (omitting its type selects `all`). `debug`
is a persistent service, not a finite verification command; capture its status
and manage its process when device testing needs it. Commands produce readable
logs, not a JSON protocol. Check exit code 0 for success and 1 for failure, and
record the build artifact path printed on successful packaging.
