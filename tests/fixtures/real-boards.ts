import type { CircuitJson } from "circuit-json"
import arduinoMicro from "../assets/arduino-micro.circuit.json"
import gameboy from "../assets/abse-gameboy.circuit.json"
import rcCar from "../assets/rc-car-controller.circuit.json"
import pdPowerSupply from "../assets/pd-power-supply.circuit.json"
import corneKeyboard from "../assets/corne-keyboard.circuit.json"
import nema34 from "../assets/nema34-controller.circuit.json"
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
  {
    id: "rc-car-controller",
    name: "RC car controller",
    circuitJson: rcCar as CircuitJson,
    expected: { traces: 94, candidates: 60, issues: 2, strictIssues: 4 },
  },
  {
    id: "pd-power-supply",
    name: "PD power supply",
    circuitJson: pdPowerSupply as CircuitJson,
    expected: { traces: 219, candidates: 87, issues: 5, strictIssues: 23 },
  },
  {
    id: "corne-keyboard",
    name: "Corne keyboard",
    circuitJson: corneKeyboard as CircuitJson,
    expected: { traces: 437, candidates: 359, issues: 45, strictIssues: 147 },
  },
  {
    id: "nema34-controller",
    name: "NEMA-34 controller",
    circuitJson: nema34 as CircuitJson,
    expected: { traces: 1264, candidates: 360, issues: 1, strictIssues: 1 },
  },
]
