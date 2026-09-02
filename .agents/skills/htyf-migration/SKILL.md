---
name: htyf-migration
description: Migrate or incrementally re-migrate an existing mini-program, application, Taro project, or Godot game into the matching HTYF target with complete feature parity. Use for full, partial, or repeated HTYF migrations, source-code update synchronization, user-selected Taro templates, Godot game-template and HTYF SDK integration, React Native adaptation, capsule layout, and verification.
---

# HTYF Migration

Migrate the source project into the requested `htyf` target. Preserve every
user-visible feature and required behavior, including routes, state, data,
assets, permissions, loading, empty and error states, and platform interaction.

## Execute

1. Resolve the source and target paths from the request and workspace. Detect
   whether the source is a Godot game before selecting a template. Use the
   local `_game_temp_` for Godot, the local `_taro_temp_` when the user
   explicitly selects Taro for a non-Godot project, and `_apps_temp_` for a
   direct React Native application. When the required local template is
   missing, ask before fetching it from the official repository.
2. Read [the migration rules](references/migration-rules.md) completely
   before modifying the target. Treat them as the authoritative navigation,
   target-branch, storage, dependency, Taro, Godot SDK, code-documentation,
   native-source, overlay, capsule-layout, testing, and acceptance constraints
   for this skill.
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
