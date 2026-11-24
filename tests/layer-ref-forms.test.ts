import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { analyzePcbStyle } from "../lib"
import { buildAnalysisContext } from "../lib/segments"

// circuit-json accepts each layer reference as a plain string ("top") or as
// an object ({ name: "top" }); zod normalizes objects to strings. Analyzed
// input is raw parsed JSON, so both forms must behave identically. In a real
// JSON file every object is a distinct instance, which these round-trips reproduce.
function roundTrip(circuitJson: unknown): CircuitJson {
  return JSON.parse(JSON.stringify(circuitJson)) as CircuitJson
}

/** Rewrite every layer reference in the circuit to its object form. */
function objectFormLayers(circuitJson: unknown): unknown {
  return JSON.parse(
    JSON.stringify(circuitJson, (key, value) =>
      ["layer", "from_layer", "to_layer", "start_layer", "end_layer"].includes(
        key,
      ) && typeof value === "string"
        ? { name: value }
        : value,
    ),
  )
}

function longOddAngleBoard() {
  return [
    {
      type: "pcb_trace",
      pcb_trace_id: "trace",
      source_trace_id: "source",
      route: [
        { route_type: "wire", x: 0, y: 0, width: 0.2, layer: "top" },
        { route_type: "wire", x: 12, y: 4, width: 0.2, layer: "top" },
      ],
    },
  ]
}

test("object-form wire layers produce the same odd-angle analysis as strings", () => {
  const stringForm = analyzePcbStyle(roundTrip(longOddAngleBoard()))
  const objectForm = analyzePcbStyle(
    roundTrip(objectFormLayers(longOddAngleBoard())),
  )
  expect(stringForm.issues).toHaveLength(1)
  expect(objectForm.issues).toEqual(stringForm.issues)
})

test("object-form layers do not drop segments from the analysis context", () => {
  const ctx = buildAnalysisContext(
    roundTrip(objectFormLayers(longOddAngleBoard())),
  )
  expect(ctx.segments).toHaveLength(1)
  expect(ctx.segments[0].layer).toBe("top")
})

test("object-form via and wire layers connect segments identically across a layer change", () => {
  const board = [
    {
      type: "pcb_trace",
      pcb_trace_id: "trace",
      route: [
        { route_type: "wire", x: 0, y: 0, width: 0.2, layer: "top" },
        { route_type: "wire", x: 3, y: 1, width: 0.2, layer: "top" },
        {
          route_type: "via",
          x: 3,
          y: 1,
          from_layer: "top",
          to_layer: "bottom",
        },
        { route_type: "wire", x: 3, y: 1, width: 0.2, layer: "bottom" },
        { route_type: "wire", x: 12, y: 4, width: 0.2, layer: "bottom" },
      ],
    },
  ]
  const objectForm = buildAnalysisContext(roundTrip(objectFormLayers(board)))
  const stringForm = buildAnalysisContext(roundTrip(board))
  expect(objectForm.segments.length).toBeGreaterThan(0)
  expect(objectForm.segments).toEqual(stringForm.segments)
})

test("object-form layers produce the same staircase analysis as strings", () => {
  const staircase = () => {
    const route = [{ route_type: "wire", x: 0, y: 0, width: 0.2, layer: "top" }]
    let x = 0
    let y = 0
    for (let i = 0; i < 10; i++) {
      const heading = ((i % 2 === 0 ? 0 : 45) * Math.PI) / 180
      x += 0.5 * Math.cos(heading)
      y += 0.5 * Math.sin(heading)
      route.push({ route_type: "wire", x, y, width: 0.2, layer: "top" })
    }
    return [{ type: "pcb_trace", pcb_trace_id: "trace", route }]
  }
  const stringForm = analyzePcbStyle(roundTrip(staircase()))
  const objectForm = analyzePcbStyle(roundTrip(objectFormLayers(staircase())))
  expect(stringForm.issues.length).toBeGreaterThan(0)
  expect(objectForm.issues).toEqual(stringForm.issues)
})
