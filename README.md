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

A segment is an error only when **both** conditions hold:

- Its length is **strictly greater than 5 mm**.
- Its direction differs from the nearest multiple of 45° by **more than 4°**.

Long horizontal, vertical, and 45° runs pass. Short segments at arbitrary angles also pass. Exactly the length threshold or angle tolerance passes. Length is the Euclidean distance between adjacent route endpoints, not the sum of the whole trace. Direction reversal and the 360° wraparound work in every quadrant.

`LongTraceSegmentSolver` selects eligible segments without emitting errors. `OddAngleTraceSegmentSolver` examines those candidates and emits one `PcbTraceSegmentOddAngle` per failing segment, including both thresholds and measurements. Thresholds are configurable through `maxSegmentLengthMm` and `angleToleranceDegrees`. The `issueTypes` filter retains the required length stage; an empty array disables analysis.

Wire segments entering/leaving vias or pads are included on the appropriate layer. Layer transitions and pad interiors are excluded. Duplicate or numerically coincident points (≤1e-9 mm) are ignored. Unknown route point types and nonfinite planar coordinates fail clearly. This package accepts already routed Circuit JSON; it never changes the input.

## Solver composition and issue locations

`PcbStyleAnalysisPipeline` extends `BasePipelineSolver` from [tscircuit/solver-utils](https://github.com/tscircuit/solver-utils). Each stage extends `BaseSolver` and examines one segment per step. `definePipelineStep` composes the stages: the first returns length-qualified candidates, and the second produces the final issue list. Candidate selection never appears as a style error. Stage outputs and visualizations are available in `GenericSolverDebugger`.

Every error contains:

- A deterministic `issueId`, `lineItemType`, `severity: "error"`, and readable message.
- `pcbTraceId`, optional source trace/group/subcircuit IDs, and the original `circuitJsonIndex`.
- Original `startRouteIndex` and `endRouteIndex`, layer, endpoints, width, and length in millimeters.
- A midpoint `location` and copper-inclusive `bounds` for highlighting, selecting, and zooming.
- The applied length threshold, measured angle, closest allowed angle, deviation, and tolerance.

IDs remain stable for a fixed input order and are distinct across duplicate trace IDs. These are analysis records, rather than new element types appended to Circuit JSON. A viewer can keep them in its local analysis state.

## Visual verification

`createPcbStyleIssueArtifacts` returns one cropped, self-contained SVG per issue, with that segment highlighted in red, nearby copper as context, exact endpoint coordinates, and a description XML string. Artifacts include `issueIndex`, `issue`, `layer`, `bounds`, `fileName`, `contentType`, and `content`. Rule and layer filters preserve the original analysis indices.

The rendering focuses on routed copper; it does not currently render component bodies, pads, silkscreen, or board outlines. `bounds` and endpoint data also support an overlay on the PCB viewer's complete board rendering.

Visual regression tests commit **one overview snapshot per real board**: Arduino Micro, ABSE Game Boy 1.0.16, and a USB-C flashlight. Each overview highlights every segment satisfying both conditions in red. All three boards pass the default 5 mm / 4° rule, so their overviews show unhighlighted copper and zero errors. There are three snapshots total, with no per-issue or per-layer snapshot files.

The library still supports generating an artifact for every individual issue through `createPcbStyleIssueArtifacts`; this capability is exercised by the real-board artifact regression tests without committing a separate snapshot for every error.

The regression tests exercise complete boards and verify that emitted issues select the original copper and retain original route indices and metadata. They cover the Game Boy's 292 vias and duplicated coordinates at layer transitions, repeated GND trace IDs on the flashlight, configurable tolerance on one Game Boy segment, pipeline stage isolation, and artifact filtering on Arduino Micro's inner layers. The flashlight provides real long horizontal/vertical/45° routes that must pass. Positive issue-location and artifact assertions use unmodified boards with explicitly stricter options: 0.1° tolerance produces three errors on Arduino Micro and four on Game Boy; a 0.1 mm length threshold exercises Arduino inner-layer artifacts. No board coordinates are changed.

The gallery lets you select a real board and layer; each board also has its own step-by-step debugger. See [fixture provenance](tests/assets/README.md) for pinned upstream sources.
```sh
bun install
bun test
bun run typecheck
bun run format:check
bun run build
bun run start          # Cosmos: gallery and three real-board solver debuggers
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

[tscircuit/pcb-trace-linter](https://github.com/tscircuit/pcb-trace-linter) already implements odd-angle analysis over SRJ/Circuit JSON, a solver debugger, and per-issue snapshots. This repo follows its multiples-of-45° and segment-adjacency conventions, with a more forgiving default tolerance of 4°, checking angles only on length-qualified segments with a Circuit JSON native implementation that avoids loading core's renderer/conversion stack.

The schematic reference is [tscircuit/circuit-json-schematic-placement-analysis](https://github.com/tscircuit/circuit-json-schematic-placement-analysis) (without "to"). Its one-rule-per-stage pipeline, typed issues, browser entry, and artifact interface informed this package. [circuit-json-routing-analysis](https://github.com/tscircuit/circuit-json-routing-analysis) addresses routing capacity/congestion rather than these style checks.

Bootstrapped following the [handbook guide](https://github.com/tscircuit/handbook/blob/main/guides/bootstrapping-repos.md): source installation, lib/tests layout, no lockfile, Bun/Biome checks, Cosmos, and solver-utils. The repository declaration is in [tscircuit/create-repo](https://github.com/tscircuit/create-repo).

