import { expect, test } from "bun:test"
import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { analyzePcbStyle } from "../lib"
import { renderPcbStyleSvg } from "../lib/create-pcb-style-issue-artifacts"
import provenance from "./assets/published-boards.provenance.json"
import { realBoards } from "./fixtures/real-boards"

for (const source of provenance) {
  test(
    source.packageName +
      ": default errors match the complete published release and highlight every failing segment once",
    () => {
      const board = realBoards.find((b) => b.id === source.id)!
      const bytes = readFileSync(
        new URL("./assets/" + source.id + ".circuit.json", import.meta.url),
      )
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(
        source.fixtureSha256,
      )
      expect(source.sourceCircuitJsonIndices).toHaveLength(
        board.circuitJson.length,
      )
      const analysis = analyzePcbStyle(board.circuitJson)
      expect(
        analysis.issues.map((i) => ({
          sourceCircuitJsonIndex:
            source.sourceCircuitJsonIndices[i.circuitJsonIndex],
          startRouteIndex: i.startRouteIndex,
          endRouteIndex: i.endRouteIndex,
          pcbTraceId: i.pcbTraceId,
          layer: i.layer,
          lengthMm: i.lengthMm,
          deviationDegrees: i.deviationDegrees,
        })),
      ).toEqual(source.expectedIssues)
      expect(analysis.issues.length).toBeGreaterThan(0)
      for (const issue of analysis.issues) {
        expect(issue.lengthMm).toBeGreaterThan(5)
        expect(issue.deviationDegrees).toBeGreaterThan(4)
        expect(issue.maxSegmentLengthMm).toBe(5)
        expect(issue.angleToleranceDegrees).toBe(4)
      }
      const svg = renderPcbStyleSvg(board.circuitJson, analysis.issues)
      expect(svg.match(/<line[^>]*stroke="#ff5555"/g)).toHaveLength(
        analysis.issues.length,
      )
    },
  )
}
