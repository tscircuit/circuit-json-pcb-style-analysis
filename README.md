# PCB style analysis CLI

Analyze a routed Circuit JSON file for long odd-angle runs and repetitive staircases. The odd-angle rule flags copper **longer than 5 mm AND more than 4° from a multiple of 45°**. The staircase rule independently flags repeated alternating bends, including when every individual step uses an allowed angle.

Length and angle checks also apply to **effective straight runs**. Adding intermediate points, numerical jitter, or tiny stair steps cannot hide a long odd-angle run. The analyzer simplifies connected copper within half the narrowest segment width, measures the resulting chord, and reports the original route range and constituent segments. SVGs highlight those original segments. Trace records, vias, layer changes, and pad interiors remain boundaries; substantial bends remain separate. Physical segment checks are retained so simplification cannot erase an existing error. Approximate runs include an angular uncertainty allowance of `atan2(2 × maximum centerline deviation, chord length)`; exactly collinear subdivisions use the original angle threshold.

`PcbTraceStaircase` findings require at least **6 alternating bends over 2 mm of copper**, between two consistent forward headings 15°–90° apart. Headings match within 4°. Each step must be at most **1 mm after merging co-directed pieces**. Thus subdividing a long step cannot fabricate a staircase or bypass its step-length limit. This rule does not depend on absolute angle, the odd-angle thresholds, or trace width. Ordinary corners, smooth arcs, and backtracking length-tuning meanders do not match this pattern. These findings describe routing style; a replacement route still requires clearance checks.

Traces with explicit length-matching requirements are exempt from both style rules. The analyzer resolves `pcb_trace.source_trace_id` against `source_bus.source_trace_ids` and `length_match_source_trace_ids` when the bus declares `max_length_skew` (including zero), `target_length`, or a nonempty `length_match_source_trace_ids` list. Every PCB trace belonging to those source traces is exempt, while its copper remains visible in SVGs. Bus membership alone, impedance constraints, and maximum/minimum length limits alone do not exempt traces. This exemption does not verify that the length requirement is met.

## Install

Install [Bun](https://bun.sh/docs/installation), then install the CLI from GitHub:

```sh
bun add --global --ignore-scripts github:tscircuit/circuit-json-pcb-style-analysis
```

The CLI runs directly with Bun; no build step or dependency install scripts are needed.

Make sure Bun and Bun's global binary directory (`~/.bun/bin` by default) are on your `PATH`:

```sh
export PATH="$HOME/.bun/bin:$PATH"
pcb-style-analysis --help
```

## Analyze a file

Export your routed board as Circuit JSON, then run:

```sh
pcb-style-analysis board.circuit.json
```

The input must be a JSON array of Circuit JSON elements. The command reports each issue's trace ID, layer, length, angle, original array/route indices, and endpoint coordinates in millimeters.

### Highlight every error in one image

```sh
pcb-style-analysis board.circuit.json --svg board-style.svg
```

Open `board-style.svg` in a browser. It shows the complete routed copper with every failing segment highlighted in red. One overview is generated, including when there are no errors. The input file is unchanged.

### JSON output

```sh
pcb-style-analysis board.circuit.json --json > issues.json
```

The output is `{ "issues": [...] }`. Each issue includes trace and route indices, layer, endpoints, midpoint, bounds, measured length and angle, and the applied thresholds. JSON output and the SVG can be requested together:

```sh
pcb-style-analysis board.circuit.json --json --svg board-style.svg > issues.json
```

### Adjust the thresholds

```sh
pcb-style-analysis board.circuit.json --max-segment-length 10 --angle-tolerance 6
```

This flags only segments longer than 10 mm **and** more than 6° from a multiple of 45°. The length threshold must be positive; angle tolerance must be at least 0° and less than 22.5°. A segment exactly at either threshold passes.

Staircase findings remain enabled when relaxing the odd-angle thresholds. Select a single rule or adjust the staircase thresholds:

```sh
pcb-style-analysis board.circuit.json --issue-type odd-angle
pcb-style-analysis board.circuit.json --issue-type staircase --min-staircase-bends 8 --min-staircase-length 3 --max-stair-step-length 0.5
```

Library callers can select `issueTypes: ["PcbTraceStaircase"]` and set `minStaircaseBends`, `minStaircaseLengthMm`, and `maxStairStepLengthMm`. An empty `issueTypes` array disables all rules.

## Exit codes

| Code | Meaning |
| --- | --- |
| `0` | Analysis completed with no style issues |
| `1` | Analysis completed with style issues; requested JSON/SVG output is still written |
| `2` | Invalid arguments, invalid input, or a file/analysis error |

## Run from a checkout

```sh
git clone https://github.com/tscircuit/circuit-json-pcb-style-analysis.git
cd circuit-json-pcb-style-analysis
bun install
bun lib/cli.ts /path/to/board.circuit.json --svg /path/to/board-style.svg
```

Try a real board included in the repository:

```sh
bun lib/cli.ts tests/assets/pd-power-supply.circuit.json --svg /tmp/pd-style.svg
```

This fixture has eight errors at the default thresholds: six odd-angle findings and two staircases, all highlighted in the single SVG. It exits with code `1`.
