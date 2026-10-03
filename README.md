# mobile-noirwire

NoirWire for iOS and Android. NoirWire is a non-custodial Solana wallet that organises money into purpose-based private portfolios of crypto and trackers (tokenized stocks). This repository is the React Native app, built with Expo. It shares its visual language with the NoirWire web app and will share its wallet logic through a common package.

The wallet logic comes from the shared package `@noirwire/shared`; this app supplies what only a phone can (storage, biometrics, capture protection, activity for the idle lock, analytics transport) and draws what the shared view models and copy decide. Onboarding, unlock and the security settings are built; the money screens are still placeholders. See [What is not built yet](#what-is-not-built-yet).

## Guarantees

Every change has to keep these true.

- **Keys never leave the device.** The recovery phrase and every key derived from it are created, stored and used on the device. Nothing that can sign is sent anywhere.
- **Addresses are secrets.** A portfolio's address links its owner to its holdings, so an address is never put in a route, a log, an analytics event or an error report. Route parameters carry portfolio ids and tracker symbols only, and anything shaped like an address is refused (`src/navigation/routeParams.ts`).
- **Costs are shown in USDC.** A person sees what an action costs in dollars before they confirm it, never in a unit they have to convert.
- **A broken runtime does not run a wallet.** On every start the app checks its randomness, encryption and text handling against known answers and shows a full-screen error instead of opening if any of them fails (`src/boot/`).

## Requirements

| Tool     | Version                                                            |
| -------- | ------------------------------------------------------------------ |
| Node     | 22 or later (CI runs 22)                                           |
| npm      | the version shipped with your Node                                 |
| Expo SDK | 57 (React Native 0.86, React 19.2)                                 |
| iOS      | 16.4 or later on the device; Xcode 26 to build                     |
| Android  | API 24 or later on the device; SDK platform 36 and JDK 17 to build |
| EAS CLI  | 16 or later, for cloud builds                                      |

The app uses native modules (`react-native-quick-crypto` among them), so it does not run in Expo Go. It needs a development build.

## Running it

Install dependencies and create your environment file:

```sh
npm install
cp .env.example .env
```

### Working against an unreleased shared version

`package.json` declares the shared package as `github:Noirwire/shared-noirwire#v0.2.0`. Until that repository and tag are published, `npm install` and `npm ci` on a fresh clone fail on that one dependency, and that is the only reason a fresh clone cannot install today. Until then, pack the shared repository checked out next to this one and install the tarball over the declared dependency, without changing `package.json`:

```sh
# in ../shared-noirwire
npm pack --pack-destination ../shared-pack

# here
npm install --no-save ../shared-pack/noirwire-shared-0.2.0.tgz
```

Repeat both after every change to the shared package. `--no-save` keeps the git URL in `package.json`; never commit a tarball or `file:` path there. A symlinked folder (`npm install ../shared-noirwire`) does not work: Metro does not follow it and it brings a second copy of every library the two share.

Once the tag is published, install normally and allow the package's build script once, as the shared README describes: `npm install-scripts approve @noirwire/shared`.

### On a device or simulator, with EAS

These are the commands to get a development build onto a phone. They have been written from the project's configuration and have **not been run yet**: no native build of this project has been produced so far.

```sh
npm install --global eas-cli
eas login
eas init                                                     # once: links the project to your Expo account
eas device:create                                            # once per iPhone: registers it for internal builds
eas build --profile development-device --platform ios        # development client for a registered iPhone
eas build --profile development-device --platform android    # development client APK for an Android phone
```

`eas init` writes the project's id into the Expo configuration on first run (`extra.eas.projectId`). It is deliberately absent until then; commit what it adds.

Install the build EAS produces (open the link it prints on the phone), then start the bundler and open the app:

```sh
npx expo start --dev-client
```

For a simulator or emulator, use the `development` profile instead. For a build testers can install without the bundler, use `preview`.

### Built locally

With Xcode or the Android SDK installed, the same development build can be compiled on your machine. Also not run yet:

```sh
npx expo run:ios
npx expo run:android
```

Both generate `ios/` and `android/` first. Those folders are build output: they are ignored by git and recreated by `npx expo prebuild --clean`. Change native configuration in `app.config.ts`, never in the generated folders.

### In a browser

```sh
npm run web
```

The web build exists for browser tests. It is not a product.

## Environment variables

| Variable                     | Purpose                                          |
| ---------------------------- | ------------------------------------------------ |
| `EXPO_PUBLIC_RELAY_URL`      | Base URL of the NoirWire relay the app talks to. |
| `EXPO_PUBLIC_SOLANA_NETWORK` | Solana network to use, for example `devnet`.     |

Every `EXPO_PUBLIC_` value is compiled into the app and readable by anyone who has it. Nothing secret belongs in them. Both are checked at start (`src/platform/env.ts`): the network must be `mainnet` or `devnet`, and the relay URL an https origin with no path (plain http only to `localhost`, `127.0.0.1` or the Android emulator's `10.0.2.2`). A bad value stops the app on the runtime failure screen rather than at a first request. Every request goes to a relay route under that origin and carries the header `X-NoirWire-Client: mobile/<app version>`.

## Scripts

| Script                 | What it does                                    |
| ---------------------- | ----------------------------------------------- |
| `npm start`            | Start the bundler for a development build.      |
| `npm run ios`          | Build and run on the iOS simulator.             |
| `npm run android`      | Build and run on an Android emulator or device. |
| `npm run web`          | Run in a browser.                               |
| `npm run export:web`   | Export the static web build to `dist/`.         |
| `npm run typecheck`    | Type check with TypeScript.                     |
| `npm run lint`         | Lint with ESLint.                               |
| `npm run format`       | Format with Prettier.                           |
| `npm run format:check` | Check formatting without writing.               |
| `npm test`             | Run the Jest suite.                             |

## Project layout

```
index.js              Entry: loads the polyfill, then the router
polyfill.js           Native crypto and the one Buffer implementation
polyfill.web.js       The same Buffer for the browser build
app.config.ts         Expo configuration (name, identifiers, icons, permissions, native build settings, Android backup off)
eas.json              Build profiles
assets/               App icon, Android adaptive icon, splash mark, favicon (from the raven mark)
app/                  Routes (Expo Router), each a thin wrapper that wires navigation to a feature screen
  (onboarding)/       welcome, create (the phrase), confirm, import, import-source, import-result,
                      set-password, biometric
  (visitor)/          look-around (read-only Markets before a wallet exists)
  (tabs)/             Home, Markets, Earn, Activity, and the Settings stack
  (tabs)/settings/    recovery-phrase, password, privacy, risks, about, reset
  unlock, reset       The lock gate and the reset reachable from it
  portfolio/[id]      A portfolio
  markets/[symbol]    A tracker
  trade, send, ...    Modal routes
  dev/ui              The UI kit gallery (development builds only)
modules/
  backup-exclusion/   A local Expo module (iOS) that sets the do-not-backup flag on the vault's directory
src/
  boot/               Runtime checks and the screen shown when one fails
  platform/           The adapters behind the shared package's ports, and install.ts that wires them
  features/           Screens and the mobile-only rules and strings they need, by feature
  navigation/         Route pieces: the wallet gate, placeholder, header options, parameter guard
  ui/                 The design system: tokens, type, components
  dev/                The gallery behind /dev/ui
  types/              Type declarations for third-party modules
```

### The platform adapters

`src/platform/install.ts` runs once, in the root layout, right after the runtime checks pass. It calls the shared `assertRuntime()`, then `installPlatform()` and `configureHttp()` with:

| Port        | Adapter                                                                                                                                                                                                                                                                                                                                        |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `vault`     | `fileVault.ts`: one file per key in `<documents>/vault/`. A write goes to `.next`, is renamed to `.ready`, then replaces the live file; the step before every read and write finishes or discards what a crash left, so a reader never sees half a record. Updates of a key run under the lock for it. Subscribers hear this process's writes. |
| `locks`     | The shared `inProcessLocks()`: a phone has one process and no tabs.                                                                                                                                                                                                                                                                            |
| `activity`  | `activity.ts`: a return to the foreground, and every touch through the root `ActivityCapture`. The shared store's idle lock counts from these.                                                                                                                                                                                                 |
| `track`     | `track.ts`: the shared closed event list, posted to the relay's `/api/event` with the client header, only while Usage analytics is on; events that coincide with a transaction wait a random 1 to 10 minutes, as on the web.                                                                                                                   |
| `env`       | `env.ts`: the build settings above, through the shared `envFrom`.                                                                                                                                                                                                                                                                              |
| HTTP config | `httpConfig.ts`: `baseUrl` is the relay URL, every request carries `X-NoirWire-Client`.                                                                                                                                                                                                                                                        |
| Biometrics  | `biometricKeystore.ts`: the vault key, and nothing else, in the Keychain or Keystore behind biometric access control, on this device only, destroyed by the system when the enrolment changes.                                                                                                                                                 |
| Preferences | `preferences.ts`: the analytics choice and the biometric setting, each under its own vault key, outside the encrypted record.                                                                                                                                                                                                                  |

The vault directory carries the iOS do-not-backup flag, set by the local module in `modules/backup-exclusion` and read back to confirm it held; if it cannot be set, the vault refuses to store anything. Android backups are off for the whole app (`allowBackup: false`). The browser build keeps the same files in local storage (`vaultFiles.web.ts`), for browser tests only.

### The design system

`src/ui/theme.ts` holds the same tokens, under the same names, as the `@theme` block of the web app's `globals.css`. When the web repository is checked out next to this one as `app-noirwire`, `npm test` compares the two and fails on drift. Without it that comparison is skipped.

To see every component in every state, open `/dev/ui` in a development build (the welcome screen links to it). The route and the gallery are left out of production bundles.

The kit:

| Component                                | What it is for                                                                                                                                                                       |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Text                                     | Type variants: `display`, `h1`, `h2`, `lead`, `body`, `note`, `label`, `faint`.                                                                                                      |
| Button                                   | `primary`, `quiet`, `danger`. 52pt tall, pill shaped; the primary gives a light haptic.                                                                                              |
| Field                                    | Labelled text field, 52pt, with a reveal control when secure and an error line.                                                                                                      |
| Segmented                                | One choice from a short set, with pressed feedback and a selection haptic.                                                                                                           |
| Chip, IconButton                         | Small controls, each with a 44pt target.                                                                                                                                             |
| Sheet                                    | Bottom sheet: grabber, pull down to dismiss, footer action, Back step, "Discard this?" for input, in-flight lock, keyboard avoidance.                                                |
| Notice, Panel, Row, Divider              | Inline messages, review tables and separators.                                                                                                                                       |
| Acknowledge                              | A labelled checkbox that gates a primary action.                                                                                                                                     |
| Switch                                   | An on or off setting as one row, using the platform's switch.                                                                                                                        |
| ListRow                                  | One settings row: label, caption, value and a chevron when it leads somewhere; one control to a screen reader.                                                                       |
| ChoicePanel                              | One option of a single choice that needs a few lines to explain itself, read as one radio button.                                                                                    |
| Stepper                                  | Minus, a numeric field and plus for a whole percent, with press-and-hold repeat; one adjustable control to a screen reader.                                                          |
| PieRing                                  | A pie's ring by weight; against a current mix it marks where each target slice begins.                                                                                               |
| StepList                                 | Progress through named steps: waiting, current, done, failed, not done.                                                                                                              |
| PhraseGrid                               | The recovery phrase in a numbered grid: concealed until revealed, never selectable, kept out of screenshots, and an optional warned Copy that clears the clipboard after 30 seconds. |
| QRCode                                   | An address as a QR code, drawn on the device.                                                                                                                                        |
| Scanner                                  | Camera QR scanning with a permission explanation and a paste alternative; hands back text for the caller to check.                                                                   |
| BalanceHeader                            | Home's balance block, with the raven's ring behind the figure.                                                                                                                       |
| Money, Delta, Chart                      | Formatted amounts, signed changes and a price line.                                                                                                                                  |
| Mark, IdentityMark, EmptyState, Skeleton | The raven, a portfolio's mark, empty states and loading placeholders.                                                                                                                |

Spacing comes from named tokens in `theme.ts` (`layout.gutter` 20pt for screen edges, `layout.section` 32pt between sections, `layout.group` 16pt and `layout.tight` 8pt within a group), and sizes from `size` (`size.control` 52pt for main controls, `size.minTarget` 44pt for small ones). Components use these names rather than raw numbers.

Two things to know when adding to the kit:

- **Icons** are imported one file at a time, `phosphor-react-native/src/icons/<Name>`, so the bundle carries only the icons in use. Importing from the package root pulls in every icon it ships.
- **Buffer** is always imported from the `buffer` package. The bare global is banned by lint: the native crypto module ships a second implementation, and two in one bundle break 64-bit reads.

## Testing

```sh
npm test
```

Jest with `jest-expo` and React Native Testing Library. Tests sit beside the code they cover. Screen tests run the real shared wallet store over the shared in-memory vault (`@noirwire/shared/testing`), with real key derivation, so a password that encrypts in a test encrypts on a phone; `src/features/testServices.tsx` provides them. `src/platform/recordRoundTrip.test.ts` seals a wallet with the shared keystore under Node and opens it through the file vault on a real disk.

The shared package and the Solana libraries ship ES modules, so `jest.config.js` lets the transformer read them, transforms their `.mjs` builds, turns the shared package's dynamic imports into requires (`jest/dynamicImportToRequire.js`), and maps `rpc-websockets`, whose exports map offers nothing the React Native test environment asks for. The suite covers the chart path, pie ring and signature arc maths, money and change formatting (the web app's own cases), the runtime checks against stubbed runtimes, the route parameter guard, and every component with behaviour: roles and states, the Sheet's dismissal rules, the Stepper's bounds and repeat, Acknowledge gating, the phrase clipboard clearing after 30 seconds, and the Scanner with the camera module mocked, including a refused permission.

CI (`.github/workflows/ci.yml`) runs type check, lint, format check and tests on every pull request.

## What is not built yet

- **The money screens are placeholders.** Home (beyond its lock button), Markets, Earn, Activity, portfolio, tracker, trade, send, receive, fund, new portfolio, pie builder and pie order show an empty state. "Look around first" opens a read-only placeholder in place of the visitor's Markets.
- **Biometric unlock is built and switched off.** The keystore adapter, the onboarding offer, the Settings switch and the Unlock prompt exist and are tested, but they stay hidden on every device until the shared wallet store can hand out the raw vault key and unlock with it (`src/features/biometric/vaultKeyAccess.ts` says what is missing).
- **Not built from the spec yet:** the network gate (2.0), the offline banner (3.5), the Home offer to turn biometric unlock back on, Settings' funding wallet row and page (2.31), About's tracker list date, Terms, Privacy policy and open-source licences, the Android back-button rules for a busy import, settling pending actions after unlock (no money action exists yet), and holding a deep link across Unlock.
- **No native build has been verified.** The iOS bundle compiles (`npx expo export --platform ios`) and the app runs in a browser. It has not yet been compiled for or run on iOS or Android, so the backup exclusion module, biometrics, the keystore, haptics, the sheet's pull to dismiss and its keyboard avoidance, camera scanning and capture protection have not been seen working on a device.
- **No end-to-end test suite** in the repository, and no crash reporting.

## Release profiles

Defined in `eas.json`.

| Profile              | Use                                                                              |
| -------------------- | -------------------------------------------------------------------------------- |
| `development`        | Development client for day-to-day work. iOS simulator and Android APK.           |
| `development-device` | Development client for physical phones: a registered iPhone and an Android APK.  |
| `preview`            | Internal distribution build testers install on their phones (Android as an APK). |
| `e2e-test`           | Unsigned iOS simulator build and Android APK for automated tests.                |
| `production`         | Store builds for the App Store and Google Play.                                  |
| `dapp-store`         | Production build as an Android APK, for the Solana dApp Store.                   |

The bundle identifier and Android package are both `com.noirwire.app` in `app.config.ts`. Change them there before the first store build: they cannot be changed after release.

## Security

See [SECURITY.md](SECURITY.md). Do not open a public issue for a vulnerability.

## Licence

All rights reserved. The source is published for transparency. See [LICENSE](LICENSE).
