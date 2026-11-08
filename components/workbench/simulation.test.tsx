// @vitest-environment happy-dom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { useSimulation } from "@/components/use-simulation";

const MAP = "1 1\n>";

test("without an imported or linked map Run and Step cannot create a machine or record a result", () => {
  const onRunEnd = vi.fn();
  const { result } = renderHook(() => useSimulation("print 1", { onRunEnd }));
  act(() => result.current.run());
  act(() => result.current.step());
  expect(result.current.hasMap).toBe(false);
  expect(result.current.started).toBe(false);
  expect(result.current.playing).toBe(false);
  expect(result.current.snapshot.steps).toBe(0);
  expect(onRunEnd).not.toHaveBeenCalled();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

test("Turbo reaches the instruction limit quickly while preserving exactly 1000 processed lines and one result", () => {
  vi.useFakeTimers();
  const onRunEnd = vi.fn();
  const { result } = renderHook(() => useSimulation("while true", { onRunEnd, mapText: MAP }));
  act(() => result.current.setSpeed("turbo"));
  act(() => result.current.run());
  act(() => vi.advanceTimersByTime(1001));
  expect(result.current.snapshot.steps).toBe(1000);
  expect(result.current.snapshot.error?.code).toBe("INSTRUCTION_COUNT_LIMIT_EXCEEDED");
  expect(result.current.playing).toBe(false);
  expect(onRunEnd).toHaveBeenCalledTimes(1);
  expect(onRunEnd).toHaveBeenCalledWith({ code: "while true", mapId: null });
});

test("pausing and stepping preserve source-line processing at the normal speed", () => {
  vi.useFakeTimers();
  const { result } = renderHook(() => useSimulation("print 1\nprint 2", { mapText: MAP }));
  act(() => result.current.run());
  act(() => vi.advanceTimersByTime(250));
  expect(result.current.snapshot.output).toEqual(["1"]);
  act(() => result.current.pause());
  act(() => vi.advanceTimersByTime(1000));
  expect(result.current.snapshot.steps).toBe(1);
  act(() => result.current.step());
  expect(result.current.snapshot.output).toEqual(["1", "2"]);
  expect(result.current.snapshot.status).toBe("done");
});
