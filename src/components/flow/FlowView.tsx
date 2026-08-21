import { useMemo } from 'react'
import FlowRail from './FlowRail'
import StepCard from './StepCard'
import { DATA } from '../../data/dataset'
import { activeStep, flowLayout } from '../../lib/flowLayout'
import { useFlowTimeline } from '../../hooks/useFlowTimeline'
import { joinDot } from '../../lib/text'

/** The single-page end-to-end story for the traced table. */
export default function FlowView({ active }: { active: boolean }) {
  const flow = DATA.flow
  const table = DATA.tables.find((candidate) => candidate.id === flow.id)
  const layout = useMemo(() => flowLayout(flow.nodes), [flow.nodes])
  const timeline = useFlowTimeline(layout.total, active)
  const current = activeStep(layout, timeline.t)
  const createdTables = Array.from(new Map(flow.nodes.slice(1).map((node) => [`${node.zone}-${node.label}`, node])).values())
  const requiredTables = Array.from(new Map(flow.nodes.flatMap((node) => node.side ?? []).map((input) => [input.id ?? input.label, input])).values())
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
        <div className="relationship-grid">
          <section className="relationship-column">
            <div className="relationship-title"><span className="relationship-type">Created for this table</span><strong>{createdTables.length}</strong></div>
            <p>Intermediate and published tables produced along this trace.</p>
            <div className="relationship-items">{createdTables.map((node) => <div key={`${node.zone}-${node.label}`}><strong>{node.label}</strong><span>{node.zone}</span></div>)}</div>
          </section>
          <section className="relationship-column">
            <div className="relationship-title"><span className="relationship-type">Other required tables</span><strong>{requiredTables.length}</strong></div>
            <p>Source and lookup tables needed by the flow, but not created exclusively for it.</p>
            <div className="relationship-items">{requiredTables.map((input) => <div key={input.id ?? input.label}><strong>{input.label}</strong><span>{input.id ?? 'Catalog ID not documented'}</span></div>)}</div>
          </section>
          <section className="relationship-column downstream-column">
            <div className="relationship-title"><span className="relationship-type">Downstreams</span><strong>Gap</strong></div>
            <p>Known consumers or the documented gap after publication.</p>
            <div className="relationship-items"><div className="relationship-empty">{flow.downstream}</div></div>
          </section>
        </div>
      </div>

      {table && <div className="card table-summary">
        <h2>Table details</h2>
        <div className="title-row"><h3>{table.name}</h3><span className="tid">{table.id}</span></div>
        <p className="lead">{joinDot([table.domain, table.type, table.layer])}</p>
        <div className="meta">{meta.map(([label, value]) => <div key={label}><dt>{label}</dt><dd className={value ? undefined : 'empty'}>{value || 'Not documented'}</dd></div>)}</div>
      </div>}

      <div className="card pipeline-card">
        <div className="pipeline-heading">
          <div><span className="flow-kicker">Integration footprint</span><h3>Pipelines that interact with {flow.table}</h3></div><strong>{pipelineNames.length}</strong>
        </div>
        <div className="pipeline-list">{pipelineNames.map((name) => {
          const pipeline = DATA.pipelines.find((candidate) => candidate.name === name || candidate.id === name)
          return <div key={name}><strong>{name}</strong><span>{pipeline ? [pipeline.id, pipeline.tool, pipeline.status].filter(Boolean).join(' · ') : 'Documented in the end-to-end trace'}</span></div>
        })}</div>
      </div>
    </div>
  )
}
