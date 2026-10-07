import { GenericSolverDebugger } from "@tscircuit/solver-utils/react"
import { PcbStyleAnalysisPipeline } from "../lib"
import { cases } from "../tests/fixtures/cases"
export default (
  <GenericSolverDebugger
    createSolver={() => new PcbStyleAnalysisPipeline(cases.multiSegment)}
  />
)
