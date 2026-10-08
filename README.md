# PCB style analysis CLI

Analyze a routed Circuit JSON file. A segment is flagged only when it is **longer than 5 mm AND more than 4° from a multiple of 45°**. Horizontal, vertical, and 45° traces pass regardless of length. Short segments at odd angles also pass.

Length and angle checks also apply to **effective straight runs**. Adding intermediate points, numerical jitter, or tiny stair steps cannot hide a long odd-angle run. The analyzer simplifies connected copper within half the narrowest segment width, measures the resulting chord, and reports the original route range and constituent segments. SVGs highlight those original segments. Trace records, vias, layer changes, and pad interiors remain boundaries; substantial bends remain separate. Physical segment checks are retained so simplification cannot erase an existing error. Approximate runs include an angular uncertainty allowance of `atan2(2 × maximum centerline deviation, chord length)`; exactly collinear subdivisions use the original angle threshold.

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

This fixture has six errors at the default thresholds, including a subdivided straight run, all highlighted in the single SVG, and exits with code `1`.
