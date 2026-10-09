import { getConnectedTraceSegments } from "../trace-runs"
import type { AnalysisContext, PcbTraceStaircase, TraceSegment } from "../types"
import { visualizeIssues } from "../visualize"
import { locateIssue, SegmentIssueSolver } from "./SegmentIssueSolver"

export interface StaircaseTraceParams {
  ctx: AnalysisContext
  minStaircaseBends?: number
  minStaircaseLengthMm?: number
  maxStairStepLengthMm?: number
}
type Step = {
  direction: number
  parts: TraceSegment[]
  lengthMm: number
}

function direction(s: TraceSegment): number {
  const angle =
    ((Math.atan2(s.end.y - s.start.y, s.end.x - s.start.x) * 180) / Math.PI +
      360) %
    360
  return angle
}
function angleDistance(a: number, b: number): number {
  return Math.abs(((a - b + 540) % 360) - 180)
}

/** Repeated alternating forward bends are a style issue at any absolute angle. */
export class StaircaseTraceSolver extends SegmentIssueSolver {
  private bendCounts = new Map<TraceSegment, number>()
  constructor(public params: StaircaseTraceParams) {
    super({ ...params.ctx, segments: [] })
    const minBends = params.minStaircaseBends ?? 6
    const minLength = params.minStaircaseLengthMm ?? 2
    const maxStep = params.maxStairStepLengthMm ?? 1
    if (!Number.isInteger(minBends) || minBends < 2)
      throw new Error("minStaircaseBends must be an integer of at least 2")
    if (!Number.isFinite(minLength) || minLength <= 0)
      throw new Error("minStaircaseLengthMm must be finite and positive")
    if (!Number.isFinite(maxStep) || maxStep <= 0)
      throw new Error("maxStairStepLengthMm must be finite and positive")

    const candidates: TraceSegment[] = []
    for (const chain of getConnectedTraceSegments(params.ctx)) {
      const steps: Step[] = []
      for (const s of chain) {
        const heading = direction(s)
        const last = steps.at(-1)
        // Redundant points cannot fabricate extra bends or shorten long steps.
        if (last && angleDistance(last.direction, heading) <= 4 + 1e-10) {
          last.parts.push(s)
          last.lengthMm += s.lengthMm
        } else
          steps.push({ direction: heading, parts: [s], lengthMm: s.lengthMm })
      }
      for (let i = 0; i < steps.length - 1; ) {
        const a = steps[i],
          b = steps[i + 1]
        const difference = angleDistance(a.direction, b.direction)
        if (
          difference < 15 - 1e-10 ||
          difference > 90 + 1e-10 ||
          a.lengthMm > maxStep + 1e-9 ||
          b.lengthMm > maxStep + 1e-9
        ) {
          i++
          continue
        }
        let end = i + 2
        while (
          end < steps.length &&
          angleDistance(
            steps[end].direction,
            steps[i + ((end - i) % 2)].direction,
          ) <=
            4 + 1e-10 &&
          steps[end].lengthMm <= maxStep + 1e-9
        )
          end++
        const parts = steps.slice(i, end).flatMap((s) => s.parts)
        const lengthMm = parts.reduce((n, s) => n + s.lengthMm, 0)
        if (end - i - 1 >= minBends && lengthMm + 1e-9 >= minLength) {
          const candidate = {
            ...parts[0],
            end: parts.at(-1)!.end,
            endRouteIndex: parts.at(-1)!.endRouteIndex,
            width: parts.reduce((width, s) => Math.max(width, s.width), 0),
            lengthMm,
            constituentSegments: parts,
          }
          candidates.push(candidate)
          this.bendCounts.set(candidate, end - i - 1)
          i = end
        } else i = end - 1
      }
    }
    this.ctx = { ...params.ctx, segments: candidates }
    this.MAX_ITERATIONS = candidates.length + 2
  }
  override checkSegment(s: TraceSegment): PcbTraceStaircase {
    const bendCount = this.bendCounts.get(s)!
    return {
      ...locateIssue(s, "staircase"),
      lineItemType: "PcbTraceStaircase",
      bendCount,
      minStaircaseBends: this.params.minStaircaseBends ?? 6,
      minStaircaseLengthMm: this.params.minStaircaseLengthMm ?? 2,
      maxStairStepLengthMm: this.params.maxStairStepLengthMm ?? 1,
      message: `${s.pcbTraceId} route ${s.startRouteIndex} → ${s.endRouteIndex} on ${s.layer} has ${bendCount} alternating staircase bends over ${s.lengthMm.toFixed(3)} mm`,
    }
  }
  override visualize() {
    return visualizeIssues(this.params.ctx, this.issues)
  }
  override getConstructorParams(): [StaircaseTraceParams] {
    return [this.params]
  }
}
