import { getSnapshot } from "@noirwire/shared/wallet";
import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { forgetWallet, installTestPlatform, testServices } from "../testServices";
import { NewPortfolioSheet } from "./NewPortfolioSheet";
import { renderScreen, unlockedWallet } from "./testWallet";

afterEach(() => forgetWallet());

async function open() {
  const on = { onClose: jest.fn(), onCreated: jest.fn() };
  await renderScreen(await testServices(), <NewPortfolioSheet {...on} />);
  return on;
}

describe("NewPortfolioSheet", () => {
  it("creates a named portfolio with its mark, on this phone, and opens it", async () => {
    const { events } = installTestPlatform();
    await unlockedWallet();
    const on = await open();
    expect(screen.getByText("New portfolio")).toBeOnTheScreen();
    expect(
      screen.getByText("Give it a name only you see. The name never leaves this phone."),
    ).toBeOnTheScreen();
    const create = () => screen.getByRole("button", { name: "Create portfolio" });
    expect(create()).toBeDisabled();
    await fireEvent.changeText(screen.getByLabelText("Portfolio name"), "   ");
    expect(create()).toBeDisabled();
    await fireEvent.press(screen.getByRole("button", { name: "Long term" }));
    await fireEvent.press(screen.getByRole("button", { name: "Change Icon and colour" }));
    await fireEvent.press(screen.getByRole("radio", { name: "Travel icon" }));
    await fireEvent.press(screen.getByRole("radio", { name: "Rose colour" }));
    await fireEvent.press(create());
    await waitFor(() => expect(on.onCreated).toHaveBeenCalled());
    const created = getSnapshot()!.portfolios[0];
    expect(created).toMatchObject({
      label: "Long term",
      icon: { glyph: "airplane", tint: "rose" },
    });
    expect(on.onCreated).toHaveBeenCalledWith(created.id);
    expect(on.onClose).toHaveBeenCalled();
    expect(events).toContainEqual({ event: "dialog_opened", props: { dialog: "new_account" } });
    expect(events).toContainEqual({ event: "account_created", props: { kind: "portfolio" } });
  });

  it("switches to a pie, which needs a name and a mix before it can be created", async () => {
    installTestPlatform();
    await unlockedWallet();
    await open();
    await fireEvent.press(screen.getByRole("radio", { name: "Pie" }));
    expect(screen.getByText("New pie")).toBeOnTheScreen();
    expect(
      screen.getByText("Set a mix of trackers and invest in all of them at once."),
    ).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText("Pie name"), "Core");
    expect(screen.getByRole("button", { name: "Create pie" })).toBeDisabled();
    expect(screen.getByLabelText("The pie's ring, its default mark")).toBeOnTheScreen();
  });

  it("says when the new portfolio could not be saved on this phone", async () => {
    const { vault } = installTestPlatform();
    await unlockedWallet();
    await open();
    vault.refuseWrites = true;
    await fireEvent.changeText(screen.getByLabelText("Portfolio name"), "Everyday");
    await fireEvent.press(screen.getByRole("button", { name: "Create portfolio" }));
    expect(
      await screen.findByText("The new portfolio could not be saved on this phone."),
    ).toBeOnTheScreen();
    vault.refuseWrites = false;
  });
});
