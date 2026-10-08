import type { CircuitJson } from "circuit-json"
import { GenericSolverDebugger } from "@tscircuit/solver-utils/react"
import { PcbStyleAnalysisPipeline } from "../lib"
import am3352 from "../tests/assets/am3352-segmented-trace.circuit.json"

export default (
  <GenericSolverDebugger
    createSolver={() => new PcbStyleAnalysisPipeline(am3352 as CircuitJson)}
  />
)
