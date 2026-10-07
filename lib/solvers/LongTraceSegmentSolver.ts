import type {
  AnalysisContext,
  TraceSegment,
  PcbTraceSegmentTooLong,
} from "../types"
import { locateIssue, SegmentIssueSolver } from "./SegmentIssueSolver"
export interface LongTraceSegmentParams {
  ctx: AnalysisContext
  maxSegmentLengthMm: number
}
export class LongTraceSegmentSolver extends SegmentIssueSolver {
  constructor(public params: LongTraceSegmentParams) {
    super(params.ctx)
    if (
      !Number.isFinite(params.maxSegmentLengthMm) ||
      params.maxSegmentLengthMm <= 0
    )
      throw new Error("maxSegmentLengthMm must be finite and positive")
  }
  override checkSegment(s: TraceSegment): PcbTraceSegmentTooLong | undefined {
    if (s.lengthMm <= this.params.maxSegmentLengthMm) return
    return {
      ...locateIssue(s, "long-segment"),
      lineItemType: "PcbTraceSegmentTooLong",
      maxSegmentLengthMm: this.params.maxSegmentLengthMm,
      message:
        s.pcbTraceId +
        " segment " +
        s.startRouteIndex +
        " on " +
        s.layer +
        " is " +
        s.lengthMm.toFixed(3) +
        " mm long (maximum " +
        this.params.maxSegmentLengthMm +
        " mm)",
    }
  }
  override getConstructorParams(): [LongTraceSegmentParams] {
    return [this.params]
  }
}
