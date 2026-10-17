# Expo SDK upgrade and build handoff

## Result

Expo **58.0.14**, Expo Router **58.0.23**, React **19.3.0**, React Native **0.88.0**,
Sentry **8.28.0**, NativeWind **4.2.7**, and Tailwind **3.4.19**.

## Environment and scope

The upgrade starts at `9ff1575` on `sdk-upgrade`, from Expo SDK 54, and advances
through SDK 55, 56, and 57 to SDK 58.
Use Node **24.22.0** (`nvm install && nvm use`); EAS profiles inherit the same version.
Dependencies are resolved with strict npm peer checks; do not use `--force` or
`--legacy-peer-deps`. Install reproducibly with `npm ci`.

The app retains its package identifiers, URL scheme, session storage, API contracts,
and static web output. The target requires iOS 16.4 or newer.

## Validation record

Baseline SDK 54: TypeScript passed, 38 tests passed, Android/iOS exports passed,
and lint passed with four existing warnings in profile and terms-of-service.
Online Doctor initially passed 16/18 checks: missing `react-native-svg` and six
SDK dependency mismatches. After alignment, Doctor passed 18/18, strict npm
resolution passed, and TypeScript, lint, and all 38 tests passed again.

SDK 55: dependency check and Doctor passed (20/20), TypeScript and 38 tests
passed, lint retained the same four warnings, and `npm ls --all` passed.
Android/iOS exports passed. The custom Babel configuration required adding
`babel-preset-expo` directly.

SDK 56: dependency alignment passed. Removed the unsupported StatusBar background
prop and migrated React Navigation imports and the payment test mock. Doctor
reported the known SDK 56 Hermes V1 memory regression (21/22 checks); the planned
SDK 57 upgrade addresses it rather than disabling the check. SDK 56 is not a
release candidate. TypeScript, lint (the same four warnings), and all 38 existing
tests passed after compatibility updates; three added form-lifecycle regression
tests passed. Android/iOS exports passed. New compiler lint rules required guarded
form resets during render, JSX action components instead of calling render helpers,
and `useAnimatedValue`; no compiler rules were disabled. TypeScript 6 required an
explicit ES-module identity API test mock.

SDK 57: dependency check and Doctor passed (21/21), clearing the SDK 56 Hermes
warning. TypeScript, lint (four baseline warnings), all 42 tests then present,
strict npm dependency validation, and Android/iOS exports passed. The additional
web/native safe-area regression test also passed separately.

SDK 58: strict dependency resolution required a fresh install/lockfile after npm
retained an SDK 57 optional Expo UI peer. No force flags or peer bypasses were used.
A fresh `npm ci` from the final lockfile passed.
Dependency alignment and Doctor passed (20/20), `npm ls --all` passed, TypeScript
passed with React Native's strict API enabled, all 43 tests passed, and lint passed
with only the four baseline warnings. Android/iOS and static web exports passed.
The final combined Android/iOS/web export also passed after `npm ci` with
`--max-workers 2`; the repeated TypeScript, lint, 43-test, and npm dependency checks
passed. Expo returned status 0 after reporting a forced exit for remaining handles
once all export files were written.
Event/refresh callbacks and tab icon colors
were adapted to the stricter types; browser safe areas use CSS `env()` values.

Native generation (`npx expo prebuild --no-install`) passed. Verified the original
identifiers/scheme, arm64-only Android ABI filter, minification/resource shrinking,
iOS 16.4 deployment target, SceneDelegate, and scene manifest. Generation changed
start scripts automatically; the existing scripts were restored. Generated native
folders are disposable and removed after inspection so EAS regenerates from config.

The SDK-compatible Sentry 8 package probes the removed internal
`expo-router/build/global-state/router-store` through a guarded optional import.
Metro warns about that missing module; Sentry's optional route-context lookup
returns no context on SDK 58. The app does not enable `expoRouterIntegration`.
Verify error delivery/source maps on devices before release; this warning must not
be mistaken for completed native Sentry validation.

## External review fixes

Terminal payment results can be dismissed while history is stale or unavailable.
Acknowledged transactions do not automatically reopen, and another unresolved
transaction can still resume. Collection remains disabled while history reports
pending payments; a refresh action makes failed/stale history recoverable.

Notification, payment, and general-preference drafts are protected once edited.
Clean forms still hydrate from refreshed settings; an account change resets the
draft. Duplicate iOS query schemes were removed, the Expo range was tightened to
`~58.0.14` in both manifests, and the refresh-control JSX was normalized.

Validation after these fixes: **50/50 tests passed**, TypeScript and lint passed
(with the same four baseline warnings), changed tests passed ESLint, and the npm
lockfile passed an offline `npm ci --dry-run --ignore-scripts` check. Android, iOS,
and static web exports passed with two workers. The Sentry/Router warning and Expo
export shutdown message described above remain; the native release gate still
applies.

## Commands

Run all tests, rather than only the payment script:

```sh
npx expo install --check
npx expo-doctor
npx tsc --noEmit
npm run lint
node --test tests/*.test.cjs
npx expo export --platform android --platform ios
npx expo export --platform web
```

`npm run prebuild` exports JavaScript bundles; it does **not** generate or compile
native projects. Use `npx expo prebuild --no-install` explicitly for native generation.
Native folders are generated and ignored; preserve any manual changes before
regenerating them.

## User-run native builds

No cloud builds or submissions are triggered by this upgrade. From an authenticated
EAS session, run:

```sh
npx eas-cli@latest build --platform android --profile preview
npx eas-cli@latest build --platform ios --profile preview
npx eas-cli@latest build --platform ios --profile preview-device
```

The first command builds an internal Android APK. The second builds for the iOS
simulator. The third builds for registered physical iOS devices and requires Apple
signing credentials/device registration. Existing development and production
profiles remain available. Use fresh development clients after SDK upgrades.

Ensure the selected EAS environment provides the intended `EXPO_PUBLIC_API_URL`.
Do not select API environments with `NODE_ENV`; Expo controls it for its commands.
Provide `SENTRY_AUTH_TOKEN` securely for source-map upload; never commit it.

## Release gate

Local bundle/configuration validation does not prove native compilation or device
behavior. This machine has Command Line Tools only (no full Xcode), no Java runtime,
and no Android SDK detected, so native compilation requires another configured
machine or the EAS commands above.

Before release, test on Android and physical iOS:

- Cold start, fonts, splash screen, NativeWind/Gluestack styles and animations.
- Activation, login, persisted session restoration, logout, and switching accounts.
- All tabs, authentication redirects, deep links, Android back, keyboard and safe areas.
- Payment initiation, pending status, socket reconnection, and account isolation.
- Receipt/lease PDF downloads and sharing, including switching accounts mid-download.
- Camera/photo permission denial, cancellation, identity and maintenance uploads.
- A controlled Sentry error and readable uploaded source maps in a release build.
- Release APK startup with shrinking enabled; existing arm64-only ABI policy.

Release only after native builds and device checks pass. Retain the previous store
binary while validating; SDK upgrades require new native binaries.

## References

- [Expo SDK upgrade walkthrough](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/)
- [SDK 55 release notes](https://expo.dev/changelog/sdk-55)
- [SDK 56 release notes](https://expo.dev/changelog/sdk-56)
- [SDK 57 release notes](https://expo.dev/changelog/sdk-57)
- [SDK 58 release notes](https://expo.dev/changelog/sdk-58)
- [Router SDK 55 → 56 migration](https://docs.expo.dev/router/migrate/sdk-55-to-56/)
- [Router SDK 57 → 58 migration](https://docs.expo.dev/router/migrate/sdk-57-to-58/)
