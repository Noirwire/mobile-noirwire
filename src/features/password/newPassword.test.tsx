import { assessPassword } from "@noirwire/shared/wallet";
import { act, renderHook } from "@testing-library/react-native";
import { phoneCopy } from "../phoneCopy";
import { STRENGTH_DELAY_MS, useNewPassword } from "./newPassword";

jest.mock("@noirwire/shared/wallet", () => ({
  ...jest.requireActual("@noirwire/shared/wallet"),
  assessPassword: jest.fn(),
}));

const assess = assessPassword as jest.Mock;

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

const settle = () => act(() => jest.advanceTimersByTimeAsync(STRENGTH_DELAY_MS));

describe("useNewPassword", () => {
  it("says a check that could not run without blaming a connection, and checks again on the next keystroke", async () => {
    assess.mockRejectedValueOnce(new Error("Requiring unknown module")).mockResolvedValue({
      ok: true,
    });
    const { result } = await renderHook(() => useNewPassword());
    await act(async () => result.current.setPassword("harbor-velvet-orbit-canyon"));
    await settle();
    expect(result.current.strength).toEqual({
      text: "Could not check this password. Type it again.",
      tone: "danger",
    });
    expect(phoneCopy.passwordCheckFailed).not.toMatch(/connection|network|online/i);
    expect(result.current.ready).toBe(false);

    await act(async () => result.current.setPassword("harbor-velvet-orbit-canyon-meadow"));
    await settle();
    expect(result.current.strength).toEqual({ text: "Strong password.", tone: "safe" });
    await act(async () => result.current.setConfirm("harbor-velvet-orbit-canyon-meadow"));
    expect(result.current.ready).toBe(true);
  });

  it("says it is checking while the verdict is on its way", async () => {
    assess.mockReturnValue(new Promise(() => undefined));
    const { result } = await renderHook(() => useNewPassword());
    await act(async () => result.current.setPassword("harbor-velvet-orbit-canyon"));
    expect(result.current.strength).toEqual({ text: "Checking strength...", tone: "faint" });
  });
});
