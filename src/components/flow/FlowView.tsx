import { Fragment, useDeferredValue, useId, useState } from 'react'
import { DATA } from '../../data/dataset'
import { TABLE_LINEAGES, type LineageNode, type RelatedGroup, type TableLineage } from '../../data/tableLineages'
import { splitOnSeparators, splitQualifiedName } from '../../lib/text'
import type { TableRec } from '../../types'

function FilterBox({ label, options, selected, onSelect, allLabel }: { label: string; options: string[]; selected: string; onSelect: (value: string) => void; allLabel?: string }) {
  const inputId = useId()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const normalizedQuery = query.trim().toLowerCase()
  const visibleOptions = normalizedQuery ? options.filter((option) => option.toLowerCase().includes(normalizedQuery)) : options

  return <section className="filter-box" aria-labelledby={`${inputId}-label`}>
    <strong id={`${inputId}-label`}>{label}</strong>
    <button className="filter-dropdown-trigger" type="button" aria-expanded={open} aria-controls={`${inputId}-menu`} onClick={() => setOpen((visible) => !visible)}><span>{selected || allLabel || `Choose ${label.toLowerCase()}`}</span><i aria-hidden="true" /></button>
    {open ? <div className="filter-dropdown-menu" id={`${inputId}-menu`}>
      <div className="filter-box-search"><i aria-hidden="true" /><input id={inputId} aria-label={`Search ${label}`} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${label.toLowerCase()}`} autoComplete="off" autoFocus /></div>
      <div className="filter-options-list" role="listbox" aria-labelledby={`${inputId}-label`}>
        {allLabel ? <button type="button" role="option" aria-selected={!selected} onClick={() => { onSelect(''); setOpen(false) }}>{allLabel}</button> : null}
        {visibleOptions.map((option) => <button type="button" role="option" aria-selected={selected === option} key={option} onClick={() => { onSelect(option); setOpen(false) }}>{option}</button>)}
        {!visibleOptions.length ? <span>No matching options</span> : null}
      </div>
    </div> : null}
  </section>
}

function TableSelector({ value, onChange }: { value: string; onChange: (name: string) => void }) {
  const [source, setSource] = useState('')
  const options = TABLE_LINEAGES.map((lineage) => ({
    lineage,
    table: DATA.tables.find((item) => item.name === lineage.tableName),
  }))
  const sources = [...new Set(options.map(({ table }) => table?.src).filter(Boolean))]
  const visibleOptions = options.filter(({ table }) =>
    !source || table?.src === source,
  )

  return <section className="table-selector-card" aria-label="Lineage filters">
    <FilterBox label="Source system" options={sources as string[]} selected={source} onSelect={setSource} allLabel="All source systems" />
    <FilterBox label="Table name" options={visibleOptions.map(({ lineage }) => lineage.tableName)} selected={value} onSelect={onChange} />
  </section>
}

function TableSummary({ table, lineage }: { table?: TableRec; lineage: TableLineage }) {
  const metadata = [['Database', table?.db], ['Schema', table?.schema], ['Source system', table?.src], ['Business cases', table?.bcs.join(', ')], ['Wave', table?.wave], ['Complexity', table?.cplx], ['Technical owner', table?.owner], ['Status', table?.status]]
  return <section className="card table-summary-card">
    <div className="summary-title"><div><span className="flow-kicker">Selected table</span><div className="title-row"><h3>{lineage.tableName}</h3><span className="tid">{table?.id}</span></div></div><div className="summary-volume">{lineage.rowCount?.toLocaleString('en-US')} rows <span>·</span> {lineage.columnCount} columns</div></div>
    <h2>Table details</h2>
    <div className="meta">{metadata.map(([label, value]) => <div key={label}><dt>{label}</dt><dd className={value ? undefined : 'empty'}>{value || 'Not documented'}</dd></div>)}</div>
  </section>
}

/** A qualified name with wrap opportunities after each separator, so narrow cards never break mid-token. */
function TechnicalName({ value }: { value: string }) {
  const parts = splitOnSeparators(value)
  return <>{parts.map((part, index) => <Fragment key={`${part}-${index}`}>{part}{index < parts.length - 1 ? <wbr /> : null}</Fragment>)}</>
}

function StageNode({ node, index, selected, onSelect }: { node: LineageNode; index: number; selected: boolean; onSelect: () => void }) {
  const { qualifier, object } = splitQualifiedName(node.name)
  const tone = node.tone ?? 'live'
  const role = index === 0 ? 'source' : tone === 'target' ? 'target' : 'stage'
  const action = index === 0 ? 'Trace this source' : tone === 'target' ? 'Inspect target' : 'Inspect stage'

  return <button
    type="button"
    aria-pressed={selected}
    title={node.name}
    className={`architecture-node ${tone} role-${role}`}
    onClick={onSelect}
  >
    <span className="node-head">
      <b>{String(index + 1).padStart(2, '0')}</b>
      <span className="node-role">{node.role}</span>
    </span>
    <span className="node-body">
      {qualifier ? <span className="node-qualifier">{qualifier}</span> : null}
      <strong className="node-object"><TechnicalName value={object} /></strong>
      {node.detail ? <span className="node-detail">{node.detail}</span> : null}
      {node.keys?.length ? <span className="node-keys">{node.keys.map((key) => <code key={key}>{key}</code>)}</span> : null}
    </span>
    <span className="node-foot">
      {node.process ? <span className="node-flow"><i>Writes via</i><b>{node.process}</b></span> : null}
      <span className="node-cta">{selected ? 'Selected' : action}</span>
    </span>
  </button>
}

function DownstreamNode({ group, index, selected, onSelect }: { group?: RelatedGroup; index: number; selected: boolean; onSelect: () => void }) {
  const items = group?.items ?? []
  const preview = items.slice(0, 3)

  return <button
    type="button"
    aria-pressed={selected}
    className="architecture-node downstream"
    onClick={onSelect}
  >
    <span className="node-head">
      <b>{String(index + 1).padStart(2, '0')}</b>
      <span className="node-role">Potential downstream dependencies</span>
    </span>
    <span className="node-body">
      <strong className="node-object">{items.length} potential {items.length === 1 ? 'dependency' : 'dependencies'}</strong>
      {group ? <span className="node-detail">Pending confirmation</span> : <span className="node-detail">No downstreams documented</span>}
      {preview.length ? <span className="node-keys">
        {preview.map((item) => <code key={item.name}>{item.name.replace(/^WMBI\./, '')}</code>)}
        {items.length > preview.length ? <code>+{items.length - preview.length} more</code> : null}
      </span> : null}
    </span>
    <span className="node-foot">
      <span className="node-cta">{selected ? 'Close consumers' : 'View consumers'}</span>
    </span>
  </button>
}

function SupportGateway({ group, selected, onToggle }: { group: RelatedGroup; selected: boolean; onToggle: () => void }) {
  const action = group.id === 'injections' ? 'Explore inputs' : 'View dependencies'
  const preview = group.items.slice(0, 2).map((item) => item.name).join(' · ')

  return <button type="button" aria-pressed={selected} className={`support-tile ${group.tone}`} onClick={onToggle}>
    <span className="tile-head">
      <i aria-hidden="true" />
      <b>{group.id === 'injections' ? 'Supporting inputs' : group.label}</b>
      <em>{group.items.length}</em>
    </span>
    <p>{group.description}</p>
    <span className="tile-preview">{preview}{group.items.length > 2 ? ` · +${group.items.length - 2} more` : ''}</span>
    <span className="tile-cta">{selected ? 'Close details' : action}</span>
  </button>
}

function catalogPipelinesFor(name: string): string[] {
  const objectName = name.split('.').at(-1)?.trim()
  if (!objectName) return []
  const table = DATA.tables.find((candidate) => candidate.name.toUpperCase() === objectName.toUpperCase())
  if (!table) return []
  return table.pipeIds.flatMap((pipelineId) => {
    const pipeline = DATA.pipelines.find((candidate) => candidate.id === pipelineId)
    return pipeline ? [pipeline.name] : []
  })
}

function GroupDetail({ group, onClose }: { group: RelatedGroup; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query.trim().toLowerCase())
  const visibleItems = deferredQuery ? group.items.filter((item) => `${item.name} ${item.detail ?? ''}`.toLowerCase().includes(deferredQuery)) : group.items
  return <section className={`architecture-detail group-detail ${group.tone}`}>
    <div className="detail-heading"><div><span>Now exploring · {group.tone} relationship</span><h3>{group.label}</h3><p>{group.description}</p></div><button type="button" onClick={onClose}>Back to main flow</button></div>
    <div className="layer-content">
      {group.items.length >= 8 ? <label className="dependency-filter"><span>Filter dependencies</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name or relationship" /></label> : null}
      <div className="layer-list">{visibleItems.map((item) => {
        const pipelines = catalogPipelinesFor(item.name)
        return <article key={`${group.id}-${item.name}`}>
          <strong>{item.name}</strong>
          <span className="dependency-pipeline"><i>Loaded by</i><b>{pipelines.length ? pipelines.join(', ') : 'Pending validation'}</b></span>
          {item.detail ? <p>{item.detail}</p> : null}
        </article>
      })}{!visibleItems.length ? <p className="empty-results">No matching dependencies.</p> : null}</div>
    </div>
  </section>
}

function EvidencePanel({ label, items, pending = false }: { label: string; items: string[]; pending?: boolean }) {
  return <section className={`evidence-panel${pending ? ' pending' : ''}`}><div className="evidence-heading"><span>{label}</span><b>{items.length}</b></div>{items.length ? <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul> : <p>No findings were identified in the supplied lineage evidence.</p>}</section>
}

function LineageView({ lineage }: { lineage: TableLineage }) {
  const [selectedStage, setSelectedStage] = useState<number | null>(null)
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)
  const [showEvidence, setShowEvidence] = useState(false)
  const downstream = lineage.relatedGroups.find((group) => group.id === 'downstreams')
  const supportingGroups = lineage.relatedGroups.filter((group) => group.id !== 'downstreams' && group.id !== 'legacy')
  const activeGroup = lineage.relatedGroups.find((group) => group.id === selectedGroup)
  const stage = selectedStage === null ? null : lineage.liveFlow[selectedStage]
  const reads = selectedStage === null ? null : lineage.liveFlow[selectedStage - 1]
  const writes = selectedStage === null ? null : lineage.liveFlow[selectedStage + 1]

  return <section className="architecture-workspace">
    <div className="architecture-toolbar">
      <div><span className="flow-kicker">Interactive architecture map</span><h2>{lineage.title}</h2><p>Follow the data from its source, through the active load, into {lineage.tableName} and its potential downstream dependencies.</p></div>
      <div className="architecture-orchestrator"><span>Main load pipeline</span><strong>{lineage.orchestrator}</strong><small>{lineage.cadence}</small></div>
    </div>
    <div className="architecture-legend"><span><i className="live" />Live/current</span><span><i className="injection" />Contextual input</span><span><i className="dependency" />Dependency</span><span><i className="target" />Selected table</span></div>

    <div className="architecture-canvas">
      <div className="pipeline-view integrated-map">
        <section className="support-rail" aria-label="Source and key dependencies">
          <header className="support-rail-head">
            <span>Source and key dependencies</span>
            <small>Open a group only when you need its details.</small>
          </header>
          <div className="support-tiles">
            {supportingGroups.map((group) => <SupportGateway
              key={group.id}
              group={group}
              selected={selectedGroup === group.id}
              onToggle={() => setSelectedGroup((current) => current === group.id ? null : group.id)}
            />)}
          </div>
        </section>

        <section aria-label="Main data path">
          <header className="pipeline-head">
            <div><span className="flow-kicker">Main data path</span><strong>{lineage.liveFlow.length} stages from source to published table, then potential downstream dependencies</strong></div>
            <p>Select a stage to see what it reads, which process moves it, and what comes next.</p>
          </header>
          <div className={`pipeline-path${selectedStage !== null ? ' has-selection' : ''}`}>
            <span className="pipe-rail" aria-hidden="true"><span className="pipe-pulse" /></span>
            {lineage.liveFlow.map((node, index) => <StageNode
              key={`${node.name}-${index}`}
              node={node}
              index={index}
              selected={selectedStage === index}
              onSelect={() => { setSelectedStage(index); setShowEvidence(false) }}
            />)}
            <DownstreamNode
              group={downstream}
              index={lineage.liveFlow.length}
              selected={selectedGroup === 'downstreams'}
              onSelect={() => setSelectedGroup((current) => current === 'downstreams' ? null : 'downstreams')}
            />
          </div>
          <div className="pipeline-axis" aria-hidden="true">
            {lineage.liveFlow.map((node, index) => <span key={`axis-${node.name}-${index}`}>{index === 0 ? 'Source' : node.tone === 'target' ? 'Published table' : ''}</span>)}
            <span>Consumers</span>
          </div>
          <p className="pipeline-note">The pipe reads left to right, source first.<span className="motion-only"> The moving dot marks the direction of the load.</span></p>
        </section>

        {activeGroup ? <GroupDetail group={activeGroup} onClose={() => setSelectedGroup(null)} /> : null}
        {stage ? <section className="process-inspector">
          <div className="selection-context"><span>Now exploring · stage {String((selectedStage ?? 0) + 1).padStart(2, '0')} of {String(lineage.liveFlow.length).padStart(2, '0')}</span><strong>{stage.name}</strong><button type="button" onClick={() => setSelectedStage(null)}>Back to main flow</button></div>
          <div className="process-focus"><span>Reads from</span><strong>{reads?.name ?? 'External origin'}</strong>{reads?.process ? <code>{reads.process}</code> : null}</div><i aria-hidden="true" /><div className="process-focus current"><span>{stage.role}</span><strong>{stage.name}</strong>{stage.detail ? <p>{stage.detail}</p> : null}{stage.keys?.length ? <p>Keys: {stage.keys.join(' · ')}</p> : null}</div><i aria-hidden="true" /><div className="process-focus"><span>Writes to</span><strong>{writes?.name ?? 'Downstream consumers'}</strong>{stage.process ? <code>{stage.process}</code> : null}</div>
          <div className="process-actions"><button type="button" onClick={() => setShowEvidence((visible) => !visible)}>{showEvidence ? 'Hide evidence' : 'View technical evidence'}</button></div>
          {showEvidence ? <div className="technical-evidence"><span>Evidence artifact</span><strong>{lineage.evidence}</strong><p>Relationship documented in the supplied table-level lineage artifact. Status and uncertainty wording are preserved from that source.</p></div> : null}
        </section> : null}
      </div>
    </div>
  </section>
}

export default function FlowView({ active: _active }: { active: boolean }) {
  const [selectedName, setSelectedName] = useState(TABLE_LINEAGES[0].tableName)
  const lineage = TABLE_LINEAGES.find((item) => item.tableName === selectedName) ?? TABLE_LINEAGES[0]
  const table = DATA.tables.find((item) => item.name === selectedName)
  return <div>
    <TableSelector value={selectedName} onChange={setSelectedName} />
    <TableSummary table={table} lineage={lineage} />
    <LineageView key={lineage.tableName} lineage={lineage} />
    <section className="evidence-grid" aria-label="Findings and pending validation"><EvidencePanel label="Findings" items={lineage.findings} /><EvidencePanel label="Pending validation" items={lineage.pendingValidation} pending /></section>
  </div>
}
