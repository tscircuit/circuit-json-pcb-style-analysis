import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { analyzePcbStyle } from "../lib"
import { buildAnalysisContext } from "../lib/segments"
import am3352 from "./assets/am3352-segmented-trace.circuit.json"

test("AM3352's sub-width staircase is effectively a long odd-angle run", () => {
  const cj = am3352 as CircuitJson
  const original = JSON.stringify(cj)
  const steps = buildAnalysisContext(cj).segments.filter(
    (s) => s.startRouteIndex >= 31 && s.endRouteIndex <= 308,
  )
  expect(steps).toHaveLength(277)
  expect(steps.every((s) => s.lengthMm <= 0.100000001)).toBe(true)
  // All individual steps use allowed directions, but the copper forms an
  // 18.397 mm run at 247.938 degrees, within half a trace width of its chord.
  const issue = analyzePcbStyle(cj).issues.find(
    (s) => s.startRouteIndex === 31 && s.endRouteIndex === 308,
  )
  expect(issue).toBeDefined()
  expect(issue!.lengthMm).toBeCloseTo(18.397026933719427)
  expect(issue!.deviationDegrees).toBeCloseTo(22.061659041861304)
  expect(JSON.stringify(cj)).toBe(original)
})
