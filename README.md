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

| Platform               | Distribution                                                 |
| ---------------------- | ------------------------------------------------------------ |
| iOS 16.4 or later      | App Store (production profile), internal builds for testers  |
| Android 7.0 (API 24)+  | Google Play (production profile), APK for testers            |
| Solana Seeker and Saga | Solana dApp Store, as a signed APK (`dapp-store` profile)    |
| Web (browser export)   | Test target only. It runs the UI suite and is not a product. |

The app uses native modules (`react-native-quick-crypto` among them), so it does not run in Expo Go. It needs a development build. Native builds have not yet been verified on physical devices.

## Architecture

TypeScript, React 19.2 and React Native 0.86 on Expo SDK 57, with Expo Router for navigation.

| Layer              | What it holds                                                                                                                                                                                                          |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@noirwire/shared` | The wallet core, shared with the web app: domain rules, application use cases, presentation view models and copy, design tokens, and the Solana infrastructure. It talks to the phone only through ports (`platform`). |
| `src/platform/`    | The phone's adapters behind those ports, wired once by `install.ts` after the runtime checks pass.                                                                                                                     |
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

Requirements: Node 22 or later (`.nvmrc`), npm, and for native builds Xcode 26 or the Android SDK (platform 36, JDK 17), or an Expo account for cloud builds.

```sh
git clone https://github.com/Noirwire/mobile-noirwire.git
cd mobile-noirwire
npm ci
cp .env.example .env
```

### Installing the shared package before its tag is published

`package.json` declares the shared package as a git tag of `Noirwire/shared-noirwire`. Until that tag is published, `npm install` and `npm ci` on a fresh clone fail on that one dependency. Until then, pack the shared repository checked out next to this one and install the tarball over the declared dependency, without changing `package.json`:

```sh
# in ../shared-noirwire
npm pack --pack-destination ../shared-pack

# here
npm install --no-save ../shared-pack/noirwire-shared-<version>.tgz
```

Repeat both after every change to the shared package. `--no-save` keeps the git URL in `package.json`; never commit a tarball or `file:` path there. A symlinked folder (`npm install ../shared-noirwire`) does not work: Metro does not follow it and it brings a second copy of every library the two share.

### Run it

```sh
npm test               # the Jest suite
npm run web            # the app in a browser, for a quick look
npm start              # the bundler, for a development build on a phone
```

To put a development build on a phone, build one with EAS (see [Build and release](#build-and-release)) or locally with `npx expo run:ios` / `npx expo run:android`. Both generate `ios/` and `android/` first; those folders are build output, ignored by git and recreated by `npx expo prebuild --clean`. Change native configuration in `app.config.ts`.

### Environment

| Variable                     | Purpose                                                           |
| ---------------------------- | ----------------------------------------------------------------- |
| `EXPO_PUBLIC_RELAY_URL`      | Origin of the NoirWire relay, such as `https://app.noirwire.com`. |
| `EXPO_PUBLIC_SOLANA_NETWORK` | `mainnet` or `devnet`.                                            |

Every `EXPO_PUBLIC_` value is compiled into the app and readable by anyone who has it, so nothing secret belongs in them. Both are checked at start (`src/platform/env.ts`): the relay must be an https origin with no path (plain http only to `localhost`, `127.0.0.1` or the Android emulator's `10.0.2.2`). A bad value stops the app on the runtime failure screen.

## Development

| Suite                       | Covers                                                                                                                                                                                                                | Run                                 | In CI                        |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- | ---------------------------- |
| Lint and types              | ESLint (Expo config, Prettier-compatible, a ban on the bare `Buffer` global) and TypeScript strict.                                                                                                                   | `npm run lint`, `npm run typecheck` | Yes                          |
| Format                      | Prettier.                                                                                                                                                                                                             | `npm run format:check`              | Yes                          |
| Unit and component (Jest)   | `jest-expo` with React Native Testing Library. Screens run the real shared wallet store over the shared in-memory vault with real key derivation; components are tested by role and state. Tests sit beside the code. | `npm test`, `npm run test:coverage` | Yes, with a coverage summary |
| Expo doctor                 | Dependency versions against the SDK and the project configuration.                                                                                                                                                    | `npm run doctor`                    | Yes                          |
| Web export                  | The app bundles for the web target.                                                                                                                                                                                   | `npm run export:web`                | Yes                          |
| UI (Playwright, web export) | The critical journeys in Chromium at 390 x 844 against a static export, listed below.                                                                                                                                 | `npm run test:e2e`                  | Yes                          |
| UI (Maestro, native)        | The same journeys on a real iOS or Android build.                                                                                                                                                                     | `maestro test .maestro/`            | No, needs a device or EAS    |

### UI tests on the web export

`npm run test:e2e` exports the app for the web (`dist/e2e`, built against `https://app.noirwire.com` on mainnet), serves it on `127.0.0.1:8061` (`E2E_PORT` changes it) and runs `e2e/` in Chromium. Every request to the relay origin is answered from committed fixtures in `e2e/fixtures/` and `e2e/support/relay.ts`: Solana RPC, prices, price history, Jupiter quotes, Earn vaults and the fee relayer. Any request to another host is blocked and fails the test, as does an uncaught page error, so the suite never reaches production or the internet. A funded wallet is seeded into the browser by the shared wallet code itself, encrypted exactly as the app stores it.

Journeys covered:

- Create a wallet with the three-word phrase check, landing on an empty Home; a wrong word is refused.
- Import a wallet from a recovery phrase through the source choice.
- Unlock, a wrong password refused, lock, unlock again.
- Home with a funded portfolio and USDC waiting in the funding wallet, then the portfolio.
- Markets, search, a tracker, its chart range, and a buy order's review priced from the quote.
- Send to the wallet's own funding address: the review warns that it links the two and gates Send on it.
- Fund privately: the review shows both fees and the total leaving the funding wallet.
- Earn: a deposit from a chosen portfolio reaches its review.
- Settings reset: Delete stays disabled until RESET is typed, and the vault is empty afterwards.

`E2E_SKIP_EXPORT=1 npm run test:e2e` reuses an existing `dist/e2e`. On failure, CI uploads the Playwright report and traces.

### UI tests on a native build (Maestro)

The flows in `.maestro/` drive the same journeys on a development or preview build with [Maestro](https://maestro.dev), matching the screens' accessibility labels. Install Maestro, install a build on a simulator, emulator or phone, then:

```sh
maestro test .maestro/
```

That runs the flows that need no money: create with the phrase check, a refused wrong word, import, lock and unlock, Markets to a tracker's buy sheet, and Settings reset. The flows in `.maestro/funded/` reach the trade, send (own-address warning), fund privately and Earn reviews, and need a wallet that already holds USDC in its funding wallet and in a portfolio. They stop at each review and never confirm:

```sh
maestro test --include-tags funded \
  -e FUNDED_PHRASE="<test wallet phrase>" -e FUNDING_ADDRESS="<its funding address>" \
  -e PORTFOLIO="<its portfolio name>" .maestro/funded/
```

On EAS, build with the `e2e-test` profile and run the same command against the build as a Maestro step of an EAS Workflow. The Maestro flows were written against labels verified in the web export and have not yet been run on a device.

## Build and release

Builds run on EAS with the profiles in `eas.json`:

| Profile              | Use                                                                                                       |
| -------------------- | --------------------------------------------------------------------------------------------------------- |
| `development`        | Development client for a simulator and an Android APK.                                                    |
| `development-device` | Development client for a registered iPhone and an Android APK.                                            |
| `preview`            | Internal distribution: installable iOS build for registered devices, Android APK.                         |
| `e2e-test`           | Unsigned simulator build and APK for automated UI tests.                                                  |
| `production`         | Store builds: App Store, and an Android App Bundle for Google Play. Build numbers increase automatically. |
| `dapp-store`         | The production build as a signed APK, for the Solana dApp Store.                                          |

`.github/workflows/eas-build.yml` runs the full CI first, then:

- on a version tag (`git tag v0.2.0 && git push origin v0.2.0`): `eas build --platform all --profile production --non-interactive`;
- on a manual run (Actions, EAS build, Run workflow): a `preview` build for the chosen platform.

Both need the `EXPO_TOKEN` repository secret, an Expo access token. Without it the build job is skipped with a notice. The first build also needs `eas init` once, which adds the project id to the Expo configuration; commit what it adds. Submitting to the stores and to the Solana dApp Store is done by hand from the finished builds.

## Security

Report a vulnerability privately to **ph1l1ph@proton.me**, as described in [SECURITY.md](SECURITY.md). Never open a public issue for one.

What the code guarantees, and every change has to keep true:

- **Keys never leave the device.** Nothing that can sign is sent anywhere.
- **Addresses are secrets.** An address is never put in a route, a log, an analytics event or an error report. Route parameters carry portfolio ids and tracker symbols only, and anything shaped like an address is refused (`src/navigation/routeParams.ts`).
- **Costs are shown in USDC** before any action is confirmed.
- **A broken runtime does not run a wallet** (`src/boot/`).

The code has not been audited.

## Licence

All rights reserved. The source is published for transparency. See [LICENSE](LICENSE).

Related: [shared-noirwire](https://github.com/Noirwire/shared-noirwire) · [relayer-noirwire](https://github.com/Noirwire/relayer-noirwire) · [noirwire.com](https://noirwire.com)
