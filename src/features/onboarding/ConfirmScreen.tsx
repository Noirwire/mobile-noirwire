import { onboardingCopy } from "@noirwire/shared/copy";
import { useEffect } from "react";
import { AccessibilityInfo, StyleSheet, View } from "react-native";
import { Button, Notice, Screen, Text } from "@/ui";
import { errorHaptic, lightHaptic, successHaptic } from "@/ui/haptics";
import { layout } from "@/ui/theme";
import { useCaptureProtection } from "@/ui/useCaptureProtection";
import { mobileOnboardingCopy } from "./copy";
import { QuizChoice } from "./QuizChoice";
import { pick, QUESTIONS, resume, type Quiz } from "./phraseQuiz";

type ConfirmScreenProps = {
  words: readonly string[];
  quiz: Quiz;
  onQuizChange: (quiz: Quiz) => void;
  onPassed: () => void;
  onShowPhrase: () => void;
};

const copy = onboardingCopy.confirm;
const mobile = mobileOnboardingCopy.confirm;

/** Spec 2.4: three words from the paper, by position. Never shows the phrase or the answer after a miss. */
export function ConfirmScreen({
  words,
  quiz,
  onQuizChange,
  onPassed,
  onShowPhrase,
}: ConfirmScreenProps) {
  useCaptureProtection(true);
  const position = quiz.positions[quiz.step] + 1;
  const question = copy.whichWord(position);

  useEffect(() => {
    if (!quiz.restarted) AccessibilityInfo.announceForAccessibility(question);
  }, [question, quiz.restarted]);

  function choose(word: string) {
    const { quiz: next, outcome } = pick(quiz, word, words);
    onQuizChange(next);
    if (outcome === "correct") lightHaptic();
    else if (outcome === "passed") {
      successHaptic();
      onPassed();
    } else errorHaptic();
  }

  return (
    <Screen edges={["right", "bottom", "left"]}>
      <View style={styles.intro}>
        <Text variant="display" accessibilityRole="header">
          {copy.title}
        </Text>
        <Text tone="dim">{mobile.intro}</Text>
      </View>
      {quiz.restarted ? (
        <View style={styles.group}>
          <Notice tone="warning">{mobile.restart}</Notice>
          <Button label={mobile.showAgain} onPress={onShowPhrase} />
          <Button
            label={mobile.tryAgain}
            variant="quiet"
            onPress={() => onQuizChange(resume(quiz))}
          />
        </View>
      ) : (
        <View style={styles.group}>
          <Text variant="faint">{copy.question(quiz.step + 1, QUESTIONS)}</Text>
          <Text variant="h2" accessibilityRole="header">
            {question}
          </Text>
          <View style={styles.choices}>
            {quiz.choices.map((word) => (
              <QuizChoice
                key={word}
                word={word}
                disabled={quiz.disabled.includes(word)}
                onPress={() => choose(word)}
              />
            ))}
          </View>
          {quiz.hint !== null && <Notice tone="warning">{mobile.checkWord(quiz.hint)}</Notice>}
          <Button label={mobile.showAgain} variant="quiet" onPress={onShowPhrase} />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { gap: layout.group },
  group: { gap: layout.group },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: layout.tight },
});
