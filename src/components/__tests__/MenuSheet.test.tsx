import { fireEvent, render, screen } from "@testing-library/react-native";
import { Platform } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider } from "@/lib/theme/ThemeProvider";
import { MenuSheet } from "../MenuSheet";
import type { MenuItem } from "../MenuSheet";

jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);
jest.mock("@expo/vector-icons/MaterialCommunityIcons", () => () => null);

const metrics = {
  frame: { x: 0, y: 0, width: 360, height: 640 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

function setup() {
  const edit = jest.fn();
  const remove = jest.fn();
  const onClose = jest.fn();
  const items: MenuItem[] = [
    { label: "Edit review", icon: "pencil-outline", onPress: edit },
    { label: "Delete review", icon: "trash-can-outline", destructive: true, onPress: remove },
  ];
  const ui = (visible: boolean) => (
    <SafeAreaProvider initialMetrics={metrics}>
      <ThemeProvider>
        <MenuSheet
          visible={visible}
          title="Corner Roast"
          subtitle="Your review"
          items={items}
          onClose={onClose}
        />
      </ThemeProvider>
    </SafeAreaProvider>
  );
  return { edit, remove, onClose, ui };
}

describe("MenuSheet", () => {
  it("shows the title and one row per action", async () => {
    const { ui } = setup();
    await render(ui(true));
    expect(screen.getByText("Corner Roast")).toBeTruthy();
    expect(screen.getByText("Your review")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Edit review" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Delete review" })).toBeTruthy();
  });

  it("closes first, then runs the chosen action once the sheet has gone", async () => {
    const { ui, edit, onClose } = setup();
    const view = await render(ui(true));
    await fireEvent.press(screen.getByRole("button", { name: "Edit review" }));
    expect(onClose).toHaveBeenCalled();
    expect(edit).not.toHaveBeenCalled();
    // The jest preset runs as iOS, where the action waits for onDismiss; check the Android path.
    const os = Platform.OS;
    Platform.OS = "android";
    await view.rerender(ui(false));
    Platform.OS = os;
    expect(edit).toHaveBeenCalledTimes(1);
  });

  it("cancels without running anything", async () => {
    const { ui, edit, remove, onClose } = setup();
    const view = await render(ui(true));
    await fireEvent.press(screen.getAllByRole("button", { name: "Cancel" }).at(-1)!);
    expect(onClose).toHaveBeenCalled();
    await view.rerender(ui(false));
    expect(edit).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
  });
});
