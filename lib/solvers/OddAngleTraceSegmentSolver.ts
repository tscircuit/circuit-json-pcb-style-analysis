import type {
  AnalysisContext,
  TraceSegment,
  PcbTraceSegmentOddAngle,
} from "../types"
import { visualizeIssues } from "../visualize"
import { buildTraceRuns } from "../trace-runs"
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
      segments: params.candidateSegments ?? buildTraceRuns(params.ctx),
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
    // A failing run replaces its constituent errors, so subdivision cannot
    // inflate issue counts. Passing approximations never suppress physical errors.
    const covered = new Set<string>()
    for (const segment of this.ctx.segments) {
      if (!segment.constituentSegments || !this.checkSegment(segment)) continue
      for (const part of segment.constituentSegments)
        covered.add(part.circuitJsonIndex + ":" + part.startRouteIndex)
    }
    this.ctx = {
      ...this.ctx,
      segments: this.ctx.segments.filter(
        (s) =>
          s.constituentSegments ||
          !covered.has(s.circuitJsonIndex + ":" + s.startRouteIndex),
      ),
    }
  }
  override checkSegment(s: TraceSegment): PcbTraceSegmentOddAngle | undefined {
    if (s.lengthMm <= this.params.maxSegmentLengthMm) return
    const angleDegrees =
      ((Math.atan2(s.end.y - s.start.y, s.end.x - s.start.x) * 180) / Math.PI +
        360) %
      360
    const nearest = Math.round(angleDegrees / 45) * 45
    const deviationDegrees = Math.abs(angleDegrees - nearest)
    // Approximation of small endpoint bends must not turn an allowed straight
    // segment into an error, especially with very strict angle tolerances.
    const uncertaintyDegrees =
      (Math.atan2(2 * (s.maxCenterlineDeviationMm ?? 0), s.lengthMm) * 180) /
      Math.PI
    if (
      deviationDegrees <=
      this.params.angleToleranceDegrees + uncertaintyDegrees + 1e-10
    )
      return
    return {
      ...locateIssue(s, "odd-angle"),
      lineItemType: "PcbTraceSegmentOddAngle",
      maxSegmentLengthMm: this.params.maxSegmentLengthMm,
      angleDegrees,
      nearestAllowedAngleDegrees: nearest % 360,
      deviationDegrees,
      angleToleranceDegrees: this.params.angleToleranceDegrees,
      ...(s.constituentSegments
        ? { angleUncertaintyDegrees: uncertaintyDegrees }
        : {}),
      message:
        s.pcbTraceId +
        (s.constituentSegments
          ? " run " + s.startRouteIndex + " → " + s.endRouteIndex
          : " segment " + s.startRouteIndex) +
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
        "°" +
        (uncertaintyDegrees
          ? ", approximation allowance " + uncertaintyDegrees.toFixed(3) + "°"
          : "") +
        ")",
    }
  }
  override visualize() {
    return visualizeIssues(this.params.ctx, this.issues)
  }
  override getConstructorParams(): [OddAngleTraceSegmentParams] {
    return [this.params]
  }
}
