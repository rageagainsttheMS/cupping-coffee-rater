import { fireEvent, render, screen } from "@testing-library/react-native";
import { AppearanceView } from "../AppearanceView";
import { ThemeProvider } from "@/lib/theme/ThemeProvider";

jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);
jest.mock("@expo/vector-icons/MaterialCommunityIcons", () => () => null);

async function renderView(selected: "system" | "light" | "dark" = "system") {
  const handlers = { onSelect: jest.fn(), onBack: jest.fn() };
  await render(
    <ThemeProvider>
      <AppearanceView selected={selected} {...handlers} />
    </ThemeProvider>,
  );
  return handlers;
}

describe("AppearanceView", () => {
  it("marks only the current choice as selected", async () => {
    await renderView("dark");
    expect(screen.getByRole("radio", { name: "Dark", selected: true })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "System", selected: false })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Light", selected: false })).toBeTruthy();
  });

  it("reports the chosen option", async () => {
    const { onSelect } = await renderView();
    await fireEvent.press(screen.getByLabelText("Light"));
    expect(onSelect).toHaveBeenCalledWith("light");
  });

  it("goes back", async () => {
    const { onBack } = await renderView();
    await fireEvent.press(screen.getByLabelText("Back"));
    expect(onBack).toHaveBeenCalled();
  });
});
