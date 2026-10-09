import { expect, test } from "bun:test"
import { readFileSync, writeFileSync } from "node:fs"
import { gunzipSync } from "node:zlib"
import { createHash } from "node:crypto"
import type { CircuitJson } from "circuit-json"
import { analyzePcbStyle, renderPcbStyleSvg } from "../lib"

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
      (i.lineItemType as string) === "PcbTraceStaircase" &&
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
  expect(analysis.issues).toHaveLength(0)
  const svg = renderPcbStyleSvg(cj, analysis.issues, {
    title: `Latest AM3352 SBC — ${analysis.issues.length} issues detected`,
  })
  const path = new URL(
    "./__snapshots__/am3352-staircase-overview.snap.svg",
    import.meta.url,
  )
  if (process.env.UPDATE_SNAPSHOTS === "1") writeFileSync(path, svg)
  expect(svg).toBe(readFileSync(path, "utf8"))
})
