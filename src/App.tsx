import { lazy, Suspense, useState } from 'react'
import AccessGate, { hasSessionAccess } from './components/AccessGate'
import Header from './components/Header'
import StatStrip from './components/StatStrip'
import { LINEAGE_REPORT_SUMMARY } from './data/lineageReportSummary'

const FlowView = lazy(() => import('./components/flow/FlowView'))

export default function App() {
  const [hasAccess, setHasAccess] = useState(hasSessionAccess)

  if (!hasAccess) return <AccessGate onUnlock={() => setHasAccess(true)} />

  return (
    <>
      <Header />
      <StatStrip />
      <div className="page-shell wrap wide">
        <main><Suspense fallback={<p className="lineage-loading">Loading lineage reports…</p>}><FlowView active /></Suspense></main>
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
