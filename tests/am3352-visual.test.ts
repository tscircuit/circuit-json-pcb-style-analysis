import { expect, test } from "bun:test"
import { readFileSync, writeFileSync } from "node:fs"
import { gunzipSync } from "node:zlib"
import { createHash } from "node:crypto"
import type { CircuitJson } from "circuit-json"
import { analyzePcbStyle, renderPcbStyleSvg } from "../lib"

test("visual: complete AM3352 board shows the detected issue count and highlighted copper", () => {
  const bytes = gunzipSync(
    readFileSync(
      new URL("./assets/am3352-sbc.circuit.json.gz", import.meta.url),
    ),
  )
  // Byte-for-byte copy of the linked board; compression only reduces fixture size.
  expect(createHash("sha256").update(bytes).digest("hex")).toBe(
    "36725097b67b289636d32d3edc60ff2906357ce9c445e3c66e33ee3389602e3c",
  )
  const cj = JSON.parse(bytes.toString()) as CircuitJson
  const analysis = analyzePcbStyle(cj)
  expect(analysis.issues).toHaveLength(0)
  const svg = renderPcbStyleSvg(cj, analysis.issues, {
    title: `AM3352 SBC — ${analysis.issues.length} issues detected`,
  })
  expect(svg).toContain(`${analysis.issues.length} issues detected`)
  const path = new URL(
    "./__snapshots__/am3352-sbc-overview.snap.svg",
    import.meta.url,
  )
  if (process.env.UPDATE_SNAPSHOTS === "1") writeFileSync(path, svg)
  expect(svg).toBe(readFileSync(path, "utf8"))
})
