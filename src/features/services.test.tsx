import { refresh, useNetInfo } from "@react-native-community/netinfo";
import { act, renderHook } from "@testing-library/react-native";
import type { Installed } from "@/platform/install";
import { deviceServices, OFFLINE_RECHECK_MS } from "./services";
import { noBiometrics } from "./testServices";

jest.mock("@react-native-community/netinfo", () => ({
  useNetInfo: jest.fn(),
  refresh: jest.fn(() => Promise.resolve()),
}));
jest.mock("expo-clipboard", () => ({ getStringAsync: jest.fn() }));

const connection = useNetInfo as jest.Mock;
const recheck = refresh as jest.Mock;
const services = deviceServices({ preferences: {}, biometrics: noBiometrics } as Installed);

beforeEach(() => {
  jest.useFakeTimers();
  recheck.mockClear();
});
afterEach(() => jest.useRealTimers());

describe("the phone's connection", () => {
  it("counts as online until the system says otherwise", async () => {
    connection.mockReturnValue({ isConnected: null });
    const { result } = await renderHook(() => services.useOnline());
    expect(result.current).toBe(true);
    await act(() => jest.advanceTimersByTimeAsync(OFFLINE_RECHECK_MS * 3));
    expect(recheck).not.toHaveBeenCalled();
  });

  it("asks again every few seconds while offline, and stops once it is back", async () => {
    connection.mockReturnValue({ isConnected: false });
    const { result, rerender } = await renderHook(() => services.useOnline());
    expect(result.current).toBe(false);
    await act(() => jest.advanceTimersByTimeAsync(OFFLINE_RECHECK_MS * 2));
    expect(recheck).toHaveBeenCalledTimes(2);

    connection.mockReturnValue({ isConnected: true });
    await rerender({});
    expect(result.current).toBe(true);
    await act(() => jest.advanceTimersByTimeAsync(OFFLINE_RECHECK_MS * 3));
    expect(recheck).toHaveBeenCalledTimes(2);
  });
});
