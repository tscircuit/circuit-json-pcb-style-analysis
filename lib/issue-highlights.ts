import type { PcbStyleIssue } from "./types"
/** Highlight original copper for both odd-angle and staircase findings. */
export function getIssueHighlights(issues: PcbStyleIssue[]) {
  return issues.map((issue) => ({
    issue,
    color: "#ff5555",
    message: issue.message,
  }))
}
