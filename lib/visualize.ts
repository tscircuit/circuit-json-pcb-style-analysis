import type { GraphicsObject } from "graphics-debug"
import type { AnalysisContext, PcbStyleIssue } from "./types"
import { getIssueHighlights } from "./issue-highlights"
export function visualizeIssues(
  ctx: AnalysisContext,
  issues: PcbStyleIssue[],
): GraphicsObject {
  const highlights = getIssueHighlights(issues)
  return {
    coordinateSystem: "cartesian",
    lines: [
      ...ctx.segments.map((s) => ({
        points: [s.start, s.end],
        strokeColor: s.layer === "bottom" ? "#60a5fa" : "#94a3b8",
        strokeWidth: s.width,
      })),
      ...highlights.flatMap(({ issue, color, message }) =>
        (issue.constituentSegments ?? [issue]).map((segment) => ({
          points: [segment.start, segment.end],
          strokeColor: color,
          strokeWidth: Math.max(segment.width * 2, 0.25),
          label: message,
        })),
      ),
    ],
    points: highlights.map(({ issue, color, message }, i) => ({
      ...issue.location,
      color,
      label: i + 1 + ": " + message,
    })),
  }
}
