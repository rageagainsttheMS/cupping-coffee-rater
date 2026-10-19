import { fireEvent, render, screen } from "@testing-library/react-native";
import { StarInput } from "../StarInput";
import { ThemeProvider } from "@/lib/theme/ThemeProvider";

jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);
// The icon font is an asset the test renderer can't load.
jest.mock("@expo/vector-icons/MaterialCommunityIcons", () => () => null);

// What the responder system passes with every touch event.
const TOUCH = {
  touchBank: [],
  numberActiveTouches: 0,
  indexOfSingleActiveTouch: -1,
  mostRecentTimeStamp: 0,
};

async function setup(value: number | null = null) {
  const onChange = jest.fn();
  await render(
    <ThemeProvider>
      <StarInput value={value} onChange={onChange} accessibilityLabel="Coffee" showReadout />
    </ThemeProvider>,
  );
  const control = screen.getByLabelText("Coffee");
  // Five stars across 500 px: each star is 100 px wide.
  await fireEvent(control, "layout", { nativeEvent: { layout: { width: 500, height: 52 } } });
  return { control, onChange };
}

describe("StarInput", () => {
  it("gives a half step for the left half of a star and a whole star for the right half", async () => {
    const { control, onChange } = await setup();
    await fireEvent(control, "responderGrant", {
      nativeEvent: { locationX: 320 },
      touchHistory: TOUCH,
    });
    expect(onChange).toHaveBeenLastCalledWith(3.5);
    await fireEvent(control, "responderGrant", {
      nativeEvent: { locationX: 380 },
      touchHistory: TOUCH,
    });
    expect(onChange).toHaveBeenLastCalledWith(4);
  });

  it("never reports less than 1", async () => {
    const { control, onChange } = await setup();
    await fireEvent(control, "responderGrant", {
      nativeEvent: { locationX: 10 },
      touchHistory: TOUCH,
    });
    expect(onChange).toHaveBeenLastCalledWith(1);
  });

  it("can be changed a half step at a time by a screen reader", async () => {
    const { control, onChange } = await setup(3);
    await fireEvent(control, "accessibilityAction", { nativeEvent: { actionName: "increment" } });
    expect(onChange).toHaveBeenLastCalledWith(3.5);
    await fireEvent(control, "accessibilityAction", { nativeEvent: { actionName: "decrement" } });
    expect(onChange).toHaveBeenLastCalledWith(2.5);
  });

  it("shows the rating as a big number, and a dash when there is none", async () => {
    await render(
      <ThemeProvider>
        <StarInput value={4.5} onChange={jest.fn()} showReadout />
      </ThemeProvider>,
    );
    expect(screen.getByText("4.5")).toBeTruthy();
    await render(
      <ThemeProvider>
        <StarInput value={null} onChange={jest.fn()} showReadout />
      </ThemeProvider>,
    );
    expect(screen.getByText("–")).toBeTruthy();
  });

  it("only displays a rating when there is no onChange", async () => {
    await render(
      <ThemeProvider>
        <StarInput value={4} accessibilityLabel="Display" />
      </ThemeProvider>,
    );
    const control = screen.getByLabelText("Display");
    expect(control.props.accessibilityActions).toBeUndefined();
  });
});
