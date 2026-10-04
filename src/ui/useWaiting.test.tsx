import {
  STILL_WORKING_AFTER_MS,
  WAITING_DELAY_MS,
  WAIT_LIMIT_MS,
} from "@noirwire/shared/presentation";
import { act, render, renderHook, screen } from "@testing-library/react-native";
import { Skeleton } from "./Skeleton";
import { useWaiting, WaitOverdueError, withinLimit, type Waiting } from "./useWaiting";
import { StillWorking, WaitingLine, WaitingPlaceholder } from "./Waiting";

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

const pass = (ms: number) => act(() => jest.advanceTimersByTimeAsync(ms));

describe("useWaiting", () => {
  it("shows nothing for the first 300 ms, then the signal, then the calm line", async () => {
    const { result } = await renderHook(() => useWaiting(true, "check"));
    expect(result.current).toMatchObject({ signal: "none", label: null, stillWorking: null });
    await pass(WAITING_DELAY_MS - 1);
    expect(result.current.signal).toBe("none");
    await pass(1);
    expect(result.current).toMatchObject({
      signal: "indicator",
      label: "Checking...",
      stillWorking: null,
    });
    await pass(STILL_WORKING_AFTER_MS.check - WAITING_DELAY_MS);
    expect(result.current.stillWorking).toBe("Still checking. This is taking longer than usual.");
  });

  it("answers a placeholder for content and an indicator for everything else", async () => {
    const content = await renderHook(() => useWaiting(true, "content"));
    const action = await renderHook(() => useWaiting(true, "action"));
    await pass(WAITING_DELAY_MS);
    expect(content.result.current).toMatchObject({ signal: "placeholder", label: "Loading" });
    expect(action.result.current).toMatchObject({
      signal: "indicator",
      label: "Working on it...",
    });
    await pass(STILL_WORKING_AFTER_MS.content);
    expect(content.result.current.stillWorking).not.toBeNull();
    expect(action.result.current.stillWorking).toBeNull();
    await pass(STILL_WORKING_AFTER_MS.action);
    expect(action.result.current.stillWorking).toBe(
      "Still working. You can leave this open; nothing more is needed from you.",
    );
  });

  it("shows nothing while there is nothing to wait for, and starts again on the next wait", async () => {
    const { result, rerender } = await renderHook(
      ({ active }: { active: boolean }) => useWaiting(active, "review"),
      { initialProps: { active: false } },
    );
    await pass(60_000);
    expect(result.current).toMatchObject({ signal: "none", overdue: false });
    await rerender({ active: true });
    await pass(STILL_WORKING_AFTER_MS.review);
    expect(result.current.stillWorking).not.toBeNull();
    await rerender({ active: false });
    expect(result.current).toMatchObject({ signal: "none", stillWorking: null });
    await rerender({ active: true });
    expect(result.current.signal).toBe("none");
    await pass(WAITING_DELAY_MS);
    expect(result.current).toMatchObject({ signal: "indicator", stillWorking: null });
  });

  it("is overdue once the wait passes its limit, and never before", async () => {
    const { result } = await renderHook(() => useWaiting(true, "content"));
    await pass(WAIT_LIMIT_MS.content - 1);
    expect(result.current.overdue).toBe(false);
    await pass(1);
    expect(result.current.overdue).toBe(true);
  });

  it("marks the steps of multi-step work from the start", async () => {
    const { result } = await renderHook(() =>
      useWaiting(true, "action", { steps: { titles: ["One", "Two", "Three"], current: 1 } }),
    );
    expect(result.current.steps?.map((step) => step.status)).toEqual([
      "done",
      "current",
      "waiting",
    ]);
  });

  it("ends a wait that never answers", async () => {
    const never = withinLimit(new Promise<number>(() => undefined), 1_000);
    const caught = never.catch((error: unknown) => error);
    await pass(1_000);
    expect(await caught).toBeInstanceOf(WaitOverdueError);
    await expect(withinLimit(Promise.resolve(7), 1_000)).resolves.toBe(7);
    await expect(withinLimit(Promise.reject(new Error("no")), 1_000)).rejects.toThrow("no");
  });
});

function Placeholder() {
  const waiting = useWaiting(true, "content");
  return (
    <WaitingPlaceholder waiting={waiting}>
      <Skeleton height={20} />
    </WaitingPlaceholder>
  );
}

function Line() {
  return <WaitingLine waiting={useWaiting(true, "review")} />;
}

describe("the waiting signals", () => {
  it("keeps a placeholder's room but draws it only after the delay, announced as Loading", async () => {
    await render(<Placeholder />);
    expect(screen.queryByLabelText("Loading")).toBeNull();
    await pass(WAITING_DELAY_MS);
    expect(screen.getByLabelText("Loading")).toHaveStyle({ gap: 12 });
    expect(screen.queryByText("Loading")).toBeNull();
    await pass(STILL_WORKING_AFTER_MS.content);
    expect(screen.getByText("Still loading. This is taking longer than usual.")).toBeOnTheScreen();
  });

  it("draws an indicator with its label, and the calm line under it later", async () => {
    await render(<Line />);
    expect(screen.queryByText("Preparing your review...")).toBeNull();
    await pass(WAITING_DELAY_MS);
    expect(screen.getByText("Preparing your review...")).toBeOnTheScreen();
    await pass(STILL_WORKING_AFTER_MS.review);
    expect(
      screen.getByText("Still preparing your review. Nothing has been sent."),
    ).toBeOnTheScreen();
  });

  it("draws the calm line alone, for a control with its own indicator", async () => {
    const quiet = { stillWorking: null } as Waiting;
    const slow = { stillWorking: "Still checking." } as Waiting;
    const view = await render(<StillWorking waiting={quiet} />);
    expect(screen.queryByText("Still checking.")).toBeNull();
    await view.rerender(<StillWorking waiting={slow} />);
    expect(screen.getByText("Still checking.")).toBeOnTheScreen();
  });
});
