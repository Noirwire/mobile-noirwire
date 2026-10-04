import { render, screen } from "@testing-library/react-native";
import { Notice } from "./Notice";

describe("Notice", () => {
  it("does not interrupt a screen reader for plain information", async () => {
    await render(<Notice>A tracker follows a price.</Notice>);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it.each(["warning", "danger"] as const)("announces a %s notice as an alert", async (tone) => {
    await render(<Notice tone={tone}>Your trade is public.</Notice>);
    expect(screen.getByRole("alert")).toHaveTextContent("Your trade is public.");
  });
});
