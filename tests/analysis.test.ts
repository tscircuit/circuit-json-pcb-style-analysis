import { expect, test } from "bun:test"
import type { PcbTrace, PcbTraceRoutePoint } from "circuit-json"
import {
  analyzePcbStyle,
  createPcbStyleIssueArtifacts,
  PcbStyleAnalysisPipeline,
} from "../lib"
import { buildAnalysisContext } from "../lib/segments"
import { renderPcbStyleSvg } from "../lib/create-pcb-style-issue-artifacts"
import { realBoards } from "./fixtures/real-boards"

for (const board of realBoards) {
  test(
    board.name +
      ": every issue selects the original copper, with stable IDs and no input changes",
    () => {
      const cj = board.circuitJson
      const original = JSON.stringify(cj)
      const analysis = analyzePcbStyle(cj)
      expect(cj.filter((e) => e.type === "pcb_trace")).toHaveLength(
        board.expected.traces,
      )
      expect(analysis.issues).toHaveLength(
        board.expected.longSegments + board.expected.oddAngles,
      )
      expect(new Set(analysis.issues.map((i) => i.issueId)).size).toBe(
        analysis.issues.length,
      )
      for (const issue of analysis.issues) {
        const trace = cj[issue.circuitJsonIndex] as PcbTrace
        expect(trace.type).toBe("pcb_trace")
        expect(trace.pcb_trace_id).toBe(issue.pcbTraceId)
        expect(issue.sourceTraceId).toBe(trace.source_trace_id)
        expect(issue.subcircuitId).toBe(trace.subcircuit_id)
        expect(issue.endRouteIndex).toBe(issue.startRouteIndex + 1)
        const a = trace.route[issue.startRouteIndex]
        const b = trace.route[issue.endRouteIndex]
        const endpoint = (p: PcbTraceRoutePoint, outgoing: boolean) =>
          p.route_type === "through_pad"
            ? outgoing
              ? p.end
              : p.start
            : { x: p.x, y: p.y }
        expect(issue.start).toEqual(endpoint(a, true))
        expect(issue.end).toEqual(endpoint(b, false))
        expect(issue.severity).toBe("error")
        expect(issue.location.x).toBeGreaterThanOrEqual(issue.bounds.minX)
        expect(issue.location.x).toBeLessThanOrEqual(issue.bounds.maxX)
        expect(issue.location.y).toBeGreaterThanOrEqual(issue.bounds.minY)
        expect(issue.location.y).toBeLessThanOrEqual(issue.bounds.maxY)
        expect(issue.bounds.minX).toBeLessThan(
          Math.min(issue.start.x, issue.end.x),
        )
        expect(issue.bounds.maxX).toBeGreaterThan(
          Math.max(issue.start.x, issue.end.x),
        )
      }
      expect(analyzePcbStyle(cj)).toEqual(analysis)
      expect(JSON.stringify(cj)).toBe(original)
    },
  )
}

test("Game Boy's 292 vias retain route indices and exclude duplicate points at layer transitions", () => {
  const board = realBoards[1]
  const routes = board.circuitJson.filter((e) => e.type === "pcb_trace")
  expect(
    routes.flatMap((t) => t.route).filter((p) => p.route_type === "via"),
  ).toHaveLength(292)
  const ctx = buildAnalysisContext(board.circuitJson)
  expect(ctx.segments).toHaveLength(2363)
  // This routed net changes layer twice, with duplicate wire coordinates at each via.
  const segments = ctx.segments.filter((s) => s.circuitJsonIndex === 877)
  expect(
    segments.map((s) => [s.startRouteIndex, s.endRouteIndex, s.layer]),
  ).toEqual([
    [0, 1, "top"],
    [1, 2, "top"],
    [2, 3, "top"],
    [3, 4, "top"],
    [6, 7, "bottom"],
    [7, 8, "bottom"],
    [8, 9, "bottom"],
    [11, 12, "top"],
    [12, 13, "top"],
  ])
  expect(
    analyzePcbStyle(board.circuitJson).issues.filter(
      (i) => i.circuitJsonIndex === 877,
    ),
  ).toEqual([])
})

test("USB-C flashlight's repeated GND trace IDs still select four distinct long copper segments and no odd angles", () => {
  const issues = analyzePcbStyle(realBoards[2].circuitJson).issues
  expect(issues.map((i) => [i.issueId, i.pcbTraceId, i.layer])).toEqual([
    ["long-segment:185:0", "pcb_trace_GND", "bottom"],
    ["long-segment:192:0", "pcb_trace_GND", "top"],
    ["long-segment:192:1", "pcb_trace_GND", "top"],
    ["long-segment:196:0", "pcb_trace_Net-(SW1-Pad2)", "top"],
  ])
  expect(issues[0]).toMatchObject({
    start: { x: 4.325, y: -11.6223 },
    end: { x: -4.325, y: -11.6223 },
    lengthMm: 8.65,
    location: { x: 0, y: -11.6223 },
  })
  // Its two diagonal GND/switch runs are legitimate multiples of 45 degrees.
  // Their highlights must convey length violations, never angle violations.
  const svg = renderPcbStyleSvg(realBoards[2].circuitJson, issues)
  expect(svg.match(/<line[^>]*stroke="#f59e0b"/g)).toHaveLength(4)
  expect(svg).not.toContain('stroke="#ff5555"')
})

test("Game Boy's near-horizontal source_trace_141_0 emits both errors for the same original segment", () => {
  const issues = analyzePcbStyle(realBoards[1].circuitJson).issues.filter(
    (i) => i.circuitJsonIndex === 933 && i.startRouteIndex === 7,
  )
  expect(issues.map((i) => i.lineItemType)).toEqual([
    "PcbTraceSegmentTooLong",
    "PcbTraceSegmentOddAngle",
  ])
  for (const issue of issues)
    expect(issue).toMatchObject({
      pcbTraceId: "source_trace_141_0",
      layer: "top",
      start: { x: -13.408130445680602, y: 33.09312314598361 },
      end: { x: -1.6191737403625233, y: 33.03950095624234 },
    })
  const odd = issues.find((i) => i.lineItemType === "PcbTraceSegmentOddAngle")!
  expect(odd).toMatchObject({
    nearestAllowedAngleDegrees: 0,
    angleToleranceDegrees: 0.1,
  })
  if (odd.lineItemType === "PcbTraceSegmentOddAngle")
    expect(odd.deviationDegrees).toBeCloseTo(0.2606086399129026)
  // Two diagnostics on one segment get one purple highlight, not a misleading
  // length/angle color determined by whichever issue was rendered last.
  const svg = renderPcbStyleSvg(realBoards[1].circuitJson, issues)
  expect(svg.match(/<line[^>]*stroke="#a78bfa"/g)).toHaveLength(1)
})

test("Game Boy analysis can pause between stages, and selecting a rule produces exactly that full-board stage output", () => {
  const cj = realBoards[1].circuitJson
  const solver = new PcbStyleAnalysisPipeline(cj)
  solver.solveUntilStage("OddAngleTraceSegmentSolver")
  expect(solver.failed).toBe(false)
  expect(solver.solved).toBe(false)
  expect(solver.getOutput().issues).toHaveLength(217)
  expect(
    solver
      .getOutput()
      .issues.every((i) => i.lineItemType === "PcbTraceSegmentTooLong"),
  ).toBe(true)
  solver.solve()
  const { issues } = solver.getOutput()
  expect(issues).toHaveLength(631)
  for (const type of [
    "PcbTraceSegmentTooLong",
    "PcbTraceSegmentOddAngle",
  ] as const)
    expect(analyzePcbStyle(cj, { issueTypes: [type] }).issues).toEqual(
      issues.filter((i) => i.lineItemType === type),
    )
})

test("Arduino Micro's inner-layer artifacts keep global issue indices and highlight only the selected segment", () => {
  const cj = realBoards[0].circuitJson
  const analysis = analyzePcbStyle(cj)
  const artifacts = createPcbStyleIssueArtifacts(cj, {
    analysis,
    layer: "inner2",
    issueTypes: ["PcbTraceSegmentOddAngle"],
  })
  const expected = analysis.issues.filter(
    (i) => i.layer === "inner2" && i.lineItemType === "PcbTraceSegmentOddAngle",
  )
  expect(expected.length).toBeGreaterThan(0)
  expect(artifacts.map((a) => a.issue)).toEqual(expected)
  for (const artifact of artifacts) {
    expect(artifact.issueIndex).toBe(analysis.issues.indexOf(artifact.issue))
    expect(artifact.bounds).toEqual(artifact.issue.bounds)
    expect(artifact.content.match(/<line[^>]*stroke="#ff5555"/g)).toHaveLength(
      1,
    )
    expect(artifact.descriptionXml).toContain(
      'pcbTraceId="' + artifact.issue.pcbTraceId + '"',
    )
    expect(artifact.descriptionXml).toContain('layer="inner2"')
  }
})
