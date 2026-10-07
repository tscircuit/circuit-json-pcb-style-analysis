# Real-board fixture provenance

All visual snapshots and debugger examples use these routed boards.

## Arduino Micro

Source: [pcb-trace-linter's routed dataset-srj18 sample003](https://github.com/tscircuit/pcb-trace-linter/blob/4c035f9d40ffb03ba547a08975b5e64b20371123/tests/fixtures/dataset-srj18-sample003.routed.json).
Pinned source blob: `85084cb13ee7498d75e5a1d30a4a0e0fa3248c54`.

The source contains 145 PCB traces, routed with `AutoroutingPipelineSolver9_PreloadedTraceGraph` from `@tscircuit/capacity-autorouter@0.0.928` using default options. Its upstream provenance is documented in [pcb-trace-linter/tests/fixtures/README.md](https://github.com/tscircuit/pcb-trace-linter/blob/4c035f9d40ffb03ba547a08975b5e64b20371123/tests/fixtures/README.md).

The committed Circuit JSON preserves all trace IDs, coordinates, widths, wire points, and vias. SRJ `through_obstacle` is translated to Circuit JSON `through_pad` with `start/end`, `from_layer → start_layer`, and `to_layer → end_layer`. Connection names become source trace IDs. Board/connectivity/obstacle metadata are omitted; this fixture exercises routed copper.

Default result: **320 odd-angle errors and 26 long-segment errors**. The odd-angle count agrees with the original linter.


## ABSE Game Boy 1.0.16 and USB-C flashlight

These are unmodified native Circuit JSON fixtures from `tscircuit/circuit-to-svg`, pinned at commit `6c99c3f6eb78a75efc08163198892c7647a8189b`:

- [ABSE Game Boy](https://github.com/tscircuit/circuit-to-svg/blob/6c99c3f6eb78a75efc08163198892c7647a8189b/tests/pcb/assets/abse-gameboy-1.0.16-pcb.json): 1,515 elements, 253 routed traces, 292 route vias; 217 long-segment errors and 414 odd-angle errors.
- [USB-C flashlight](https://github.com/tscircuit/circuit-to-svg/blob/6c99c3f6eb78a75efc08163198892c7647a8189b/tests/pcb/assets/usb-c-flashlight-core-issue-680.json): 199 elements and 17 routed traces; four long-segment errors and zero odd-angle errors. Repeated GND trace IDs exercise issue disambiguation by Circuit JSON and route indices.

Both fixtures retain all board/component/pad/trace elements and original routing coordinates. No routes are synthesized, altered, or simplified for testing.

SHA-256 digests of the copied source files:

- `abse-gameboy.circuit.json`: `a6f095d4602d0ee2621daba8153203816c8039188144220492fb1b4d6e2275fa`
- `usb-c-flashlight.circuit.json`: `58b59df398e593913614e3d3808f9903098d2d4ea63fa812dd3a93425a47a548`
