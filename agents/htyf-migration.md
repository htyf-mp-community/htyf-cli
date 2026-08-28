# HTYF migration agent

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
   routing, state, styling, request, and test conventions rather than creating
   a parallel framework.
3. Map each source capability to React Native and to an allowed native module.
   Pure TypeScript/JavaScript dependencies are allowed when they do not add a
   native binary. Any new native dependency must appear in the allowlist below
   at the stated version.
4. Migrate in vertical slices. For each route, finish UI, interactions, data,
   error handling, permissions, and tests before marking it complete.
5. Compare the source and target feature-by-feature. Resolve every checklist
   item, type error, relevant test failure, and unsupported dependency before
   reporting completion.

## Native dependency allowlist

The target runs React Native `0.86.3`. Native packages may only be selected
from this list, using the version already pinned by the target project:

- Core/platform: Expo 57 modules, `@callstack/repack`, `expo-router`,
  `react-native-config`, `react-native-device-info`, `react-native-localize`,
  `react-native-permissions`, `react-native-safe-area-context`,
  `react-native-screens`, `react-native-restart`, and
  `react-native-edge-to-edge`.
- UI/layout: `@lodev09/react-native-true-sheet`,
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
  `@react-native-async-storage/async-storage`,
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

## In-tree overlays only

Render dialogs, sheets, menus, popovers, loading masks, and other overlays
inside the HTYF application or page React tree. Implement them with an
in-tree container, absolute positioning, `zIndex`/`elevation`, safe-area
insets, and explicit back-button and accessibility behavior.

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

## Completion report

Report the migrated feature checklist, deliberate source-to-target differences,
native modules used, and verification commands with their results. Migration is
complete only when every inventoried feature is implemented or explicitly
identified as blocked with a concrete reason.
