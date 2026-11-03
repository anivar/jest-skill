// rules/timer-recursive-safety.md (corrected in 1.2.1). The functions are copied from the rule.
function startTicker(callback) {
  const tick = () => {
    callback();
    setTimeout(tick, 1000);
  };
  setTimeout(tick, 1000);
}

const fetchData = () => Promise.resolve({ id: 1 });
function poll(callback) {
  fetchData().then((data) => {
    callback(data);
    setTimeout(() => poll(callback), 1000);
  });
}

beforeEach(() => {
  jest.useFakeTimers();
});
afterEach(() => {
  jest.useRealTimers();
});

test("runAllTimers on a recursive timer throws after 100000 timers", () => {
  startTicker(() => {});
  expect(() => jest.runAllTimers()).toThrow("Aborting after running 100000 timers, assuming an infinite loop!");
});

test("runOnlyPendingTimers runs one tick, and advanceTimersByTime(3000) runs three more", () => {
  const cb = jest.fn();
  startTicker(cb);
  jest.runOnlyPendingTimers();
  expect(cb).toHaveBeenCalledTimes(1);
  jest.advanceTimersByTime(3000);
  expect(cb).toHaveBeenCalledTimes(4);
});

test("a timer queued from a promise callback: runAllTimers runs nothing", () => {
  const cb = jest.fn();
  poll(cb);
  jest.runAllTimers();
  expect(cb).toHaveBeenCalledTimes(0);
  expect(jest.getTimerCount()).toBe(0);
});

test("a timer queued from a promise callback: runOnlyPendingTimersAsync gives 2, then 3", async () => {
  const cb = jest.fn();
  poll(cb);
  await jest.runOnlyPendingTimersAsync();
  expect(cb).toHaveBeenCalledTimes(2);
  await jest.runOnlyPendingTimersAsync();
  expect(cb).toHaveBeenCalledTimes(3);
});

test("a timer queued from a promise callback: advanceTimersByTimeAsync(3000) gives 4", async () => {
  const cb = jest.fn();
  poll(cb);
  await jest.advanceTimersByTimeAsync(3000);
  expect(cb).toHaveBeenCalledTimes(4);
});
