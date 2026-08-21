import { useMemo } from 'react'
import { DATA, scopedTables, tablesWithoutPipeline } from '../../data/dataset'
import { C, FONT, impact } from '../../lib/tokens'
import { truncate } from '../../lib/text'
import type { TableRec } from '../../types'

const W = 1280
const LANE_H = 48
const PAD_TOP = 10
const CELL_GAP = 5
const LABEL_W = 370

interface Props {
  onSelectTable: (id: string) => void
}

/**
 * The whole scoped estate grouped by the pipeline that loads it, plus a dashed
 * lane for the tables whose loading process is not documented anywhere.
 */
export default function EstateView({ onSelectTable }: Props) {
  const lanes = useMemo(() => {
    const byPipe = DATA.pipelines
      .map((p) => ({ p, ts: scopedTables.filter((t) => t.pipeIds.includes(p.id)) }))
      .filter((x) => x.ts.length)
      .sort((a, b) => b.ts.length - a.ts.length)
    return byPipe
  }, [])

  const orphans = tablesWithoutPipeline
  const idle = DATA.pipelines.length - lanes.length
  const widest = Math.max(1, ...lanes.map((x) => x.ts.length), orphans.length)
  const cellW = Math.max(10, Math.min(22, Math.floor((W - LABEL_W) / widest) - CELL_GAP))
  const laneCount = lanes.length + (orphans.length ? 1 : 0)
  const height = PAD_TOP + laneCount * (LANE_H + 14) + 8

  const lane = (
    i: number,
    label: string,
    sub: string,
    tables: TableRec[],
    dashed: boolean,
  ) => {
    const y = PAD_TOP + i * (LANE_H + 14)
    return (
      <g key={label}>
        <text
          x={0}
          y={y + 18}
          fill={C.dark}
          fontFamily={FONT.sans}
          fontSize={14}
          fontWeight={700}
        >
          {truncate(label, 36)}
        </text>
        <text x={0} y={y + 38} fill={C.nDarkest} fontFamily={FONT.mono} fontSize={10}>
          {sub}
        </text>
        {tables.map((t, j) => (
          <rect
            key={t.id}
            x={LABEL_W + j * (cellW + CELL_GAP)}
            y={y + 8}
            width={cellW}
            height={cellW}
            rx={5}
            fill={dashed ? 'none' : impact(t.bcn)}
            stroke={dashed ? C.nD2 : undefined}
            strokeDasharray={dashed ? '3 3' : undefined}
            style={{ cursor: 'pointer' }}
            onClick={() => onSelectTable(t.id)}
          >
            <title>
              {[
                t.name,
                t.id,
                t.bcs.length ? t.bcs.join(' ') : 'no business case',
                t.status,
              ]
                .filter(Boolean)
                .join(' · ')}
            </title>
          </rect>
        ))}
      </g>
    )
  }

  return (
    <div>
      <div className="note gap">
        <b>What this shows</b>
        Every one of the {scopedTables.length} tables in scope, grouped by the pipeline that loads
        it. The {orphans.length} with no pipeline recorded are the ones whose loading process is not
        documented anywhere we can read, and that is where the tracing effort sits.
        {idle > 0 &&
          ` The other ${idle} of the ${DATA.pipelines.length} pipelines load nothing in Phase 1 scope.`}{' '}
        A table loaded by more than one pipeline appears in each of those lanes. Click any mark to
        open that table.
      </div>

      <div className="card estate-chart-card">
        <div className="estate-chart-heading">
          <div>
            <h2>Pipelines and the tables they load</h2>
            <p>Each mark is a table. Select one to open its documented lineage and dependencies.</p>
          </div>
          <span>{lanes.length} active pipeline lanes</span>
        </div>
        <div className="estate-legend" aria-label="Business case impact legend">
          <span><i style={{ background: C.nD2 }} />No business case</span>
          <span><i style={{ background: C.ecosystem }} />1 business case</span>
          <span><i style={{ background: C.aqua }} />2–3 business cases</span>
          <span><i style={{ background: C.red }} />4+ business cases</span>
          <span><i className="hollow" />No pipeline recorded</span>
        </div>
        <div className="estate-chart-scroll" tabIndex={0} aria-label="Pipeline diagram">
          <svg viewBox={`0 0 ${W} ${height}`} role="img" aria-label="Tables grouped by pipeline">
            {lanes.map((x, i) =>
              lane(
                i,
                x.p.name,
                `${x.p.id} · ${x.ts.length} tables · ${x.p.freq.join(', ') || 'no cadence recorded'}`,
                x.ts,
                false,
              ),
            )}
            {!!orphans.length &&
              lane(
                lanes.length,
                'No pipeline recorded',
                `${orphans.length} tables · loading process not documented`,
                orphans,
                true,
              )}
          </svg>
        </div>
      </div>

      <div className="card">
        <h2>Triggers</h2>
        <table className="grid">
          <thead>
            <tr>
              <th>Trigger</th>
              <th>ID</th>
              <th>Cadence</th>
              <th>Status</th>
              <th>Pipelines</th>
              <th>Tables</th>
            </tr>
          </thead>
          <tbody>
            {[...DATA.triggers]
              .sort((a, b) => b.tables.length - a.tables.length)
              .map((x) => (
                <tr key={x.id}>
                  <td>{x.name}</td>
                  <td style={{ fontFamily: FONT.mono, fontSize: 11 }}>{x.id}</td>
                  <td>{x.freq.join(', ') || 'not recorded'}</td>
                  <td>
                    <span
                      className="pill"
                      style={{
                        background:
                          x.status === 'Started'
                            ? C.ecosystem
                            : x.status === 'Stopped'
                              ? C.red
                              : C.nD2,
                        color: '#fff',
                      }}
                    >
                      {x.status}
                    </span>
                  </td>
                  <td className="num">{x.pipes.length}</td>
                  <td className="num">{x.tables.length}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
