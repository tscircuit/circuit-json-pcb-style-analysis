import { GenericSolverDebugger } from "@tscircuit/solver-utils/react"
import { PcbStyleAnalysisPipeline } from "../lib"
import { realBoards } from "../tests/fixtures/real-boards"
export default (
  <GenericSolverDebugger
    createSolver={() =>
      new PcbStyleAnalysisPipeline(
        realBoards.find((b) => b.id === "nema34-controller")!.circuitJson,
      )
    }
  />
)
