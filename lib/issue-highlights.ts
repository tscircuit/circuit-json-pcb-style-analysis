import type { PcbStyleIssue } from "./types"
/** Only eligible long segments at odd angles are errors. */
export function getIssueHighlights(issues: PcbStyleIssue[]) {
  return issues.map((issue) => ({
    issue,
    color: "#ff5555",
    message: issue.message,
  }))
}
