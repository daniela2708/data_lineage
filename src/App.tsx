import Header from './components/Header'
import StatStrip from './components/StatStrip'
import FlowView from './components/flow/FlowView'
import { DATA } from './data/dataset'

export default function App() {
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
          <span>{DATA.meta.total} tables · {DATA.meta.pipelines} pipelines · source: Data Catalog V1.xlsx · lineage documented on the ADF side only</span>
        </div>
      </footer>
    </>
  )
}
