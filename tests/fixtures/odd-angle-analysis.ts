import { analyzePcbStyle, type PcbStyleAnalysisOptions } from "../../lib"
import type { CircuitJson } from "circuit-json"

/** Keep subdivision regressions specific to the odd-angle rule. */
export function analyzeOddAngles(
  cj: CircuitJson,
  options: PcbStyleAnalysisOptions = {},
) {
  const analysis = analyzePcbStyle(cj, {
    ...options,
    issueTypes: options.issueTypes ?? ["PcbTraceSegmentOddAngle"],
  })
  return {
    issues: analysis.issues.filter(
      (i) => i.lineItemType === "PcbTraceSegmentOddAngle",
    ),
  }
}
