import type { SchemeActivity } from "@noirwire/shared/infrastructure";
import { STILL_WORKING_AFTER_MS, WAITING_DELAY_MS } from "@noirwire/shared/presentation";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import type { ComponentProps } from "react";
import { LOOK_FURTHER_LIMIT_MS, ResultScreen } from "./ResultScreen";

const ADDRESS = "5aqYNsJsmRuasaFMMWAF2s94r1bTuXZC46A6Ro9C82GY";

const FOUND_ONE: SchemeActivity = {
  address: ADDRESS,
  balanceSol: 0,
  portfolios: [{ index: 1, address: ADDRESS, solBalance: 0 }],
  active: true,
  scannedThrough: 21,
};
const FOUND_NOTHING: SchemeActivity = {
  address: ADDRESS,
  balanceSol: 0,
  portfolios: [],
  active: false,
};
const FOUND_THREE: SchemeActivity = {
  ...FOUND_ONE,
  portfolios: [
    ...FOUND_ONE.portfolios,
    { index: 30, address: ADDRESS, solBalance: 0 },
    { index: 31, address: ADDRESS, solBalance: 0 },
  ],
};

type Props = ComponentProps<typeof ResultScreen>;

function show(props: Partial<Props> = {}) {
  const handlers = {
    onContinue: jest.fn(),
    onOtherSet: jest.fn(),
    onFoundMore: jest.fn(),
    lookFurther: jest.fn(async (activity: SchemeActivity) => activity),
  };
  const all: Props = {
    activity: FOUND_ONE,
    fundingAddress: ADDRESS,
    online: true,
    ...handlers,
    ...props,
  };
  return { ...all, view: render(<ResultScreen {...all} />) };
}

const lookFurther = () => screen.getByRole("button", { name: "Missing a portfolio? Look further" });

afterEach(() => jest.useRealTimers());

describe("ResultScreen", () => {
  it("says what was found and shows the funding address only when asked, in groups of four", async () => {
    const { onContinue, onOtherSet, view } = show();
    await view;
    expect(screen.getByText(/^Found 1 portfolio/)).toBeOnTheScreen();
    expect(screen.queryByText(/5aqY/)).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Show my funding wallet address" }));
    expect(screen.getByText(/^5aqY NsJs mRua/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Hide" }));
    expect(screen.queryByText(/5aqY/)).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Open the other set instead" }));
    await fireEvent.press(screen.getByRole("button", { name: "Continue" }));
    expect(onOtherSet).toHaveBeenCalledTimes(1);
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it("offers no other set when there was no choice of addresses to make", async () => {
    await show({ activity: FOUND_NOTHING, onOtherSet: undefined }).view;
    expect(
      screen.getByText("Nothing found yet. This phrase will open a new, empty wallet."),
    ).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled();
    expect(screen.getAllByRole("button").map((button) => button.props.accessibilityLabel)).toEqual([
      "Continue",
      "Show my funding wallet address",
      "Missing a portfolio? Look further",
    ]);
  });

  it("looks further when asked, and hands on the portfolios it found beyond the first scan", async () => {
    const found = jest.fn(async () => FOUND_THREE);
    const { onFoundMore, view } = show({ lookFurther: found });
    await view;
    await fireEvent.press(lookFurther());
    expect(found).toHaveBeenCalledWith(FOUND_ONE);
    expect(await screen.findByText("Found 2 more portfolios.")).toBeOnTheScreen();
    expect(onFoundMore).toHaveBeenCalledWith(FOUND_THREE);
    expect(lookFurther()).toBeEnabled();
  });

  it("says so when there was nothing more, and changes nothing", async () => {
    const { onFoundMore, view } = show();
    await view;
    await fireEvent.press(lookFurther());
    expect(
      await screen.findByText("No more portfolios were found for this phrase."),
    ).toBeOnTheScreen();
    expect(onFoundMore).not.toHaveBeenCalled();
  });

  it("shows that it is looking after a moment, holds Continue meanwhile, and can be cancelled", async () => {
    jest.useFakeTimers();
    let finish!: (activity: SchemeActivity) => void;
    const held = () => new Promise<SchemeActivity>((resolve) => (finish = resolve));
    const { onFoundMore, view } = show({ lookFurther: held });
    await view;
    await fireEvent.press(lookFurther());
    expect(screen.queryByText("Looking further for your portfolios...")).toBeNull();
    await act(() => jest.advanceTimersByTimeAsync(WAITING_DELAY_MS));
    expect(screen.getByText("Looking further for your portfolios...")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
    expect(screen.getByText("Continue is paused while we look.")).toBeOnTheScreen();
    await act(() => jest.advanceTimersByTimeAsync(STILL_WORKING_AFTER_MS.action));
    expect(
      screen.getByText("Still working. You can leave this open; nothing more is needed from you."),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled();
    await act(async () => finish(FOUND_THREE));
    expect(onFoundMore).not.toHaveBeenCalled();
    expect(screen.queryByText("Found 2 more portfolios.")).toBeNull();
  });

  it("says plainly when it could not finish, with a way to try again", async () => {
    const failing = jest.fn(async () => {
      throw new Error("429 Too Many Requests");
    });
    await show({ lookFurther: failing }).view;
    await fireEvent.press(lookFurther());
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "We couldn't finish looking. Nothing was changed. Try again.",
    );
    expect(screen.queryByText(/429/)).toBeNull();
    expect(lookFurther()).toBeEnabled();
  });

  it("never looks for ever: a scan that does not answer ends as not finished", async () => {
    jest.useFakeTimers();
    await show({ lookFurther: () => new Promise(() => undefined) }).view;
    await fireEvent.press(lookFurther());
    await act(() => jest.advanceTimersByTimeAsync(LOOK_FURTHER_LIMIT_MS));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "We couldn't finish looking. Nothing was changed. Try again.",
    );
    expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled();
  }, 30_000);

  it("cannot look further while offline", async () => {
    await show({ online: false }).view;
    expect(lookFurther()).toBeDisabled();
  });
});
