import type { PcbStyleIssue } from "./types"

export const issueColors = {
  longSegment: "#f59e0b",
  oddAngle: "#ff5555",
  both: "#a78bfa",
}

/** Draw each physical segment once, retaining both reasons when rules overlap. */
export function getIssueHighlights(issues: PcbStyleIssue[]) {
  const groups = new Map<string, PcbStyleIssue[]>()
  for (const issue of issues) {
    const key = issue.circuitJsonIndex + ":" + issue.startRouteIndex
    const group = groups.get(key) ?? []
    group.push(issue)
    groups.set(key, group)
  }
  return [...groups.values()].map((group) => {
    const long = group.some((i) => i.lineItemType === "PcbTraceSegmentTooLong")
    const odd = group.some((i) => i.lineItemType === "PcbTraceSegmentOddAngle")
    return {
      issue: group[0],
      color:
        long && odd
          ? issueColors.both
          : long
            ? issueColors.longSegment
            : issueColors.oddAngle,
      message: group.map((i) => i.message).join("; "),
    }
  })
}
