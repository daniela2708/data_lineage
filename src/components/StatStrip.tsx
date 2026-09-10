import { LINEAGE_REPORT_SUMMARY } from '../data/lineageReportSummary'

/** Counts that frame the whole prototype. Every one is derived, none is typed in. */
export default function StatStrip() {
  const stats: [string, number][] = [
    ['Tables available', LINEAGE_REPORT_SUMMARY.reportCount],
    ['Tables in catalog', LINEAGE_REPORT_SUMMARY.catalogTableCount],
  ]

  return (
    <div className="stats">
      <div className="page-shell stats-inner">
        {stats.map(([label, value]) => (
          <div className="stat" key={label}>
            <b>{value}</b>
            <i>{label}</i>
          </div>
        ))}
      </div>
    </div>
  )
}
