# Running the Maestro flows

These flows drive a real build of the app the way a person would: by screen,
not by code. They are not run in CI (that is the Playwright suite against the
web export, see the root README) because they need a built app on a
simulator, emulator or phone.

## 1. Install Maestro

```sh
curl -Ls "https://get.maestro.mobile.dev" | bash
```

## 2. Build a debug app locally

No Expo account and no cloud build are involved; everything here runs on this
machine.

```sh
npm run ios:sim        # iOS Simulator
npm run android:debug  # a connected Android device or emulator
```

Both commands prebuild the native project and install a debug build, exactly
what Maestro drives. Leave the app installed; Maestro launches it by bundle
id (`com.noirwire.app`) from `.maestro/config.yaml`.

## 3. Run the flows

```sh
maestro test .maestro/
```

That runs every flow except `funded/*`: create a wallet with the phrase
check, a refused wrong word, import, lock and unlock, Markets to a tracker's
buy sheet, and Settings reset.

The `funded/` flows need a wallet that already holds USDC in its funding
wallet and in a portfolio, and never confirm past a review screen:

```sh
maestro test --include-tags funded \
  -e FUNDED_PHRASE="<test wallet phrase>" -e FUNDING_ADDRESS="<its funding address>" \
  -e PORTFOLIO="<its portfolio name>" .maestro/funded/
```

## Notes

- Point `EXPO_PUBLIC_API_URL` and `EXPO_PUBLIC_SOLANA_NETWORK` (in `.env`)
  at whatever the build should talk to before running `ios:sim` /
  `android:debug` - Maestro only drives the UI, it does not control which
  API or network the app was built against.
- These flows were written against the accessibility labels verified in the
  Playwright web-export suite (`e2e/`) and have not yet been run on a device.
- A release build (`npm run android:apk`, `npm run ios:device`,
  `npm run ios:archive`) also works as a Maestro target; swap the install
  step above for one of those if a release build is specifically what needs
  checking.
