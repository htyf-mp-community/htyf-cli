# HTYF migration rules

Use this guide when moving an existing project into an `htyf` React Native
project or when completing a partially migrated feature.

## Objective

Reproduce every user-visible feature and required behavior from the source
project in the `htyf` target. Preserve navigation, state, data flows, loading,
empty/error states, permissions, assets, and platform interactions. A screen
that merely renders is not complete if its interactions or edge cases differ.

## Template source

Before starting a migration, look for a usable HTYF application template in
the local workspace, including `packages/cli/_apps_temp_`. Prefer the local
template when it exists.

If no local HTYF template is available, ask the user whether to download the
template from
[`htyf-mp-community/htyf-cli`](https://github.com/htyf-mp-community/htyf-cli.git),
using that repository's `packages/cli/_apps_temp_` directory. Download or clone
it only after the user confirms. Copy the template into the intended target
without overwriting existing project files unless the user has explicitly
approved those replacements.

## Workflow

1. Inventory the source project by feature: routes, screens, components,
   stores, services, assets, permissions, native capabilities, and tests.
   Record every item in a migration checklist before editing the target.
2. Inspect the target's existing architecture and dependencies. Reuse its
   state, styling, request, and test conventions while normalizing navigation
   and persistence to the required implementations below.
3. Map each source capability to React Native and to an allowed native module.
   First exhaust a pure TypeScript/JavaScript implementation and the target's
   existing native modules. Pure TypeScript/JavaScript dependencies are allowed
   when they do not add a native binary. Any new native dependency must appear
   in the allowlist below at the stated version.
4. Migrate in vertical slices. For each route, finish UI, interactions, data,
   error handling, permissions, and tests before marking it complete.
5. Compare the source and target feature-by-feature. Resolve every checklist
   item, type error, relevant test failure, and unsupported dependency before
   reporting completion.

## Incremental re-migration

Treat migration as repeatable synchronization, not a one-time copy. After each
successful migration, create or update `.htyf-migration/source-state.json` in
the target and commit it with the migrated code. Record the source repository
identity and path, branch, migrated Git commit, whether source working-tree
changes were included, a deterministic manifest for non-Git or uncommitted
source files, migration time, and the completed or blocked feature mapping.

At the start of every later migration, read that state before editing. Compare
the recorded baseline with the source's current checked-out commit and working
tree. For Git sources, inspect commits and file changes across the baseline
range, including additions, modifications, deletions, renames, dependency and
configuration changes, plus current uncommitted source changes. For a non-Git
source or missing commit, compare the stored manifest with a fresh deterministic
manifest. If no trustworthy baseline exists, rebuild the full source inventory
instead of assuming that unchanged-looking files were already migrated.

Translate the source delta into feature-level changes and bring every relevant
update into the HTYF target. Reconcile it with existing React Native adapters,
tests, manual fixes, and HTYF-specific behavior; do not replace the target tree
wholesale or restore source APIs that earlier migration rules replaced. Handle
source deletions and renames explicitly, removing obsolete target behavior only
after confirming that no HTYF-specific consumer still needs it.

The current source checkout is the input boundary. Inspect remote/upstream
status when available, but obtain permission before fetching, pulling, switching
branches, or otherwise changing the source checkout. If a newer upstream
revision is known but unavailable locally, report the exact revision gap rather
than claiming the target is current.

Update `source-state.json` to the new baseline only after the delta is migrated
and verified. Keep the previous baseline when work fails or remains incomplete,
and report the pending source commits/files so the next run resumes from the
last verified state.

## Complete code documentation

Leave the migrated target maintainable by a developer who has not seen the
source project. Preserve source comments that remain accurate, rewrite comments
whose assumptions changed during migration, and remove comments that no longer
describe the code. Follow the target repository's comment language; when it has
no established convention, use concise Chinese comments.

Document every migrated or modified exported component, hook, service, adapter,
store, utility, type, and configuration entry with JSDoc/TSDoc when its contract
is not already fully expressed by an established interface. State its purpose,
parameters, return value, thrown errors, side effects, lifecycle or cleanup
requirements, and platform limitations that callers must understand. Include
units and coordinate spaces for dimensions, pixels, logical points, durations,
offsets, and persisted values.

Add nearby implementation comments for decisions that are not obvious from the
code, including source-to-HTYF behavior mappings, JavaScript replacements for
native features, React Navigation transitions, MMKV namespaces and key
ownership, async ordering, race prevention, fallback paths, capsule geometry,
safe-area calculations, bottom-sheet sizing, gesture interaction, and security
or compatibility tradeoffs. Explain why the constraint exists and what must
remain true; avoid comments that merely restate the next line.

Use actionable annotations for unfinished work. `TODO(htyf-native)` continues
to identify deferred native work, and other TODO/FIXME comments must include a
concrete missing outcome plus a link or path to the relevant migration-gap or
tracking document. Do not hide incomplete behavior behind vague comments,
commented-out code, or empty catch blocks.

Before completion, review every changed source file and ensure its public
contracts and non-obvious invariants are documented, examples and identifiers
still match the implementation, and no stale source-platform comment survives.
Documentation completeness is part of the migration checklist, not optional
cleanup after implementation.

## Navigation and persistence

Use `@react-navigation` for all application routing. Build the route hierarchy
with `NavigationContainer` and the appropriate React Navigation stack, tab, or
drawer navigators. Preserve route parameters, nested navigation, deep links,
screen focus behavior, header behavior, and Android hardware-back semantics
from the source. Replace routing APIs from the source or template instead of
maintaining a second router alongside React Navigation. React Navigation
features must also comply with the in-tree overlay rule below.

Use `react-native-mmkv` for persistent key-value data. Create and export an
explicit MMKV storage instance from one storage module, with a stable ID unique
to the migrated application, such as one derived from its HTYF app ID or package
identity. Add a feature or account suffix only when separate namespaces are
required. The ID must remain stable across launches and must not share the
library's unnamed/default storage space with another application. Route-state
persistence, when required, must use this MMKV instance through an adapter.

`@react-native-async-storage/async-storage` is prohibited: remove it from the
target dependencies and replace direct imports, wrappers, adapters, and
transitive application usage with the dedicated MMKV storage module. Before
completion, search runtime code and local wrappers for AsyncStorage imports and
verify that every persistent key is owned by the intended MMKV namespace.

## Native dependency allowlist

The target runs React Native `0.86.3`. Native packages may only be selected
from this list, using the version already pinned by the target project:

- Core/platform: Expo 57 modules, `@callstack/repack`,
  `react-native-config`, `react-native-device-info`, `react-native-localize`,
  `react-native-permissions`, `react-native-safe-area-context`,
  `react-native-screens`, `react-native-restart`, and
  `react-native-edge-to-edge`.
- UI/layout: `@lodev09/react-native-true-sheet`,
  `@gorhom/bottom-sheet`,
  `@react-native-community/blur`, `@react-native-community/checkbox`,
  `@react-native-community/datetimepicker`,
  `@react-native-community/slider`, `@react-native-masked-view/masked-view`,
  `@react-native-picker/picker`,
  `@react-native-segmented-control/segmented-control`,
  `react-native-avoid-softinput`, `react-native-enriched-html`,
  `react-native-enriched-markdown`, `react-native-gesture-handler`,
  `react-native-keyboard-controller`, `react-native-linear-gradient`,
  `react-native-pager-view`, `react-native-reanimated`, `react-native-svg`,
  `react-native-vector-icons`, `react-native-worklets`, and
  `react-native-worklets-core`.
- Images/camera: `@d11/react-native-fast-image`,
  `@react-native-camera-roll/camera-roll`, `expo-camera`,
  `expo-image-manipulator`, `expo-image-picker`, `react-native-camera-kit`,
  `react-native-image-code-scanner`, `react-native-image-colors`,
  `react-native-image-picker`, `react-native-qr-kit`, and
  `react-native-view-shot`.
- Files/network/storage: `@dr.pogodin/react-native-fs`,
  `@kesha-antonov/react-native-background-downloader`,
  `@react-native-documents/picker`, `@react-native-documents/viewer`,
  `@react-native-community/netinfo`, `expo-asset`, `expo-document-picker`,
  `expo-file-system`, `react-native-blob-util`, `react-native-file-access`,
  `react-native-mmkv`, and the `react-native-nitro-*` packages already pinned
  in the target.
- Media/realtime: `expo-audio`, `expo-video`, `lottie-react-native`,
  `react-airplay`, `react-native-agora`, `react-native-audio-api`,
  `react-native-media-toolkit`, `react-native-track-player`,
  `react-native-video`, `react-native-vlc-media-player`,
  `react-native-volume-manager`, `react-native-webrtc`, and
  `react-native-webview`.
- Device/background: `@boterop/react-native-background-timer`,
  `@sayem314/react-native-keep-awake`, `expo-brightness`, `expo-keep-awake`,
  `expo-location`, `expo-sensors`, `react-native-background-actions`,
  `react-native-ble-manager`, `react-native-orientation-locker`, and
  `react-native-wifi-reborn`.
- Graphics/runtime/AI: `@borndotcom/react-native-godot`,
  `@shopify/react-native-skia`, `llama.rn`, `whisper.rn`,
  `react-native-get-random-values`, `react-native-quick-base64`,
  `react-native-quick-crypto`, `react-native-quickjs-sandbox`,
  `react-native-webgpu`, and `react-native-worklets-core`.
- System/business: `@react-native-clipboard/clipboard`, `expo-clipboard`,
  `expo-constants`, `expo-crypto`, `expo-font`, `expo-linking`,
  `expo-system-ui`, `jcore-react-native`, `jpush-react-native`,
  `react-native-global-exception-handler`, `react-native-google-mobile-ads`,
  `react-native-iap`, `react-native-share`, `react-native-splash-view`, and
  `react-native-teleport`.

Treat the target `package.json` as the source of truth for exact versions. If a
needed native capability is absent from both this list and the target, stop and
report the capability gap instead of silently installing a replacement.

## Native source boundary

Keep migration changes in TypeScript/JavaScript and supported configuration.
When a feature appears to require changes under `ios/` or `android/`, first
investigate whether the same outcome is possible with JavaScript, React Native
APIs, the HTYF JS SDK, or an already allowed and configured native module.

If no viable JavaScript-level solution exists, defer that feature for manual
native work. Leave the `ios/` and `android/` source unchanged, keep the rest of
the migration moving, and expose a safe unavailable or reduced-functionality
state where the missing feature would otherwise fail or mislead the user.

Record every deferred native feature in both places:

- Add a concise `TODO(htyf-native)` comment at the nearest JavaScript
  integration boundary. State what is unavailable and point to the migration
  gap document; do not leave commented-out native code or a fake success path.
- Create or update `docs/htyf-migration-gaps.md` in the target. Record the
  source feature, user impact, JavaScript approaches evaluated, why they were
  insufficient, the likely iOS/Android work, the current fallback, and a
  concrete manual verification criterion.

Classify these items as documented native blockers in the migration checklist
and completion report. They are not completed features, even when a fallback
keeps the application stable.

## In-tree overlays only

Render dialogs, sheets, menus, popovers, loading masks, and other overlays
inside the HTYF application or page React tree. Implement them with an
in-tree container, absolute positioning, `zIndex`/`elevation`, safe-area
insets, and explicit back-button and accessibility behavior.

Bottom sheets may use `@gorhom/bottom-sheet`, including its `BottomSheet` and
`BottomSheetModal` APIs. Place `BottomSheetModalProvider` inside the HTYF
application root so its portal remains owned by that React tree. Configure
safe-area insets, keyboard behavior, backdrop dismissal, gesture conflicts,
snap points, accessibility focus, and Android hardware-back dismissal for the
migrated interaction. This allowance applies only to `@gorhom/bottom-sheet`;
it does not permit wrapping the sheet with React Native `Modal` or
`FullWindowOverlay`.

For scrollable sheet content, use the package's coordinated scrollables such
as `BottomSheetScrollView`, `BottomSheetFlatList`, or
`BottomSheetSectionList`. Reserve `BottomSheetView` for content that genuinely
fits without scrolling. Ensure the scroll content's bottom padding includes
the bottom safe-area inset, the measured height of any fixed footer or action
bar, and visible spacing after the final item. A `bottomInset` on the sheet does
not replace this content padding. When a footer overlays the scroll area,
measure or otherwise derive its actual height instead of hardcoding a device
height.

Choose snap points or dynamic sizing that leave a real scroll viewport, and
recalculate for orientation, font scaling, keyboard state, and changing
content. At every supported snap point, the final item and its actions must be
scrollable completely above the safe area, footer, keyboard, and sheet edge;
reaching the maximum scroll offset while content remains clipped is a layout
failure.

Do not import, render, wrap, or indirectly rely on React Native `Modal`,
`react-native-screens`' `FullWindowOverlay`, or equivalent components that
create a native window, full-window overlay, or presentation layer outside the
HTYF page root. A package being present in the native dependency allowlist does
not permit these APIs. When migrating a source component that uses one, replace
its presentation mechanism while preserving dismissal, focus, backdrop,
stacking, animation, and hardware-back behavior.

Before reporting completion, search the migrated source and its local wrappers
for `Modal`, `FullWindowOverlay`, and equivalent native overlay APIs. Every
match must be removed from runtime UI code or demonstrated to be unrelated.

## Page header and capsule layout

Use `@htyf-mp/js-sdk`'s `jssdk.getMenuButtonBoundingClientRect()` as the
capsule's occupied rectangle, not as a reserved full-width row.

- Keep titles, back buttons, and actions in the usable area to the capsule's
  left when their vertical ranges overlap it. Their right edge must be 8–12 pt
  before `capsule.left`.
- Content below `capsule.bottom` uses the full page width. Do not carry the
  capsule's right-side inset down the page.
- Render no empty toolbar row. A page without back/action controls places its
  title directly in the available area left of the capsule.
- Give every interactive control a touch target of at least 44 x 44 pt.
- Derive all geometry from live window dimensions, safe-area insets, pixel
  ratio, and capsule data. Recompute it after orientation or dimension changes.
  Do not encode device models or fixed header heights.
- If capsule data is missing or invalid, fall back to the system safe area.

### Coordinate normalization

Normalize the SDK rectangle into logical points before layout. Validate finite,
positive bounds and compare the raw rectangle against the current logical
window. Values that already plausibly fit the logical window remain unchanged;
values that only plausibly fit after division by `PixelRatio.get()` are treated
as physical pixels. Clamp the normalized rectangle to the window and return no
capsule for impossible geometry. Keep this logic in a pure function so it can
be tested without rendering a screen.

Apply capsule avoidance per element using vertical rectangle intersection. An
element is constrained only when `element.top < capsule.bottom` and
`element.bottom > capsule.top`. For an overlap, its maximum right boundary is
`capsule.left - safetyGap`; otherwise it is the full content right boundary.

## Required tests

Add unit tests for the pure coordinate and avoidance helpers, plus component or
layout tests where practical. At minimum cover:

1. SDK coordinates already expressed in logical points.
2. Physical-pixel coordinates on a 3x display.
3. Missing or invalid capsule data and safe-area fallback.
4. Multiple action buttons fitting to the capsule's left with 44 pt targets.
5. A long title truncating or wrapping without entering the capsule rectangle.
6. Content below the capsule regaining full width.
7. Dimension/orientation changes recalculating the layout.
8. React Navigation route parameters and hardware-back behavior for migrated
   route flows.
9. MMKV namespace isolation, persistence across instance recreation, and the
   storage adapter used by application code.
10. Bottom-sheet opening, snap points, backdrop and hardware-back dismissal,
    keyboard interaction, and safe-area layout when a bottom sheet is used.
    Include content longer than the viewport and verify the final item is fully
    visible and actionable at maximum scroll for every supported snap point.
11. For a repeated migration, tests covering each changed source behavior and
    regression tests for the target adaptations touched while merging the
    source delta.

## Completion report

Report the migrated feature checklist, deliberate source-to-target differences,
the source baseline and delta applied, native modules used, and verification
commands with their results. Migration is complete only when every inventoried
feature is implemented or explicitly identified as blocked with a concrete
reason and the recorded source baseline matches the last verified input.
