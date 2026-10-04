import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { AppState, type AppStateStatus } from "react-native";
import { PhraseScreen } from "./PhraseScreen";

const WORDS =
  "abandon ability able about above absent absorb abstract absurd abuse access accident".split(" ");

function appStateListener() {
  let listener: (state: AppStateStatus) => void = () => undefined;
  jest.spyOn(AppState, "addEventListener").mockImplementation((_, next) => {
    listener = next as typeof listener;
    return { remove: jest.fn() };
  });
  return (state: AppStateStatus) => act(() => listener(state));
}

describe("PhraseScreen", () => {
  afterEach(() => jest.restoreAllMocks());

  it("conceals the words until Reveal and keeps Continue disabled, with nothing to copy", async () => {
    await render(<PhraseScreen words={WORDS} onContinue={jest.fn()} />);
    expect(screen.queryByText("abandon")).toBeNull();
    expect(screen.getByLabelText("Recovery phrase, hidden")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: /copy/i })).toBeNull();
  });

  it("continues only once the words were revealed and their saving acknowledged", async () => {
    const onContinue = jest.fn();
    await render(<PhraseScreen words={WORDS} onContinue={onContinue} />);
    await fireEvent.press(screen.getByRole("button", { name: "Reveal phrase" }));
    expect(screen.getByLabelText("Word 1, abandon")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
    await fireEvent.press(
      screen.getByRole("checkbox", { name: "I have saved these words for the next step." }),
    );
    await fireEvent.press(screen.getByRole("button", { name: "Continue" }));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it("conceals the words again when the app leaves the foreground", async () => {
    const become = appStateListener();
    await render(<PhraseScreen words={WORDS} onContinue={jest.fn()} />);
    await fireEvent.press(screen.getByRole("button", { name: "Reveal phrase" }));
    expect(screen.getByText("abandon")).toBeOnTheScreen();
    await become("background");
    expect(screen.queryByText("abandon")).toBeNull();
  });
});
