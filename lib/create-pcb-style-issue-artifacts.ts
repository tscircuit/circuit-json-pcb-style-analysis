import type { CircuitJson } from "circuit-json"
import { analyzePcbStyle } from "./analyze-pcb-style"
import { buildAnalysisContext } from "./segments"
import { getIssueHighlights } from "./issue-highlights"
import type {
  Bounds,
  PcbStyleAnalysisOptions,
  PcbStyleAnalysisResult,
  PcbStyleIssue,
} from "./types"

export interface PcbStyleIssueArtifact {
  issueIndex: number
  issue: PcbStyleIssue
  layer: string
  bounds: Bounds
  descriptionXml: string
  fileName: string
  contentType: "image/svg+xml"
  content: string
}
export interface PcbStyleIssueArtifactOptions extends PcbStyleAnalysisOptions {
  /** Reuse analysis of the same input. Filtering retains original issue indices. */
  analysis?: PcbStyleAnalysisResult
  layer?: string
}
export function escapeXml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[c]!,
  )
}
export function describeIssueXml(issue: PcbStyleIssue): string {
  return (
    "<" +
    issue.lineItemType +
    ' severity="error" pcbTraceId="' +
    escapeXml(issue.pcbTraceId) +
    '" startRouteIndex="' +
    issue.startRouteIndex +
    '" endRouteIndex="' +
    issue.endRouteIndex +
    '" layer="' +
    escapeXml(issue.layer) +
    '" x="' +
    issue.location.x +
    '" y="' +
    issue.location.y +
    '" lengthMm="' +
    issue.lengthMm +
    '" message="' +
    escapeXml(issue.message) +
    '" />'
  )
}
/** Browser-safe, self-contained vector drawing. Context is muted; selected issues are colored by rule. */
export function renderPcbStyleSvg(
  circuitJson: CircuitJson,
  issues: PcbStyleIssue[],
  options: { bounds?: Bounds; layer?: string; title?: string } = {},
): string {
  const ctx = buildAnalysisContext(circuitJson)
  const segments = ctx.segments.filter(
    (s) => !options.layer || s.layer === options.layer,
  )
  const points = segments.flatMap((s) => [s.start, s.end])
  const bounds = options.bounds ?? {
    minX: Math.min(0, ...points.map((p) => p.x)) - 2,
    minY: Math.min(0, ...points.map((p) => p.y)) - 2,
    maxX: Math.max(0, ...points.map((p) => p.x)) + 2,
    maxY: Math.max(0, ...points.map((p) => p.y)) + 2,
  }
  const scale = Math.min(
    740 / Math.max(1, bounds.maxX - bounds.minX),
    350 / Math.max(1, bounds.maxY - bounds.minY),
  )
  const cx = (bounds.minX + bounds.maxX) / 2
  const cy = (bounds.minY + bounds.maxY) / 2
  const x = (n: number) => Number((400 + (n - cx) * scale).toFixed(4))
  const y = (n: number) => Number((215 - (n - cy) * scale).toFixed(4))
  const line = (
    s: {
      start: { x: number; y: number }
      end: { x: number; y: number }
      width: number
    },
    color: string,
    highlight = false,
  ) =>
    '<line x1="' +
    x(s.start.x) +
    '" y1="' +
    y(s.start.y) +
    '" x2="' +
    x(s.end.x) +
    '" y2="' +
    y(s.end.y) +
    '" stroke="' +
    color +
    '" stroke-width="' +
    Number(
      Math.max(
        highlight ? 4 : 1,
        s.width * scale * (highlight ? 1.8 : 1),
      ).toFixed(4),
    ) +
    '" stroke-linecap="round"/>'
  const context = segments
    .filter(
      (s) =>
        Math.max(s.start.x, s.end.x) + s.width >= bounds.minX &&
        Math.min(s.start.x, s.end.x) - s.width <= bounds.maxX &&
        Math.max(s.start.y, s.end.y) + s.width >= bounds.minY &&
        Math.min(s.start.y, s.end.y) - s.width <= bounds.maxY,
    )
    .map((s) => line(s, s.layer === "bottom" ? "#74a9d8" : "#9aa9a2"))
    .join("")
  const individual = options.bounds !== undefined && issues.length === 1
  const highlights = getIssueHighlights(issues)
    .map(
      ({ issue: s, color }, i) =>
        (s.constituentSegments ?? [s])
          .map((part) => line(part, color, true))
          .join("") +
        (individual
          ? '<circle cx="' +
            x(s.location.x) +
            '" cy="' +
            y(s.location.y) +
            '" r="10" fill="#fff" stroke="' +
            color +
            '" stroke-width="2"/>' +
            '<text x="' +
            x(s.location.x) +
            '" y="' +
            (y(s.location.y) + 4) +
            '" text-anchor="middle" fill="#9b1111" font-size="11">' +
            (i + 1) +
            "</text>"
          : ""),
    )
    .join("")
  const title =
    options.title ?? "PCB style analysis — " + issues.length + " errors"
  const details = individual
    ? [
        issues[0].message,
        "Start (" +
          issues[0].start.x.toFixed(3) +
          ", " +
          issues[0].start.y.toFixed(3) +
          ") → End (" +
          issues[0].end.x.toFixed(3) +
          ", " +
          issues[0].end.y.toFixed(3) +
          ") mm",
        "Layer: " +
          issues[0].layer +
          " | Circuit JSON index: " +
          issues[0].circuitJsonIndex +
          " | Route indices: " +
          issues[0].startRouteIndex +
          " → " +
          issues[0].endRouteIndex,
      ]
    : [
        "Red: PCB traces with detected style issues",
        "Coordinates in millimeters; Y points upward. " +
          issues.length +
          " located errors.",
      ]
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="490" viewBox="0 0 800 490"><title>' +
    escapeXml(title) +
    '</title><rect width="800" height="490" fill="#10271c"/><style>text{font-family:monospace}</style><text x="20" y="26" fill="#fff" font-size="16">' +
    escapeXml(title) +
    '</text><defs><clipPath id="board"><rect x="15" y="40" width="770" height="350"/></clipPath></defs><g clip-path="url(#board)">' +
    context +
    highlights +
    '</g><rect x="0" y="400" width="800" height="90" fill="#f1f5f9"/>' +
    details
      .map(
        (t, i) =>
          '<text x="16" y="' +
          (423 + i * 22) +
          '" fill="#152d22" font-size="11">' +
          escapeXml(t) +
          "</text>",
      )
      .join("") +
    "</svg>\n"
  )
}
/** One cropped SVG per issue, compatible with the schematic viewer's artifact convention. */
export function createPcbStyleIssueArtifacts(
  circuitJson: CircuitJson,
  options: PcbStyleIssueArtifactOptions = {},
): PcbStyleIssueArtifact[] {
  const analysis =
    options.analysis ??
    analyzePcbStyle(circuitJson, {
      maxSegmentLengthMm: options.maxSegmentLengthMm,
      angleToleranceDegrees: options.angleToleranceDegrees,
      minStaircaseBends: options.minStaircaseBends,
      minStaircaseLengthMm: options.minStaircaseLengthMm,
      maxStairStepLengthMm: options.maxStairStepLengthMm,
    })
  return analysis.issues.flatMap((issue, issueIndex) => {
    if (options.layer && issue.layer !== options.layer) return []
    if (options.issueTypes && !options.issueTypes.includes(issue.lineItemType))
      return []
    const margin = Math.max(
      2,
      (issue.bounds.maxX - issue.bounds.minX) * 0.2,
      (issue.bounds.maxY - issue.bounds.minY) * 0.2,
    )
    const crop = {
      minX: issue.bounds.minX - margin,
      minY: issue.bounds.minY - margin,
      maxX: issue.bounds.maxX + margin,
      maxY: issue.bounds.maxY + margin,
    }
    return [
      {
        issueIndex,
        issue,
        layer: issue.layer,
        bounds: issue.bounds,
        descriptionXml: describeIssueXml(issue),
        fileName:
          "issue-" +
          String(issueIndex + 1).padStart(4, "0") +
          "-" +
          issue.lineItemType +
          ".svg",
        contentType: "image/svg+xml" as const,
        content: renderPcbStyleSvg(circuitJson, [issue], {
          bounds: crop,
          layer: issue.layer,
          title: "Issue " + (issueIndex + 1) + " — " + issue.lineItemType,
        }),
      },
    ]
  })
}
