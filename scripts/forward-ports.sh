#!/usr/bin/env bash
# Forwards the dev server (8081) and a local API (4000 for the test network,
# 4001 for mainnet) to every Android device and emulator adb can see. The forwards are lost whenever a device is
# unplugged, restarted or adb itself restarts, so run this again after any of those.
set -euo pipefail

devices=$(adb devices | awk 'NR > 1 && $2 == "device" { print $1 }')
if [ -z "$devices" ]; then
  echo "No Android device or emulator is connected (check: adb devices)." >&2
  exit 1
fi

for device in $devices; do
  adb -s "$device" reverse tcp:8081 tcp:8081 >/dev/null
  adb -s "$device" reverse tcp:4000 tcp:4000 >/dev/null
  adb -s "$device" reverse tcp:4001 tcp:4001 >/dev/null
  echo "$device: forwarding 8081 (dev server), 4000 and 4001 (local API)"
done
