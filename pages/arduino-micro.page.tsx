import { GenericSolverDebugger } from "@tscircuit/solver-utils/react"
import type { CircuitJson } from "circuit-json"
import { PcbStyleAnalysisPipeline } from "../lib"
import circuitJson from "../tests/assets/arduino-micro.circuit.json"
export default (
  <GenericSolverDebugger
    createSolver={() =>
      new PcbStyleAnalysisPipeline(circuitJson as CircuitJson)
    }
  />
)
