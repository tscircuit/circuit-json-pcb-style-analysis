import { expect, test } from "bun:test"
import type { CircuitJson, PcbTraceRoutePoint } from "circuit-json"
import {
  createPcbStyleIssueArtifacts,
  OddAngleTraceSegmentSolver,
} from "../lib"
import { buildAnalysisContext } from "../lib/segments"
import { analyzeOddAngles as analyzePcbStyle } from "./fixtures/odd-angle-analysis"
import { buildTraceRuns } from "../lib/trace-runs"
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

function wire(
  x: number,
  y: number,
  layer: "top" | "bottom" = "top",
  width = 0.2,
): PcbTraceRoutePoint {
  return { route_type: "wire", x, y, layer, width }
}
function circuit(route: PcbTraceRoutePoint[]): CircuitJson {
  return [{ type: "pcb_trace", pcb_trace_id: "trace", route }] as CircuitJson
}

for (const count of [1, 2, 10, 1000, 20000]) {
  test(`subdividing an odd-angle line into ${count} pieces preserves one finding`, () => {
    const cj = circuit(
      Array.from({ length: count + 1 }, (_, i) =>
        wire((12 * i) / count, (4 * i) / count),
      ),
    )
    const issues = analyzePcbStyle(cj).issues
    expect(issues).toHaveLength(1)
    expect(issues[0].lengthMm).toBeCloseTo(Math.hypot(12, 4), 10)
    expect(issues[0].deviationDegrees).toBeCloseTo(18.434948822922024, 10)
    expect(issues[0].startRouteIndex).toBe(0)
    expect(issues[0].endRouteIndex).toBe(count)
    const solver = new OddAngleTraceSegmentSolver({
      ctx: buildAnalysisContext(cj),
      maxSegmentLengthMm: 5,
      angleToleranceDegrees: 4,
    })
    solver.solve()
    expect(solver.getOutput()).toEqual(issues)
  })
}

test("collinear runs respect strict length and angle boundaries", () => {
  const cj = circuit([wire(0, 0), wire(3, 1), wire(6, 2)])
  const issue = analyzePcbStyle(cj).issues[0]
  expect(issue).toBeDefined()
  expect(
    analyzePcbStyle(cj, { maxSegmentLengthMm: issue.lengthMm }).issues,
  ).toEqual([])
  expect(
    analyzePcbStyle(cj, { angleToleranceDegrees: issue.deviationDegrees })
      .issues,
  ).toEqual([])
})

test("tiny jitter cannot hide odd runs; substantial bends and allowed directions pass", () => {
  const cj = circuit(
    Array.from({ length: 101 }, (_, i) =>
      wire(i / 10, i / 30 + (i % 2 ? 0.01 : 0)),
    ),
  )
  expect(analyzePcbStyle(cj).issues).toHaveLength(1)
  for (const slope of [0, 1, -1]) {
    const allowed = circuit(
      Array.from({ length: 101 }, (_, i) => wire(i / 10, (slope * i) / 10)),
    )
    expect(
      analyzePcbStyle(allowed, { angleToleranceDegrees: 0 }).issues,
    ).toEqual([])
  }
  const bend = circuit([wire(0, 0), wire(3, 1), wire(0, 2), wire(3, 3)])
  expect(analyzePcbStyle(bend).issues).toEqual([])
  expect(
    buildTraceRuns(buildAnalysisContext(bend)).filter(
      (s) => s.constituentSegments,
    ),
  ).toEqual([])
})

test("runs never bridge vias, pad interiors, layers, or separate records with duplicate IDs", () => {
  const boundaries: PcbTraceRoutePoint[][] = [
    [wire(0, 0), wire(3, 1), wire(3, 1, "bottom"), wire(6, 2, "bottom")],
    [
      wire(0, 0),
      { route_type: "via", x: 3, y: 1, from_layer: "top", to_layer: "bottom" },
      wire(6, 2, "bottom"),
    ],
    [
      wire(0, 0),
      {
        route_type: "through_pad",
        start: { x: 3, y: 1 },
        end: { x: 3.1, y: 1.1 },
        start_layer: "top",
        end_layer: "top",
        width: 0.2,
        pcb_smtpad_id: "pad",
      },
      wire(6, 2),
    ],
  ]
  for (const route of boundaries)
    expect(analyzePcbStyle(circuit(route)).issues).toEqual([])
  const separate = [
    ...circuit([wire(0, 0), wire(3, 1)]),
    ...circuit([wire(3, 1), wire(6, 2)]),
  ]
  expect(analyzePcbStyle(separate).issues).toEqual([])
  // Duplicate wire coordinates may not be used as artificial run boundaries.
  expect(
    analyzePcbStyle(circuit([wire(0, 0), wire(3, 1), wire(3, 1), wire(6, 2)]))
      .issues,
  ).toHaveLength(1)
})

test("AM3352 run artifacts select every original copper step and include their widths in bounds", () => {
  const cj = am3352 as CircuitJson
  const original = JSON.stringify(cj)
  const analysis = analyzePcbStyle(cj)
  const artifacts = createPcbStyleIssueArtifacts(cj, { analysis })
  const artifact = artifacts.find((a) => a.issue.startRouteIndex === 31)!
  expect(artifact.issue.constituentSegments).toHaveLength(277)
  expect(artifact.content.match(/<line[^>]*stroke="#ff5555"/g)).toHaveLength(
    277,
  )
  expect(artifact.descriptionXml).toContain('endRouteIndex="308"')
  for (const segment of artifact.issue.constituentSegments!) {
    for (const p of [segment.start, segment.end]) {
      expect(p.x - segment.width / 2).toBeGreaterThanOrEqual(
        artifact.bounds.minX,
      )
      expect(p.x + segment.width / 2).toBeLessThanOrEqual(artifact.bounds.maxX)
      expect(p.y - segment.width / 2).toBeGreaterThanOrEqual(
        artifact.bounds.minY,
      )
      expect(p.y + segment.width / 2).toBeLessThanOrEqual(artifact.bounds.maxY)
    }
  }
  expect(JSON.stringify(cj)).toBe(original)
})

test("a passing approximation never suppresses an existing physical error", () => {
  const cj = circuit([wire(0, 0), wire(10, 0.75), wire(10, 0.65)])
  const issues = analyzePcbStyle(cj).issues
  expect(issues).toHaveLength(1)
  expect(issues[0].startRouteIndex).toBe(0)
  expect(issues[0].endRouteIndex).toBe(1)
  expect(issues[0].constituentSegments).toBeUndefined()
})
