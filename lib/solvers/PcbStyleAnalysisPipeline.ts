import { BasePipelineSolver, definePipelineStep } from "@tscircuit/solver-utils"
import type { PipelineStep } from "@tscircuit/solver-utils"
import type { CircuitJson } from "circuit-json"
import { buildAnalysisContext } from "../segments"
import type {
  AnalysisContext,
  PcbStyleAnalysisOptions,
  PcbStyleAnalysisResult,
} from "../types"
import { visualizeIssues } from "../visualize"
import { LongTraceSegmentSolver } from "./LongTraceSegmentSolver"
import { OddAngleTraceSegmentSolver } from "./OddAngleTraceSegmentSolver"
import type { SegmentIssueSolver } from "./SegmentIssueSolver"
export class PcbStyleAnalysisPipeline extends BasePipelineSolver<CircuitJson> {
  ctx!: AnalysisContext
  pipelineDef: PipelineStep<SegmentIssueSolver>[] = [
    definePipelineStep(
      "LongTraceSegmentSolver",
      LongTraceSegmentSolver,
      (p: PcbStyleAnalysisPipeline) => [
        { ctx: p.ctx, maxSegmentLengthMm: p.options.maxSegmentLengthMm ?? 5 },
      ],
    ),
    definePipelineStep(
      "OddAngleTraceSegmentSolver",
      OddAngleTraceSegmentSolver,
      (p: PcbStyleAnalysisPipeline) => [
        {
          ctx: p.ctx,
          angleToleranceDegrees: p.options.angleToleranceDegrees ?? 0.1,
        },
      ],
    ),
  ]
  constructor(
    circuitJson: CircuitJson,
    public options: PcbStyleAnalysisOptions = {},
  ) {
    super(circuitJson)
    if (options.issueTypes) {
      const names = new Set<string>(
        options.issueTypes.map((type) =>
          type === "PcbTraceSegmentTooLong"
            ? "LongTraceSegmentSolver"
            : "OddAngleTraceSegmentSolver",
        ),
      )
      this.pipelineDef = this.pipelineDef.filter((stage) =>
        names.has(stage.solverName),
      )
    }
    this.MAX_ITERATIONS = circuitJson.reduce(
      (n, e) => n + (e.type === "pcb_trace" ? e.route.length * 2 : 0),
      10,
    )
  }
  override _setup() {
    this.ctx = buildAnalysisContext(this.inputProblem)
  }
  override getOutput(): PcbStyleAnalysisResult {
    return {
      issues: this.pipelineDef.flatMap(
        (stage) =>
          this.getSolver<SegmentIssueSolver>(stage.solverName)?.getOutput() ??
          [],
      ),
    }
  }
  override getConstructorParams(): [CircuitJson, PcbStyleAnalysisOptions] {
    return [this.inputProblem, this.options]
  }
  override initialVisualize() {
    this.setup()
    return visualizeIssues(this.ctx, [])
  }
  override finalVisualize() {
    this.setup()
    return visualizeIssues(this.ctx, this.getOutput().issues)
  }
}
