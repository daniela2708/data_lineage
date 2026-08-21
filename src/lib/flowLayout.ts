/**
 * Geometry and timing for the animated chain.
 *
 * Kept as a pure function so the diagram is generated from the list of steps
 * rather than drawn by hand: give it the chain for another table and it lays
 * itself out the same way.
 */

import type { FlowNode, FlowSide } from '../types'
import { wrapLabel } from './text'

export const CANVAS_WIDTH = 1180
const EDGE_PAD = 76

/** Milliseconds a step stays lit before the pulse leaves it. */
const DWELL_MS = 420
/** Extra dwell when a step has side inputs to show. */
const SIDE_MS = 260
/** Milliseconds the pulse takes to travel one segment. */
const SEGMENT_MS = 760
/** Pause on the finished chain before it loops. */
const HOLD_MS = 1200

const BAND_ROW_H = 25
const BAND_TOP = 10
const RAIL_OFFSET = 48
const LABEL_LINE_H = 13
const LABEL_MAX_CHARS = 15
const CHIP_H = 19

export interface ChipLayout extends FlowSide {
  x: number
  y: number
  w: number
  /** Curve from the chip down into its step on the rail. */
  path: string
  /** Index of the step this chip feeds. */
  node: number
}

export interface NodeLayout {
  index: number
  cx: number
  zone: string
  label: string
  /** Label split into lines that fit the column. */
  lines: string[]
  /** Millisecond on the timeline when this step lights up. */
  on: number
}

export interface SegmentLayout {
  x1: number
  x2: number
  length: number
  /** Colour comes from the step the segment arrives at. */
  zone: string
  start: number
  end: number
}

export interface FlowLayout {
  width: number
  height: number
  railY: number
  colWidth: number
  nodes: NodeLayout[]
  segments: SegmentLayout[]
  chips: ChipLayout[]
  /** Length of one loop, including the hold at the end. */
  total: number
}

export function flowLayout(nodes: FlowNode[]): FlowLayout {
  const width = CANVAS_WIDTH
  const colWidth =
    nodes.length > 1 ? (width - EDGE_PAD * 2) / (nodes.length - 1) : width - EDGE_PAD * 2

  // One band row per side input, so two chips can never collide.
  let rows = 0
  const rowOf = new Map<FlowSide, number>()
  nodes.forEach((n) => n.side?.forEach((s) => rowOf.set(s, rows++)))

  const railY = BAND_TOP + rows * BAND_ROW_H + RAIL_OFFSET
  const lines = nodes.map((n) => wrapLabel(n.label, LABEL_MAX_CHARS))
  const maxLines = Math.max(1, ...lines.map((l) => l.length))
  const height = railY + 63 + maxLines * LABEL_LINE_H + 10

  const chipW = Math.min(142, colWidth * 1.22)
  const chips: ChipLayout[] = []
  const laidOut: NodeLayout[] = []

  nodes.forEach((n, i) => {
    const cx = nodes.length > 1 ? EDGE_PAD + colWidth * i : width / 2
    n.side?.forEach((s) => {
      const y = BAND_TOP + (rowOf.get(s) ?? 0) * BAND_ROW_H
      const x = Math.max(2, Math.min(width - chipW - 2, cx - chipW / 2))
      const mid = x + chipW / 2
      chips.push({
        ...s,
        x,
        y,
        w: chipW,
        node: i,
        path: `M${mid},${y + CHIP_H} C${mid},${y + 40} ${cx},${railY - 40} ${cx},${railY - 13}`,
      })
    })
    laidOut.push({ index: i, cx, zone: n.zone, label: n.label, lines: lines[i], on: 0 })
  })

  // Timeline: light a step, hold, then draw the segment to the next one.
  const segments: SegmentLayout[] = []
  let t = 0
  laidOut.forEach((nd, i) => {
    nd.on = t
    t += DWELL_MS + (nodes[i].side?.length ? SIDE_MS : 0)
    if (i < laidOut.length - 1) {
      const x1 = nd.cx
      const x2 = laidOut[i + 1].cx
      segments.push({
        x1,
        x2,
        length: x2 - x1,
        zone: nodes[i + 1].zone,
        start: t,
        end: t + SEGMENT_MS,
      })
      t += SEGMENT_MS
    }
  })

  return { width, height, railY, colWidth, nodes: laidOut, segments, chips, total: t + HOLD_MS }
}

/** Index of the step showing at time `t`. */
export function activeStep(layout: FlowLayout, t: number): number {
  let cur = 0
  layout.nodes.forEach((n, i) => {
    if (t >= n.on) cur = i
  })
  return cur
}

/**
 * Where the pulse sits at time `t`, or null when it is resting on a step.
 */
export function pulseAt(layout: FlowLayout, t: number): number | null {
  for (const s of layout.segments) {
    const p = (t - s.start) / (s.end - s.start)
    if (p > 0 && p < 1) return s.x1 + (s.x2 - s.x1) * p
  }
  return null
}

/** How much of a segment is drawn at time `t`, from 0 to 1. */
export function segmentProgress(s: SegmentLayout, t: number): number {
  return Math.max(0, Math.min(1, (t - s.start) / (s.end - s.start)))
}
