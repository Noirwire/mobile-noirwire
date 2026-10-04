import { fireEvent, render, screen } from "@testing-library/react-native";
import { preventScreenCaptureAsync } from "expo-screen-capture";
import { useState } from "react";
import { ConfirmScreen } from "./ConfirmScreen";
import type { PhraseQuiz } from "@noirwire/shared/application";

const WORDS =
  "abandon ability able about above absent absorb abstract absurd abuse access accident".split(" ");

/** Positions 2, 7 and 11 (one-based), with the answer first among its choices. */
const QUIZ: PhraseQuiz = {
  positions: [1, 6, 10],
  step: 0,
  choices: ["ability", "absurd", "abuse", "accident"],
  disabled: [],
  misses: 0,
  hint: null,
  restarted: false,
  passed: false,
};

function Harness({ onPassed = jest.fn(), onShowPhrase = jest.fn() }) {
  const [quiz, setQuiz] = useState(QUIZ);
  return (
    <ConfirmScreen
      words={WORDS}
      quiz={quiz}
      onQuizChange={setQuiz}
      onPassed={onPassed}
      onShowPhrase={onShowPhrase}
    />
  );
}

describe("ConfirmScreen", () => {
  it("asks for a word by its position", async () => {
    await render(<Harness />);
    expect(screen.getByText("Question 1 of 3")).toBeOnTheScreen();
    expect(screen.getByRole("header", { name: "Which word is number 2?" })).toBeOnTheScreen();
    expect(screen.getAllByRole("button").map((button) => button.props.accessibilityLabel)).toEqual(
      expect.arrayContaining(["ability", "absurd", "abuse", "accident", "Show phrase again"]),
    );
  });

  it("keeps the question on a wrong pick, disables that word and names the position to check", async () => {
    await render(<Harness />);
    await fireEvent.press(screen.getByRole("button", { name: "abuse" }));
    expect(screen.getByRole("header", { name: "Which word is number 2?" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "abuse" })).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent("Check word 2 on your paper.");
  });

  it("restarts after three wrong picks, with the way back to the paper", async () => {
    const onShowPhrase = jest.fn();
    await render(<Harness onShowPhrase={onShowPhrase} />);
    await fireEvent.press(screen.getByRole("button", { name: "abuse" }));
    await fireEvent.press(screen.getByRole("button", { name: "absurd" }));
    await fireEvent.press(screen.getByRole("button", { name: "accident" }));
    expect(
      screen.getByText("Let's start again with different words. Look at your paper first."),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Show phrase again" }));
    expect(onShowPhrase).toHaveBeenCalledTimes(1);
    await fireEvent.press(screen.getByRole("button", { name: "Try again" }));
    expect(screen.getByText("Question 1 of 3")).toBeOnTheScreen();
  });

  it("passes after three correct picks", async () => {
    const onPassed = jest.fn();
    await render(<Harness onPassed={onPassed} />);
    for (const word of ["ability", "absorb", "access"]) {
      await fireEvent.press(screen.getByRole("button", { name: word }));
    }
    expect(onPassed).toHaveBeenCalledTimes(1);
  });

  it("shows no word to choose from when the screen cannot be kept out of captures", async () => {
    (preventScreenCaptureAsync as jest.Mock).mockRejectedValueOnce(new Error("no"));
    await render(<Harness />);
    expect(
      await screen.findByText(
        "This can't be shown safely right now, so it is kept hidden. Try again.",
      ),
    ).toBeOnTheScreen();
    for (const word of QUIZ.choices) expect(screen.queryByText(word)).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText(QUIZ.choices[0])).toBeOnTheScreen();
  });
});
