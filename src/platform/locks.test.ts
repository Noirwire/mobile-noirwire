import { inProcessLocks } from "@noirwire/shared/platform";

/** The mobile platform's locks are the shared in-process mutex: one holder of a name at a time. */
describe("in-process locks", () => {
  it("runs holders of one name one at a time, in order", async () => {
    const locks = inProcessLocks();
    const order: string[] = [];
    const hold = (name: string, label: string) =>
      locks.withLock(name, async () => {
        order.push(`${label} in`);
        await new Promise((resolve) => setTimeout(resolve, 5));
        order.push(`${label} out`);
      });
    await Promise.all([hold("a", "1"), hold("a", "2")]);
    expect(order).toEqual(["1 in", "1 out", "2 in", "2 out"]);
  });

  it("lets different names run together", async () => {
    const locks = inProcessLocks();
    const order: string[] = [];
    let release!: () => void;
    const first = locks.withLock("a", () => new Promise<void>((resolve) => (release = resolve)));
    await locks.withLock("b", async () => void order.push("b ran while a held"));
    release();
    await first;
    expect(order).toEqual(["b ran while a held"]);
  });

  it("keeps working after a holder throws, and passes the error to its caller", async () => {
    const locks = inProcessLocks();
    await expect(locks.withLock("a", () => Promise.reject(new Error("boom")))).rejects.toThrow(
      "boom",
    );
    expect(await locks.withLock("a", async () => "next")).toBe("next");
  });
});
