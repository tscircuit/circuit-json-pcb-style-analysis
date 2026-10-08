# Published-board survey

Analyzed the preview Circuit JSON for 14 packages returned by tscircuit.com’s registry trending endpoint. Each release is pinned below; every count uses the default combined rule: segment length >5 mm and deviation >4° from the nearest multiple of 45°.

| Package | Routed traces | Errors | Release ID |
| --- | ---: | ---: | --- |
| [imrishabh18/corne-keyboard](https://tscircuit.com/imrishabh18/corne-keyboard) | 437 | 45 | `50b0e628-724a-4411-afab-30769b377a69` |
| [imrishabh18/nema-23-stepper-controller](https://tscircuit.com/imrishabh18/nema-23-stepper-controller) | 362 | 22 | `ce2edb82-bc7a-4eb3-9cbd-280f173e6dcd` |
| [astra/pd-power-supply](https://tscircuit.com/astra/pd-power-supply) | 219 | 5 | `57387f49-bd91-4277-8a82-706b1575c5ed` |
| [gokul/musegrow](https://tscircuit.com/gokul/musegrow) | 103 | 1 | `9a1b2ca4-b61d-4154-91a2-aba6593c7f8e` |
| [techmannih/NEMA-34-Smart-Motor-Mounted-Stepper-Controller](https://tscircuit.com/techmannih/NEMA-34-Smart-Motor-Mounted-Stepper-Controller) | 1264 | 1 | `52682ce8-441d-4c88-ad7d-81f90324e1f3` |
| [rushabhcodes/ESP32-E-Reader](https://tscircuit.com/rushabhcodes/ESP32-E-Reader) | 228 | 0 | `1e800b88-7611-4255-850a-815a8be9c1a3` |
| [imrishabh18/fitness_watch](https://tscircuit.com/imrishabh18/fitness_watch) | 88 | 0 | `5e8db416-5fc3-4df4-9af8-4460cc990fab` |
| [krishnax12/ip2312-fast-charging-module](https://tscircuit.com/krishnax12/ip2312-fast-charging-module) | 40 | 0 | `60221a81-45a3-4373-8ad2-3a601b51612a` |
| [imrishabh18/rp2040-motor-controller](https://tscircuit.com/imrishabh18/rp2040-motor-controller) | 285 | 0 | `e8d285f7-c3d8-46f5-9a54-344fdde0124e` |
| [krishnax12/watchy-eink-smartwatch](https://tscircuit.com/krishnax12/watchy-eink-smartwatch) | 184 | 0 | `bbfc52b8-29b4-4907-b882-64d5c6415eb3` |
| [techmannih/museview](https://tscircuit.com/techmannih/museview) | 191 | 0 | `4a9f4c39-bcd3-44db-92dc-6550a9615506` |
| [gokul/acoustic-guitar-tuner](https://tscircuit.com/gokul/acoustic-guitar-tuner) | 71 | 0 | `db07d87c-f403-458a-a9ba-7c2e676651d0` |
| [seveibar/f1c100s-linux-dev-board](https://tscircuit.com/seveibar/f1c100s-linux-dev-board) | 245 | 0 | `97a9c4d9-9cae-4ae8-a085-3cdf60a3a8a0` |
| [gokul/usb-hub-board](https://tscircuit.com/gokul/usb-hub-board) | 235 | 0 | `69d85ce4-b11d-4eb9-b4ab-a871824cbdb1` |

The committed positive examples are PD power supply (5 errors), Corne keyboard (45), and NEMA-34 controller (1). Each has one combined overview snapshot showing all default-rule errors. The other positive survey results remain survey data rather than extra snapshots.

The downloaded preview records were analyzed without route changes. The committed fixtures retain every `pcb_board` and `pcb_trace` record in source order, including complete route arrays, widths, coordinates, layer transitions, and IDs. Other records (including 3D meshes, copper pours, schematic data, pads, and silkscreen) are omitted because this analyzer and its copper-only renderer do not consume them. No trace is filtered or simplified.

`tests/assets/published-boards.provenance.json` records pinned release IDs, component paths, source URLs, source element counts, hashes, and a fixture-index → source Circuit JSON index map. The source hash covers the fetched Circuit JSON serialized as UTF-8 with two-space indentation and a trailing newline; the fixture hash covers its compact serialization. Issue route indices remain unchanged, and the index map locates each issue in the original full release.
