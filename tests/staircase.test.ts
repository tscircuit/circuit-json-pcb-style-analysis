import { expect, test } from "bun:test"
import { readFileSync, writeFileSync } from "node:fs"
import { gunzipSync } from "node:zlib"
import { createHash } from "node:crypto"
import type { CircuitJson, PcbTraceRoutePoint } from "circuit-json"
import {
  analyzePcbStyle,
  renderPcbStyleSvg,
  createPcbStyleIssueArtifacts,
  type PcbStyleAnalysisOptions,
} from "../lib"

function latestBoard(): CircuitJson {
  const bytes = gunzipSync(
    readFileSync(
      new URL(
        "./assets/am3352-staircase-board.circuit.json.gz",
        import.meta.url,
      ),
    ),
  )
  expect(createHash("sha256").update(bytes).digest("hex")).toBe(
    "d6ae4525b451cdcfce0c82b3423b2a2c035e8a8fb36f888033b645100cce24c5",
  )
  return JSON.parse(bytes.toString()) as CircuitJson
}

test("latest AM3352 flags repeated staircase bends despite allowed individual directions", () => {
  const analysis = analyzePcbStyle(latestBoard())
  const issue = analysis.issues.find(
    (i) =>
      i.lineItemType === "PcbTraceStaircase" &&
      i.pcbTraceId === "grid:source_net_80:1" &&
      i.startRouteIndex === 29 &&
      i.endRouteIndex === 125,
  )
  expect(issue).toBeDefined()
  expect(issue!.lengthMm).toBeCloseTo(11.51040764008575)
})

test("visual: latest AM3352 shows staircase findings and the detected count", () => {
  const cj = latestBoard()
  const analysis = analyzePcbStyle(cj)
  expect(analysis.issues).toHaveLength(181)
  expect(
    analysis.issues.every((i) => i.lineItemType === "PcbTraceStaircase"),
  ).toBe(true)
  const svg = renderPcbStyleSvg(cj, analysis.issues, {
    title: `Latest AM3352 SBC — ${analysis.issues.length} issues detected`,
  })
  const path = new URL(
    "./__snapshots__/am3352-staircase-overview.snap.svg",
    import.meta.url,
  )
  expect(svg.match(/<line[^>]*stroke="#ff5555"/g)).toHaveLength(
    analysis.issues.reduce(
      (n, i) => n + (i.constituentSegments?.length ?? 1),
      0,
    ),
  )
  if (process.env.UPDATE_SNAPSHOTS === "1") writeFileSync(path, svg)
  expect(svg).toBe(readFileSync(path, "utf8"))
})

function staircase(step = 0.25, count = 20): PcbTraceRoutePoint[] {
  let x = 0,
    y = 0
  const route: PcbTraceRoutePoint[] = [
    { route_type: "wire", x, y, width: 0.2, layer: "top" },
  ]
  for (let i = 0; i < count; i++) {
    if (i % 2 === 0) x += step
    y += step
    route.push({ route_type: "wire", x, y, width: 0.2, layer: "top" })
  }
  return route
}
function traces(...routes: PcbTraceRoutePoint[][]): CircuitJson {
  return routes.map((route) => ({
    type: "pcb_trace",
    pcb_trace_id: "trace",
    route,
  })) as CircuitJson
}
function stairs(cj: CircuitJson, options: PcbStyleAnalysisOptions = {}) {
  return analyzePcbStyle(cj, {
    ...options,
    issueTypes: ["PcbTraceStaircase"],
  }).issues.filter((i) => i.lineItemType === "PcbTraceStaircase")
}
function subdivide(
  route: PcbTraceRoutePoint[],
  count: number,
): PcbTraceRoutePoint[] {
  const points = route as Extract<PcbTraceRoutePoint, { route_type: "wire" }>[]
  return points
    .slice(0, -1)
    .flatMap((a, i) =>
      Array.from({ length: count }, (_, j) => ({
        ...a,
        x: a.x + ((points[i + 1].x - a.x) * j) / count,
        y: a.y + ((points[i + 1].y - a.y) * j) / count,
      })),
    )
    .concat(points.at(-1)!)
}

test("point subdivision and duplicates preserve staircase counts, bends, and length", () => {
  const route = staircase()
  const expected = stairs(traces(route))[0]
  expect(expected.bendCount).toBe(19)
  for (const count of [1, 2, 10, 100]) {
    const fragmented = subdivide(route, count).flatMap((p) => [p, { ...p }])
    const found = stairs(traces(fragmented))
    expect(found).toHaveLength(1)
    expect(found[0].bendCount).toBe(expected.bendCount)
    expect(found[0].lengthMm).toBeCloseTo(expected.lengthMm, 10)
  }
})

test("a long staircase step cannot masquerade as tiny steps by subdivision", () => {
  expect(stairs(traces(subdivide(staircase(1.2), 100)))).toEqual([])
})

test("ordinary bends, short staircases, smooth arcs, and length-tuning meanders pass", () => {
  expect(stairs(traces(staircase(0.5, 6)))).toEqual([])
  expect(stairs(traces(staircase(0.05, 20)))).toEqual([])
  const arc = Array.from({ length: 101 }, (_, i) => ({
    route_type: "wire" as const,
    x: 4 * Math.cos((i * Math.PI) / 200),
    y: 4 * Math.sin((i * Math.PI) / 200),
    width: 0.2,
    layer: "top" as const,
  }))
  expect(stairs(traces(arc))).toEqual([])
  const meander = Array.from({ length: 40 }, (_, i) => ({
    route_type: "wire" as const,
    x: [0, 0.5, 0.5, 0][i % 4],
    y: Math.floor(i / 2) * 0.5,
    width: 0.2,
    layer: "top" as const,
  }))
  expect(stairs(traces(meander))).toEqual([])
})

test("staircases cannot join across traces, vias, pads, or layer boundaries", () => {
  const route = staircase(0.25, 8)
  expect(stairs(traces(route))).toHaveLength(1)
  expect(stairs(traces(route.slice(0, 5), route.slice(4)))).toEqual([])
  const p = route[4] as Extract<PcbTraceRoutePoint, { route_type: "wire" }>
  const bottom = route
    .slice(5)
    .map((p) => ({ ...p, layer: "bottom" })) as PcbTraceRoutePoint[]
  const via: PcbTraceRoutePoint = {
    route_type: "via",
    x: p.x,
    y: p.y,
    from_layer: "top",
    to_layer: "bottom",
  }
  expect(stairs(traces([...route.slice(0, 5), via, ...bottom]))).toEqual([])
  expect(
    stairs(
      traces([...route.slice(0, 5), { ...p, layer: "bottom" }, ...bottom]),
    ),
  ).toEqual([])
  const pad: PcbTraceRoutePoint = {
    route_type: "through_pad",
    start: { x: p.x, y: p.y },
    end: { x: p.x, y: p.y },
    start_layer: "top",
    end_layer: "top",
    width: 0.2,
  }
  expect(
    stairs(traces([...route.slice(0, 5), pad, ...route.slice(5)])),
  ).toEqual([])
})

test("staircase thresholds, issue selection, artifacts, and input immutability agree", () => {
  const cj = traces(staircase())
  const original = JSON.stringify(cj)
  const issue = stairs(cj)[0]
  expect(stairs(cj, { minStaircaseBends: issue.bendCount + 1 })).toEqual([])
  expect(stairs(cj, { minStaircaseLengthMm: issue.lengthMm + 0.01 })).toEqual(
    [],
  )
  expect(stairs(cj, { minStaircaseLengthMm: issue.lengthMm })).toHaveLength(1)
  expect(analyzePcbStyle(cj, { issueTypes: [] }).issues).toEqual([])
  const artifacts = createPcbStyleIssueArtifacts(cj, {
    issueTypes: ["PcbTraceStaircase"],
  })
  expect(artifacts).toHaveLength(1)
  expect(
    artifacts[0].content.match(/<line[^>]*stroke="#ff5555"/g),
  ).toHaveLength(20)
  expect(artifacts[0].issue).toEqual(issue)
  expect(
    createPcbStyleIssueArtifacts(cj, {
      issueTypes: ["PcbTraceStaircase"],
      minStaircaseBends: 100,
    }),
  ).toEqual([])
  expect(JSON.stringify(cj)).toBe(original)
})

test("dense staircases below the length threshold complete without repeated suffix scans", () => {
  expect(stairs(traces(staircase(0.00001, 20000)))).toEqual([])
})

test("rotating the staircase to nonstandard angles does not hide its bends", () => {
  for (const degrees of [0, 7, 22.5, 60, 180]) {
    const angle = (degrees * Math.PI) / 180
    const rotated = staircase().map((p) => {
      const wire = p as Extract<PcbTraceRoutePoint, { route_type: "wire" }>
      return {
        ...wire,
        x: wire.x * Math.cos(angle) - wire.y * Math.sin(angle),
        y: wire.x * Math.sin(angle) + wire.y * Math.cos(angle),
      }
    })
    expect(stairs(traces(rotated))).toHaveLength(1)
    expect(stairs(traces(rotated))[0].bendCount).toBe(19)
  }
})
