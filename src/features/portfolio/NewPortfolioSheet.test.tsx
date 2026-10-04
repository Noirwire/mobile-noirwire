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
    const create = () => screen.getByRole("button", { name: "Create portfolio" });
    await fireEvent.changeText(screen.getByLabelText("Portfolio name"), "   ");
    await fireEvent.press(create());
    expect(screen.getByRole("alert")).toHaveTextContent("Type a name first.");
    expect(on.onCreated).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole("button", { name: "Long term" }));
    expect(screen.queryByRole("alert")).toBeNull();
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
    const on = await open();
    await fireEvent.press(screen.getByRole("radio", { name: "Pie" }));
    await fireEvent.press(screen.getByRole("button", { name: "Create pie" }));
    expect(screen.getByText("Type a name first.")).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText("Pie name"), "Core");
    expect(screen.queryByText("Type a name first.")).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Create pie" }));
    expect(screen.getAllByText("Add at least one tracker.")).toHaveLength(1);
    expect(on.onCreated).not.toHaveBeenCalled();
    expect(screen.getByLabelText("The pie's ring, its default mark")).toBeOnTheScreen();
  });

  it("drops the missing-name line when the kind is changed", async () => {
    installTestPlatform();
    await unlockedWallet();
    await open();
    await fireEvent.press(screen.getByRole("button", { name: "Create portfolio" }));
    expect(screen.getByText("Type a name first.")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("radio", { name: "Pie" }));
    expect(screen.queryByText("Type a name first.")).toBeNull();
  });

  it("refuses a name another portfolio already has, as it is typed", async () => {
    installTestPlatform();
    await unlockedWallet((wallet) => ({
      ...wallet,
      portfolios: [{ ...wallet.portfolios[0], label: "Trips" }],
    }));
    const on = await open();
    await fireEvent.changeText(screen.getByLabelText("Portfolio name"), " trips ");
    expect(screen.getByRole("alert")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Create portfolio" }));
    expect(on.onCreated).not.toHaveBeenCalled();
    expect(getSnapshot()!.portfolios).toHaveLength(1);
  });

  it("says to use a never-used portfolio first once the wallet ends in ten of them", async () => {
    installTestPlatform();
    await unlockedWallet((wallet) => {
      const [first] = wallet.portfolios;
      return {
        ...wallet,
        portfolios: Array.from({ length: 10 }, (_, index) => ({
          ...first,
          id: `empty-${index}`,
          label: `Empty ${index}`,
          derivationIndex: first.derivationIndex + index,
        })),
      };
    });
    await open();
    expect(screen.getByRole("button", { name: "Create portfolio" })).toBeDisabled();
  });

  it("says when the new portfolio could not be saved on this phone", async () => {
    const { vault } = installTestPlatform();
    await unlockedWallet();
    await open();
    vault.refuseWrites = true;
    await fireEvent.changeText(screen.getByLabelText("Portfolio name"), "Everyday");
    await fireEvent.press(screen.getByRole("button", { name: "Create portfolio" }));
    expect(await screen.findByText(/could not be saved on this phone/)).toBeOnTheScreen();
    vault.refuseWrites = false;
  });
});
