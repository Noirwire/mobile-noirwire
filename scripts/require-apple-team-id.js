#!/usr/bin/env node

// A device build or an archive signs with a real Apple team. Without this
// check, an unset team id lets Xcode silently pick whichever team happens to
// be signed in on the Mac, which is exactly the failure mode the owner's
// local-only build setup is meant to rule out. See README.md > Building
// locally.
if (!process.env.NOIRWIRE_APPLE_TEAM_ID) {
  console.error(
    "NOIRWIRE_APPLE_TEAM_ID is not set.\n" +
      "Set it to your Apple Developer team's 10-character ID (Apple Developer " +
      "account > Membership) before running a device build or an archive.",
  );
  process.exit(1);
}
