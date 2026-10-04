import { render, screen } from "@testing-library/react-native";
import { AccessibilityInfo } from "react-native";
import { StepList, type Step } from "./StepList";

const STEPS: Step[] = [
  { key: "a", title: "Private move sent", status: "done" },
  { key: "b", title: "Waiting in the queue", status: "current" },
  { key: "c", title: "Arrived in Investing", status: "waiting" },
];

describe("StepList", () => {
  beforeEach(() => jest.spyOn(AccessibilityInfo, "announceForAccessibility").mockImplementation());
  afterEach(() => jest.restoreAllMocks());

  it("names each step with its status", async () => {
    await render(<StepList steps={STEPS} />);
    expect(screen.getByLabelText("Private move sent, Done")).toBeOnTheScreen();
    expect(screen.getByLabelText("Waiting in the queue, In progress")).toBeOnTheScreen();
    expect(screen.getByLabelText("Arrived in Investing, Waiting")).toBeOnTheScreen();
  });

  it("shows a failed step's reason and a custom status word", async () => {
    await render(
      <StepList
        steps={[
          { key: "x", title: "NVIDIA", status: "failed", reason: "Nothing was traded." },
          { key: "y", title: "Alphabet", status: "skipped", statusLabel: "Not placed" },
        ]}
      />,
    );
    expect(screen.getByLabelText("NVIDIA, Failed")).toBeOnTheScreen();
    expect(screen.getByText("Nothing was traded.")).toBeOnTheScreen();
    expect(screen.getByLabelText("Alphabet, Not placed")).toBeOnTheScreen();
  });

  it("announces a change of state, not the first render", async () => {
    const view = await render(<StepList steps={STEPS} />);
    expect(AccessibilityInfo.announceForAccessibility).not.toHaveBeenCalled();
    await view.rerender(
      <StepList
        steps={STEPS.map((step) => (step.key === "b" ? { ...step, status: "done" } : step))}
      />,
    );
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
      "Waiting in the queue, Done",
    );
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledTimes(1);
  });
});
