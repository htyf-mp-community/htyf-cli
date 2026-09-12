---
name: htyf-migration
description: Migrate or incrementally re-migrate an existing mini-program, application, Taro project, or Godot game into the matching HTYF target with complete feature parity. Use for full, partial, or repeated HTYF migrations, source-code update synchronization, user-selected Taro templates, Godot game-template and HTYF SDK integration, React Native adaptation, capsule layout, and verification.
---

# HTYF Migration

Migrate the source project into the requested `htyf` target. Preserve every
user-visible feature and required behavior, including routes, state, data,
assets, permissions, loading, empty and error states, and platform interaction.

## Execute

1. Resolve the source and target paths. When the user omits the target, use
   `<source>/HTYF` and keep existing source files unchanged. Detect Godot before
   selecting `game`; use `taro` for an explicitly selected non-Godot Taro
   target, otherwise `app` for direct React Native.
2. Read [the migration rules](references/migration-rules.md) completely and
   [the CLI workflow](references/cli-workflow.md) before initializing or
   modifying the target. For a new target, invoke the CLI non-interactively to
   download/generate the matching official template and place it at the target
   root. Migrate into that template. For a verified existing target, reuse it
   and follow the incremental workflow. These references govern source
   isolation, target setup, platform adaptation, tests, and acceptance.
3. Read any recorded source baseline, compare it with the current source, then
   inventory the full source or its verified delta by feature and create a
   checkable migration list.
4. Implement vertical slices in the target using its existing architecture.
   Complete each slice's UI, interactions, data, permissions, error handling,
   platform SDK integration, code documentation, and tests before marking it
   migrated.
5. Compare source and target against every inventory item. Run verification
   proportional to the changed code and resolve every relevant failure.
6. Report the completed mapping, deliberate differences, native modules used,
   verification commands and results, and concrete blockers.

Migration is complete only when every inventoried feature is implemented or
explicitly identified as blocked with a concrete reason.
