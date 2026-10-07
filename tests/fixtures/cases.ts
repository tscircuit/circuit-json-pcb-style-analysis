import type { CircuitJson, PcbTraceRoutePoint } from "circuit-json"
export const wire = (
  x: number,
  y: number,
  layer = "top",
): PcbTraceRoutePoint => ({
  route_type: "wire",
  x,
  y,
  width: 0.2,
  layer: layer as "top",
})
export function trace(
  route: PcbTraceRoutePoint[],
  id = "pcb_trace_1",
): CircuitJson {
  return [
    {
      type: "pcb_trace",
      pcb_trace_id: id,
      source_trace_id: "source_trace_1",
      route,
    },
  ]
}
export const cases: Record<string, CircuitJson> = {
  horizontalLong: trace([wire(0, 0), wire(8, 0)]),
  verticalLong: trace([wire(0, 0), wire(0, 8)]),
  diagonalLong: trace([wire(0, 0), wire(4, 4)]),
  negativeLong: trace([wire(0, 0), wire(-8, 0)]),
  exactFive: trace([wire(0, 0), wire(3, 4)]),
  justOverFive: trace([wire(0, 0), wire(5.000001, 0)]),
  oddShort: trace([wire(0, 0), wire(2, 1)]),
  oddLong: trace([wire(0, 0), wire(8, 2)]),
  reversedOdd: trace([wire(2, 1), wire(0, 0)]),
  multiSegment: trace([wire(0, 0), wire(8, 0), wire(10, 1), wire(10, 8)]),
  bottom: trace([wire(0, 0, "bottom"), wire(-6, 2, "bottom")]),
  duplicatePoint: trace([wire(0, 0), wire(0, 0), wire(2, 1)]),
  via: trace([
    wire(0, 0),
    { route_type: "via", x: 8, y: 1, from_layer: "top", to_layer: "bottom" },
    wire(10, 3, "bottom"),
  ]),
  pad: trace([
    wire(0, 0),
    {
      route_type: "through_pad",
      start: { x: 6, y: 1 },
      end: { x: 8, y: 1 },
      width: 1,
      start_layer: "top",
      end_layer: "top",
    },
    wire(10, 2),
  ]),
  clean: trace([wire(0, 0), wire(2, 0), wire(4, 2), wire(4, 4)]),
  longTotalShortSegments: trace([wire(0, 0), wire(4, 0), wire(8, 0)]),
}
for (const angle of [
  15, 30, 60, 75, 105, 120, 150, 165, 195, 210, 240, 255, 285, 300, 330, 345,
]) {
  const radians = (angle * Math.PI) / 180
  cases["angle" + angle] = trace([
    wire(-1, -2),
    wire(-1 + 3 * Math.cos(radians), -2 + 3 * Math.sin(radians)),
  ])
}
