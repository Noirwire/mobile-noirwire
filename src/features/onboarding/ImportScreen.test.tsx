import { mobileOnboardingCopy, onboardingCopy } from "@noirwire/shared/copy";
import type { ImportResolution } from "@noirwire/shared/infrastructure";
import { STILL_WORKING_AFTER_MS } from "@noirwire/shared/presentation";
import { act, fireEvent, screen } from "@testing-library/react-native";
import { preventScreenCaptureAsync } from "expo-screen-capture";
import { useState } from "react";
import { Keyboard } from "react-native";
import type { AppServices } from "../services";
import { installTestPlatform, renderWith, testServices } from "../testServices";
import { IMPORT_LIMIT_MS, ImportScreen } from "./ImportScreen";

const PHRASE =
  "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
const RESOLUTION = { scheme: null } as ImportResolution;
/** A failed lookup says what it means for the wallet, and nothing technical. */
const FAILED = /Nothing was saved on this phone\. Try again\.$/;

beforeEach(() => {
  installTestPlatform();
  jest.useFakeTimers();
});
afterEach(() => jest.useRealTimers());

const field = () => screen.getByLabelText("Recovery phrase");
const pressContinue = () => fireEvent.press(screen.getByRole("button", { name: "Continue" }));
/** Lets the top loader be drawn and the lookup start. */
const settle = () => act(() => jest.advanceTimersByTimeAsync(50));

/** A lookup that answers when the test says so. */
function heldLookup() {
  let finish!: (value: ImportResolution) => void;
  let fail!: (error: Error) => void;
  const resolveImport = jest.fn(
    () =>
      new Promise<ImportResolution>((resolve, reject) => {
        finish = resolve;
        fail = reject;
      }),
  );
  return { resolveImport, finish: () => finish(RESOLUTION), fail: () => fail(new Error("down")) };
}

async function importing(overrides: Partial<AppServices> = {}, onFound = jest.fn()) {
  const lookup = heldLookup();
  await renderWith(
    await testServices({ resolveImport: lookup.resolveImport, ...overrides }),
    <ImportScreen onFound={onFound} />,
  );
  await fireEvent.changeText(field(), PHRASE);
  await pressContinue();
  await settle();
  return { ...lookup, onFound };
}

describe("ImportScreen", () => {
  it("counts words as they are typed, and a line break is not a word", async () => {
    await renderWith(await testServices(), <ImportScreen onFound={jest.fn()} />);
    expect(screen.getByText("12 or 24 words")).toBeOnTheScreen();
    await fireEvent.changeText(field(), "abandon ability able about above absent absorb\n\n");
    expect(screen.getByText("7 words")).toBeOnTheScreen();
    await fireEvent.changeText(field(), "1. abandon\n2. ability,\n3. ABLE");
    expect(screen.getByText("3 words")).toBeOnTheScreen();
  });

  it("is four lines tall and submits on Enter instead of adding a line", async () => {
    await renderWith(await testServices(), <ImportScreen onFound={jest.fn()} />);
    expect(field().props.multiline).toBe(true);
    expect(field().props.submitBehavior).toBe("blurAndSubmit");
    expect(field()).toHaveStyle({ minHeight: 4 * 22 + 24 });
  });

  it("says how many words there were once the field is left", async () => {
    await renderWith(await testServices(), <ImportScreen onFound={jest.fn()} />);
    await fireEvent.changeText(field(), "abandon ".repeat(11));
    expect(screen.queryByRole("alert")).toBeNull();
    await fireEvent(field(), "blur");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "A recovery phrase is 12 or 24 words. This has 11.",
    );
  });

  it("says so when the keyboard is closed, which never blurs the field", async () => {
    const hide = jest.spyOn(Keyboard, "addListener");
    await renderWith(await testServices(), <ImportScreen onFound={jest.fn()} />);
    await fireEvent.changeText(field(), "abandon ".repeat(13));
    const closed = hide.mock.calls.find(([event]) => event === "keyboardDidHide")?.[1];
    await act(async () => closed?.({} as never));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "A recovery phrase is 12 or 24 words. This has 13.",
    );
    hide.mockRestore();
  });

  it("keeps Continue pressable for a refused phrase, and pressing it says why", async () => {
    const resolveImport = jest.fn(async () => RESOLUTION);
    await renderWith(await testServices({ resolveImport }), <ImportScreen onFound={jest.fn()} />);
    expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled();
    await pressContinue();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "A recovery phrase is 12 or 24 words. This has 0.",
    );
    await fireEvent.changeText(field(), "abandon ".repeat(12));
    await pressContinue();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "These are all real words, but together they are not a recovery phrase. Check that every word is the right one and in the right order.",
    );
    await fireEvent.changeText(field(), PHRASE.replace("about", "abotu"));
    await pressContinue();
    expect(screen.getByRole("alert")).toHaveTextContent(
      'Word 12, "abotu", is not a recovery phrase word. Check its spelling.',
    );
    expect(resolveImport).not.toHaveBeenCalled();
  });

  it("looks a valid phrase up, however it was pasted, and hands on what it found", async () => {
    const resolveImport = jest.fn(async () => RESOLUTION);
    const onFound = jest.fn();
    await renderWith(await testServices({ resolveImport }), <ImportScreen onFound={onFound} />);
    await fireEvent.changeText(field(), `  ${PHRASE.toUpperCase().replaceAll(" ", ",\n")}  `);
    await pressContinue();
    await settle();
    await settle();
    expect(resolveImport).toHaveBeenCalledWith(PHRASE);
    expect(onFound).toHaveBeenCalledWith(PHRASE.split(" "), RESOLUTION);
  });

  it("keeps the form on screen at once, before the lookup has started: no new page", async () => {
    const lookup = heldLookup();
    await renderWith(
      await testServices({ resolveImport: lookup.resolveImport }),
      <ImportScreen onFound={jest.fn()} />,
    );
    await fireEvent.changeText(field(), PHRASE);
    await pressContinue();
    expect(screen.getByRole("header", { name: onboardingCopy.import.title })).toBeOnTheScreen();
    expect(field()).toBeOnTheScreen();
    expect(field().props.value).toBe(PHRASE);
    expect(field().props.editable).toBe(false);
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeOnTheScreen();
    expect(
      screen.getByText("Checking what this phrase holds. This can take up to a minute."),
    ).toBeOnTheScreen();
    expect(lookup.resolveImport).not.toHaveBeenCalled();
    await settle();
    expect(lookup.resolveImport).toHaveBeenCalledTimes(1);
  });

  it("says it is still working once the lookup runs long", async () => {
    await importing();
    const slow = "Still working. A wallet with many portfolios takes a little longer.";
    expect(screen.queryByText(slow)).toBeNull();
    await act(() => jest.advanceTimersByTimeAsync(STILL_WORKING_AFTER_MS.action));
    expect(screen.getByText(slow)).toBeOnTheScreen();
  });

  it("can be cancelled while it runs, and ignores the answer that comes later", async () => {
    const { finish, onFound } = await importing();
    await fireEvent.press(screen.getByRole("button", { name: "Cancel" }));
    expect(field().props.value).toBe(PHRASE);
    expect(screen.queryByRole("alert")).toBeNull();
    await act(async () => finish());
    await settle();
    expect(onFound).not.toHaveBeenCalled();
  });

  it("says plainly when the import cannot finish, with nothing technical", async () => {
    const { fail } = await importing();
    await act(async () => fail());
    expect(screen.getByRole("alert")).toHaveTextContent(FAILED);
    expect(field().props.value).toBe(PHRASE);
    expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled();
  });

  it("ends with the plain failure when the phone goes offline mid-import", async () => {
    let goOffline!: () => void;
    const useOnline = () => {
      const [online, setOnline] = useState(true);
      goOffline = () => setOnline(false);
      return online;
    };
    const { resolveImport } = await importing({ useOnline });
    await act(async () => goOffline());
    expect(screen.getByRole("alert")).toHaveTextContent(FAILED);
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
    expect(screen.getByText(mobileOnboardingCopy.import.offline)).toBeOnTheScreen();
    expect(resolveImport).toHaveBeenCalledTimes(1);
  });

  it("never waits for ever: a lookup that does not answer ends with the plain failure", async () => {
    await importing();
    await act(() => jest.advanceTimersByTimeAsync(IMPORT_LIMIT_MS));
    expect(screen.getByRole("alert")).toHaveTextContent(FAILED);
    expect(field()).toBeOnTheScreen();
  });

  it("reads the clipboard only when Paste is pressed", async () => {
    const readClipboard = jest.fn(async () => PHRASE);
    await renderWith(await testServices({ readClipboard }), <ImportScreen onFound={jest.fn()} />);
    expect(readClipboard).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole("button", { name: "Paste" }));
    expect(readClipboard).toHaveBeenCalledTimes(1);
    expect(field().props.value).toBe(PHRASE);
  });

  it("offers no field to type a phrase into until the screen is kept out of captures", async () => {
    let protect!: () => void;
    (preventScreenCaptureAsync as jest.Mock).mockImplementationOnce(
      () => new Promise<void>((resolve) => (protect = resolve)),
    );
    await renderWith(await testServices(), <ImportScreen onFound={jest.fn()} />);
    expect(screen.queryByLabelText("Recovery phrase")).toBeNull();
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
    await act(async () => protect());
    expect(field()).toBeOnTheScreen();
  });

  it("keeps the field away when the protection is refused, and says so", async () => {
    (preventScreenCaptureAsync as jest.Mock).mockRejectedValueOnce(new Error("no"));
    await renderWith(await testServices(), <ImportScreen onFound={jest.fn()} />);
    await settle();
    expect(
      screen.getByText("This can't be shown safely right now, so it is kept hidden. Try again."),
    ).toBeOnTheScreen();
    expect(screen.queryByLabelText("Recovery phrase")).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Try again" }));
    await settle();
    expect(field()).toBeOnTheScreen();
  });
});
