# circuit-json-pcb-style-analysis

Located PCB trace style errors, produced by a step-by-step solver pipeline.

```sh
bun add github:tscircuit/circuit-json-pcb-style-analysis
```

```ts
import {
  analyzePcbStyle,
  createPcbStyleIssueArtifacts,
  PcbStyleAnalysisPipeline,
} from "@tscircuit/circuit-json-pcb-style-analysis"

const analysis = analyzePcbStyle(circuitJson)
const artifacts = createPcbStyleIssueArtifacts(circuitJson, { analysis })

// For debugging, stepping, or streaming progress:
const solver = new PcbStyleAnalysisPipeline(circuitJson)
solver.solve()
if (solver.failed) throw new Error(solver.error ?? "Analysis failed")
console.log(solver.getOutput().issues)
```

## Rules

- `LongTraceSegmentSolver` emits `PcbTraceSegmentTooLong` when a planar segment is **strictly longer than 5 mm**. Length is Euclidean distance between adjacent route endpoints, not the sum of the whole trace. Exactly 5 mm passes.
- `OddAngleTraceSegmentSolver` emits `PcbTraceSegmentOddAngle` when the segment's absolute direction differs from the nearest multiple of 45° by more than **0.1°**. Direction reversal and the 360° wraparound work in every quadrant.

Both rules run independently: a long segment at an odd angle produces two errors. Thresholds are configurable through `maxSegmentLengthMm` and `angleToleranceDegrees`. Restrict stages using `issueTypes`; an empty array disables all stages.

Wire segments entering/leaving vias or pads are included on the appropriate layer. Layer transitions and pad interiors are excluded. Duplicate or numerically coincident points (≤1e-9 mm) are ignored. Unknown route point types and nonfinite planar coordinates fail clearly. This package accepts already routed Circuit JSON; it never changes the input.

## Solver composition and issue locations

`PcbStyleAnalysisPipeline` extends `BasePipelineSolver` from [tscircuit/solver-utils](https://github.com/tscircuit/solver-utils). Each rule extends `BaseSolver`, examines one segment per step, and returns its own issue list. `definePipelineStep` composes the stages and the pipeline aggregates their results. Stage outputs and visualizations are available in `GenericSolverDebugger`.

Every error contains:

- A deterministic `issueId`, `lineItemType`, `severity: "error"`, and readable message.
- `pcbTraceId`, optional source trace/group/subcircuit IDs, and the original `circuitJsonIndex`.
- Original `startRouteIndex` and `endRouteIndex`, layer, endpoints, width, and length in millimeters.
- A midpoint `location` and copper-inclusive `bounds` for highlighting, selecting, and zooming.
- The applied limit or measured angle, closest allowed angle, deviation, and tolerance.

IDs remain stable for a fixed input order and are distinct across rules and duplicate trace IDs. These are analysis records, rather than new element types appended to Circuit JSON. A viewer can keep them in its local analysis state.

## Visual verification

`createPcbStyleIssueArtifacts` returns one cropped, self-contained SVG per issue, with that segment highlighted red, nearby copper as context, exact endpoint coordinates, and a description XML string. Artifacts include `issueIndex`, `issue`, `layer`, `bounds`, `fileName`, `contentType`, and `content`. Rule and layer filters preserve the original analysis indices.

The rendering focuses on routed copper; it does not currently render component bodies, pads, silkscreen, or board outlines. `bounds` and endpoint data also support an overlay on the PCB viewer's complete board rendering.

The committed **416 SVG snapshots** cover 32 synthetic cases and a routed Arduino Micro: 320 odd-angle errors plus 26 long-segment errors, each with a detail snapshot. Cases include all quadrants, short/long/diagonal segments, exact length boundaries, duplicate points, bottom copper, vias, pads, and clean examples. The gallery shows overview/detail drawings and JSON. The Arduino Micro debugger supports stepping through the real dataset.

```sh
bun install
bun test
bun run typecheck
bun run format:check
bun run build
bun run start          # Cosmos: gallery and two solver debuggers
bun run build:site
UPDATE_SNAPSHOTS=1 bun test  # explicitly regenerate visual expectations
```

## Future PCB viewer integration

The browser build exports `analyzePcbStyle` and `createPcbStyleIssueArtifacts` from `dist/browser.js`, with no filesystem or DOM access. After publishing to GitHub Packages, a PCB viewer can follow the schematic viewer's loader/dialog pattern:

```ts
const analyzer = await import(
  /* @vite-ignore */ /* webpackIgnore: true */
  "https://jscdn.tscircuit.com/@tscircuit/circuit-json-pcb-style-analysis/latest/dist/browser.js"
)
const artifacts = analyzer.createPcbStyleIssueArtifacts(circuitJson)
```

A **Run Style Analysis** right-click action can load the module on demand, show loading/errors and an empty-result state, then display issue artifacts or overlay `issue.start → issue.end` on `issue.layer`. Use `issue.bounds` to zoom to a selected error. For large boards, analysis can run in a worker. The loader's URL becomes available after the first package release; this change prepares the analyzer API and does not add the PCB viewer menu.

## Existing work and provenance

[tscircuit/pcb-trace-linter](https://github.com/tscircuit/pcb-trace-linter) already implements odd-angle analysis over SRJ/Circuit JSON, a solver debugger, and per-issue snapshots. This repo follows its angle/tolerance and segment-adjacency conventions, adding independent long-segment analysis with a Circuit JSON native implementation that avoids loading core's renderer/conversion stack.

The schematic reference is [tscircuit/circuit-json-schematic-placement-analysis](https://github.com/tscircuit/circuit-json-schematic-placement-analysis) (without "to"). Its one-rule-per-stage pipeline, typed issues, browser entry, and artifact interface informed this package. [circuit-json-routing-analysis](https://github.com/tscircuit/circuit-json-routing-analysis) addresses routing capacity/congestion rather than these style checks.

Bootstrapped following the [handbook guide](https://github.com/tscircuit/handbook/blob/main/guides/bootstrapping-repos.md): source installation, lib/tests layout, no lockfile, Bun/Biome checks, Cosmos, and solver-utils. The repository declaration is in [tscircuit/create-repo](https://github.com/tscircuit/create-repo).

