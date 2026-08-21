import { useState } from 'react'
import { ORACLE_LINEAGE } from '../../data/oracleLineage'

type DiagramView = 'overview' | 'live' | 'dependencies' | 'legacy'
type Selection = { eyebrow: string; name: string; detail: string; tone: string }

const VIEWS: { key: DiagramView; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'live', label: 'Live process' },
  { key: 'dependencies', label: 'Dependencies' },
  { key: 'legacy', label: 'Legacy' },
]

const INITIAL_SELECTION: Selection = {
  eyebrow: 'Target table',
  name: ORACLE_LINEAGE.target,
  detail: `${ORACLE_LINEAGE.rowCount.toLocaleString('en-US')} rows · ${ORACLE_LINEAGE.columnCount} columns · published Oracle dimension`,
  tone: 'target',
}

function DiagramNode({ stage, name, detail, selected, onSelect }: {
  stage: string
  name: string
  detail: string
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button className="oracle-node" aria-pressed={selected} onClick={onSelect}>
      <span>{stage}</span><strong>{name}</strong><p>{detail}</p><em>Explore</em>
    </button>
  )
}

export default function OracleLineageDiagram() {
  const [view, setView] = useState<DiagramView>('overview')
  const [selection, setSelection] = useState<Selection>(INITIAL_SELECTION)
  const showLive = view === 'overview' || view === 'live'
  const showDependencies = view === 'overview' || view === 'dependencies'
  const showLegacy = view === 'overview' || view === 'legacy'
  const select = (eyebrow: string, name: string, detail: string, tone: string) =>
    setSelection({ eyebrow, name, detail, tone })

  return (
    <div className="oracle-diagram" aria-label="Current Oracle and TIBCO lineage for CLUB_CARD_DIM">
      <div className="oracle-diagram-toolbar">
        <div className="oracle-view-switcher" role="group" aria-label="Oracle diagram layer">
          {VIEWS.map((item) => <button key={item.key} aria-pressed={view === item.key} onClick={() => setView(item.key)}>{item.label}</button>)}
        </div>
        <div className="oracle-legend" aria-label="Diagram legend">
          <span><i className="live" />Live</span><span><i className="injection" />Injection</span>
          <span><i className="dependency" />Dependency</span><span><i className="dead" />Inactive</span>
        </div>
      </div>

      {showLive ? <>
        <div className="oracle-live-chain">
          {ORACLE_LINEAGE.liveChain.map((node, index) => <div className="oracle-chain-step" key={node.name}>
            <DiagramNode {...node} selected={selection.name === node.name} onSelect={() => select(node.stage, node.name, node.detail, index === ORACLE_LINEAGE.liveChain.length - 1 ? 'target' : 'live')} />
            {index < ORACLE_LINEAGE.liveChain.length - 1 ? <span className="oracle-arrow" aria-hidden="true">→</span> : null}
          </div>)}
        </div>
        <button className="oracle-orchestrator" aria-pressed={selection.name === ORACLE_LINEAGE.orchestrator} onClick={() => select('Live orchestrator', ORACLE_LINEAGE.orchestrator, `Chains the live load steps · ${ORACLE_LINEAGE.cadence}`, 'orchestrator')}>
          <span>Live orchestrator</span><strong>{ORACLE_LINEAGE.orchestrator}</strong><p>{ORACLE_LINEAGE.cadence}</p>
        </button>
      </> : null}

      {showDependencies ? <div className="oracle-support-grid">
        <section className="oracle-support injection"><h4>Rows injected by fact loads</h4>
          {ORACLE_LINEAGE.injections.map((item) => <button key={item.name} aria-pressed={selection.name === item.name} onClick={() => select('Row injection', item.name, item.detail, 'injection')}><strong>{item.name}</strong><span>{item.detail}</span></button>)}
        </section>
        <section className="oracle-support dependency"><h4>Tables read post-load</h4>
          {ORACLE_LINEAGE.factDependencies.map((item) => <button key={item.name} aria-pressed={selection.name === item.name} onClick={() => select('Fact dependency', item.name, item.detail, 'dependency')}><strong>{item.name}</strong><span>{item.detail}</span></button>)}
        </section>
      </div> : null}

      {showLegacy ? <section className="oracle-dead-chain"><h4>Still deployed, no longer executing</h4><div>
        {ORACLE_LINEAGE.deadChains.map((chain) => <button key={chain.staging} aria-pressed={selection.name === chain.staging} onClick={() => select('Inactive chain', chain.staging, `${chain.source} · ${chain.lastActivity}`, 'legacy')}>
          <strong>{chain.source}</strong><i aria-hidden="true">⇢</i><strong>{chain.staging}</strong><span>{chain.lastActivity}</span>
        </button>)}
      </div></section> : null}

      <div className={`oracle-selection ${selection.tone}`} aria-live="polite">
        <span>{selection.eyebrow}</span><strong>{selection.name}</strong><p>{selection.detail}</p>
      </div>

      {view === 'overview' ? <div className="oracle-explore-hint">
        <strong>Explore the technical evidence</strong>
        <span>Use the views above to inspect target fields and post-load logic, dependency evidence, or all three historical implementations.</span>
      </div> : null}

      {view === 'live' ? <div className="oracle-evidence-grid live-evidence">
        <section>
          <h4>Key target fields</h4>
          <div className="oracle-field-list">{ORACLE_LINEAGE.targetColumns.map((column) => <div key={column.name}><code>{column.name}</code><span>{column.note}</span></div>)}</div>
          <small>8 highlighted fields · 33 additional columns</small>
        </section>
        <section>
          <h4>Post-load steps</h4>
          <ol>{ORACLE_LINEAGE.postLoadSteps.map((step) => <li key={step.name}><strong>{step.name}</strong><span>{step.detail}</span></li>)}</ol>
          <div className="oracle-trigger"><span>Enabled trigger</span><strong>{ORACLE_LINEAGE.trigger.name}</strong><p>{ORACLE_LINEAGE.trigger.detail}</p></div>
        </section>
      </div> : null}

      {view === 'dependencies' ? <div className="oracle-evidence-block">
        <div className="oracle-evidence-heading"><div><h4>Candidate downstream tables</h4><p>Identified from the staging inventory; not yet confirmed from code.</p></div><span>Inferred</span></div>
        <div className="candidate-grid">{ORACLE_LINEAGE.candidateDownstreams.map((group) => <section key={group.group}><strong>{group.group}</strong><p>{group.names}</p></section>)}</div>
        <div className="evidence-rule"><strong>Evidence boundary</strong><span>Only SALES_POS_TX_F is confirmed from code. WebFOCUS and the Snowflake copy are confirmed end consumers; all tables above remain candidates.</span></div>
      </div> : null}

      {view === 'legacy' ? <div className="legacy-evidence">
        <section className="generation-section"><h4>Three generations of the load</h4><div className="generation-timeline">
          {ORACLE_LINEAGE.generations.map((item) => <article key={item.period}><span>{item.period}</span><strong>{item.flow}</strong><p>From {item.source}</p></article>)}
        </div></section>
        <section><h4>Four EME enrichment flows</h4><div className="enrichment-list">
          {ORACLE_LINEAGE.legacyEnrichmentFlows.map((item) => <div key={item.name}><strong>{item.name}</strong><span>Writes to {item.writesTo}</span></div>)}
        </div></section>
        <div className="oracle-question"><span>Question for Weis</span><strong>{ORACLE_LINEAGE.openQuestion}</strong><p>Data Engineering recommends retirement, but consumers must be ruled out first.</p></div>
      </div> : null}
    </div>
  )
}
