#!/usr/bin/env bash
# Forwards the dev server (8081) and a local relay (3000) to every Android
# device and emulator adb can see. The forwards are lost whenever a device is
# unplugged, restarted or adb itself restarts, so run this again after any of those.
set -euo pipefail

devices=$(adb devices | awk 'NR > 1 && $2 == "device" { print $1 }')
if [ -z "$devices" ]; then
  echo "No Android device or emulator is connected (check: adb devices)." >&2
  exit 1
fi

for device in $devices; do
  adb -s "$device" reverse tcp:8081 tcp:8081 >/dev/null
  adb -s "$device" reverse tcp:3000 tcp:3000 >/dev/null
  echo "$device: forwarding 8081 (dev server) and 3000 (local relay)"
done
