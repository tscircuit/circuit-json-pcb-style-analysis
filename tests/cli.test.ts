import { afterAll, expect, test } from "bun:test"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"

const cli = fileURLToPath(new URL("../lib/cli.ts", import.meta.url))
const pd = fileURLToPath(
  new URL("./assets/pd-power-supply.circuit.json", import.meta.url),
)
const flashlight = fileURLToPath(
  new URL("./assets/usb-c-flashlight.circuit.json", import.meta.url),
)
const dir = mkdtempSync(join(tmpdir(), "pcb-style-cli-"))
afterAll(() => rmSync(dir, { recursive: true, force: true }))
const run = (...args: string[]) =>
  spawnSync(process.execPath, [cli, ...args], { encoding: "utf8" })

test("CLI writes clean JSON and one combined PD-board SVG even when style issues set exit code 1", () => {
  const original = readFileSync(pd, "utf8")
  const svg = join(dir, "board overview.svg")
  const result = run(pd, "--json", "--svg", svg)
  expect(result.status).toBe(1)
  const output = JSON.parse(result.stdout)
  expect(output.issues).toHaveLength(6)
  expect(output.issues[0]).toMatchObject({
    issueId: "odd-angle:4:4",
    pcbTraceId: "pcb_trace_3",
    layer: "bottom",
    circuitJsonIndex: 4,
    startRouteIndex: 4,
    endRouteIndex: 5,
    maxSegmentLengthMm: 5,
    angleToleranceDegrees: 4,
    start: { x: 5, y: 20.5 },
    end: { x: 17, y: 18 },
  })
  expect(result.stderr).toContain("Saved overview to")
  expect(
    readFileSync(svg, "utf8").match(/<line[^>]*stroke="#ff5555"/g),
  ).toHaveLength(7)
  expect(readFileSync(pd, "utf8")).toBe(original)
  const text = run(pd)
  expect(text.status).toBe(1)
  expect(text.stdout).toContain("6 style issue(s)")
  expect(text.stdout).toContain("Circuit JSON index 4, route 4 → 5")
  expect(text.stdout).toContain("(5, 20.5) → (17, 18) mm")
})

test("CLI accepts the real flashlight and applies configurable thresholds to the PD board", () => {
  const svg = join(dir, "clean.svg")
  const clean = run(flashlight, "--json", "--svg", svg)
  expect(clean.status).toBe(0)
  expect(JSON.parse(clean.stdout)).toEqual({ issues: [] })
  expect(readFileSync(svg, "utf8")).not.toContain('stroke="#ff5555"')
  const relaxed = run(
    pd,
    "--json",
    "--max-segment-length",
    "20",
    "--angle-tolerance",
    "6",
  )
  expect(relaxed.status).toBe(0)
  expect(JSON.parse(relaxed.stdout)).toEqual({ issues: [] })
})

test("CLI reports argument errors separately and refuses to replace the input with an SVG", () => {
  const help = run("--help")
  expect(help.status).toBe(0)
  expect(help.stdout).toContain("Usage: pcb-style-analysis")
  const original = readFileSync(pd, "utf8")
  for (const args of [
    [],
    [pd, "--unknown"],
    [pd, "--max-segment-length", "NaN"],
    [pd, "--max-segment-length", "0"],
    [pd, "--angle-tolerance", "22.5"],
    [pd, "--svg", pd],
  ]) {
    const result = run(...args)
    expect(result.status).toBe(2)
    expect(result.stdout).toBe("")
    expect(result.stderr).toContain("pcb-style-analysis:")
  }
  expect(readFileSync(pd, "utf8")).toBe(original)
})

test("CLI rejects unreadable files, malformed JSON, and non-array input without emitting analysis JSON", () => {
  const malformed = join(dir, "malformed.json")
  const wrapped = join(dir, "wrapped.json")
  writeFileSync(malformed, "{")
  writeFileSync(
    wrapped,
    JSON.stringify({ circuitJson: JSON.parse(readFileSync(pd, "utf8")) }),
  )
  for (const input of [join(dir, "missing.json"), malformed, wrapped]) {
    const result = run(input, "--json")
    expect(result.status).toBe(2)
    expect(result.stdout).toBe("")
    expect(result.stderr).toContain("pcb-style-analysis:")
  }
})
