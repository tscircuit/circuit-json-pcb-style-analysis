#!/usr/bin/env bun
import { readFile, writeFile } from "node:fs/promises"
import { resolve } from "node:path"
import { parseArgs } from "node:util"
import type { CircuitJson } from "circuit-json"
import { analyzePcbStyle } from "./analyze-pcb-style"
import { renderPcbStyleSvg } from "./create-pcb-style-issue-artifacts"

const usage = `Usage: pcb-style-analysis <circuit.json> [options]

Flag long odd-angle runs and repetitive staircase routing.

Options:
  --json                         Print the analysis as JSON
  --svg <file.svg>                Save one overview with all errors highlighted
  --max-segment-length <mm>       Length threshold (default: 5; must be positive)
  --angle-tolerance <degrees>     Angle tolerance (default: 4; range: [0, 22.5))
  --issue-type <rule>             Select odd-angle or staircase (default: both)
  --min-staircase-bends <count>    Minimum alternating bends (default: 6)
  --min-staircase-length <mm>      Minimum staircase length (default: 2)
  --max-stair-step-length <mm>     Maximum merged step length (default: 1)
  -h, --help                     Show this help

Exit codes: 0 = no issues; 1 = style issues found; 2 = input or command error.
`

function threshold(value: string | undefined, fallback: number, name: string) {
  if (value === undefined) return fallback
  const number = Number(value)
  if (!value.trim() || !Number.isFinite(number))
    throw new Error(name + " must be a finite number")
  return number
}

async function main() {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    allowPositionals: true,
    options: {
      help: { type: "boolean", short: "h" },
      json: { type: "boolean" },
      svg: { type: "string" },
      "max-segment-length": { type: "string" },
      "angle-tolerance": { type: "string" },
      "issue-type": { type: "string" },
      "min-staircase-bends": { type: "string" },
      "min-staircase-length": { type: "string" },
      "max-stair-step-length": { type: "string" },
    },
  })
  if (values.help) {
    process.stdout.write(usage)
    return
  }
  if (positionals.length !== 1)
    throw new Error("Provide one Circuit JSON file.\n\n" + usage)
  const inputPath = resolve(positionals[0])
  if (
    values.svg !== undefined &&
    (!values.svg.trim() || resolve(values.svg) === inputPath)
  )
    throw new Error(
      "--svg must name an output file different from the input file",
    )
  const maxSegmentLengthMm = threshold(
    values["max-segment-length"],
    5,
    "--max-segment-length",
  )
  const angleToleranceDegrees = threshold(
    values["angle-tolerance"],
    4,
    "--angle-tolerance",
  )
  if (maxSegmentLengthMm <= 0)
    throw new Error("--max-segment-length must be positive")
  if (angleToleranceDegrees < 0 || angleToleranceDegrees >= 22.5)
    throw new Error("--angle-tolerance must be in [0, 22.5)")
  const input: unknown = JSON.parse(await readFile(inputPath, "utf8"))
  if (
    !Array.isArray(input) ||
    input.some(
      (item) =>
        !item ||
        typeof item !== "object" ||
        typeof item.type !== "string" ||
        (item.type === "pcb_trace" &&
          (!Array.isArray(item.route) ||
            typeof item.pcb_trace_id !== "string")),
    )
  )
    throw new Error(
      "Expected a Circuit JSON array of elements; pcb_trace elements need pcb_trace_id and route",
    )
  const circuitJson = input as CircuitJson
  if (
    values["issue-type"] &&
    !["odd-angle", "staircase"].includes(values["issue-type"])
  )
    throw new Error("--issue-type must be odd-angle or staircase")
  const analysis = analyzePcbStyle(circuitJson, {
    maxSegmentLengthMm,
    angleToleranceDegrees,
    issueTypes:
      values["issue-type"] === "odd-angle"
        ? ["PcbTraceSegmentOddAngle"]
        : values["issue-type"] === "staircase"
          ? ["PcbTraceStaircase"]
          : undefined,
    minStaircaseBends: threshold(
      values["min-staircase-bends"],
      6,
      "--min-staircase-bends",
    ),
    minStaircaseLengthMm: threshold(
      values["min-staircase-length"],
      2,
      "--min-staircase-length",
    ),
    maxStairStepLengthMm: threshold(
      values["max-stair-step-length"],
      1,
      "--max-stair-step-length",
    ),
  })
  if (values.svg) {
    await writeFile(values.svg, renderPcbStyleSvg(circuitJson, analysis.issues))
    process.stderr.write("Saved overview to " + values.svg + "\n")
  }
  if (values.json) {
    process.stdout.write(JSON.stringify(analysis, null, 2) + "\n")
  } else {
    process.stdout.write(
      analysis.issues.length +
        " style issue(s) found in " +
        positionals[0] +
        "\n",
    )
    for (const issue of analysis.issues) {
      process.stdout.write(
        `\n${issue.issueId}: ${issue.message}\n` +
          `  Circuit JSON index ${issue.circuitJsonIndex}, route ${issue.startRouteIndex} → ${issue.endRouteIndex}; ` +
          `(${issue.start.x}, ${issue.start.y}) → (${issue.end.x}, ${issue.end.y}) mm\n`,
      )
    }
  }
  process.exitCode = analysis.issues.length ? 1 : 0
}

main().catch((error: unknown) => {
  process.stderr.write(
    "pcb-style-analysis: " +
      (error instanceof Error ? error.message : String(error)) +
      "\n",
  )
  process.exitCode = 2
})
