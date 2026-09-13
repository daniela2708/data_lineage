import SummaryStrip, { type SummaryMetric } from './SummaryStrip'
import { LINEAGE_REPORT_SUMMARY } from '../data/lineageReportSummary'

/** Counts that frame the whole prototype. Every one is derived, none is typed in. */
export default function StatStrip() {
  const metrics: SummaryMetric[] = [
    { label: 'Tables available', value: LINEAGE_REPORT_SUMMARY.reportCount },
    { label: 'Tables in catalog', value: LINEAGE_REPORT_SUMMARY.catalogTableCount },
  ]

  return <SummaryStrip metrics={metrics} label="Lineage coverage" />
}
