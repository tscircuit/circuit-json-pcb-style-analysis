import { expect, test } from "bun:test"
import { readFileSync, writeFileSync, existsSync } from "node:fs"
import { renderPcbStyleSvg } from "../lib/create-pcb-style-issue-artifacts"
import { analyzePcbStyle } from "../lib"
import { realBoards } from "./fixtures/real-boards"
import type { CircuitJson } from "circuit-json"
import am3352 from "./assets/am3352-segmented-trace.circuit.json"

function snapshot(name: string, svg: string) {
  const path = new URL("./__snapshots__/" + name + ".snap.svg", import.meta.url)
  if (process.env.UPDATE_SNAPSHOTS === "1") writeFileSync(path, svg)
  expect(existsSync(path)).toBe(true)
  expect(svg).toBe(readFileSync(path, "utf8"))
}

test("visual: AM3352 staircase highlights original copper rather than its chord", () => {
  const cj = am3352 as CircuitJson
  const analysis = analyzePcbStyle(cj)
  expect(analysis.issues).toHaveLength(2)
  snapshot(
    "am3352-segmented-trace-overview",
    renderPcbStyleSvg(cj, analysis.issues, {
      title: `AM3352 SBC — segmented run — ${analysis.issues.length} issues detected`,
    }),
  )
})

// Every drawing uses the complete routed board; no generated traces or isolated segment fixtures.
for (const board of realBoards) {
  test(
    "visual: " + board.name + ", all problematic segments highlighted",
    () => {
      const cj = board.circuitJson
      const analysis = analyzePcbStyle(cj)
      expect(analysis.issues).toHaveLength(board.expected.issues)
      snapshot(
        board.id + "-overview",
        renderPcbStyleSvg(cj, analysis.issues, {
          title: board.name + " — all style errors",
        }),
      )
    },
  )
}
