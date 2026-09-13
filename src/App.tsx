import { lazy, Suspense, useState } from 'react'
import AccessGate from './components/AccessGate'
import AppChrome from './components/AppChrome'
import ExplorerNav, { type ExplorerSection } from './components/ExplorerNav'
import { LINEAGE_REPORT_SUMMARY } from './data/lineageReportSummary'

const FlowView = lazy(() => import('./components/flow/FlowView'))
const AnomaliesView = lazy(() => import('./components/anomalies/AnomaliesView'))

export default function App() {
  const [hasAccess, setHasAccess] = useState(false)
  const [section, setSection] = useState<ExplorerSection>('lineage')
  const [selectedTableName, setSelectedTableName] = useState('')

  if (!hasAccess) return <AccessGate onUnlock={() => setHasAccess(true)} />

  const openLineage = (tableName: string) => {
    setSelectedTableName(tableName)
    setSection('lineage')
    requestAnimationFrame(() => document.querySelector('main')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  return (
    <>
      <AppChrome />
      <ExplorerNav value={section} onChange={setSection} />
      <div className="page-shell wrap">
        <main><Suspense fallback={<p className="lineage-loading">Loading explorer…</p>}>
          {section === 'lineage'
            ? <FlowView selectedTableName={selectedTableName} onSelectTable={setSelectedTableName} />
            : <AnomaliesView onOpenLineage={openLineage} />}
        </Suspense></main>
      </div>
      <footer>
        <div className="page-shell footer-inner">
          <span>Proprietary and confidential</span>
          <span>{LINEAGE_REPORT_SUMMARY.catalogTableCount} catalog tables · {LINEAGE_REPORT_SUMMARY.reportCount} table-level lineage reports · source: Data Catalog V1.xlsx + diagramas_html/*.html</span>
        </div>
      </footer>
    </>
  )
}
