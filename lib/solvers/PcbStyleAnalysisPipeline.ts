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
import { StaircaseTraceSolver } from "./StaircaseTraceSolver"
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
    definePipelineStep(
      "StaircaseTraceSolver",
      StaircaseTraceSolver,
      (p: PcbStyleAnalysisPipeline) => [
        {
          ctx: p.ctx,
          minStaircaseBends: p.options.minStaircaseBends,
          minStaircaseLengthMm: p.options.minStaircaseLengthMm,
          maxStairStepLengthMm: p.options.maxStairStepLengthMm,
        },
      ],
    ),
  ]
  constructor(
    circuitJson: CircuitJson,
    public options: PcbStyleAnalysisOptions = {},
  ) {
    super(circuitJson)
    // Odd-angle selection still requires the length eligibility stage.
    if (options.issueTypes) {
      const oddAngles = options.issueTypes.includes("PcbTraceSegmentOddAngle")
      const staircases = options.issueTypes.includes("PcbTraceStaircase")
      this.pipelineDef = this.pipelineDef.filter((step) =>
        step.solverName === "StaircaseTraceSolver" ? staircases : oddAngles,
      )
    }
    this.MAX_ITERATIONS = circuitJson.reduce(
      (n, e) => n + (e.type === "pcb_trace" ? e.route.length * 5 : 0),
      10,
    )
  }
  override _setup() {
    this.ctx = buildAnalysisContext(this.inputProblem)
  }
  override getOutput(): PcbStyleAnalysisResult {
    return {
      issues: [
        ...(this.getSolver<OddAngleTraceSegmentSolver>(
          "OddAngleTraceSegmentSolver",
        )?.getOutput() ?? []),
        ...(this.getSolver<StaircaseTraceSolver>(
          "StaircaseTraceSolver",
        )?.getOutput() ?? []),
      ],
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
