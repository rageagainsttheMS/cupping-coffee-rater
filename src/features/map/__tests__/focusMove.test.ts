import { FOCUS_RETRY_MS, moveWhenReady } from "../focusMove";

describe("moveWhenReady", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("moves at once and again after the retry delay", () => {
    const move = jest.fn();
    moveWhenReady(move);
    expect(move).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(FOCUS_RETRY_MS);
    expect(move).toHaveBeenCalledTimes(2);
  });

  it("does not retry once cancelled, e.g. when the screen loses focus", () => {
    const move = jest.fn();
    const cancel = moveWhenReady(move);
    cancel();
    jest.advanceTimersByTime(FOCUS_RETRY_MS * 2);
    expect(move).toHaveBeenCalledTimes(1);
  });
});
