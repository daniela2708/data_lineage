import { useDeferredValue, useMemo, useState } from 'react'
import OverviewHeader from '../OverviewHeader'
import SummaryStrip, { type SummaryMetric } from '../SummaryStrip'
import {
  ANOMALIES,
  ANOMALY_SUMMARY,
  QUESTIONS_FOR_WEIS,
  RESOLUTION_LABELS,
  anomalyForTable,
  type Anomaly,
  type AnomalyResolution,
  type AnomalyTable,
} from '../../data/anomalies'

const WAVE_OPTIONS = [...new Set(ANOMALIES.flatMap((anomaly) => anomaly.tables.map((table) => table.wave).filter((wave): wave is string => Boolean(wave))))].sort()
const ACTION_OPTIONS = [...new Set(ANOMALIES.map((anomaly) => anomaly.resolutionType))]
const ANOMALY_POSITIONS = new Map(ANOMALIES.map((anomaly, index) => [anomaly.id, index + 1]))
const PRIORITY_TABLES = ['OPERATOR_DIM', 'RECLM_SCAN_DETAIL_F', 'CUSTOMER_ATTR_XREF'] as const
const SUMMARY_METRICS: SummaryMetric[] = [
  { label: 'Phase 1 tables', value: ANOMALY_SUMMARY.phaseOneTables },
  { label: 'Fully traced', value: ANOMALY_SUMMARY.fullyTraced, tone: 'positive' },
  { label: 'With anomaly', value: ANOMALY_SUMMARY.withAnomaly, tone: 'warning' },
  { label: 'Anomaly types', value: ANOMALY_SUMMARY.anomalyTypes },
]

/**
 * External classifications are deliberately outside Oracle table lineage, so no
 * report is generated for them. anomalies.test.ts holds the other half of this:
 * every entry that is a lineage defect does have a report to open.
 */
function hasLineageReport(tableName: string): boolean {
  return anomalyForTable(tableName)?.anomaly.isLineageDefect ?? false
}

function TableAction({ table, onOpenLineage }: { table: AnomalyTable; onOpenLineage: (tableName: string) => void }) {
  return <article className="anomaly-table-item">
    <div>
      <strong>{table.name}</strong>
      {table.wave ? <span>{table.wave}</span> : null}
    </div>
    {table.note ? <p>{table.note}</p> : null}
    {hasLineageReport(table.name)
      ? <button type="button" onClick={() => onOpenLineage(table.name)}>Open lineage <span aria-hidden="true">→</span></button>
      : <small>{table.name === 'SALES PLAN SPREADSHEET INPUTS' ? 'Manual process · no table-level lineage expected' : 'No table-level lineage report available'}</small>}
  </article>
}

function CategoryDetails({ anomaly, tables, onOpenLineage, open, onToggle }: { anomaly: Anomaly; tables: readonly AnomalyTable[]; onOpenLineage: (tableName: string) => void; open: boolean; onToggle: (open: boolean) => void }) {
  return <details id={`anomaly-${anomaly.id}`} className={`anomaly-category resolution-${anomaly.resolutionType}`} open={open} onToggle={(event) => onToggle(event.currentTarget.open)}>
    <summary>
      <span className="anomaly-index" aria-hidden="true">{String(ANOMALY_POSITIONS.get(anomaly.id) ?? 0).padStart(2, '0')}</span>
      <span className="anomaly-category-name"><strong>{anomaly.name}</strong><small>{anomaly.description}</small></span>
      <span className={`resolution-badge resolution-${anomaly.resolutionType}`}>{RESOLUTION_LABELS[anomaly.resolutionType]}</span>
      <b>{tables.length}</b>
      <i aria-hidden="true" />
    </summary>
    <div className="anomaly-category-body">
      <div className="anomaly-impact"><span>What it blocks / impact</span><strong>{anomaly.impact}</strong></div>
      {!anomaly.isLineageDefect ? <p className="external-distinction"><strong>Classification, not a defect.</strong> These entries are intentionally outside Oracle table lineage.</p> : null}
      <div className="anomaly-table-grid">{tables.map((table) => <TableAction table={table} onOpenLineage={onOpenLineage} key={table.name} />)}</div>
      {anomaly.notes?.length ? <div className="anomaly-notes">{anomaly.notes.map((note) => <p key={note}>{note}</p>)}</div> : null}
    </div>
  </details>
}

export default function AnomaliesView({ onOpenLineage }: { onOpenLineage: (tableName: string) => void }) {
  const [query, setQuery] = useState('')
  const [type, setType] = useState('')
  const [wave, setWave] = useState('')
  const [action, setAction] = useState<AnomalyResolution | ''>('')
  const [openCategories, setOpenCategories] = useState(() => new Set<string>())
  const deferredQuery = useDeferredValue(query.trim().toLowerCase())

  const results = useMemo(() => ANOMALIES.flatMap((anomaly) => {
    if (type && anomaly.id !== type) return []
    if (action && anomaly.resolutionType !== action) return []
    const tables = anomaly.tables.filter((table) => {
      if (wave && table.wave !== wave) return false
      if (!deferredQuery) return true
      return `${table.name} ${table.note ?? ''}`.toLowerCase().includes(deferredQuery)
    })
    return tables.length ? [{ anomaly, tables }] : []
  }), [action, deferredQuery, type, wave])

  const visibleTableCount = results.reduce((count, result) => count + result.tables.length, 0)
  const clearFilters = () => { setQuery(''); setType(''); setWave(''); setAction('') }
  const revealCategory = (id: string) => {
    setOpenCategories((current) => new Set(current).add(id))
    requestAnimationFrame(() => document.getElementById(`anomaly-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  return <div className="anomalies-view">
    <OverviewHeader
      eyebrow="Phase 1 assessment"
      title="Anomalies overview"
      description="Lineage shows where data comes from. Anomalies show what is incomplete, suspicious, stale, external, undocumented, or awaiting a decision."
    />

    <SummaryStrip metrics={SUMMARY_METRICS} label="Anomaly summary" />

    <aside className="lineage-distinction"><i aria-hidden="true">i</i><p><strong>Fully traced does not mean defect free.</strong> A complete technical lineage can still carry a data-quality, freshness, ownership, operational, or business finding.</p></aside>

    <section className="anomaly-section priority-findings" aria-labelledby="priority-findings-title">
      <div className="anomaly-section-heading"><div><span className="flow-kicker">Attention required</span><h2 id="priority-findings-title">Priority findings</h2></div></div>
      <div className="priority-list">{PRIORITY_TABLES.flatMap((tableName) => {
        const match = anomalyForTable(tableName)
        if (!match) return []
        return [<article className="priority-row" key={tableName}>
          <div><strong>{tableName}</strong><span className={`resolution-badge resolution-${match.anomaly.resolutionType}`}>{RESOLUTION_LABELS[match.anomaly.resolutionType]}</span></div>
          <p>{match.table.note}</p>
          {hasLineageReport(tableName) ? <button type="button" onClick={() => onOpenLineage(tableName)}>Open lineage →</button> : null}
        </article>]
      })}</div>
    </section>

    <section className="anomaly-section" aria-labelledby="distribution-title">
      <div className="anomaly-section-heading"><div><span className="flow-kicker">Cross-cutting view</span><h2 id="distribution-title">Anomaly distribution</h2></div><span>{ANOMALY_SUMMARY.withAnomaly} classified entries</span></div>
      <div className="anomaly-distribution-scroll" tabIndex={0} role="region" aria-label="Anomaly distribution table">
        <table className="anomaly-distribution"><thead><tr><th>Anomaly</th><th>Tables</th><th>Impact</th><th>Required action</th><th /></tr></thead>
          <tbody>{ANOMALIES.map((anomaly) => <tr key={anomaly.id}><td>{anomaly.name}{!anomaly.isLineageDefect ? <small>External classification</small> : null}</td><td>{anomaly.tables.length}</td><td>{anomaly.impact}</td><td><span className={`resolution-badge resolution-${anomaly.resolutionType}`}>{RESOLUTION_LABELS[anomaly.resolutionType]}</span></td><td><button type="button" onClick={() => revealCategory(anomaly.id)}>View</button></td></tr>)}</tbody>
        </table>
      </div>
    </section>

    <section className="anomaly-explorer" aria-labelledby="anomaly-explorer-title">
      <div className="anomaly-section-heading"><div><span className="flow-kicker">Explore findings</span><h2 id="anomaly-explorer-title">Affected tables</h2></div><span>{visibleTableCount} tables · {results.length} types shown</span></div>
      <div className="anomaly-filters">
        <label><span>Table name</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tables" /></label>
        <label><span>Anomaly type</span><select value={type} onChange={(event) => setType(event.target.value)}><option value="">All anomaly types</option>{ANOMALIES.map((anomaly) => <option value={anomaly.id} key={anomaly.id}>{anomaly.name}</option>)}</select></label>
        <label><span>Wave</span><select value={wave} onChange={(event) => setWave(event.target.value)}><option value="">All waves</option>{WAVE_OPTIONS.map((option) => <option key={option}>{option}</option>)}</select></label>
        <label><span>Required action</span><select value={action} onChange={(event) => setAction(event.target.value as AnomalyResolution | '')}><option value="">All actions</option>{ACTION_OPTIONS.map((option) => <option value={option} key={option}>{RESOLUTION_LABELS[option]}</option>)}</select></label>
        <button type="button" onClick={clearFilters}>Clear</button>
      </div>
      <div className="anomaly-category-list">
        {results.map(({ anomaly, tables }) => <CategoryDetails anomaly={anomaly} tables={tables} onOpenLineage={onOpenLineage} open={openCategories.has(anomaly.id)} onToggle={(open) => setOpenCategories((current) => { const next = new Set(current); if (open) next.add(anomaly.id); else next.delete(anomaly.id); return next })} key={anomaly.id} />)}
        {!results.length ? <div className="anomaly-empty"><strong>No anomalies match these filters.</strong><button type="button" onClick={clearFilters}>Clear filters</button></div> : null}
      </div>
    </section>

    <section className="anomaly-section open-questions" aria-labelledby="questions-title">
      <div className="anomaly-section-heading"><div><span className="flow-kicker">Decisions and dependencies</span><h2 id="questions-title">Questions for Weis</h2></div><span>{QUESTIONS_FOR_WEIS.length} question groups</span></div>
      <p className="questions-intro">The first question can unblock half of the anomalies and needs IT action. The second and third require business answers.</p>
      <div>{QUESTIONS_FOR_WEIS.map((question, index) => <details className="question-card" key={question.id}>
        <summary><b>{index + 1}</b><span><strong>{question.title}</strong><small>{question.summary}</small></span><span className={`resolution-badge resolution-${question.resolutionType}`}>{RESOLUTION_LABELS[question.resolutionType]}</span><i aria-hidden="true" /></summary>
        <div className="question-body">{question.groups.map((group) => <section key={group.title}><h3>{group.title} <span>{group.tables.length}</span></h3><div className="question-table-list">{group.tables.map((table) => <TableAction table={table} onOpenLineage={onOpenLineage} key={table.name} />)}</div></section>)}<div className="anomaly-notes">{question.notes.map((note) => <p key={note}>{note}</p>)}</div></div>
      </details>)}</div>
    </section>

    <p className="report-footer">Based on all {ANOMALY_SUMMARY.phaseOneTables} Phase 1 scope tables, the Oracle catalog, and 882 DataMigrator files · September 2026.</p>
  </div>
}
