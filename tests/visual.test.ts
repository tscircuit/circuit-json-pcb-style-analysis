import { expect, test } from "bun:test"
import { readFileSync, writeFileSync, existsSync } from "node:fs"
import {
  createPcbStyleIssueArtifacts,
  renderPcbStyleSvg,
} from "../lib/create-pcb-style-issue-artifacts"
import { analyzePcbStyle } from "../lib"
import { buildAnalysisContext } from "../lib/segments"
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
    "visual: " + board.name + ", board/layer overviews and every located error",
    () => {
      const cj = board.circuitJson
      const analysis = analyzePcbStyle(cj)
      expect(
        analysis.issues.filter(
          (i) => i.lineItemType === "PcbTraceSegmentOddAngle",
        ),
      ).toHaveLength(board.expected.oddAngles)
      expect(
        analysis.issues.filter(
          (i) => i.lineItemType === "PcbTraceSegmentTooLong",
        ),
      ).toHaveLength(board.expected.longSegments)
      snapshot(
        board.id + "-overview",
        renderPcbStyleSvg(cj, analysis.issues, {
          title: board.name + " — all style errors",
        }),
      )
      const layers = [
        ...new Set(buildAnalysisContext(cj).segments.map((s) => s.layer)),
      ].sort()
      for (const layer of layers)
        snapshot(
          board.id + "-layer-" + layer,
          renderPcbStyleSvg(
            cj,
            analysis.issues.filter((i) => i.layer === layer),
            { layer, title: board.name + " — " + layer },
          ),
        )
      for (const artifact of createPcbStyleIssueArtifacts(cj, { analysis }))
        snapshot(
          board.id + "-" + artifact.fileName.replace(".svg", ""),
          artifact.content,
        )
    },
  )
}
