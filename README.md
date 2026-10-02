# mobile-noirwire

NoirWire for iOS and Android. NoirWire is a non-custodial Solana wallet that organises money into purpose-based private portfolios of crypto and trackers (tokenized stocks). This repository is the React Native app, built with Expo. It shares its visual language with the NoirWire web app and will share its wallet logic through a common package.

This is the foundation: the project, its runtime checks, the navigation skeleton and the UI kit. The screens themselves are placeholders. See [What is not built yet](#what-is-not-built-yet).

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

### On a device or simulator, with EAS

These are the commands to get a development build onto a device. They have been written from the project's configuration and have **not been run yet**: no native build of this project has been produced so far.

```sh
npm install --global eas-cli
eas login
eas init                                               # once, links the project to your Expo account
eas build --profile development --platform ios         # iOS simulator build
eas build --profile development --platform android     # Android APK
```

Install the build EAS produces (open the link it prints on the device, or drag the simulator build onto a running simulator), then start the bundler and open the app:

```sh
npx expo start --dev-client
```

The `development` profile builds for the iOS simulator. To put a development build on a physical iPhone, register the device with `eas device:create` and remove `"simulator": true` from that profile, or add a profile of your own.

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

Every `EXPO_PUBLIC_` value is compiled into the app and readable by anyone who has it. Nothing secret belongs in them. Nothing reads either variable yet.

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
app.config.ts         Expo configuration (name, identifiers, native build settings)
eas.json              Build profiles
app/                  Routes (Expo Router, one file per screen)
  (onboarding)/       welcome, create, import, set-password
  (tabs)/             Home, Markets, Earn, Activity, Settings
  portfolio/[id]      A portfolio
  markets/[symbol]    A tracker
  trade, send, ...    Modal routes
  unlock              Unlock
  dev/ui              The UI kit gallery (development builds only)
src/
  boot/               Runtime checks and the screen shown when one fails
  navigation/         Shared route pieces: placeholder, header options, parameter guard
  ui/                 The design system: tokens, type, components
  dev/                The gallery behind /dev/ui
  types/              Type declarations for third-party modules
```

### The design system

`src/ui/theme.ts` holds the same tokens, under the same names, as the `@theme` block of the web app's `globals.css`. When the web repository is checked out next to this one as `app-noirwire`, `npm test` compares the two and fails on drift. Without it that comparison is skipped.

To see every component in every state, open `/dev/ui` in a development build (the welcome screen links to it). The route and the gallery are left out of production bundles.

Two things to know when adding to the kit:

- **Icons** are imported one file at a time, `phosphor-react-native/src/icons/<Name>`, so the bundle carries only the icons in use. Importing from the package root pulls in every icon it ships.
- **Buffer** is always imported from the `buffer` package. The bare global is banned by lint: the native crypto module ships a second implementation, and two in one bundle break 64-bit reads.

## Testing

```sh
npm test
```

Jest with `jest-expo` and React Native Testing Library. Tests sit beside the code they cover. The suite covers the chart path maths, money and change formatting (the web app's own cases), the runtime checks against stubbed runtimes, the route parameter guard, and the Button, Field, Segmented, Sheet and Notice components.

CI (`.github/workflows/ci.yml`) runs type check, lint, format check and tests on every pull request.

## What is not built yet

- **Every screen is a placeholder.** Each route below exists, is reachable and shows an empty state that says what will go there. None of them does anything: welcome (which links to create and import), create, import, set-password, unlock, Home, Markets, Earn, Activity, Settings, portfolio, tracker, trade, send, receive, fund, new portfolio, pie builder and pie order.
- **There is no wallet.** No key generation, no storage, no unlocking, no network access, no prices. The app always opens on the welcome screen.
- **The native crypto module is linked but unused.** It is installed and checked at start; nothing else calls it yet.
- **No native build has been verified.** The native projects generate cleanly, and the app runs in a browser. It has not yet been compiled for or run on iOS or Android, so the runtime checks have not yet been seen passing on a device.
- **No end-to-end tests,** no app icon or splash artwork, no analytics, no crash reporting.

## Release profiles

Defined in `eas.json`.

| Profile       | Use                                                                    |
| ------------- | ---------------------------------------------------------------------- |
| `development` | Development client for day-to-day work. iOS simulator and Android APK. |
| `preview`     | Internal distribution build for testers.                               |
| `e2e-test`    | Unsigned iOS simulator build and Android APK for automated tests.      |
| `production`  | Store builds for the App Store and Google Play.                        |
| `dapp-store`  | Production build as an Android APK, for the Solana dApp Store.         |

The bundle identifier and Android package are both `com.noirwire.app` in `app.config.ts`. Change them there before the first store build: they cannot be changed after release.

## Security

See [SECURITY.md](SECURITY.md). Do not open a public issue for a vulnerability.

## Licence

All rights reserved. The source is published for transparency. See [LICENSE](LICENSE).
