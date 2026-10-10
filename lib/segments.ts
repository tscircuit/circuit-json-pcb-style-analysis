import type { CircuitJson, PcbTraceRoutePoint } from "circuit-json"
import type { AnalysisContext, Point, TraceSegment } from "./types"
function endpoint(p: PcbTraceRoutePoint, outgoing: boolean): Point {
  if (p.route_type === "through_pad") return outgoing ? p.end : p.start
  return { x: p.x, y: p.y }
}
function layer(p: PcbTraceRoutePoint, outgoing: boolean): string {
  if (p.route_type === "wire") return p.layer
  if (p.route_type === "via") return outgoing ? p.to_layer : p.from_layer
  return outgoing ? p.end_layer : p.start_layer
}
/** Enumerate physical planar wires without bridging layer changes or pad interiors. */
export function buildAnalysisContext(
  circuitJson: CircuitJson,
): AnalysisContext {
  const lengthMatchedSourceTraceIds = new Set<string>()
  for (const item of circuitJson) {
    if (item.type !== "source_bus") continue
    if (
      item.max_length_skew === undefined &&
      item.target_length === undefined &&
      !item.length_match_source_trace_ids?.length
    )
      continue
    for (const id of item.source_trace_ids) lengthMatchedSourceTraceIds.add(id)
    for (const id of item.length_match_source_trace_ids ?? [])
      lengthMatchedSourceTraceIds.add(id)
  }
  const segments: TraceSegment[] = []
  for (const [circuitJsonIndex, item] of circuitJson.entries()) {
    if (item.type !== "pcb_trace") continue
    for (let i = 0; i < item.route.length - 1; i++) {
      const a = item.route[i]
      const b = item.route[i + 1]
      const supported = (p: PcbTraceRoutePoint) =>
        ["wire", "via", "through_pad"].includes(p.route_type)
      if (!supported(a) || !supported(b))
        throw new Error(item.pcb_trace_id + ": unsupported route point at " + i)
      if (a.route_type !== "wire" && b.route_type !== "wire") continue
      if (layer(a, true) !== layer(b, false)) continue
      const start = endpoint(a, true)
      const end = endpoint(b, false)
      if (![start.x, start.y, end.x, end.y].every(Number.isFinite))
        throw new Error(
          item.pcb_trace_id + ": nonfinite route coordinates at " + i,
        )
      const lengthMm = Math.hypot(end.x - start.x, end.y - start.y)
      if (lengthMm <= 1e-9) continue
      const wire = a.route_type === "wire" ? a : b
      const width =
        wire.route_type === "wire"
          ? Math.max(wire.width, wire.end_width ?? wire.width)
          : 0
      if (!Number.isFinite(width) || width <= 0)
        throw new Error(item.pcb_trace_id + ": invalid wire width at " + i)
      segments.push({
        pcbTraceId: item.pcb_trace_id,
        sourceTraceId: item.source_trace_id,
        pcbGroupId: item.pcb_group_id,
        subcircuitId: item.subcircuit_id,
        circuitJsonIndex,
        startRouteIndex: i,
        endRouteIndex: i + 1,
        layer: layer(a, true),
        start: { ...start },
        end: { ...end },
        width,
        lengthMm,
      })
    }
  }
  return { circuitJson, segments, lengthMatchedSourceTraceIds }
}
