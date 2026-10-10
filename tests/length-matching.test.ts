import { expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { gunzipSync } from "node:zlib"
import type { CircuitJson, SourceBus } from "circuit-json"
import { analyzePcbStyle, renderPcbStyleSvg } from "../lib"
import { buildAnalysisContext } from "../lib/segments"

function trace(id: string, sourceTraceId?: string): CircuitJson[number] {
  // Both an odd-angle physical wire and a repetitive forward staircase.
  const route = [
    {
      route_type: "wire" as const,
      x: 0,
      y: 0,
      width: 0.2,
      layer: "top" as const,
    },
  ]
  route.push({ ...route[0], x: 10, y: 3 })
  for (let i = 0; i < 20; i++) {
    const last = route.at(-1)!
    route.push({
      ...last,
      x: last.x + (i % 2 === 0 ? 0.25 : 0),
      y: last.y + 0.25,
    })
  }
  return {
    type: "pcb_trace",
    pcb_trace_id: id,
    source_trace_id: sourceTraceId,
    route,
  }
}
function bus(fields: Partial<SourceBus>): SourceBus {
  return {
    type: "source_bus",
    source_bus_id: "bus",
    source_trace_ids: ["matched"],
    ...fields,
  }
}

test("explicit length matching exempts every member PCB trace from both rules", () => {
  for (const fields of [
    { max_length_skew: 0 },
    { max_length_skew: 0.635 },
    { target_length: 20 },
    { target_length: { reference: "longest_manhattan" as const, offset: 2 } },
    { length_match_source_trace_ids: ["comparison"] },
  ]) {
    const cj: CircuitJson = [
      trace("matched-a", "matched"),
      trace("matched-b", "matched"),
      trace("comparison", "comparison"),
      trace("ordinary", "ordinary"),
      trace("unresolved"),
      bus(fields),
    ]
    const before = JSON.stringify(cj)
    const baseline = analyzePcbStyle(cj.slice(0, -1)).issues
    expect(new Set(baseline.map((i) => i.lineItemType)).size).toBe(2)
    const expected = baseline.filter(
      (i) =>
        i.sourceTraceId !== "matched" &&
        !(
          "length_match_source_trace_ids" in fields &&
          i.sourceTraceId === "comparison"
        ),
    )
    expect(analyzePcbStyle(cj).issues).toEqual(expected)
    for (const issueType of [
      "PcbTraceStaircase",
      "PcbTraceSegmentOddAngle",
    ] as const)
      expect(analyzePcbStyle(cj, { issueTypes: [issueType] }).issues).toEqual(
        expected.filter((i) => i.lineItemType === issueType),
      )
    // Exempt geometry is retained for full-board visualization.
    expect(buildAnalysisContext(cj).segments).toHaveLength(105)
    expect(renderPcbStyleSvg(cj, [])).toContain("<line")
    expect(JSON.stringify(cj)).toBe(before)
  }
})

test("bus membership, impedance, and min/max limits alone do not exempt traces", () => {
  const cj: CircuitJson = [trace("matched", "matched")]
  const baseline = analyzePcbStyle(cj).issues
  for (const fields of [
    {},
    { target_impedance: 50 },
    { min_length: 10 },
    { max_length: 30 },
    { length_match_source_trace_ids: [] },
  ])
    expect(analyzePcbStyle([...cj, bus(fields)]).issues).toEqual(baseline)
})

test("AM3352 bus metadata exempts DDR routing while unconstrained routing stays checked", () => {
  const cj = JSON.parse(
    gunzipSync(
      readFileSync(
        new URL(
          "./assets/am3352-staircase-board.circuit.json.gz",
          import.meta.url,
        ),
      ),
    ).toString(),
  ) as CircuitJson
  const ctx = buildAnalysisContext(cj)
  expect(ctx.lengthMatchedSourceTraceIds?.size).toBe(70)
  const matched = cj.find(
    (e) => e.type === "pcb_trace" && e.source_trace_id === "source_trace_15",
  )!
  expect(matched.type).toBe("pcb_trace")
  const replacement = trace("length-matched-ddr", "source_trace_15")
  const modified = cj.map((e) => (e === matched ? replacement : e))
  const issues = analyzePcbStyle(modified).issues
  expect(issues.some((i) => i.pcbTraceId === "length-matched-ddr")).toBe(false)
  const withoutConstraints = modified.filter((e) => e.type !== "source_bus")
  expect(
    new Set(
      analyzePcbStyle(withoutConstraints)
        .issues.filter((i) => i.pcbTraceId === "length-matched-ddr")
        .map((i) => i.lineItemType),
    ),
  ).toEqual(new Set(["PcbTraceSegmentOddAngle", "PcbTraceStaircase"]))
  expect(issues).toEqual(analyzePcbStyle(cj).issues)
})
