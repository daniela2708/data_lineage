import { useMemo } from 'react'
import {
  activeStep,
  flowLayout,
  pulseAt,
  segmentProgress,
  type FlowLayout,
} from '../../lib/flowLayout'
import { C, FONT, zoneColor } from '../../lib/tokens'
import { truncate } from '../../lib/text'
import type { FlowNode } from '../../types'

interface Props {
  nodes: FlowNode[]
  /** Position on the timeline, in milliseconds. */
  t: number
  onStepClick: (index: number) => void
}

/**
 * The chain as a rail: one marker per step, side inputs feeding in from the band
 * above, and a pulse that travels the rail as the data moves. Nothing is drawn
 * by hand, it all comes out of flowLayout.
 */
export default function FlowRail({ nodes, t, onStepClick }: Props) {
  const layout: FlowLayout = useMemo(() => flowLayout(nodes), [nodes])
  const { width, height, railY, colWidth, segments, chips } = layout
  const current = activeStep(layout, t)
  const pulseX = pulseAt(layout, t)

  return (
    <div className="fsvg">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Lineage chain, step ${current + 1} of ${layout.nodes.length}`}
      >
        {/* rail, grey underneath and coloured on top as each segment is drawn */}
        {segments.map((s, i) => (
          <line
            key={`base-${i}`}
            x1={s.x1}
            y1={railY}
            x2={s.x2}
            y2={railY}
            stroke={C.nDarker}
            strokeWidth={3}
            strokeLinecap="round"
          />
        ))}
        {segments.map((s, i) => (
          <line
            key={`fill-${i}`}
            x1={s.x1}
            y1={railY}
            x2={s.x2}
            y2={railY}
            stroke={zoneColor(s.zone)}
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray={s.length}
            strokeDashoffset={s.length * (1 - segmentProgress(s, t))}
          />
        ))}

        {/* the pulse */}
        {pulseX !== null && (
          <>
            <circle cx={pulseX} cy={railY} r={12} fill={C.red} opacity={0.16} />
            <circle cx={pulseX} cy={railY} r={5.5} fill={C.red} />
          </>
        )}

        {/* side inputs: the tables read at a step without being the step */}
        {chips.map((c, i) => {
          const on = t >= layout.nodes[c.node].on
          const origin = c.kind === 'origin'
          return (
            <g key={`chip-${i}`} opacity={on ? 1 : 0.25}>
              <path
                d={c.path}
                fill="none"
                stroke={origin ? C.nDarkest : C.coolDarkest}
                strokeWidth={1.4}
                strokeDasharray={origin ? undefined : '3 3'}
              />
              <rect
                x={c.x}
                y={c.y}
                width={c.w}
                height={19}
                rx={6}
                fill={origin ? C.white : C.coolLighter}
                stroke={origin ? C.dark : C.coolDarkest}
                strokeWidth={1}
                strokeDasharray={origin ? undefined : '3 2'}
              />
              <text
                x={c.x + 7}
                y={c.y + 13.5}
                fill={C.dark}
                fontFamily={FONT.mono}
                fontSize={9}
              >
                {truncate(c.label, 24)}
                <title>{c.id ? `${c.label} (${c.id})` : c.label}</title>
              </text>
            </g>
          )
        })}

        {/* steps */}
        {layout.nodes.map((n) => {
          const on = t >= n.on
          const col = zoneColor(n.zone)
          return (
            <g key={n.index}>
              <rect
                x={n.cx - 48}
                y={railY + 21}
                width={96}
                height={19}
                rx={9.5}
                fill={C.white}
                stroke={on ? col : C.nDarker}
                strokeWidth={1}
                opacity={on ? 1 : 0.45}
              />
              <text
                x={n.cx}
                y={railY + 34.5}
                fill={on ? C.dark : C.nD2}
                fontFamily={FONT.mono}
                fontSize={8}
                fontWeight={700}
                letterSpacing={0.45}
                textAnchor="middle"
                opacity={on ? 1 : 0.35}
              >
                {`${String(n.index + 1).padStart(2, '0')} · ${n.zone.toUpperCase()}`}
              </text>
              <circle
                cx={n.cx}
                cy={railY}
                r={on ? 13 : 12}
                fill={C.white}
                stroke={on ? col : C.nDarker}
                strokeWidth={3}
              />
              <circle cx={n.cx} cy={railY} r={4.5} fill={on ? col : C.nDarker} />
              {n.lines.map((line, li) => (
                <text
                  key={li}
                  x={n.cx}
                  y={railY + 59 + li * 13}
                  fill={C.dark}
                  fontFamily={FONT.sans}
                  fontSize={10.5}
                  fontWeight={700}
                  textAnchor="middle"
                  opacity={on ? 1 : 0.35}
                >
                  {line}
                </text>
              ))}
              {/* full column is the hit area, so a step is easy to click */}
              <rect
                x={n.cx - colWidth / 2}
                y={0}
                width={colWidth}
                height={height}
                fill="transparent"
                style={{ cursor: 'pointer' }}
                onClick={() => onStepClick(n.index)}
              >
                <title>{`${n.zone} · ${n.label}`}</title>
              </rect>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
