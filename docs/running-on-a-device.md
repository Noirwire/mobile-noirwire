# Running on a device

Detail behind the README's [Quick start](../README.md#quick-start): every build target, both relay options, and the four problems a first run tends to hit. Read the Quick start first; come here for the parts it only links to.

## Requirements

- Node 24 or later (`.nvmrc`) and npm.
- For native builds: Xcode (iOS) and the Android SDK, platform 36, with JDK 17.
- There is no cloud build path. Every build, including store and dApp Store builds, runs on this machine - see [Building locally](../README.md#building-locally) in the README for the full command table and signing setup.

## Choosing what the app talks to

`EXPO_PUBLIC_RELAY_URL` and `EXPO_PUBLIC_SOLANA_NETWORK` in `.env` decide this; see the comments in `.env.example`. There are exactly two working setups:

### Option A: a deployed relay

Point `EXPO_PUBLIC_RELAY_URL` at an https origin that already serves the relay routes (`/api/rpc`, `/api/prices`, `/api/jupiter`, `/api/relayer`, `/api/private-payments`), such as `https://app.noirwire.com`, and set `EXPO_PUBLIC_SOLANA_NETWORK` to the network that relay runs against. Nothing else to configure.

### Option B: the web app running locally

The web app ([`app-noirwire`](https://github.com/Noirwire/app-noirwire), a sibling repository, also serves the relay routes) can stand in for a deployed relay:

1. In the `app-noirwire` repo: `npm run dev`. It serves on port 3000.
2. With the Android device or emulator connected: `adb reverse tcp:3000 tcp:3000`, so a request to `localhost:3000` from the phone reaches the Mac. (iOS Simulator shares the Mac's network already and needs no `adb reverse`; a physical iPhone needs the Mac's LAN IP instead of `localhost`.)
3. In `.env`: `EXPO_PUBLIC_RELAY_URL=http://localhost:3000` and `EXPO_PUBLIC_SOLANA_NETWORK` set to whatever network `app-noirwire`'s own `.env` is running.
4. Restart Metro after editing `.env`: a running Metro does not pick up a changed `.env` on its own.

```sh
npm start -- --clear
```

## Building and installing a dev build

```sh
npm run ios:sim        # iOS Simulator - no signing, no Apple team needed
npm run android:debug  # a connected Android device or emulator
```

Both regenerate `ios/` and `android/` (build output, git-ignored) and install the dev build. The app needs native modules (`react-native-quick-crypto` among them), so it does not run in Expo Go - it needs this build.

A physical phone also needs USB debugging enabled (Android, in Developer options) or to be registered with your Apple team (iOS - `npm run ios:device` requires `NOIRWIRE_APPLE_TEAM_ID`, see [Signing](../README.md#signing) in the README).

For every other build target - a release APK, an App Bundle, a release Xcode archive - see [Building locally](../README.md#building-locally) in the README.

## Starting Metro

```sh
npm start
```

Open the dev build already installed on the simulator, emulator or phone and scan the printed QR code (the simulator and emulator connect without scanning). If the phone cannot reach Metro, see the firewall problem below.

## Troubleshooting

### `npm ci` prints a wall of warnings

Peer-dependency, deprecation and "NN vulnerabilities" warnings on a fresh install are expected and need no action:

- **Peer dependency**: a test tool's `react-reconciler` wants React 19.3; Expo SDK 57 pins React 19.2.3. Expo's pinned version is the one that ships.
- **Vulnerabilities**: Expo's own build tooling (the `xcode` / `node-forge` chain behind `expo prebuild`) plus two transitive Solana library advisories (`stream-json`, `uuid`, pulled in via `@solana/web3.js`'s `jayson` dependency) with no patched release yet.
- **Never run `npm audit fix --force`.** It rewrites these to major versions that Expo and the Solana libraries do not support, and will not actually fix the two advisories with no patch.

### `npm run android:debug` fails with "cannot write to emulator"

With no device attached, the command cold-starts an emulator and tries to install the app before it has finished booting, so `adb` cannot yet talk to it. Run the command again once the emulator has fully booted. With a phone and an emulator both connected at once, `expo run:android` needs to know which one: `npm run android:debug -- --device` opens a picker (or pass a name: `npm run android:debug -- --device "Pixel_7"`).

### Dev build on a phone can't reach Metro

Symptom: the installed app shows "Failed to connect to /192.168.x.x:8081" (or similar) instead of loading.

Cause: macOS's firewall blocks the phone's incoming connection to Metro's port 8081 on the Mac, even though both are on the same Wi-Fi.

Fix, with the phone on USB:

```sh
adb reverse tcp:8081 tcp:8081
```

Then open the dev build against `http://localhost:8081` instead of the LAN address Metro printed.

### "NoirWire cannot run safely on this device: App configuration"

Symptom: the app installs and opens, but immediately shows this failure screen with no further detail (in a production build).

Cause: `src/platform/install.ts` reads and validates `EXPO_PUBLIC_RELAY_URL` / `EXPO_PUBLIC_SOLANA_NETWORK` (`src/platform/env.ts`) before anything else runs, and throws if `.env` is missing - most often because the `cp .env.example .env` step was skipped - or if a value fails validation, such as the placeholder `https://relay.example.com` from `.env.example` left unedited, or a relay URL that is not a bare https origin.

Fix: create or correct `.env` (see "Choosing what the app talks to" above), then restart Metro with `npm start -- --clear`.

In a **development build**, this screen also prints the underlying error message under "App configuration" and logs it with `console.error`, so a missing or wrong setting names itself instead of only showing the generic line. A **production build** still shows only the generic line - see `src/boot/RuntimeGate.tsx`.
