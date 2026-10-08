import { BaseSolver } from "@tscircuit/solver-utils"
import type { AnalysisContext, TraceSegment } from "../types"
import { visualizeIssues } from "../visualize"
import { buildTraceRuns } from "../trace-runs"
export interface LongTraceSegmentParams {
  ctx: AnalysisContext
  maxSegmentLengthMm: number
}
/** Select candidates for angle analysis; length alone is not a style error. */
export class LongTraceSegmentSolver extends BaseSolver {
  segments: TraceSegment[] = []
  private nextSegment = 0
  private candidates: TraceSegment[]
  constructor(public params: LongTraceSegmentParams) {
    super()
    if (
      !Number.isFinite(params.maxSegmentLengthMm) ||
      params.maxSegmentLengthMm <= 0
    )
      throw new Error("maxSegmentLengthMm must be finite and positive")
    this.candidates = buildTraceRuns(params.ctx)
    this.MAX_ITERATIONS = this.candidates.length + 2
  }
  override _step() {
    const segment = this.candidates[this.nextSegment++]
    if (!segment) {
      this.solved = true
      this.progress = 1
      return
    }
    if (segment.lengthMm > this.params.maxSegmentLengthMm)
      this.segments.push(segment)
    this.progress = this.nextSegment / this.candidates.length
    this.stats = {
      segmentsChecked: this.nextSegment,
      candidateCount: this.segments.length,
    }
  }
  override getOutput() {
    return this.segments
  }
  override visualize() {
    return visualizeIssues(this.params.ctx, [])
  }
  override getConstructorParams(): [LongTraceSegmentParams] {
    return [this.params]
  }
}
