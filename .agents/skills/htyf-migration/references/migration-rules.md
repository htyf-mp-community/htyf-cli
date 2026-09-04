# HTYF migration rules

Use this guide when moving an existing project into an HTYF direct React Native
application, Taro multi-end application, or Godot game target, or when
completing a partially migrated feature.

## Objective

Reproduce every user-visible feature and required behavior from the source
project in the `htyf` target. Preserve navigation, state, data flows, loading,
empty/error states, permissions, assets, and platform interactions. A screen
that merely renders is not complete if its interactions or edge cases differ.

## Project type and template source

Determine the source project type before choosing a template. Treat a readable
`project.godot` as the primary Godot signal. Confirm it by inspecting the
configured main scene and supporting `.gd`, `.tscn`, `.tres`, or `addons/`
content when available. A generated `.godot/` cache directory by itself is not
enough to classify a project. `app.json` with `type: "game"` is supporting
evidence, not a replacement for inspecting the actual source. When the signals
conflict or the project contains multiple runtimes, ask the user which part is
the migration input instead of guessing.

After classification, select exactly one matching template:

- For a direct React Native application migration, look for
  `packages/cli/_apps_temp_` in the local workspace.
- For a non-Godot project where the user explicitly requests the Taro template,
  look for `packages/cli/_taro_temp_` in the local workspace. The user's
  explicit Taro choice overrides automatic selection of `_apps_temp_`.
- For a Godot migration, look for `packages/cli/_game_temp_` in the local
  workspace. Preserve its Godot project structure and game packaging setup.

Prefer the matching local template when it is usable. If it is missing, ask
the user whether to obtain that specific directory from
[`htyf-mp-community/htyf-cli`](https://github.com/htyf-mp-community/htyf-cli).
For Godot, download only that repository's `packages/cli/_game_temp_` template
directory. For a user-selected Taro migration, download only
`packages/cli/_taro_temp_`; for a direct React Native application use
`packages/cli/_apps_temp_`. Do not clone, download, fetch, or copy from the
remote repository until the user explicitly confirms. Copy the selected
template into the intended target without overwriting existing project files
unless the user has explicitly approved those replacements.

Record the detected project type, evidence, selected template path, and
template revision or deterministic manifest in the migration checklist and
`.htyf-migration/source-state.json`. A later incremental migration must retain
the same target type unless the user explicitly requests a conversion.

## User-selected Taro target

Use this branch only for a non-Godot project when the user explicitly selects
the Taro template. Treat `_taro_temp_`, its pinned Taro and `@htyf-mp/*`
versions, platform plugin, Taro configuration, routing, APIs, build scripts,
and platform-file resolution as the target architecture. Preserve multi-end
behavior where it is in scope.

Before implementing this branch, read the current official
[Taro React Native development notes](https://docs.taro.zone/docs/react-native-remind)
and follow the guidance applicable to the template's pinned Taro version. Use
Taro components and APIs, Taro application/page configuration, and the
template's `.htyf`, `.rn`, `.ios`, and `.android` file-resolution conventions.
Adapt styles to the React Native/Yoga subset: prefer Flex layout, make the
intended axis explicit, use supported class selectors or inline style
overrides, and use HTYF-specific files or conditional compilation for platform
differences. Verify selectors, units, positioning, borders, shadows, background
images, overflow, and shorthand properties against the current Taro guide
rather than assuming browser CSS support.

Normalize migrated HTYF-specific business code to the HTYF platform identity:

- Rename source or generated `.rn.*` business files that exist for the HTYF
  target to their `.htyf.*` equivalents, including script and style files such
  as `index.rn.tsx` to `index.htyf.tsx` and `index.rn.scss` to
  `index.htyf.scss`. Update imports only when they explicitly include the
  platform suffix; ordinary extensionless imports remain unchanged so the
  template resolver selects `.htyf` first.
- Move Taro application and page configuration intended for the HTYF target
  from the `rn` adaptation field to the corresponding `htyf` field. Preserve
  supported option values and re-verify navigation, window, and page behavior
  through the HTYF build.
- Use a shared `.rn.*` implementation only when it intentionally serves more
  than the HTYF target and no HTYF-specific behavior is required. Record that
  sharing decision in the migration checklist; new HTYF-only adaptations use
  `.htyf.*`.

Do not perform a blind repository-wide `rn` to `htyf` text replacement. Keep
React Native package names, runtime concepts, and low-level compatibility
settings required by `_taro_temp_`. In particular, preserve transformer values
such as `postcss.pxtransform.config.platform: 'rn'` when the template requires
them to prevent `px` from being converted as mini-program `rpx`. The selected
template and its comments are the source of truth for these internal settings.

The direct React Native application sections below do not govern the Taro
branch. In particular, retain Taro routing instead of rebuilding the app with a
direct `NavigationContainer`; retain the template's storage abstraction and
dependency graph instead of enforcing the direct-RN MMKV/AsyncStorage rule or
native-package allowlist; and implement overlays, platform APIs, and lifecycle
through Taro and the HTYF Taro plugin rather than direct RN presentation APIs.
Do not add or remove a dependency solely to satisfy a direct React Native rule.
When a Taro capability gap remains, use the template's platform-specific file
mechanism and document the divergence; ask before changing `ios/` or `android/`
source.

Build and test at least the HTYF target with the template's Taro scripts. When
the requested migration preserves other Taro targets, also build or test each
affected target. Treat compilation warnings about unsupported styles or APIs as
migration findings, not cosmetic noise.

## Godot game target and HTYF SDK

For a Godot source, use the game branch of this guide. The React Native-only
navigation, persistence, dependency, native-source, and overlay sections below
do not apply unless the user explicitly requests a separate React Native host
change. Inventory scenes, scripts, resources, input mappings, autoloads,
rendering settings, save data, platform calls, and export/package settings.

The Godot migration target is **Godot 4.5**. Keep the target
`project.godot` compatible with 4.5 and verify that `config/features` contains
`"4.5"`. Inspect and record the source Godot version before editing. When the
source uses another version, migrate its scenes, resources, scripts, shaders,
project settings, and APIs to Godot 4.5 semantics; do not silently retain
syntax or serialized formats that only work in an older or newer engine.
Perform project import, conversion, editor checks, PCK export, plugin checks,
and automated tests with Godot 4.5. Do not open or resave the migrated target
with another Godot version because that may rewrite project resources.

The selected game template's `packages/cli/_game_temp_/_HTYF_SDK` directory is
the Red Sugar Cloud Service (红糖云服) integration SDK and is platform-owned
code. Keep the entire directory and the template's `project.godot` autoload
entry that registers `HtyfSdk`. Use the selected template version as the source
of truth: migrate game scenes, scripts, and assets around it, and never replace
it with a same-named directory from the source or delete, rename, or casually
edit its files. If the source already contains `_HTYF_SDK`, compare and report
the differences; ask before carrying any source SDK customization forward.
Record the retained SDK revision or manifest so a re-migration does not
silently overwrite it.

Use `HtyfSdk` APIs for supported host capabilities. Do not duplicate its RN
bridge or bypass it with source-platform APIs. Confirm that the autoload and
every referenced SDK resource resolve when the project opens and after the game
package is built.

### Godot plugin compatibility limits

The target host embeds Godot 4.5 and loads a PCK. Only scripts and resources
compatible with Godot 4.5 and the target platform are supported; exporting a
PCK does not make native dependencies compatible.

| Dependency type | Support rule |
| --- | --- |
| Pure GDScript plugin | Supported after engine-version and target-platform compatibility verification. |
| Editor-only plugin | May be used during development; exported content must not depend on unsupported runtime capabilities. |
| C++ GDExtension | Unsupported. |
| Custom C++ engine module | Unsupported. |
| Android or iOS native plugin | Unsupported. |

Before migration, inspect `addons/`, `.gdextension` descriptors, native library
files, platform plugins, and custom engine modules. Inspect plugin code,
configuration, runtime references, and transitive dependencies rather than
inferring compatibility from a directory name. Record each dependency's type,
affected features, and compatibility evidence in the migration checklist.
Repeat this audit for dependency changes during incremental migrations.

Replace unsupported dependencies with equivalent GDScript, Godot built-in
functionality, or the existing host SDK. Do not work around these restrictions
by modifying the host native project, integrating native libraries, or
recompiling the engine. If no equivalent replacement is possible, record the
blocker and affected features in `docs/htyf-migration-gaps.md` and annotate the
integration boundary in code. Do not silently remove features, provide empty
implementations, or declare the migration complete while these blockers remain.

Compatibility acceptance must run in the target host with its embedded Godot
4.5 engine loading the migrated PCK. Exercise affected features and record host/engine
versions, target platform, PCK identity, test steps, and results. Editor success
or successful PCK export alone is not compatibility evidence. If the target
host is unavailable, report acceptance as pending; do not claim compatibility
or migration completion.

### Godot mobile interaction and virtual controls

Treat phones and tablets with touch as the primary Godot target. Before moving
gameplay code, inventory every keyboard, mouse, gamepad, hover, right-click,
drag, pointer-lock, shortcut, and text-entry interaction. Map each interaction
to a usable touch equivalent while preserving optional physical keyboard and
gamepad support through shared InputMap actions. Gameplay code should consume
actions or semantic input vectors rather than hardcoded key codes or direct
references to the virtual-control UI.

When continuous keyboard movement has no usable touch equivalent, evaluate a
virtual joystick. Use on-screen buttons for discrete actions such as jump,
attack, pause, or interact; use direct manipulation, swipe, tap, or a second
stick only when those controls fit the source interaction. A virtual joystick
does not replace text input, accessibility actions, pointer-accurate selection,
or every keyboard shortcut. Simplify or redesign the interaction when that
produces a clearer mobile experience without changing game rules.

Prefer a small in-project implementation with Godot 4.5 `Control`, touch input,
and InputMap APIs when it satisfies the behavior. Before introducing an open
source joystick, inspect all repository files and transitive dependencies and
confirm that the selected revision contains only compatible GDScript and
resources, has an acceptable license, supports Godot 4.5, has no
GDExtension/native/runtime editor dependency, and works with the target
renderer and embedded host. Record the source URL, license, pinned commit or
release, copied files, local changes, and compatibility evidence. Obtain user
permission before downloading third-party code.

One candidate to evaluate, not an automatic dependency, is the MIT-licensed
[Virtual Joystick for Godot 4](https://godotengine.org/asset-library/asset/1718)
with source at
[MarcoFazioRandom/Virtual-Joystick-Godot](https://github.com/MarcoFazioRandom/Virtual-Joystick-Godot).
Its public repository currently exposes GDScript, scenes, textures, and editor
plugin configuration and supports fixed, dynamic, and following joystick
modes, dead zones, InputMap actions, and touch visibility. Reinspect the exact
revision at migration time; the listing or repository description alone is not
proof of Godot 4.5 host compatibility.

Design virtual controls for mobile ergonomics:

- Keep controls inside safe areas and outside the capsule, system gestures,
  cutouts, and critical gameplay UI. Reflow them for phone/tablet sizes,
  aspect-ratio changes, and both supported orientations.
- Size touch targets for reliable thumb use, provide adjustable dead and clamp
  zones, avoid accidental activation, and retain analog magnitude when the
  source movement supports it.
- Support simultaneous touches so movement and action buttons work together.
  Give each touch identifier clear ownership, release all input on touch cancel,
  focus loss, pause, scene change, and control removal, and prevent stuck input.
- Make controls legible without obscuring gameplay. Provide visual pressed and
  direction feedback, and expose configurable placement, handedness, scale, and
  opacity when the game benefits from them.
- Display touch controls based on the active input context without removing
  keyboard/gamepad mappings. Switching input methods must not duplicate actions
  or leave stale movement vectors.

Verify the final controls on physical target-host devices, not only with mouse
touch emulation. Test multi-touch movement plus actions, dead-zone boundaries,
slow and full-speed movement, rapid direction changes, touch cancellation,
pause/resume, scene transitions, input-method switching, safe-area/capsule
avoidance, rotation, representative aspect ratios, and sustained thumb use.

## Workflow

1. Inventory the source project by feature: routes, screens, components,
   stores, services, assets, permissions, native capabilities, and tests.
   Record every item in a migration checklist before editing the target.
2. Inspect the target's existing architecture and dependencies. Reuse its
   state, styling, request, navigation, persistence, and test conventions unless
   the selected branch below explicitly replaces them.
3. Map each source capability to the selected target branch. For a direct React
   Native application, map it to an allowed native module, first exhausting a
   pure TypeScript/JavaScript implementation and existing modules. For Taro,
   use Taro APIs, components, configuration, and platform files. For Godot,
   prefer GDScript/Godot APIs and the retained `HtyfSdk` integration.
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
update into the HTYF target. Reconcile it with existing direct React Native
adapters, Taro platform adaptations, or Godot/`HtyfSdk` integration, tests,
manual fixes, and HTYF-specific behavior; do not replace the target tree
wholesale, cross target-branch boundaries, overwrite `_HTYF_SDK`, or restore
source APIs that earlier migration rules replaced. Handle
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
is not already fully expressed by an established interface. In Godot scripts,
use GDScript documentation comments for public classes, methods, signals,
autoload APIs, exported properties, and resource contracts. State its purpose,
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

## React Native application navigation and persistence

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

## React Native application native dependency allowlist

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

## React Native application native source boundary

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

## React Native application in-tree overlays only

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

Use the selected target branch's SDK to obtain the capsule's occupied rectangle,
not as a reserved full-width row. Direct React Native applications use
`@htyf-mp/js-sdk`'s `jssdk.getMenuButtonBoundingClientRect()`. Godot games call
`HtyfSdk.call_get_menu_button_bounding_client_rect()` and consume the cached
result through `HtyfSdk.get_menu_button_rect_for_viewport()` after it reports
`ready: true`. Taro targets use the capsule API exposed through Taro or the
HTYF Taro plugin and keep the calculation in Taro component/layout code rather
than importing a direct React Native application adapter.

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

For Godot, pass the actual design viewport size and the matching `stretch`,
`contain`, or `cover` mode to `get_menu_button_rect_for_viewport()`. Use the
returned Godot viewport coordinates for `Control` layout; do not compare raw
host-window coordinates directly with scene coordinates and do not assume the
template's 720 x 1280 design size equals the current host window. Recalculate
after the asynchronous SDK result arrives and whenever viewport size,
orientation, or stretch configuration changes. Apply the same per-element
vertical intersection rule below: only controls vertically overlapping the
capsule lose right-side width, while controls below it regain the full viewport
width. Keep touch targets equivalent to at least 44 x 44 logical points after
coordinate conversion.

### Coordinate normalization

The following raw-SDK normalization procedure applies to the direct React
Native application branch. Godot must use `_HTYF_SDK`'s
`get_menu_button_rect_for_viewport()` conversion described above and then apply
the same rectangle-intersection layout rule to its converted result.

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
8. For direct React Native applications, React Navigation route parameters and
   hardware-back behavior for migrated route flows.
9. For direct React Native applications, MMKV namespace isolation, persistence
   across instance recreation, and the storage adapter used by application
   code.
10. For direct React Native applications, bottom-sheet opening, snap points,
    backdrop and hardware-back dismissal, keyboard interaction, and safe-area
    layout when a bottom sheet is used.
    Include content longer than the viewport and verify the final item is fully
    visible and actionable at maximum scroll for every supported snap point.
11. For a repeated migration, tests covering each changed source behavior and
    regression tests for the target adaptations touched while merging the
    source delta.
12. For Godot, detection from `project.godot`, main-scene and autoload resource
    resolution, target `config/features` value `"4.5"`, retention of the
    template `_HTYF_SDK`, and successful loading of the `HtyfSdk` autoload.
    Import, test, and export using Godot 4.5. Test capsule conversion at the
    configured design viewport/stretch mode, asynchronous readiness,
    orientation changes, invalid data fallback, overlapping controls, and
    full-width content below the capsule. Audit plugin compatibility and verify
    the migrated PCK in the Godot 4.5 target host as required by the Godot
    plugin compatibility limits above; packaging verification alone is
    insufficient. For keyboard- or mouse-driven gameplay, verify the mobile
    touch mapping and any virtual joystick/buttons on physical target devices,
    including multi-touch, cancellation, input switching, safe areas, rotation,
    and representative aspect ratios.
13. For a user-selected Taro target, the HTYF Taro build, Taro route and page
    lifecycle behavior, `.htyf.*` platform-file selection, `htyf` application
    and page configuration, supported-style conversion, and every affected
    additional Taro target. Confirm extensionless imports resolve the HTYF file,
    required low-level `rn` compatibility values remain intact, and no direct
    React Native application adapter or dependency policy was imposed on the
    Taro branch.

## Completion report

Report the detected project type and evidence, user template choice when any,
selected template and revision,
migrated feature checklist, deliberate source-to-target differences, source
baseline and delta applied, retained `_HTYF_SDK` revision for Godot or native
modules used for direct React Native, Taro targets verified, and verification
commands with their results.
For Godot, also report the source version, Godot 4.5 conversion work, dependency
compatibility audit, replacements, unresolved blockers, and Godot 4.5
target-host acceptance evidence. Also report the source-to-mobile input map,
virtual-control implementation or evaluated joystick candidates, third-party
source/license/revision when used, and physical-device results. Godot migrations
with unsupported dependency blockers or pending host acceptance remain
incomplete.
Migration is complete only when every inventoried feature is implemented or
explicitly identified as blocked with a concrete reason and the recorded source
baseline matches the last verified input.
