import { useEffect, useState } from "react";
import { Acknowledge, Button, Field, Notice, Panel, Row, Sheet, StepList, Text } from "@/ui";
import type { Step } from "@/ui";

type DemoStep = "amount" | "review" | "progress" | "result";

const PROGRESS: Step[] = [
  { key: "sent", title: "Sent to the private route", status: "done" },
  { key: "queue", title: "Waiting in the queue", status: "current" },
  { key: "arrived", title: "Arrived in Investing", status: "waiting" },
];

/** How long the demo pretends an action is in flight, so the lock can be tried. */
const IN_FLIGHT_MS = 2500;

/**
 * A money sheet's whole lifecycle with example figures: input, review with an
 * acknowledgement, a locked in-flight step and a result. Nothing here is real.
 */
export function SheetDemo() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<DemoStep>("amount");
  const [amount, setAmount] = useState("");
  const [understood, setUnderstood] = useState(false);

  useEffect(() => {
    if (step !== "progress") return;
    const timer = setTimeout(() => setStep("result"), IN_FLIGHT_MS);
    return () => clearTimeout(timer);
  }, [step]);

  function close() {
    setOpen(false);
    setStep("amount");
    setAmount("");
    setUnderstood(false);
  }

  const footer = {
    amount: <Button label="Review" disabled={amount === ""} onPress={() => setStep("review")} />,
    review: <Button label="Confirm" disabled={!understood} onPress={() => setStep("progress")} />,
    progress: undefined,
    result: <Button label="Done" onPress={close} />,
  }[step];

  return (
    <>
      <Button label="Open a multi-step sheet" variant="quiet" onPress={() => setOpen(true)} />
      <Sheet
        open={open}
        onClose={close}
        title={step === "review" ? "Review" : "Add money privately"}
        onBack={step === "review" ? () => setStep("amount") : undefined}
        dirty={amount !== "" && step !== "result"}
        busy={step === "progress"}
        footer={footer}
      >
        {step === "amount" && (
          <>
            <Text tone="dim">Type an amount, then try to swipe the sheet away: it asks first.</Text>
            <Field
              label="Amount in USDC"
              placeholder="0.00"
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
            />
          </>
        )}
        {step === "review" && (
          <>
            <Panel>
              <Row label="Arrives in Investing" value={`${amount} USDC`} />
              <Row label="Relay fee" value="0.20 USDC" last />
            </Panel>
            <Notice tone="warning">Example only. Nothing is sent from the gallery.</Notice>
            <Acknowledge
              label="I understand this is an example"
              checked={understood}
              onChange={setUnderstood}
            />
          </>
        )}
        {step === "progress" && <StepList steps={PROGRESS} />}
        {step === "result" && (
          <>
            <Text variant="h1">Funds arrived</Text>
            <Text tone="dim">The in-flight step could not be dismissed. This one can.</Text>
          </>
        )}
      </Sheet>
    </>
  );
}
