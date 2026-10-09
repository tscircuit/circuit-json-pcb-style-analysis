import type { CircuitJson } from "circuit-json"
export type Point = { x: number; y: number }
export type Bounds = { minX: number; minY: number; maxX: number; maxY: number }
export interface TraceSegment {
  pcbTraceId: string
  sourceTraceId?: string
  pcbGroupId?: string
  subcircuitId?: string
  /** Index in the original Circuit JSON array (also disambiguates duplicate IDs). */
  circuitJsonIndex: number
  /** Indices in the original trace.route array. */
  startRouteIndex: number
  endRouteIndex: number
  layer: string
  start: Point
  end: Point
  width: number
  lengthMm: number
  /** Original copper segments represented by an effective straight run. */
  constituentSegments?: TraceSegment[]
  /** Maximum centerline distance to the run's measurement chord. */
  maxCenterlineDeviationMm?: number
}
export interface LocatedPcbStyleIssue extends TraceSegment {
  issueId: string
  severity: "error"
  message: string
  location: Point
  /** Copper-inclusive segment bounds, in PCB millimeters, Y up. */
  bounds: Bounds
}
export interface PcbTraceSegmentOddAngle extends LocatedPcbStyleIssue {
  lineItemType: "PcbTraceSegmentOddAngle"
  /** Length threshold used to qualify this odd-angle error. */
  maxSegmentLengthMm: number
  angleDegrees: number
  nearestAllowedAngleDegrees: number
  deviationDegrees: number
  angleToleranceDegrees: number
  /** Extra allowance for a run's geometric approximation; absent on physical segments. */
  angleUncertaintyDegrees?: number
}
export type PcbStyleIssue = PcbTraceSegmentOddAngle
export type PcbStyleIssueType = PcbStyleIssue["lineItemType"]
export interface PcbStyleAnalysisOptions {
  /** Only physical segments or effective straight runs strictly longer than this are checked; default 5 mm. */
  maxSegmentLengthMm?: number
  /** Distance from a multiple of 45 degrees; default 4 degrees. */
  angleToleranceDegrees?: number
  issueTypes?: readonly PcbStyleIssueType[]
}
export interface AnalysisContext {
  circuitJson: CircuitJson
  segments: TraceSegment[]
}
export interface PcbStyleAnalysisResult {
  issues: PcbStyleIssue[]
}
