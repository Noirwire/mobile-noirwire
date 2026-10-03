import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { RecoveryPhraseScreen } from "@/features/settings/RecoveryPhraseScreen";

export default function RecoveryPhrase() {
  // Losing focus remounts the screen, which drops the words from memory.
  const [visit, setVisit] = useState(0);
  useFocusEffect(useCallback(() => () => setVisit((count) => count + 1), []));
  return <RecoveryPhraseScreen key={visit} />;
}
