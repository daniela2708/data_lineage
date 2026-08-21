import { useMemo } from 'react'
import FlowRail from './FlowRail'
import StepCard from './StepCard'
import { DATA } from '../../data/dataset'
import { activeStep, flowLayout } from '../../lib/flowLayout'
import { useFlowTimeline } from '../../hooks/useFlowTimeline'

/** The traced chain, animated. This is the piece the prototype exists to show. */
export default function FlowView({ active }: { active: boolean }) {
  const flow = DATA.flow
  const layout = useMemo(() => flowLayout(flow.nodes), [flow.nodes])
  const timeline = useFlowTimeline(layout.total, active)
  const current = activeStep(layout, timeline.t)

  return (
    <div>
      <div className="note">
        <b>What this is</b>
        The one table whose path is traced end to end. Every step below is documented: the source
        tables, the layer it lands in, the pipeline or notebook that moves it, and the tables it
        reads along the way. Nothing here is inferred. The chain was traced by Mariana Narvaez; the
        pipeline, notebook and merge key names come from the end to end diagram.
      </div>

      <div className="card">
        <div className="flow-heading">
          <div className="flow-identity">
            <span className="flow-kicker">End-to-end trace</span>
            <div className="title-row">
              <h3>{flow.table}</h3>
              <span className="tid">{flow.id}</span>
            </div>
          </div>
          <div className="flow-route" aria-label="Route summary">
            <span>{flow.nodes[0].zone}</span>
            <i aria-hidden="true">→</i>
            <span>{flow.nodes[flow.nodes.length - 1].zone}</span>
          </div>
        </div>
        <p className="lead" style={{ marginBottom: 16 }}>
          {flow.nodes.length} steps, from the operational tables in {flow.nodes[0].label} to the
          published table in Snowflake. Click any step to jump to it.
        </p>

        <div className="fbar">
          <button className="chip solid" onClick={timeline.toggle}>
            {timeline.playing ? 'Pause' : 'Play'}
          </button>
          <button className="chip" onClick={timeline.restart}>
            Restart
          </button>
          <button
            className="chip"
            aria-pressed={timeline.speed === 2}
            onClick={timeline.toggleSpeed}
          >
            {timeline.speed}x
          </button>
          <span className="step">
            Step {current + 1} of {flow.nodes.length}
          </span>
          <span className="pbar">
            <i style={{ width: `${Math.min(100, (timeline.t / layout.total) * 100)}%` }} />
          </span>
        </div>

        <FlowRail
          nodes={flow.nodes}
          t={timeline.t}
          onStepClick={(i) => timeline.jump(layout.nodes[i].on + 1)}
        />

        <div className="legend">
          <div>
            <span className="sw" style={{ background: 'var(--dark)' }} />
            Source table
          </div>
          <div>
            <span className="sw hollow" />
            Also read at that step
          </div>
          <div>
            <span className="sw" style={{ background: 'var(--red)' }} />
            Published table
          </div>
          <div>
            <span className="sw" style={{ background: 'var(--n-darker)' }} />
            Not reached yet
          </div>
        </div>
      </div>

      <div className="card">
        <h2>The step showing now</h2>
        <StepCard node={flow.nodes[current]} />
      </div>

      <div className="card">
        <h2>Recorded alongside the chain</h2>

        <h2 className="sec" style={{ margin: '4px 0 9px' }}>
          Merge keys
        </h2>
        <div className="kv">
          <b>{flow.keys.join(', ')}</b>
          used by the upsert into the raw layer
        </div>

        <h2 className="sec" style={{ margin: '18px 0 9px' }}>
          Legacy paths for the same table
        </h2>
        {flow.legacy.map((l) => (
          <div className="kv" key={l.label}>
            <b>{l.label}</b>
            {l.detail}
          </div>
        ))}

        <h2 className="sec" style={{ margin: '18px 0 9px' }}>
          Still to define
        </h2>
        {flow.openPoints.map((o) => (
          <div className="kv" key={o}>
            <b>· </b>
            {o}
          </div>
        ))}

        <div className="note gap" style={{ margin: '14px 0 0' }}>
          <b>Downstream</b>
          {flow.downstream}
        </div>
      </div>

      <div className="note gap">
        <b>Why it is a template and not a drawing</b>
        The diagram is generated from a list of steps, not drawn by hand. Give it the chain for
        another table and it renders the same way, which is the point of the prototype:{' '}
        {DATA.meta.inScope} tables in scope, 1 traced so far.
      </div>
    </div>
  )
}
