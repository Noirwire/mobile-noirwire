import type { ImportResolution } from "@noirwire/shared/infrastructure";
import { act, fireEvent, screen } from "@testing-library/react-native";
import { installTestPlatform, renderWith, testServices } from "../testServices";
import { ImportScreen, SLOW_CHECK_MS } from "./ImportScreen";

const PHRASE =
  "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
const RESOLUTION = { scheme: null } as ImportResolution;

beforeEach(() => installTestPlatform());

const field = () => screen.getByLabelText("Recovery phrase");

describe("ImportScreen", () => {
  it("counts words as they are typed and refuses a phrase of the wrong length once left", async () => {
    await renderWith(await testServices(), <ImportScreen onFound={jest.fn()} />);
    expect(screen.getByText("12 or 24 words")).toBeOnTheScreen();
    await fireEvent.changeText(field(), "abandon ability able about above absent absorb");
    expect(screen.getByText("7 words")).toBeOnTheScreen();
    await fireEvent(field(), "blur");
    expect(screen.getByText("A recovery phrase is 12 or 24 words.")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
  });

  it("refuses twelve words whose checksum is wrong", async () => {
    await renderWith(await testServices(), <ImportScreen onFound={jest.fn()} />);
    await fireEvent.changeText(field(), "abandon ".repeat(12));
    await fireEvent(field(), "blur");
    expect(
      screen.getByText(
        "Those words don't form a valid recovery phrase. Check the spelling and order.",
      ),
    ).toBeOnTheScreen();
  });

  it("checks a valid phrase over the network and hands on what it found", async () => {
    const resolveImport = jest.fn(async () => RESOLUTION);
    const onFound = jest.fn();
    await renderWith(await testServices({ resolveImport }), <ImportScreen onFound={onFound} />);
    await fireEvent.changeText(field(), `  ${PHRASE.toUpperCase()}  `);
    await fireEvent.press(screen.getByRole("button", { name: "Continue" }));
    expect(resolveImport).toHaveBeenCalledWith(PHRASE);
    expect(onFound).toHaveBeenCalledWith(PHRASE.split(" "), RESOLUTION);
  });

  it("says when the check is slow, and holds the field while it runs", async () => {
    jest.useFakeTimers();
    let finish!: (value: ImportResolution) => void;
    const resolveImport = () => new Promise<ImportResolution>((resolve) => (finish = resolve));
    await renderWith(await testServices({ resolveImport }), <ImportScreen onFound={jest.fn()} />);
    await fireEvent.changeText(field(), PHRASE);
    await fireEvent.press(screen.getByRole("button", { name: "Continue" }));
    expect(
      screen.getByRole("button", { name: "Checking what this phrase holds..." }),
    ).toBeDisabled();
    expect(field().props.editable).toBe(false);
    await act(() => jest.advanceTimersByTime(SLOW_CHECK_MS));
    expect(
      screen.getByText("Looking for portfolios this phrase already has. This can take a moment."),
    ).toBeOnTheScreen();
    await act(async () => finish(RESOLUTION));
    jest.useRealTimers();
  });

  it("says the network could not be reached", async () => {
    await renderWith(await testServices(), <ImportScreen onFound={jest.fn()} />);
    await fireEvent.changeText(field(), PHRASE);
    await fireEvent.press(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Could not reach the network to check this phrase. Try again.",
    );
  });

  it("is unavailable offline, with the reason", async () => {
    await renderWith(
      await testServices({ useOnline: () => false }),
      <ImportScreen onFound={jest.fn()} />,
    );
    await fireEvent.changeText(field(), PHRASE);
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
    expect(
      screen.getByText(
        "You're offline. Importing needs the network to find what this phrase holds.",
      ),
    ).toBeOnTheScreen();
  });

  it("reads the clipboard only when Paste is pressed", async () => {
    const readClipboard = jest.fn(async () => PHRASE);
    await renderWith(await testServices({ readClipboard }), <ImportScreen onFound={jest.fn()} />);
    expect(readClipboard).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole("button", { name: "Paste" }));
    expect(readClipboard).toHaveBeenCalledTimes(1);
    expect(field().props.value).toBe(PHRASE);
  });
});
