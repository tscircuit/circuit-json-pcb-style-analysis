# Arduino Micro fixture provenance

Source: [pcb-trace-linter's routed dataset-srj18 sample003](https://github.com/tscircuit/pcb-trace-linter/blob/4c035f9d40ffb03ba547a08975b5e64b20371123/tests/fixtures/dataset-srj18-sample003.routed.json).
Pinned source blob: `85084cb13ee7498d75e5a1d30a4a0e0fa3248c54`.

The source contains 145 PCB traces, routed with `AutoroutingPipelineSolver9_PreloadedTraceGraph` from `@tscircuit/capacity-autorouter@0.0.928` using default options. Its upstream provenance is documented in [pcb-trace-linter/tests/fixtures/README.md](https://github.com/tscircuit/pcb-trace-linter/blob/4c035f9d40ffb03ba547a08975b5e64b20371123/tests/fixtures/README.md).

The committed Circuit JSON preserves all trace IDs, coordinates, widths, wire points, and vias. SRJ `through_obstacle` is translated to Circuit JSON `through_pad` with `start/end`, `from_layer → start_layer`, and `to_layer → end_layer`. Connection names become source trace IDs. Board/connectivity/obstacle metadata are omitted; this fixture exercises routed copper.

Default result: **320 odd-angle errors and 26 long-segment errors**. The odd-angle count agrees with the original linter. Synthetic cases separately verify each threshold and traversal edge case.

