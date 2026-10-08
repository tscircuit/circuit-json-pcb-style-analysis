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
      expect(analyzePcbStyle(cj).issues).toHaveLength(board.expected.issues)
      // Unmodified real boards at a stricter tolerance exercise positive errors.
      const options = { angleToleranceDegrees: 0.1 }
      const analysis = analyzePcbStyle(cj, options)
      expect(cj.filter((e) => e.type === "pcb_trace")).toHaveLength(
        board.expected.traces,
      )
      expect(analysis.issues).toHaveLength(board.expected.strictIssues)
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
        expect(issue.lengthMm).toBeGreaterThan(5)
        expect(issue.maxSegmentLengthMm).toBe(5)
        expect(issue.deviationDegrees).toBeGreaterThan(0.1)
        expect(issue.angleToleranceDegrees).toBe(0.1)
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
      expect(analyzePcbStyle(cj, options)).toEqual(analysis)
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

test("USB-C flashlight's long horizontal and diagonal GND/switch runs are accepted", () => {
  const cj = realBoards[2].circuitJson
  const segments = buildAnalysisContext(cj).segments.filter(
    (s) => s.lengthMm > 5,
  )
  expect(
    segments.map((s) => [
      s.circuitJsonIndex,
      s.startRouteIndex,
      s.pcbTraceId,
      s.layer,
    ]),
  ).toEqual([
    [185, 0, "pcb_trace_GND", "bottom"],
    [192, 0, "pcb_trace_GND", "top"],
    [192, 1, "pcb_trace_GND", "top"],
    [196, 0, "pcb_trace_Net-(SW1-Pad2)", "top"],
  ])
  expect(segments[0]).toMatchObject({
    start: { x: 4.325, y: -11.6223 },
    end: { x: -4.325, y: -11.6223 },
    lengthMm: 8.65,
  })
  const issues = analyzePcbStyle(cj).issues
  expect(issues).toEqual([])
  // Length alone must never produce a highlight, including under strict angles.
  expect(analyzePcbStyle(cj, { angleToleranceDegrees: 0 }).issues).toEqual([])
  expect(renderPcbStyleSvg(cj, issues)).not.toContain('stroke="#ff5555"')
})

test("Game Boy's near-horizontal source_trace_141_0 is accepted at 4° but configurable strict analysis flags it", () => {
  const cj = realBoards[1].circuitJson
  const selectSegment = (
    issues: ReturnType<typeof analyzePcbStyle>["issues"],
  ) =>
    issues.filter((i) => i.circuitJsonIndex === 933 && i.startRouteIndex === 7)
  const defaultAnalysis = analyzePcbStyle(cj)
  const defaultIssues = selectSegment(defaultAnalysis.issues)
  expect(defaultIssues).toEqual([])
  const issues = selectSegment(
    analyzePcbStyle(cj, { angleToleranceDegrees: 0.1 }).issues,
  )
  expect(issues.map((i) => i.lineItemType)).toEqual(["PcbTraceSegmentOddAngle"])
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
    maxSegmentLengthMm: 5,
  })
  if (odd.lineItemType === "PcbTraceSegmentOddAngle")
    expect(odd.deviationDegrees).toBeCloseTo(0.2606086399129026)
  // The combined condition emits one located error and one red highlight.
  expect(issues).toHaveLength(1)
  const length = issues[0].lengthMm
  const deviation = issues[0].deviationDegrees
  expect(
    selectSegment(
      analyzePcbStyle(cj, {
        angleToleranceDegrees: 0.1,
        maxSegmentLengthMm: length,
      }).issues,
    ),
  ).toEqual([])
  expect(
    selectSegment(
      analyzePcbStyle(cj, { angleToleranceDegrees: deviation }).issues,
    ),
  ).toEqual([])
  const svg = renderPcbStyleSvg(realBoards[1].circuitJson, issues)
  expect(svg.match(/<line[^>]*stroke="#ff5555"/g)).toHaveLength(1)
})

test("Game Boy pipeline selects long candidates before angle analysis without exposing length errors", () => {
  const cj = realBoards[1].circuitJson
  for (const tolerance of [4, 0.1]) {
    const solver = new PcbStyleAnalysisPipeline(cj, {
      angleToleranceDegrees: tolerance,
    })
    solver.solveUntilStage("OddAngleTraceSegmentSolver")
    expect(solver.failed).toBe(false)
    expect(solver.solved).toBe(false)
    const candidates = solver.getStageOutput<
      ReturnType<typeof buildAnalysisContext>["segments"]
    >("LongTraceSegmentSolver")!
    expect(candidates).toHaveLength(217)
    expect(candidates.every((s) => s.lengthMm > 5)).toBe(true)
    expect(solver.getOutput().issues).toEqual([])
    solver.solve()
    expect(solver.getOutput().issues).toHaveLength(tolerance === 4 ? 0 : 4)
    expect(
      analyzePcbStyle(cj, {
        angleToleranceDegrees: tolerance,
        issueTypes: ["PcbTraceSegmentOddAngle"],
      }),
    ).toEqual(solver.getOutput())
  }
  expect(
    analyzePcbStyle(cj, { angleToleranceDegrees: 0.1, issueTypes: [] }).issues,
  ).toEqual([])
})

test("Arduino Micro's inner-layer artifacts keep global issue indices and highlight only the selected segment", () => {
  const cj = realBoards[0].circuitJson
  // Lowering the length threshold exercises real inner-layer copper without changing the board.
  const analysis = analyzePcbStyle(cj, { maxSegmentLengthMm: 0.1 })
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
