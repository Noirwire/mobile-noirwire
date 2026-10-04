# Running on a device

Detail behind the README's [Quick start](../README.md#quick-start): every build target, both API options, and the four problems a first run tends to hit. Read the Quick start first; come here for the parts it only links to.

## Requirements

- Node 24 or later (`.nvmrc`) and npm.
- For native builds: Xcode (iOS) and the Android SDK, platform 36, with JDK 17.
- There is no cloud build path. Every build, including store and dApp Store builds, runs on this machine - see [Building locally](../README.md#building-locally) in the README for the full command table and signing setup.

## Choosing what the app talks to

`EXPO_PUBLIC_API_URL` and `EXPO_PUBLIC_SOLANA_NETWORK` in `.env` decide this; see the comments in `.env.example`. Every request the app makes goes to the NoirWire API at that origin (`/v1/rpc`, `/v1/prices`, `/v1/history`, `/v1/jupiter`, `/v1/relayer`, `/v1/private-payments`, `/v1/events`), with an anonymous session the API issues and the app keeps by itself: there is nothing to sign in to and nothing to configure for it. There are exactly two working setups:

### Option A: the deployed API

Set `EXPO_PUBLIC_API_URL=https://api.noirwire.com` and `EXPO_PUBLIC_SOLANA_NETWORK` to the network that API runs against. Nothing else to configure.

### Option B: the API running locally

The API ([`api-noirwire`](https://github.com/Noirwire/api-noirwire), a sibling repository) runs on this machine:

1. In the `api-noirwire` repo: `npm run dev:stack` (or `npm run supabase:start` and `npm run dev`). It serves on port 4000, on devnet unless its `.env` says otherwise.
2. With the Android device or emulator connected: `adb reverse tcp:4000 tcp:4000` (or `npm run android:ports`, which forwards Metro's port too), so a request to `localhost:4000` from the phone reaches the Mac. (iOS Simulator shares the Mac's network already and needs no `adb reverse`; an Android emulator can also use `http://10.0.2.2:4000` with no forward.)
3. In `.env`: `EXPO_PUBLIC_API_URL=http://localhost:4000` and `EXPO_PUBLIC_SOLANA_NETWORK` set to whatever network the API's own `.env` is running (`devnet` by default).
4. Restart Metro after editing `.env`: a running Metro does not pick up a changed `.env` on its own.

Plain http is accepted only in a development build and only to `localhost`, `127.0.0.1` or `10.0.2.2`. A physical iPhone cannot reach the Mac's `localhost`, and a LAN address over http is refused, so it needs option A.

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

### The app worked, and now shows a white screen or "can't show your balances"

**Symptom.** A dev build that was working opens to a blank white screen, or opens but says it cannot show balances, or an import cannot finish.

**Cause.** The port forwards are gone. `adb reverse` forwards last only while the device stays connected: unplugging the cable, restarting the phone or the emulator, or adb restarting drops them silently. Without port 8081 the dev build cannot load the app (white screen); without port 4000 it cannot reach a local API (no balances, no prices, no import), and says so in plain words with a "Try again" that works once the forward is back.

**Fix.**

```bash
npm run android:ports   # forwards 8081 and 4000 to every connected device
```

Then reopen the app, or press "Try again" where it is offered. If the local API itself is not running, the same screen shows: check `curl http://localhost:4000/health` on the Mac. `adb reverse --list` shows what is forwarded right now; with a phone and an emulator both attached, add `-s <serial>`.

### "NoirWire cannot run safely on this device: App configuration"

Symptom: the app installs and opens, but immediately shows this failure screen with no further detail (in a production build).

Cause: `src/platform/install.ts` reads and validates `EXPO_PUBLIC_API_URL` / `EXPO_PUBLIC_SOLANA_NETWORK` (`src/platform/env.ts`) before anything else runs, and throws if `.env` is missing - most often because the `cp .env.example .env` step was skipped - or if a value fails validation: `EXPO_PUBLIC_API_URL` left empty as `.env.example` ships it, a `.env` from before the app talked to the API that still says `EXPO_PUBLIC_RELAY_URL`, an API URL that is not a bare origin, or plain http to anything but this machine.

Fix: create or correct `.env` (see "Choosing what the app talks to" above), then restart Metro with `npm start -- --clear`.

In a **development build**, this screen also prints the underlying error message under "App configuration" and logs it with `console.error`, so a missing or wrong setting names itself instead of only showing the generic line: it says what is wrong with the value and to check `EXPO_PUBLIC_API_URL` and `EXPO_PUBLIC_SOLANA_NETWORK` in `.env`. A **production build** still shows only the generic line - see `src/boot/RuntimeGate.tsx`.
