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
      expect(analysis.issues).toHaveLength(board.expected.issues)
      // The recorded source results used pairwise segments. Every old finding
      // remains represented, either alone or inside a larger effective run.
      for (const expected of source.expectedIssues) {
        const issue = analysis.issues.find(
          (i) =>
            source.sourceCircuitJsonIndices[i.circuitJsonIndex] ===
              expected.sourceCircuitJsonIndex &&
            i.pcbTraceId === expected.pcbTraceId &&
            i.layer === expected.layer &&
            i.startRouteIndex <= expected.startRouteIndex &&
            i.endRouteIndex >= expected.endRouteIndex,
        )
        expect(issue).toBeDefined()
        const segment =
          issue!.constituentSegments?.find(
            (s) => s.startRouteIndex === expected.startRouteIndex,
          ) ?? issue!
        expect(segment.endRouteIndex).toBe(expected.endRouteIndex)
        expect(segment.lengthMm).toBeCloseTo(expected.lengthMm, 10)
      }
      expect(analysis.issues.length).toBeGreaterThan(0)
      for (const issue of analysis.issues) {
        if (issue.lineItemType === "PcbTraceSegmentOddAngle") {
          expect(issue.lengthMm).toBeGreaterThan(5)
          expect(issue.deviationDegrees).toBeGreaterThan(4)
          expect(issue.maxSegmentLengthMm).toBe(5)
          expect(issue.angleToleranceDegrees).toBe(4)
        } else {
          expect(issue.lengthMm).toBeGreaterThanOrEqual(2 - 1e-9)
          expect(issue.bendCount).toBeGreaterThanOrEqual(6)
        }
      }
      const svg = renderPcbStyleSvg(board.circuitJson, analysis.issues)
      expect(svg.match(/<line[^>]*stroke="#ff5555"/g)).toHaveLength(
        analysis.issues.reduce(
          (n, i) => n + (i.constituentSegments?.length ?? 1),
          0,
        ),
      )
    },
  )
}
