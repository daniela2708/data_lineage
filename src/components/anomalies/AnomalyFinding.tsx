import { RESOLUTION_LABELS, anomalyForTable, isFullyTraced } from '../../data/anomalies'

export function TableStatusBadge({ tableName }: { tableName: string }) {
  const finding = anomalyForTable(tableName)
  if (finding) return <span className={`table-status-badge resolution-${finding.anomaly.resolutionType}`}><i aria-hidden="true" />{finding.anomaly.name}</span>
  if (isFullyTraced(tableName)) return <span className="table-status-badge fully-traced"><i aria-hidden="true" />Lineage fully traced</span>
  return null
}

export default function AnomalyFinding({ tableName }: { tableName: string }) {
  const finding = anomalyForTable(tableName)
  if (!finding) return null

  const { anomaly, table } = finding
  return <section className={`table-anomaly-finding resolution-${anomaly.resolutionType}`} aria-labelledby={`finding-${anomaly.id}`}>
    <div className="table-anomaly-heading">
      <div><span>Anomaly / finding</span><h2 id={`finding-${anomaly.id}`}>{anomaly.name}</h2></div>
      <span className={`resolution-badge resolution-${anomaly.resolutionType}`}>{RESOLUTION_LABELS[anomaly.resolutionType]}</span>
    </div>
    <p>{anomaly.description}</p>
    <dl>
      <div><dt>Impact</dt><dd>{anomaly.impact}</dd></div>
      {table.wave ? <div><dt>Migration wave</dt><dd>{table.wave}</dd></div> : null}
    </dl>
    {table.note ? <p className="table-anomaly-note">{table.note}</p> : null}
    {anomaly.notes?.map((note) => <p className="table-anomaly-note" key={note}>{note}</p>)}
  </section>
}
