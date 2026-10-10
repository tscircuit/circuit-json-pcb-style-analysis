import type { PcbTraceRoutePoint } from "circuit-json"
import type { AnalysisContext, Point, TraceSegment } from "./types"

function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lengthSquared = dx * dx + dy * dy
  const t = lengthSquared
    ? Math.max(
        0,
        Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSquared),
      )
    : 0
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy)
}

/** Measure sub-width staircases as straight runs, retaining every original wire. */
export function buildTraceRuns(ctx: AnalysisContext): TraceSegment[] {
  const runs: TraceSegment[] = []
  const simplify = (segments: TraceSegment[]) => {
    // Iterative Ramer-Douglas-Peucker avoids stack overflow on dense AI routes.
    const pending: [number, number][] = [[0, segments.length - 1]]
    while (pending.length) {
      const [lo, hi] = pending.pop()!
      if (lo === hi) continue // Already represented by a physical segment.
      const start = segments[lo].start
      const end = segments[hi].end
      let width = Infinity
      let maxDistance = -1
      let split = lo
      for (let i = lo; i <= hi; i++) {
        width = Math.min(width, segments[i].width)
        if (i === hi) continue
        const distance = distanceToSegment(segments[i].end, start, end)
        if (distance > maxDistance) {
          maxDistance = distance
          split = i
        }
      }
      if (maxDistance > width / 2 + 1e-9) {
        pending.push([split + 1, hi], [lo, split])
        continue
      }
      const constituentSegments = segments.slice(lo, hi + 1)
      runs.push({
        ...segments[lo],
        endRouteIndex: segments[hi].endRouteIndex,
        end,
        width: constituentSegments.reduce(
          (max, s) => Math.max(max, s.width),
          0,
        ),
        lengthMm: Math.hypot(end.x - start.x, end.y - start.y),
        constituentSegments,
        maxCenterlineDeviationMm: maxDistance <= 1e-9 ? 0 : maxDistance,
      })
    }
  }
  for (const connected of getConnectedTraceSegments(ctx)) simplify(connected)
  // Keep physical candidates too: approximation must never hide an existing error.
  return [...ctx.segments.filter((s) => !isLengthMatchedTrace(ctx, s)), ...runs]
}

export function isLengthMatchedTrace(
  ctx: AnalysisContext,
  segment: TraceSegment,
): boolean {
  return (
    segment.sourceTraceId !== undefined &&
    (ctx.lengthMatchedSourceTraceIds?.has(segment.sourceTraceId) ?? false)
  )
}

/** Physical wire chains, separated by trace records, vias, pads, and layer changes. */
export function getConnectedTraceSegments(
  ctx: AnalysisContext,
): TraceSegment[][] {
  const chains: TraceSegment[][] = []
  let connected: TraceSegment[] = []
  for (const segment of ctx.segments) {
    if (isLengthMatchedTrace(ctx, segment)) {
      if (connected.length) chains.push(connected)
      connected = []
      continue
    }
    const previous = connected.at(-1)
    if (previous) {
      const trace = ctx.circuitJson[segment.circuitJsonIndex]
      const sameTrace = previous.circuitJsonIndex === segment.circuitJsonIndex
      // Only wire points (including duplicate coordinates) may join runs.
      // Vias, through-pad interiors, layer changes, and trace records are boundaries.
      const wireJoin =
        sameTrace &&
        trace.type === "pcb_trace" &&
        trace.route
          .slice(previous.endRouteIndex, segment.startRouteIndex + 1)
          .every(
            (p: PcbTraceRoutePoint) =>
              p.route_type === "wire" && p.layer === segment.layer,
          )
      if (
        !wireJoin ||
        previous.layer !== segment.layer ||
        Math.hypot(
          previous.end.x - segment.start.x,
          previous.end.y - segment.start.y,
        ) > 1e-9
      ) {
        chains.push(connected)
        connected = []
      }
    }
    connected.push(segment)
  }
  if (connected.length) chains.push(connected)
  return chains
}
