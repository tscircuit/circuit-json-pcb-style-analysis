import { expect, test } from "bun:test"
import {
  analyzePcbStyle,
  createPcbStyleIssueArtifacts,
  PcbStyleAnalysisPipeline,
} from "../lib"
import { buildAnalysisContext } from "../lib/segments"
import { cases, trace, wire } from "./fixtures/cases"

test("separate stages report both rules, with exact original segment locations", () => {
  const p = new PcbStyleAnalysisPipeline(cases.oddLong)
  const before = JSON.stringify(cases.oddLong)
  p.solve()
  expect(p.solved).toBe(true)
  expect(p.failed).toBe(false)
  expect(Object.keys(p.getAllOutputs())).toEqual([
    "LongTraceSegmentSolver",
    "OddAngleTraceSegmentSolver",
  ])
  const issues = p.getOutput().issues
  expect(issues.map((i) => i.lineItemType)).toEqual([
    "PcbTraceSegmentTooLong",
    "PcbTraceSegmentOddAngle",
  ])
  for (const issue of issues) {
    expect(issue).toMatchObject({
      severity: "error",
      pcbTraceId: "pcb_trace_1",
      sourceTraceId: "source_trace_1",
      circuitJsonIndex: 0,
      startRouteIndex: 0,
      endRouteIndex: 1,
      layer: "top",
      start: { x: 0, y: 0 },
      end: { x: 8, y: 2 },
      location: { x: 4, y: 1 },
    })
    expect(issue.bounds).toEqual({
      minX: -0.1,
      minY: -0.1,
      maxX: 8.1,
      maxY: 2.1,
    })
  }
  expect(JSON.stringify(cases.oddLong)).toBe(before)
  expect(new Set(issues.map((i) => i.issueId)).size).toBe(2)
  expect(analyzePcbStyle(cases.oddLong)).toEqual(p.getOutput())
})
test("strict 5 mm boundary uses Euclidean segment length, not total trace length", () => {
  expect(
    analyzePcbStyle(cases.exactFive).issues.filter(
      (i) => i.lineItemType === "PcbTraceSegmentTooLong",
    ),
  ).toHaveLength(0)
  expect(analyzePcbStyle(cases.justOverFive).issues).toHaveLength(1)
  expect(analyzePcbStyle(cases.longTotalShortSegments).issues).toEqual([])
  expect(analyzePcbStyle(cases.diagonalLong).issues[0].lengthMm).toBeCloseTo(
    Math.sqrt(32),
  )
})
test("all eight compass directions pass; reversed and wraparound odd angles are detected", () => {
  for (let degrees = 0; degrees < 360; degrees += 45) {
    const r = (degrees * Math.PI) / 180
    expect(
      analyzePcbStyle(
        trace([wire(0, 0), wire(3 * Math.cos(r), 3 * Math.sin(r))]),
      ).issues,
    ).toEqual([])
  }
  const issue = analyzePcbStyle(cases.reversedOdd).issues[0]
  expect(issue.lineItemType).toBe("PcbTraceSegmentOddAngle")
  if (issue.lineItemType === "PcbTraceSegmentOddAngle")
    expect(issue.angleDegrees).toBeCloseTo(206.565)
  const issue2 = analyzePcbStyle(trace([wire(0, 0), wire(3, -0.01)])).issues[0]
  if (issue2.lineItemType === "PcbTraceSegmentOddAngle")
    expect(issue2.nearestAllowedAngleDegrees).toBe(0)
})
test("angle tolerance includes boundary and is configurable", () => {
  for (const [angle, count] of [
    [0.099, 0],
    [0.1, 0],
    [0.101, 1],
  ]) {
    const r = (angle * Math.PI) / 180
    expect(
      analyzePcbStyle(
        trace([wire(0, 0), wire(3 * Math.cos(r), 3 * Math.sin(r))]),
      ).issues,
    ).toHaveLength(count)
  }
  expect(
    analyzePcbStyle(cases.oddShort, { angleToleranceDegrees: 20 }).issues,
  ).toHaveLength(0)
  expect(
    analyzePcbStyle(cases.horizontalLong, { maxSegmentLengthMm: 10 }).issues,
  ).toHaveLength(0)
})
test("via and through-pad adjacency uses the correct endpoints, layer, and route indices", () => {
  const via = buildAnalysisContext(cases.via).segments
  expect(via.map((s) => [s.layer, s.startRouteIndex, s.endRouteIndex])).toEqual(
    [
      ["top", 0, 1],
      ["bottom", 1, 2],
    ],
  )
  const pad = buildAnalysisContext(cases.pad).segments
  expect(pad.map((s) => [s.start, s.end])).toEqual([
    [
      { x: 0, y: 0 },
      { x: 6, y: 1 },
    ],
    [
      { x: 8, y: 1 },
      { x: 10, y: 2 },
    ],
  ])
  expect(
    buildAnalysisContext(trace([wire(0, 0), wire(8, 2, "bottom")])).segments,
  ).toEqual([])
  expect(
    buildAnalysisContext(
      trace([
        {
          route_type: "via",
          x: 0,
          y: 0,
          from_layer: "top",
          to_layer: "bottom",
        },
        {
          route_type: "via",
          x: 8,
          y: 2,
          from_layer: "bottom",
          to_layer: "top",
        },
      ]),
    ).segments,
  ).toEqual([])
})
test("duplicate points, empty routes and empty inputs produce no spurious issues", () => {
  expect(analyzePcbStyle([]).issues).toEqual([])
  expect(analyzePcbStyle(trace([])).issues).toEqual([])
  expect(analyzePcbStyle(trace([wire(0, 0)])).issues).toEqual([])
  expect(analyzePcbStyle(trace([wire(0, 0), wire(0, 0)])).issues).toEqual([])
  expect(analyzePcbStyle(cases.duplicatePoint).issues[0].startRouteIndex).toBe(
    1,
  )
})
test("rule selection excludes whole stages and works with no selected rules", () => {
  expect(
    analyzePcbStyle(cases.oddLong, { issueTypes: ["PcbTraceSegmentOddAngle"] })
      .issues,
  ).toHaveLength(1)
  expect(analyzePcbStyle(cases.oddLong, { issueTypes: [] }).issues).toEqual([])
})
test("invalid thresholds and coordinates fail clearly", () => {
  for (const value of [0, -1, Infinity, NaN])
    expect(() =>
      analyzePcbStyle(cases.clean, { maxSegmentLengthMm: value }),
    ).toThrow()
  for (const value of [-1, 22.5, Infinity, NaN])
    expect(() =>
      analyzePcbStyle(cases.clean, { angleToleranceDegrees: value }),
    ).toThrow()
  expect(() => analyzePcbStyle(trace([wire(0, 0), wire(NaN, 1)]))).toThrow(
    "nonfinite",
  )
})
test("artifact filters retain global indices, escape markup, and keep both rules distinct", () => {
  const cj = trace([wire(0, 0), wire(8, 2)], 'pcb_trace_<script>&"')
  const artifacts = createPcbStyleIssueArtifacts(cj)
  expect(artifacts).toHaveLength(2)
  expect(artifacts[0].content).toContain('stroke="#ff5555"')
  expect(artifacts[0].content).not.toContain("<script>")
  expect(artifacts[0].descriptionXml).toContain("&lt;script&gt;")
  expect(
    createPcbStyleIssueArtifacts(cj, {
      issueTypes: ["PcbTraceSegmentOddAngle"],
    })[0].issueIndex,
  ).toBe(1)
  expect(createPcbStyleIssueArtifacts(cases.bottom, { layer: "top" })).toEqual(
    [],
  )
  expect(createPcbStyleIssueArtifacts(cases.clean)).toEqual([])
})
test("stepping runs exactly one rule at a time and final visualization highlights issues", () => {
  const p = new PcbStyleAnalysisPipeline(cases.multiSegment)
  p.step()
  expect(p.getCurrentStageName()).toBe("LongTraceSegmentSolver")
  p.step()
  expect(p.activeSubSolver?.getOutput()).toHaveLength(1)
  p.solve()
  expect(
    p.finalVisualize().lines?.filter((l) => l.strokeColor === "#ef4444"),
  ).toHaveLength(p.getOutput().issues.length)
})
