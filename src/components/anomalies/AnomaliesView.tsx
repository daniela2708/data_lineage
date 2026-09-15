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
  type AnomalyTable,
} from '../../data/anomalies'

const WAVE_OPTIONS = [...new Set(ANOMALIES.flatMap((anomaly) => anomaly.tables.map((table) => table.wave).filter((wave): wave is string => Boolean(wave))))].sort()
const SUMMARY_METRICS: SummaryMetric[] = [
  { label: 'Phase 1 tables', value: ANOMALY_SUMMARY.phaseOneTables },
  { label: 'Fully traced', value: ANOMALY_SUMMARY.fullyTraced, tone: 'positive' },
  { label: 'With anomaly', value: ANOMALY_SUMMARY.withAnomaly, tone: 'warning' },
  { label: 'Anomaly types', value: ANOMALY_SUMMARY.anomalyTypes },
]

type AffectedTable = {
  table: AnomalyTable
  anomalies: Anomaly[]
}

const AFFECTED_TABLES = [...ANOMALIES.reduce((byTable, anomaly) => {
  for (const table of anomaly.tables) {
    const key = table.name.toUpperCase()
    const current = byTable.get(key)
    if (current) current.anomalies.push(anomaly)
    else byTable.set(key, { table, anomalies: [anomaly] })
  }
  return byTable
}, new Map<string, AffectedTable>()).values()]

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

function AffectedTableCard({ result, onOpenLineage }: { result: AffectedTable; onOpenLineage: (tableName: string) => void }) {
  const { table, anomalies } = result
  return <article className="anomaly-table-item affected-table-card">
    <div>
      <strong>{table.name}</strong>
      {table.wave ? <span>{table.wave}</span> : null}
    </div>
    <ul aria-label={`Anomaly types for ${table.name}`}>
      {anomalies.map((anomaly) => <li key={anomaly.id}>{anomaly.name}</li>)}
    </ul>
    {table.note ? <p>{table.note}</p> : null}
    {hasLineageReport(table.name)
      ? <button type="button" onClick={() => onOpenLineage(table.name)}>Open lineage <span aria-hidden="true">→</span></button>
      : <small>{table.name === 'SALES PLAN SPREADSHEET INPUTS' ? 'Manual process · no table-level lineage expected' : 'No table-level lineage report available'}</small>}
  </article>
}

export default function AnomaliesView({ onOpenLineage }: { onOpenLineage: (tableName: string) => void }) {
  const [query, setQuery] = useState('')
  const [type, setType] = useState('')
  const [wave, setWave] = useState('')
  const deferredQuery = useDeferredValue(query.trim().toLowerCase())

  const results = useMemo(() => AFFECTED_TABLES.filter(({ table, anomalies }) => (
    (!deferredQuery || table.name.toLowerCase().includes(deferredQuery))
    && (!type || anomalies.some((anomaly) => anomaly.id === type))
    && (!wave || table.wave === wave)
  )), [deferredQuery, type, wave])

  const visibleTypeCount = useMemo(() => new Set(results.flatMap(({ anomalies }) => (
    anomalies.filter((anomaly) => !type || anomaly.id === type).map((anomaly) => anomaly.id)
  ))).size, [results, type])
  const clearFilters = () => { setQuery(''); setType(''); setWave('') }

  return <div className="anomalies-view">
    <OverviewHeader
      eyebrow="Phase 1 assessment"
      title="Anomalies overview"
      description="Lineage shows where data comes from. Anomalies show what is incomplete, suspicious, stale, external, undocumented, or awaiting a decision."
    />

    <SummaryStrip metrics={SUMMARY_METRICS} label="Anomaly summary" />

    <aside className="lineage-distinction"><i aria-hidden="true">i</i><p><strong>Fully traced does not mean defect free.</strong> A complete technical lineage can still carry a data-quality, freshness, ownership, operational, or business finding.</p></aside>

    <section className="anomaly-section" aria-labelledby="anomalies-by-type-title">
      <div className="anomaly-section-heading"><div><span className="flow-kicker">Cross-cutting view</span><h2 id="anomalies-by-type-title">Anomalies by type</h2></div></div>
      <div className="anomaly-type-list">
        {ANOMALIES.map((anomaly) => <article key={anomaly.id}>
          <h3>{anomaly.name}</h3>
          <ul>{anomaly.tables.map((table) => <li key={table.name}>{table.name}</li>)}</ul>
        </article>)}
      </div>
    </section>

    <section className="anomaly-explorer" aria-labelledby="anomaly-explorer-title">
      <div className="anomaly-section-heading"><div><span className="flow-kicker">Explore findings</span><h2 id="anomaly-explorer-title">Affected tables</h2></div><span>{results.length} {results.length === 1 ? 'table' : 'tables'} · {visibleTypeCount} {visibleTypeCount === 1 ? 'type' : 'types'} shown</span></div>
      <div className="anomaly-filters">
        <label><span>Table name</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tables" /></label>
        <label><span>Anomaly type</span><select value={type} onChange={(event) => setType(event.target.value)}><option value="">All anomaly types</option>{ANOMALIES.map((anomaly) => <option value={anomaly.id} key={anomaly.id}>{anomaly.name}</option>)}</select></label>
        <label><span>Wave</span><select value={wave} onChange={(event) => setWave(event.target.value)}><option value="">All waves</option>{WAVE_OPTIONS.map((option) => <option key={option}>{option}</option>)}</select></label>
        <button type="button" onClick={clearFilters}>Clear</button>
      </div>
      <div className="anomaly-category-list">
        {results.length ? <div className="anomaly-table-grid affected-table-grid">{results.map((result) => <AffectedTableCard result={result} onOpenLineage={onOpenLineage} key={result.table.name} />)}</div> : null}
        {!results.length ? <div className="anomaly-empty"><strong>No affected tables match the selected filters.</strong><button type="button" onClick={clearFilters}>Clear filters</button></div> : null}
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
