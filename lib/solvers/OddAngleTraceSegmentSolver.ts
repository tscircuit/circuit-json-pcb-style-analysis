import type {
  AnalysisContext,
  TraceSegment,
  PcbTraceSegmentOddAngle,
} from "../types"
import { locateIssue, SegmentIssueSolver } from "./SegmentIssueSolver"
export interface OddAngleTraceSegmentParams {
  ctx: AnalysisContext
  angleToleranceDegrees: number
}
export class OddAngleTraceSegmentSolver extends SegmentIssueSolver {
  constructor(public params: OddAngleTraceSegmentParams) {
    super(params.ctx)
    if (
      !Number.isFinite(params.angleToleranceDegrees) ||
      params.angleToleranceDegrees < 0 ||
      params.angleToleranceDegrees >= 22.5
    )
      throw new Error("angleToleranceDegrees must be in [0, 22.5)")
  }
  override checkSegment(s: TraceSegment): PcbTraceSegmentOddAngle | undefined {
    const angleDegrees =
      ((Math.atan2(s.end.y - s.start.y, s.end.x - s.start.x) * 180) / Math.PI +
        360) %
      360
    const nearest = Math.round(angleDegrees / 45) * 45
    const deviationDegrees = Math.abs(angleDegrees - nearest)
    if (deviationDegrees <= this.params.angleToleranceDegrees + 1e-10) return
    return {
      ...locateIssue(s, "odd-angle"),
      lineItemType: "PcbTraceSegmentOddAngle",
      angleDegrees,
      nearestAllowedAngleDegrees: nearest % 360,
      deviationDegrees,
      angleToleranceDegrees: this.params.angleToleranceDegrees,
      message:
        s.pcbTraceId +
        " segment " +
        s.startRouteIndex +
        " on " +
        s.layer +
        " is at " +
        angleDegrees.toFixed(3) +
        "° (" +
        deviationDegrees.toFixed(3) +
        "° from a 45° direction)",
    }
  }
  override getConstructorParams(): [OddAngleTraceSegmentParams] {
    return [this.params]
  }
}
