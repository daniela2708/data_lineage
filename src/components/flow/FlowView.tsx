import { useMemo, useState } from 'react'
import FlowRail from './FlowRail'
import StepCard from './StepCard'
import OracleLineageDiagram from './OracleLineageDiagram'
import { DATA } from '../../data/dataset'
import { ORACLE_LINEAGE } from '../../data/oracleLineage'
import { activeStep, flowLayout } from '../../lib/flowLayout'
import { useFlowTimeline } from '../../hooks/useFlowTimeline'
import { joinDot } from '../../lib/text'

/** The single-page end-to-end story for the traced table. */
export default function FlowView({ active }: { active: boolean }) {
  const [tableQuery, setTableQuery] = useState('')
  const flow = DATA.flow
  const table = DATA.tables.find((candidate) => candidate.id === flow.id)
  const layout = useMemo(() => flowLayout(flow.nodes), [flow.nodes])
  const timeline = useFlowTimeline(layout.total, active)
  const current = activeStep(layout, timeline.t)
  const pipelineNames = Array.from(new Set([
    ...(table?.pipeIds.flatMap((id) => {
      const pipeline = DATA.pipelines.find((candidate) => candidate.id === id)
      return pipeline ? [pipeline.name] : [id]
    }) ?? []),
    ...flow.nodes.flatMap((node) => (node.pipe ? [node.pipe] : [])),
  ]))
  const meta = table ? [
    ['Database', table.db], ['Schema', table.schema], ['Source system', table.src],
    ['Business cases', table.bcs.join(', ')], ['Wave', table.wave], ['Complexity', table.cplx],
    ['Technical owner', table.owner], ['Status', table.status],
  ] : []
  const normalizedTableQuery = tableQuery.trim().toLowerCase()
  const matchesTableQuery = (name: string, detail: string) =>
    !normalizedTableQuery || `${name} ${detail}`.toLowerCase().includes(normalizedTableQuery)
  const filteredCreatedTables = ORACLE_LINEAGE.createdTables.filter((item) => matchesTableQuery(item.name, item.status))
  const filteredRequiredTables = ORACLE_LINEAGE.requiredTables.filter((item) => matchesTableQuery(item.name, item.detail))
  const filteredDownstreams = ORACLE_LINEAGE.downstreams.filter((item) => matchesTableQuery(item.name, item.detail))
  const visibleTableCount = filteredCreatedTables.length + filteredRequiredTables.length + filteredDownstreams.length

  return (
    <div>
      <div className="card">
        <div className="flow-heading">
          <div className="flow-identity">
            <span className="flow-kicker">End-to-end trace</span>
            <div className="title-row"><h3>{flow.table}</h3><span className="tid">{flow.id}</span></div>
          </div>
          <div className="flow-route" aria-label="Route summary">
            <span>{flow.nodes[0].zone}</span><i aria-hidden="true">→</i><span>{flow.nodes[flow.nodes.length - 1].zone}</span>
          </div>
        </div>
        <p className="lead" style={{ marginBottom: 16 }}>
          {flow.nodes.length} documented steps from the operational source to the published table. Click any step to jump to it.
        </p>
        <div className="fbar">
          <button className="chip solid" onClick={timeline.toggle}>{timeline.playing ? 'Pause' : 'Play'}</button>
          <button className="chip" onClick={timeline.restart}>Restart</button>
          <button className="chip" aria-pressed={timeline.speed === 2} onClick={timeline.toggleSpeed}>{timeline.speed}x</button>
          <span className="step">Step {current + 1} of {flow.nodes.length}</span>
          <span className="pbar"><i style={{ width: `${Math.min(100, (timeline.t / layout.total) * 100)}%` }} /></span>
        </div>
        <FlowRail nodes={flow.nodes} t={timeline.t} onStepClick={(i) => timeline.jump(layout.nodes[i].on + 1)} />
        <div className="legend">
          <div><span className="sw" style={{ background: 'var(--dark)' }} />Source table</div>
          <div><span className="sw hollow" />Also read at that step</div>
          <div><span className="sw" style={{ background: 'var(--red)' }} />Published table</div>
          <div><span className="sw" style={{ background: 'var(--n-darker)' }} />Not reached yet</div>
        </div>
      </div>

      <div className="card"><h2>The step showing now</h2><StepCard node={flow.nodes[current]} /></div>

      <div className="card dependency-card">
        <div className="relationship-heading">
          <div><span className="relationship-kicker">Lineage context</span><h3>Dependencies and related tables</h3><p>Tables are grouped by their role in the documented CLUB_CARD_DIM flow.</p></div>
          <span>Evidence from source files</span>
        </div>
        <div className="table-search-row">
          <label>
            <span>Filter tables</span>
            <input
              type="search"
              value={tableQuery}
              onChange={(event) => setTableQuery(event.target.value)}
              placeholder="Name, schema, status or relationship"
            />
          </label>
          <span className="table-search-count" aria-live="polite">{visibleTableCount} results</span>
          {tableQuery ? <button className="chip" onClick={() => setTableQuery('')}>Clear</button> : null}
        </div>
        <div className="relationship-grid">
          <section className="relationship-column">
            <div className="relationship-title"><span className="relationship-type">Created for this table</span><strong>{filteredCreatedTables.length}</strong></div>
            <p>Oracle staging tables built exclusively to load this dimension.</p>
            <div className="relationship-items">{filteredCreatedTables.length ? filteredCreatedTables.map((item) => <div key={item.name}><strong>{item.name}</strong><span>{item.status}</span></div>) : <div className="relationship-empty">No matching tables</div>}</div>
          </section>
          <section className="relationship-column">
            <div className="relationship-title"><span className="relationship-type">Other required tables</span><strong>{filteredRequiredTables.length}</strong></div>
            <p>Sources, lookups and injection tables owned by other processes.</p>
            <div className="relationship-items">{filteredRequiredTables.length ? filteredRequiredTables.map((item) => <div key={item.name}><strong>{item.name}</strong><span>{item.detail}</span></div>) : <div className="relationship-empty">No matching tables</div>}</div>
          </section>
          <section className="relationship-column downstream-column">
            <div className="relationship-title"><span className="relationship-type">Downstreams</span><strong>{filteredDownstreams.length}</strong></div>
            <p>Confirmed consumers only; name-inferred candidates are excluded.</p>
            <div className="relationship-items">{filteredDownstreams.length ? filteredDownstreams.map((item) => <div key={item.name}><strong>{item.name}</strong><span>{item.detail}</span></div>) : <div className="relationship-empty">No matching tables</div>}</div>
          </section>
        </div>
      </div>

      <div className="card oracle-card">
        <div className="oracle-heading">
          <div><span className="relationship-kicker">Current Oracle / TIBCO process</span><h3>{ORACLE_LINEAGE.target}</h3><p>Complementary source-side evidence from Data Engineering, captured on {ORACLE_LINEAGE.evidenceDate}.</p></div>
          <span>{ORACLE_LINEAGE.rowCount.toLocaleString('en-US')} rows · {ORACLE_LINEAGE.columnCount} columns</span>
        </div>
        <div className="oracle-summary">
          <div><span>Orchestrator</span><strong>{ORACLE_LINEAGE.orchestrator}</strong></div>
          <div><span>Cadence</span><strong>{ORACLE_LINEAGE.cadence}</strong></div>
        </div>
        <OracleLineageDiagram />
        <h2 className="sec">Engineering findings</h2>
        <div className="finding-list">{ORACLE_LINEAGE.findings.map((finding) => <p key={finding}>{finding}</p>)}</div>
      </div>

      {table && <div className="card table-summary">
        <h2>Table details</h2>
        <div className="title-row"><h3>{table.name}</h3><span className="tid">{table.id}</span></div>
        <p className="lead">{joinDot([table.domain, table.type, table.layer])}</p>
        <div className="meta">{meta.map(([label, value]) => <div key={label}><dt>{label}</dt><dd className={value ? undefined : 'empty'}>{value || 'Not documented'}</dd></div>)}</div>
      </div>}

      <div className="card pipeline-card">
        <div className="pipeline-heading">
          <div><span className="flow-kicker">Integration footprint</span><h3>Pipelines and data flows that interact with {flow.table}</h3></div><strong>{pipelineNames.length + ORACLE_LINEAGE.liveFlows.length + 1}</strong>
        </div>
        <div className="pipeline-list">
          <div><strong>{ORACLE_LINEAGE.orchestrator}</strong><span>Oracle / TIBCO · live orchestrator</span></div>
          {ORACLE_LINEAGE.liveFlows.map((name) => <div key={name}><strong>{name}</strong><span>Oracle / TIBCO · live data flow</span></div>)}
          {pipelineNames.map((name) => {
          const pipeline = DATA.pipelines.find((candidate) => candidate.name === name || candidate.id === name)
          return <div key={name}><strong>{name}</strong><span>{pipeline ? [pipeline.id, pipeline.tool, pipeline.status].filter(Boolean).join(' · ') : 'Azure / Snowflake · documented in the end-to-end trace'}</span></div>
        })}</div>
      </div>
    </div>
  )
}
