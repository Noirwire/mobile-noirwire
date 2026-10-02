import { Redirect } from "expo-router";

// There is no wallet on the device to unlock yet, so the app always opens on onboarding.
export default function Entry() {
  return <Redirect href="/welcome" />;
}
