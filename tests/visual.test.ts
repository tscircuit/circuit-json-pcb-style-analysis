import { expect, test } from "bun:test"
import { readFileSync, writeFileSync, existsSync } from "node:fs"
import {
  createPcbStyleIssueArtifacts,
  renderPcbStyleSvg,
} from "../lib/create-pcb-style-issue-artifacts"
import { analyzePcbStyle } from "../lib"
import { cases } from "./fixtures/cases"
import arduinoMicro from "./assets/arduino-micro.circuit.json"
import type { CircuitJson } from "circuit-json"
function snapshot(name: string, svg: string) {
  const path = new URL("./__snapshots__/" + name + ".snap.svg", import.meta.url)
  if (process.env.UPDATE_SNAPSHOTS === "1") writeFileSync(path, svg)
  expect(existsSync(path)).toBe(true)
  expect(svg).toBe(readFileSync(path, "utf8"))
}
for (const [name, cj] of Object.entries(cases)) {
  test("visual: " + name, () => {
    const analysis = analyzePcbStyle(cj)
    snapshot(name + "-overview", renderPcbStyleSvg(cj, analysis.issues))
    for (const artifact of createPcbStyleIssueArtifacts(cj, { analysis })) {
      snapshot(
        name + "-" + artifact.fileName.replace(".svg", ""),
        artifact.content,
      )
    }
  })
}
test("visual: Arduino Micro, all 346 located errors", () => {
  const cj = arduinoMicro as CircuitJson
  const analysis = analyzePcbStyle(cj)
  expect(
    analysis.issues.filter((i) => i.lineItemType === "PcbTraceSegmentOddAngle"),
  ).toHaveLength(320)
  expect(
    analysis.issues.filter((i) => i.lineItemType === "PcbTraceSegmentTooLong"),
  ).toHaveLength(26)
  snapshot("arduino-micro-overview", renderPcbStyleSvg(cj, analysis.issues))
  for (const artifact of createPcbStyleIssueArtifacts(cj, { analysis }))
    snapshot(
      "arduino-micro-" + artifact.fileName.replace(".svg", ""),
      artifact.content,
    )
})
