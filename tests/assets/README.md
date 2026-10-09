# Real-board fixture provenance

All visual snapshots and debugger examples use these routed boards.

## Arduino Micro

Source: [pcb-trace-linter's routed dataset-srj18 sample003](https://github.com/tscircuit/pcb-trace-linter/blob/4c035f9d40ffb03ba547a08975b5e64b20371123/tests/fixtures/dataset-srj18-sample003.routed.json).
Pinned source blob: `85084cb13ee7498d75e5a1d30a4a0e0fa3248c54`.

The source contains 145 PCB traces, routed with `AutoroutingPipelineSolver9_PreloadedTraceGraph` from `@tscircuit/capacity-autorouter@0.0.928` using default options. Its upstream provenance is documented in [pcb-trace-linter/tests/fixtures/README.md](https://github.com/tscircuit/pcb-trace-linter/blob/4c035f9d40ffb03ba547a08975b5e64b20371123/tests/fixtures/README.md).

The committed Circuit JSON preserves all trace IDs, coordinates, widths, wire points, and vias. SRJ `through_obstacle` is translated to Circuit JSON `through_pad` with `start/end`, `from_layer → start_layer`, and `to_layer → end_layer`. Connection names become source trace IDs. Board/connectivity/obstacle metadata are omitted; this fixture exercises routed copper.

Default result: **zero errors** under the combined >5 mm and >4° rule. There are 26 length-qualified candidates, all within 4° of a multiple of 45°. An explicit 0.1° tolerance produces three combined-condition errors on the unchanged board. The original linter's 320 angle-only flags are not this analyzer's combined rule.


## ABSE Game Boy 1.0.16 and USB-C flashlight

These are unmodified native Circuit JSON fixtures from `tscircuit/circuit-to-svg`, pinned at commit `6c99c3f6eb78a75efc08163198892c7647a8189b`:

- [ABSE Game Boy](https://github.com/tscircuit/circuit-to-svg/blob/6c99c3f6eb78a75efc08163198892c7647a8189b/tests/pcb/assets/abse-gameboy-1.0.16-pcb.json): 1,515 elements, 253 routed traces, 292 route vias; 217 length-qualified candidates and zero default errors; an explicit 0.1° tolerance produces four errors.
- [USB-C flashlight](https://github.com/tscircuit/circuit-to-svg/blob/6c99c3f6eb78a75efc08163198892c7647a8189b/tests/pcb/assets/usb-c-flashlight-core-issue-680.json): 199 elements and 17 routed traces; four length-qualified candidates and zero errors, including at a 0° angle tolerance. Repeated GND trace IDs exercise issue disambiguation by Circuit JSON and route indices.

Both fixtures retain all board/component/pad/trace elements and original routing coordinates. No routes are synthesized, altered, or simplified for testing.

SHA-256 digests of the copied source files:

- `abse-gameboy.circuit.json`: `a6f095d4602d0ee2621daba8153203816c8039188144220492fb1b4d6e2275fa`
- `usb-c-flashlight.circuit.json`: `58b59df398e593913614e3d3808f9903098d2d4ea63fa812dd3a93425a47a548`

## RC car controller — positive default-rule example

Source: [tscircuit/core's RC car controller Circuit JSON](https://github.com/tscircuit/core/blob/f959993eea647e752eea96a863a15549e7e0c638/tests/repros/assets/rc-car-schematic-section-title-overlap.circuit.json), pinned at commit `f959993eea647e752eea96a863a15549e7e0c638`. The source group is `CampactRcCarController`, with ESP-12E control, a buck supply, motor driver, and a stackable interface. Although the upstream regression concerns schematic section titles, its fixture includes the complete routed PCB: 1,629 elements, 94 traces, and the original two-layer 56 × 38 mm board.

`rc-car-controller.circuit.json` is copied byte-for-byte from upstream. No coordinates, routes, or analyzer thresholds are changed for the overview snapshot. Of 60 segments longer than 5 mm, two fail the default 4° angle tolerance. Both are consecutive bottom-layer segments of `pcb_trace_3` at original Circuit JSON index 1360:

- Route indices 4 → 5: 24.524681 mm, direction 300.643224°, nearest allowed 315°, deviation 14.356776°.
- Route indices 5 → 6: 20.945704 mm, direction 5.479234°, nearest allowed 0°, deviation 5.479234°.

Both are highlighted in one combined board snapshot. Explicit 0.1° tolerance produces four errors, used by the full-corpus issue-location tests.

SHA-256: `62471a68e76f8bc5f321769e5dcdbf81cccc93bb1103389f32a64a5a6757da54`.

## Published boards from tscircuit.com

See the [14-board survey](published-board-survey.md) and [release/projection provenance](published-boards.provenance.json). The positive default-rule fixtures are `astra/pd-power-supply` (219 traces / 5 errors), `imrishabh18/corne-keyboard` (437 traces / 45 errors), and `techmannih/NEMA-34-Smart-Motor-Mounted-Stepper-Controller` (1,264 traces / 1 error). Each retains every original board and trace record; unrelated element types are omitted, and the index map preserves correspondence to the full published Circuit JSON. No routing coordinates or thresholds are changed.

## AM3352 segmented-run regression

Source: [AM3352 SBC autorouted board, October 8, 2026](https://am3352-sbc-autorouted-20261008.seveibar.chatgpt.site/#file=am3352-sbc.circuit.json), raw asset `/am3352-sbc/circuit.json`.
Fetched source SHA-256: `36725097b67b289636d32d3edc60ff2906357ce9c445e3c66e33ee3389602e3c`.

`am3352-segmented-trace.circuit.json` retains the complete, unmodified trace at original Circuit JSON index 10435 (`protected-earlier:buzz:grid:source_net_12:0`), projected to fixture index 0. All 309 route points and metadata are preserved; other board records are omitted. Route indices 31 → 308 form an 18.397 mm staircase with steps no longer than 0.1 mm. Each step is horizontal, vertical, or 45°, yet the overall direction is 247.938° (22.062° from the nearest allowed direction). This reproduces gaming both the per-segment length threshold and per-segment angle check.

With effective-run analysis, the complete linked AM3352 board reports 44 errors at the default thresholds (the pairwise analyzer reported zero). The projected trace reproduces one of those errors. Existing fixture counts also change: PD power supply has 6 default errors and Corne keyboard has 51; their earlier counts above describe the pairwise baseline. Original routing and historical provenance are unchanged.
