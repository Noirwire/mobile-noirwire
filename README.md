<div align="center">
  <br />
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset=".github/assets/noirwire.svg" />
    <img src=".github/assets/noirwire-black.svg" alt="NoirWire" width="120" />
  </picture>
  <br />
  <br />

  <h3>NoirWire Mobile: the private Solana wallet for iOS and Android</h3>

  <br />

[![CI](https://github.com/Noirwire/mobile-noirwire/actions/workflows/ci.yml/badge.svg)](https://github.com/Noirwire/mobile-noirwire/actions/workflows/ci.yml)
[![Licence: all rights reserved](https://img.shields.io/badge/licence-all%20rights%20reserved-lightgrey.svg)](LICENSE)

  <br />
  <br />
</div>

**This repository is the NoirWire app for iOS and Android: a non-custodial Solana wallet that keeps money in separate, purpose-based portfolios of USDC and tracker tokens, built with Expo and React Native.**

### Why NoirWire Mobile

- **Keys stay on the phone.** The recovery phrase and every key derived from it are created, stored and used on the device, in an encrypted vault that is kept out of backups.
- **Portfolios that do not link.** Each portfolio is its own address. Money moves into it through a private payment route, so nothing on chain ties it to the funding wallet.
- **Costs in dollars.** Every action shows what it costs in USDC before it is confirmed. No SOL to buy, no unit to convert.
- **One wallet core.** The same shared package runs the wallet logic here and in the web app, so both read and sign the same way.

## Platforms

| Platform               | Distribution                                                        |
| ---------------------- | ------------------------------------------------------------------- |
| iOS 16.4 or later      | App Store, archived and uploaded locally (`npm run ios:archive`)    |
| Android 7.0 (API 24)+  | Google Play, an App Bundle built locally (`npm run android:bundle`) |
| Solana Seeker and Saga | Solana dApp Store, as a signed APK (`npm run android:apk`)          |
| Web (browser export)   | Test target only. It runs the UI suite and is not a product.        |

The app uses native modules (`react-native-quick-crypto` among them), so it does not run in Expo Go. It needs a development build. Native builds have not yet been verified on physical devices.

## Architecture

TypeScript, React 19.2 and React Native 0.86 on Expo SDK 57, with Expo Router for navigation.

| Layer              | What it holds                                                                                                                                                                                                          |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@noirwire/shared` | The wallet core, shared with the web app: domain rules, application use cases, presentation view models and copy, design tokens, and the Solana infrastructure. It talks to the phone only through ports (`platform`). |
| `src/platform/`    | The phone's adapters behind those ports, wired once by `install.ts` after the runtime checks pass. It also wires money once (`installMoney`): one pending-action store and one signing guard for every money screen.   |
| `src/features/`    | Thin native renderers: each screen draws what a shared view model decides, plus the few rules and strings only a phone needs.                                                                                          |
| `src/ui/`          | The design system: the web app's tokens under the same names, type, and the component kit.                                                                                                                             |
| `app/`             | Expo Router routes. Each is a thin wrapper that wires navigation to a feature screen.                                                                                                                                  |
| `src/boot/`        | Known-answer checks of randomness, encryption and text handling on every start. A failure shows a full-screen error and the wallet never opens.                                                                        |

The platform adapters:

- **Vault**: `fileVault.ts` keeps one encrypted file per key under the app's documents directory, written atomically so a crash never leaves half a record. The directory carries the iOS do-not-backup flag, set by the local module in `modules/backup-exclusion` and read back to confirm it held; Android backups are off for the whole app (`allowBackup: false`).
- **Biometric key store**: `biometricKeystore.ts` keeps the vault key, and nothing else, in the Keychain or Keystore behind biometric access control, on this device only, destroyed when the enrolment changes.
- **Relay**: every network request goes to a NoirWire relay route (`/api/rpc`, `/api/prices`, `/api/jupiter`, `/api/relayer`, `/api/private-payments`) under one origin, and carries `X-NoirWire-Client: mobile/<app version>`.
- **Activity, preferences, analytics**: the idle lock's activity source, the analytics and biometric settings outside the encrypted record, and the closed event list, sent only while Usage analytics is on.

How it relates to the other NoirWire repositories:

| Repository                                                       | Role                                                                |
| ---------------------------------------------------------------- | ------------------------------------------------------------------- |
| [shared-noirwire](https://github.com/Noirwire/shared-noirwire)   | The wallet core this app and the web app both install.              |
| [relayer-noirwire](https://github.com/Noirwire/relayer-noirwire) | The fee relayer that lets a portfolio pay its network cost in USDC. |
| app-noirwire                                                     | The web app, which also serves the relay routes this app calls.     |
| mobile-noirwire                                                  | This repository.                                                    |

## Quick start

There is no cloud build path: every build, including store and dApp Store builds, runs on this machine (see [Building locally](#building-locally)). Full step-by-step detail, including every troubleshooting case below, lives in [`docs/running-on-a-device.md`](docs/running-on-a-device.md).

**1. Requirements**: Node 24 or later (`.nvmrc`), npm, and for native builds Xcode and the Android SDK (platform 36, JDK 17).

**2. Clone and install**

```sh
git clone https://github.com/Noirwire/mobile-noirwire.git
cd mobile-noirwire
npm ci
```

`npm ci` prints peer-dependency, deprecation and vulnerability warnings. That is expected; see "What the install warnings mean" below.

**3. Create `.env`**

```sh
cp .env.example .env
```

Fill in the two values (both are explained inline in `.env.example`):

- `EXPO_PUBLIC_RELAY_URL`: the relay the app talks to. Either a deployed relay over https (such as `https://app.noirwire.com`), or the web app running locally - see the comments in `.env.example` for the local setup.
- `EXPO_PUBLIC_SOLANA_NETWORK`: `mainnet` or `devnet`, matching whichever relay you pointed at.

**4. Build and install a dev build**

```sh
npm run ios:sim        # iOS Simulator
npm run android:debug  # a connected Android device or emulator
```

**5. Start Metro and open the app**

```sh
npm start
```

Scan the printed QR code from inside the dev build (Simulator and emulator connect on their own). If it cannot reach Metro, see "Dev build on a phone can't reach Metro" below.

### The shared package

`package.json` pins `@noirwire/shared` to the built package attached to a release of [shared-noirwire](https://github.com/Noirwire/shared-noirwire), so `npm ci` needs nothing else. Moving to a newer release means changing the version in that URL and running `npm install`.

To work against an unreleased version of the shared package:

```bash
# in ../shared-noirwire
npm run build && npm pack --pack-destination ../shared-pack
# here
npm install --no-save ../shared-pack/noirwire-shared-<version>.tgz
```

Repeat both after every change to the shared package. `--no-save` keeps the release URL in `package.json`; never commit a local tarball or a `file:` path there.

### Other ways to run it

```sh
npm test               # the Jest suite
npm run web            # the app in a browser, for a quick look
```

`npm run ios:sim` and `npm run android:debug` generate `ios/` and `android/` first; those folders are build output, ignored by git and recreated by `npx expo prebuild --clean`. Change native configuration in `app.config.ts`. See [Building locally](#building-locally) for every build target.

### Environment

| Variable                     | Purpose                                                           |
| ---------------------------- | ----------------------------------------------------------------- |
| `EXPO_PUBLIC_RELAY_URL`      | Origin of the NoirWire relay, such as `https://app.noirwire.com`. |
| `EXPO_PUBLIC_SOLANA_NETWORK` | `mainnet` or `devnet`.                                            |

Every `EXPO_PUBLIC_` value is compiled into the app and readable by anyone who has it, so nothing secret belongs in them. Both are checked at start (`src/platform/env.ts`): the relay must be an https origin with no path (plain http only to `localhost`, `127.0.0.1` or the Android emulator's `10.0.2.2`). A bad value, or a missing `.env`, stops the app on the runtime failure screen - in a development build, that screen also names the underlying error.

### Troubleshooting

**`npm ci` prints a wall of warnings.** Peer-dependency, deprecation and "NN vulnerabilities" warnings are expected on a fresh install; see "What the install warnings mean" below. Nothing here needs fixing before you continue.

**`npm run android:debug` fails with "cannot write to emulator" or similar.** With no device attached, it cold-starts an emulator and tries to install the app before the emulator has finished booting. Run the command again once the emulator is up. With a phone and an emulator both attached, pick one explicitly: `npm run android:debug -- --device`.

**Dev build on a phone can't reach Metro** ("Failed to connect to /192.168.x.x:8081"). macOS's firewall blocks the phone's incoming connection to Metro on the Mac. With the phone on USB: `adb reverse tcp:8081 tcp:8081`, then open the dev build against `http://localhost:8081` instead of the LAN address Metro printed.

**The app shows "NoirWire cannot run safely on this device: App configuration" with no further detail.** This means `.env` is missing (the `cp .env.example .env` step above is easy to miss) or carries a value the app rejects, such as the placeholder `https://relay.example.com` left unedited. Create or fix `.env` as described in step 3 above, then restart Metro with `npm start -- --clear` - changes to `.env` are not picked up by a running Metro. A development build also prints the specific error under "App configuration" on that screen and to the console, so a missing or wrong setting names itself.

**What the install warnings mean:** `npm ci`'s peer-dependency warning is a test tool's `react-reconciler` wanting React 19.3 while Expo SDK 57 pins React 19.2.3 - harmless, Expo's version is the one that ships. The vulnerability count is Expo's own build tooling (the `xcode`/`node-forge` chain behind prebuild) plus two transitive Solana library advisories (`stream-json`, `uuid`, pulled in via `@solana/web3.js`) with no patched release yet. Never run `npm audit fix --force`: it rewrites these to major versions Expo and the Solana libraries do not support.

Full setup detail, including running against the web app locally instead of a deployed relay, is in [`docs/running-on-a-device.md`](docs/running-on-a-device.md).

## Development

| Suite                       | Covers                                                                                                                                                                                                                | Run                                 | In CI                        |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- | ---------------------------- |
| Lint and types              | ESLint (Expo config, Prettier-compatible, a ban on the bare `Buffer` global) and TypeScript strict.                                                                                                                   | `npm run lint`, `npm run typecheck` | Yes                          |
| Format                      | Prettier.                                                                                                                                                                                                             | `npm run format:check`              | Yes                          |
| Unit and component (Jest)   | `jest-expo` with React Native Testing Library. Screens run the real shared wallet store over the shared in-memory vault with real key derivation; components are tested by role and state. Tests sit beside the code. | `npm test`, `npm run test:coverage` | Yes, with a coverage summary |
| Expo doctor                 | Dependency versions against the SDK and the project configuration.                                                                                                                                                    | `npm run doctor`                    | Yes                          |
| Web export                  | The app bundles for the web target.                                                                                                                                                                                   | `npm run export:web`                | Yes                          |
| UI (Playwright, web export) | The critical journeys in Chromium at 390 x 844 against a static export, listed below.                                                                                                                                 | `npm run test:e2e`                  | Yes                          |
| UI (Maestro, native)        | The same journeys on a real iOS or Android build.                                                                                                                                                                     | `maestro test .maestro/`            | No, needs a device           |

### UI tests on the web export

`npm run test:e2e` exports the app for the web (`dist/e2e`, built against `https://app.noirwire.com` on mainnet), serves it on `127.0.0.1:8061` (`E2E_PORT` changes it) and runs `e2e/` in Chromium. Every request to the relay origin is answered from committed fixtures in `e2e/fixtures/` and `e2e/support/relay.ts`: Solana RPC, prices, price history, Jupiter quotes, Earn vaults and the fee relayer. Any request to another host is blocked and fails the test, as does an uncaught page error, so the suite never reaches production or the internet. A funded wallet is seeded into the browser by the shared wallet code itself, encrypted exactly as the app stores it.

Journeys covered:

- Create a wallet with the three-word phrase check, landing on an empty Home; a wrong word is refused.
- Import a wallet from a recovery phrase through the source choice.
- Unlock, a wrong password refused, lock, unlock again.
- Home with a funded portfolio, what it has in Earn and USDC waiting in the funding wallet, then the portfolio.
- Markets, search, a tracker, its chart range, and a buy order's review priced from the quote.
- Send to the wallet's own funding address: the review warns that it links the two and gates Send on it.
- Fund privately: a comma is read as the decimal separator, and the review shows both fees and the total leaving the funding wallet.
- Earn: a deposit from a chosen portfolio reaches its review.
- Settings reset: Delete stays disabled until RESET is typed, and the vault is empty afterwards.

`E2E_SKIP_EXPORT=1 npm run test:e2e` reuses an existing `dist/e2e`. On failure, CI uploads the Playwright report and traces.

### UI tests on a native build (Maestro)

The flows in `.maestro/` drive the same journeys on a locally built debug app with [Maestro](https://maestro.dev), matching the screens' accessibility labels. See [`.maestro/README.md`](.maestro/README.md) for the full setup and run instructions. The Maestro flows were written against labels verified in the web export and have not yet been run on a device.

## Building locally

Every build runs on this machine: no Expo account, no EAS, no cloud build of any kind. Native folders (`ios/`, `android/`) are generated by `expo prebuild` and never committed; each script below regenerates what it needs.

| Script                   | Produces                                                                                                                                                         |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run ios:sim`        | A debug build on the iOS Simulator. No signing, no Apple team needed.                                                                                            |
| `npm run android:debug`  | A debug build on a connected Android device or emulator.                                                                                                         |
| `npm run android:apk`    | A signed, installable release APK (`android/app/build/outputs/apk/release/`) - sideload it on a phone or a Solana Seeker, or submit it to the Solana dApp Store. |
| `npm run android:bundle` | A signed release Android App Bundle (`android/app/build/outputs/bundle/release/`) for Google Play.                                                               |
| `npm run ios:device`     | A debug build installed on a connected, registered iPhone.                                                                                                       |
| `npm run ios:archive`    | A release-configuration build, for an App Store archive. Open the generated Xcode project to finish the archive and upload to App Store Connect.                 |

### Signing

**Android.** A release build (`android:apk`, `android:bundle`) reads the keystore path and passwords from environment variables, wired into the generated Gradle project by `plugins/withAndroidReleaseSigning.js` (a config plugin, since `android/` is regenerated on every prebuild and a manual Gradle edit would not survive it):

| Variable                             | Value                            |
| ------------------------------------ | -------------------------------- |
| `NOIRWIRE_ANDROID_KEYSTORE_PATH`     | Path to the upload keystore file |
| `NOIRWIRE_ANDROID_KEYSTORE_PASSWORD` | Its store password               |
| `NOIRWIRE_ANDROID_KEY_ALIAS`         | The key alias inside it          |
| `NOIRWIRE_ANDROID_KEY_PASSWORD`      | The key's own password           |

Create the upload keystore once, keep it outside git (a git-ignored `credentials/` folder is a reasonable place for it), and never let it leave this machine:

```sh
keytool -genkeypair -v -keystore credentials/noirwire-upload.keystore \
  -alias noirwire-upload -keyalg RSA -keysize 2048 -validity 10000
```

Without all four variables set, `assembleRelease` and `bundleRelease` fail immediately with a clear error - they never fall back to the debug key.

**iOS.** `NOIRWIRE_APPLE_TEAM_ID` (your Apple Developer team's 10-character ID) feeds `ios.appleTeamId` in `app.config.ts`. `ios:device` and `ios:archive` both refuse to run without it, so Xcode can never silently sign with whichever team happens to be logged in. The simulator build (`ios:sim`) needs no team and no signing.

## Security

Report a vulnerability privately to **ph1l1ph@proton.me**, as described in [SECURITY.md](SECURITY.md). Never open a public issue for one.

What the code guarantees, and every change has to keep true:

- **Keys never leave the device.** Nothing that can sign is sent anywhere.
- **Addresses are secrets.** An address is never put in a route, a log, an analytics event or an error report. Route parameters carry portfolio ids and tracker symbols only, written and read with the shared package's route helpers, which refuse anything shaped like an address.
- **Costs are shown in USDC** before any action is confirmed.
- **A broken runtime does not run a wallet** (`src/boot/`).

The code has not been audited.

## Licence

All rights reserved. The source is published for transparency. See [LICENSE](LICENSE).

Related: [shared-noirwire](https://github.com/Noirwire/shared-noirwire) · [relayer-noirwire](https://github.com/Noirwire/relayer-noirwire) · [noirwire.com](https://noirwire.com)
