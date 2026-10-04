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
        prepare={() =>
          Promise.reject(new Error("The API base URL is not set. Check EXPO_PUBLIC_API_URL."))
        }
      >
        <Text>wallet</Text>
      </RuntimeGate>,
    );
    await waitFor(() => expect(screen.getByText(PREPARE_FAILURE)).toBeTruthy());
    expect(
      screen.getByText("The API base URL is not set. Check EXPO_PUBLIC_API_URL."),
    ).toBeTruthy();
    expect(error).toHaveBeenCalledWith("RuntimeGate: prepare failed", expect.any(Error));
    error.mockRestore();
  });
});
