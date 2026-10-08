import type {
  AnalysisContext,
  TraceSegment,
  PcbTraceSegmentOddAngle,
} from "../types"
import { visualizeIssues } from "../visualize"
import { locateIssue, SegmentIssueSolver } from "./SegmentIssueSolver"
export interface OddAngleTraceSegmentParams {
  ctx: AnalysisContext
  angleToleranceDegrees: number
  maxSegmentLengthMm: number
  candidateSegments?: TraceSegment[]
}
export class OddAngleTraceSegmentSolver extends SegmentIssueSolver {
  constructor(public params: OddAngleTraceSegmentParams) {
    super({
      ...params.ctx,
      segments: params.candidateSegments ?? params.ctx.segments,
    })
    if (
      !Number.isFinite(params.maxSegmentLengthMm) ||
      params.maxSegmentLengthMm <= 0
    )
      throw new Error("maxSegmentLengthMm must be finite and positive")
    if (
      !Number.isFinite(params.angleToleranceDegrees) ||
      params.angleToleranceDegrees < 0 ||
      params.angleToleranceDegrees >= 22.5
    )
      throw new Error("angleToleranceDegrees must be in [0, 22.5)")
  }
  override checkSegment(s: TraceSegment): PcbTraceSegmentOddAngle | undefined {
    if (s.lengthMm <= this.params.maxSegmentLengthMm) return
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
      maxSegmentLengthMm: this.params.maxSegmentLengthMm,
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
        " is " +
        s.lengthMm.toFixed(3) +
        " mm long (threshold " +
        this.params.maxSegmentLengthMm +
        " mm) and at " +
        angleDegrees.toFixed(3) +
        "°; nearest allowed direction " +
        (nearest % 360) +
        "° (deviation " +
        deviationDegrees.toFixed(3) +
        "°, tolerance " +
        this.params.angleToleranceDegrees +
        "°)",
    }
  }
  override visualize() {
    return visualizeIssues(this.params.ctx, this.issues)
  }
  override getConstructorParams(): [OddAngleTraceSegmentParams] {
    return [this.params]
  }
}
