import type { ImportResolution } from "@noirwire/shared/infrastructure";
import { act, fireEvent, screen } from "@testing-library/react-native";
import { installTestPlatform, renderWith, testServices } from "../testServices";
import { IMPORT_ATTEMPTS, RETRY_PAUSE_MS } from "./importProgress";
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

  it("shows the import as progress while it runs, and says so when it is slow", async () => {
    jest.useFakeTimers();
    let finish!: (value: ImportResolution) => void;
    const resolveImport = () => new Promise<ImportResolution>((resolve) => (finish = resolve));
    await renderWith(await testServices({ resolveImport }), <ImportScreen onFound={jest.fn()} />);
    await fireEvent.changeText(field(), PHRASE);
    await fireEvent.press(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("header", { name: "Importing your wallet" })).toBeOnTheScreen();
    expect(screen.queryByLabelText("Recovery phrase")).toBeNull();
    expect(screen.getByText("Finding your portfolios")).toBeOnTheScreen();
    await act(() => jest.advanceTimersByTime(SLOW_CHECK_MS));
    expect(
      screen.getByText("Still working. A wallet with many portfolios takes a little longer."),
    ).toBeOnTheScreen();
    await act(async () => finish(RESOLUTION));
    jest.useRealTimers();
  });

  it("tries a failed lookup again without saying anything", async () => {
    jest.useFakeTimers();
    const resolveImport = jest
      .fn<Promise<ImportResolution>, [string]>()
      .mockRejectedValueOnce(new Error("busy"))
      .mockResolvedValue(RESOLUTION);
    const onFound = jest.fn();
    await renderWith(await testServices({ resolveImport }), <ImportScreen onFound={onFound} />);
    await fireEvent.changeText(field(), PHRASE);
    await fireEvent.press(screen.getByRole("button", { name: "Continue" }));
    await act(() => jest.advanceTimersByTimeAsync(RETRY_PAUSE_MS));
    expect(resolveImport).toHaveBeenCalledTimes(2);
    expect(onFound).toHaveBeenCalledWith(PHRASE.split(" "), RESOLUTION);
    expect(screen.queryByRole("alert")).toBeNull();
    jest.useRealTimers();
  });

  it("says plainly when the import cannot finish, after every try", async () => {
    jest.useFakeTimers();
    const resolveImport = jest.fn(async () => {
      throw new Error("down");
    });
    await renderWith(await testServices({ resolveImport }), <ImportScreen onFound={jest.fn()} />);
    await fireEvent.changeText(field(), PHRASE);
    await fireEvent.press(screen.getByRole("button", { name: "Continue" }));
    await act(() => jest.advanceTimersByTimeAsync(RETRY_PAUSE_MS * IMPORT_ATTEMPTS));
    expect(resolveImport).toHaveBeenCalledTimes(IMPORT_ATTEMPTS);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "We couldn't finish importing your wallet. Nothing was saved on this phone. Try again.",
    );
    expect(field()).toBeOnTheScreen();
    jest.useRealTimers();
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
