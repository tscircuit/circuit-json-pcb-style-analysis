import { BaseSolver } from "@tscircuit/solver-utils"
import type {
  AnalysisContext,
  LocatedPcbStyleIssue,
  PcbStyleIssue,
  TraceSegment,
} from "../types"
import { visualizeIssues } from "../visualize"
export function locateIssue(
  segment: TraceSegment,
  rule: string,
): LocatedPcbStyleIssue {
  const { start, end, width } = segment
  return {
    ...segment,
    issueId:
      rule + ":" + segment.circuitJsonIndex + ":" + segment.startRouteIndex,
    severity: "error",
    message: "",
    location: { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 },
    bounds: {
      minX: Math.min(start.x, end.x) - width / 2,
      minY: Math.min(start.y, end.y) - width / 2,
      maxX: Math.max(start.x, end.x) + width / 2,
      maxY: Math.max(start.y, end.y) + width / 2,
    },
  }
}
/** One segment per step keeps the debugger responsive and inspectable. */
export abstract class SegmentIssueSolver extends BaseSolver {
  issues: PcbStyleIssue[] = []
  private nextSegment = 0
  constructor(public ctx: AnalysisContext) {
    super()
    this.MAX_ITERATIONS = ctx.segments.length + 2
  }
  abstract checkSegment(segment: TraceSegment): PcbStyleIssue | undefined
  override _step() {
    const segment = this.ctx.segments[this.nextSegment++]
    if (!segment) {
      this.solved = true
      this.progress = 1
      return
    }
    const issue = this.checkSegment(segment)
    if (issue) this.issues.push(issue)
    this.progress = this.nextSegment / this.ctx.segments.length
    this.stats = {
      segmentsChecked: this.nextSegment,
      issueCount: this.issues.length,
    }
  }
  override getOutput() {
    return this.issues
  }
  override visualize() {
    return visualizeIssues(this.ctx, this.issues)
  }
}
