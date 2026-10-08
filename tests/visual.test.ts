import { expect, test } from "bun:test"
import { readFileSync, writeFileSync, existsSync } from "node:fs"
import { renderPcbStyleSvg } from "../lib/create-pcb-style-issue-artifacts"
import { analyzePcbStyle } from "../lib"
import { realBoards } from "./fixtures/real-boards"

function snapshot(name: string, svg: string) {
  const path = new URL("./__snapshots__/" + name + ".snap.svg", import.meta.url)
  if (process.env.UPDATE_SNAPSHOTS === "1") writeFileSync(path, svg)
  expect(existsSync(path)).toBe(true)
  expect(svg).toBe(readFileSync(path, "utf8"))
}

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
