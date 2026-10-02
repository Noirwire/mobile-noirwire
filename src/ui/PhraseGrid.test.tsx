import { act, fireEvent, render, screen } from "@testing-library/react-native";
import * as Clipboard from "expo-clipboard";
import { allowScreenCaptureAsync, preventScreenCaptureAsync } from "expo-screen-capture";
import { PhraseGrid } from "./PhraseGrid";
import { SECRET_CLIPBOARD_MS } from "./secretClipboard";

jest.mock("expo-clipboard", () => ({
  setStringAsync: jest.fn(() => Promise.resolve(true)),
  getStringAsync: jest.fn(() => Promise.resolve("")),
}));

const WORDS =
  "orbit lunar velvet canyon maple ember quartz harbor willow signal pepper drift".split(" ");

beforeEach(() => jest.clearAllMocks());
afterEach(() => jest.useRealTimers());

describe("PhraseGrid", () => {
  it("renders no word before Reveal and reads as one hidden phrase", async () => {
    await render(<PhraseGrid words={WORDS} revealed={false} onReveal={jest.fn()} />);
    for (const word of WORDS) expect(screen.queryByText(word)).toBeNull();
    expect(screen.getByLabelText("Recovery phrase, hidden")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Reveal phrase" })).toBeOnTheScreen();
    expect(preventScreenCaptureAsync).not.toHaveBeenCalled();
  });

  it("asks its owner to reveal", async () => {
    const onReveal = jest.fn();
    await render(<PhraseGrid words={WORDS} revealed={false} onReveal={onReveal} />);
    await fireEvent.press(screen.getByRole("button", { name: "Reveal phrase" }));
    expect(onReveal).toHaveBeenCalledTimes(1);
  });

  it("numbers every word once revealed, never selectable, and protects the screen", async () => {
    const view = await render(<PhraseGrid words={WORDS} revealed onReveal={jest.fn()} />);
    expect(screen.getByLabelText("Word 1, orbit")).toBeOnTheScreen();
    expect(screen.getByLabelText("Word 12, drift")).toBeOnTheScreen();
    expect(screen.getByText("07")).toBeOnTheScreen();
    expect(screen.getByText("quartz").props.selectable).toBe(false);
    expect(screen.queryByRole("button", { name: "Reveal phrase" })).toBeNull();
    expect(preventScreenCaptureAsync).toHaveBeenCalledTimes(1);

    await view.unmount();
    expect(allowScreenCaptureAsync).toHaveBeenCalledTimes(1);
  });

  it("lays out twenty-four words", async () => {
    const words = [...WORDS, ...WORDS];
    await render(<PhraseGrid words={words} revealed onReveal={jest.fn()} />);
    expect(screen.getByLabelText("Word 24, drift")).toBeOnTheScreen();
  });

  it("offers no Copy unless asked to", async () => {
    await render(<PhraseGrid words={WORDS} revealed onReveal={jest.fn()} />);
    expect(screen.queryByRole("button", { name: "Copy" })).toBeNull();
  });

  it("warns before copying, then clears the clipboard after 30 seconds", async () => {
    jest.useFakeTimers();
    await render(<PhraseGrid words={WORDS} revealed copyable onReveal={jest.fn()} />);

    await fireEvent.press(screen.getByRole("button", { name: "Copy" }));
    expect(Clipboard.setStringAsync).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(/Other apps and keyboards/);

    await fireEvent.press(screen.getByRole("button", { name: "Copy anyway" }));
    expect(Clipboard.setStringAsync).toHaveBeenCalledWith(WORDS.join(" "));
    expect(screen.getByText(/The clipboard is cleared in 30 seconds/)).toBeOnTheScreen();

    await act(() => jest.advanceTimersByTime(SECRET_CLIPBOARD_MS - 1));
    expect(Clipboard.setStringAsync).not.toHaveBeenCalledWith("");
    await act(() => jest.advanceTimersByTime(1));
    expect(Clipboard.setStringAsync).toHaveBeenLastCalledWith("");
  });

  it("copies nothing when the warning is cancelled", async () => {
    await render(<PhraseGrid words={WORDS} revealed copyable onReveal={jest.fn()} />);
    await fireEvent.press(screen.getByRole("button", { name: "Copy" }));
    await fireEvent.press(screen.getByRole("button", { name: "Cancel" }));
    expect(Clipboard.setStringAsync).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Copy" })).toBeOnTheScreen();
  });
});
