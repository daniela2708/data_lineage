import { useState } from 'react'
import AccessGate, { hasSessionAccess } from './components/AccessGate'
import Header from './components/Header'
import StatStrip from './components/StatStrip'
import FlowView from './components/flow/FlowView'
import { DATA } from './data/dataset'

export default function App() {
  const [hasAccess, setHasAccess] = useState(hasSessionAccess)

  if (!hasAccess) return <AccessGate onUnlock={() => setHasAccess(true)} />

  return (
    <>
      <Header />
      <StatStrip />
      <div className="page-shell wrap wide">
        <main><FlowView active /></main>
      </div>
      <footer>
        <div className="page-shell footer-inner">
          <span>Proprietary and confidential</span>
          <span>{DATA.meta.total} catalog tables · 3 table-level lineage references · source: Data Catalog V1.xlsx + public/*_lineage.html</span>
        </div>
      </footer>
    </>
  )
}
