import type { CircuitJson } from "circuit-json"
import arduinoMicro from "../assets/arduino-micro.circuit.json"
import gameboy from "../assets/abse-gameboy.circuit.json"
import flashlight from "../assets/usb-c-flashlight.circuit.json"

export const realBoards = [
  {
    id: "arduino-micro",
    name: "Arduino Micro",
    circuitJson: arduinoMicro as CircuitJson,
    expected: { traces: 145, candidates: 26, issues: 0, strictIssues: 3 },
  },
  {
    id: "abse-gameboy",
    name: "ABSE Game Boy 1.0.16",
    circuitJson: gameboy as CircuitJson,
    expected: { traces: 253, candidates: 217, issues: 0, strictIssues: 4 },
  },
  {
    id: "usb-c-flashlight",
    name: "USB-C flashlight",
    circuitJson: flashlight as CircuitJson,
    expected: { traces: 17, candidates: 4, issues: 0, strictIssues: 0 },
  },
]
