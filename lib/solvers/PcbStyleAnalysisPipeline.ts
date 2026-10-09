import {
  BaseSolver,
  BasePipelineSolver,
  definePipelineStep,
} from "@tscircuit/solver-utils"
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
export class PcbStyleAnalysisPipeline extends BasePipelineSolver<CircuitJson> {
  ctx!: AnalysisContext
  pipelineDef: PipelineStep<BaseSolver>[] = [
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
          candidateSegments: p
            .getSolver<LongTraceSegmentSolver>("LongTraceSegmentSolver")!
            .getOutput(),
          maxSegmentLengthMm: p.options.maxSegmentLengthMm ?? 5,
          angleToleranceDegrees: p.options.angleToleranceDegrees ?? 4,
        },
      ],
    ),
  ]
  constructor(
    circuitJson: CircuitJson,
    public options: PcbStyleAnalysisOptions = {},
  ) {
    super(circuitJson)
    // Selecting the issue type still requires the length eligibility stage.
    if (
      options.issueTypes &&
      !options.issueTypes.includes("PcbTraceSegmentOddAngle")
    )
      this.pipelineDef = []
    this.MAX_ITERATIONS = circuitJson.reduce(
      (n, e) => n + (e.type === "pcb_trace" ? e.route.length * 4 : 0),
      10,
    )
  }
  override _setup() {
    this.ctx = buildAnalysisContext(this.inputProblem)
  }
  override getOutput(): PcbStyleAnalysisResult {
    return {
      issues:
        this.getSolver<OddAngleTraceSegmentSolver>(
          "OddAngleTraceSegmentSolver",
        )?.getOutput() ?? [],
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
