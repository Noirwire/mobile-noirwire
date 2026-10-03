import { render, screen, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";
import { PREPARE_FAILURE, RuntimeGate } from "./RuntimeGate";

describe("RuntimeGate", () => {
  it("renders the children once prepare resolves", async () => {
    await render(
      <RuntimeGate prepare={() => Promise.resolve()}>
        <Text>wallet</Text>
      </RuntimeGate>,
    );
    await waitFor(() => expect(screen.getByText("wallet")).toBeTruthy());
  });

  it("names the underlying error under App configuration and logs it", async () => {
    const error = jest.spyOn(console, "error").mockImplementation(() => {});
    await render(
      <RuntimeGate
        prepare={() => Promise.reject(new Error("EXPO_PUBLIC_RELAY_URL must use https."))}
      >
        <Text>wallet</Text>
      </RuntimeGate>,
    );
    await waitFor(() => expect(screen.getByText(PREPARE_FAILURE)).toBeTruthy());
    expect(screen.getByText("EXPO_PUBLIC_RELAY_URL must use https.")).toBeTruthy();
    expect(error).toHaveBeenCalledWith("RuntimeGate: prepare failed", expect.any(Error));
    error.mockRestore();
  });
});
