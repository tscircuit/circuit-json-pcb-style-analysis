import type { GraphicsObject } from "graphics-debug"
import type { AnalysisContext, PcbStyleIssue } from "./types"
export function visualizeIssues(
  ctx: AnalysisContext,
  issues: PcbStyleIssue[],
): GraphicsObject {
  return {
    coordinateSystem: "cartesian",
    lines: [
      ...ctx.segments.map((s) => ({
        points: [s.start, s.end],
        strokeColor: s.layer === "bottom" ? "#60a5fa" : "#94a3b8",
        strokeWidth: s.width,
      })),
      ...issues.map((issue) => ({
        points: [issue.start, issue.end],
        strokeColor: "#ef4444",
        strokeWidth: Math.max(issue.width * 2, 0.25),
        label: issue.message,
      })),
    ],
    points: issues.map((issue, i) => ({
      ...issue.location,
      color: "#ef4444",
      label: i + 1 + ": " + issue.lineItemType,
    })),
  }
}
