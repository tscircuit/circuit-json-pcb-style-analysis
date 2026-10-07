import type { CircuitJson } from "circuit-json"
import { PcbStyleAnalysisPipeline } from "./solvers/PcbStyleAnalysisPipeline"
import type { PcbStyleAnalysisOptions, PcbStyleAnalysisResult } from "./types"
export function analyzePcbStyle(
  circuitJson: CircuitJson,
  options: PcbStyleAnalysisOptions = {},
): PcbStyleAnalysisResult {
  const solver = new PcbStyleAnalysisPipeline(circuitJson, options)
  solver.solve()
  if (solver.failed)
    throw new Error(solver.error ?? "PCB style analysis failed")
  return solver.getOutput()
}
