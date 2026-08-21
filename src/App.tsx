import { useMemo, useState } from 'react'
import Header from './components/Header'
import StatStrip from './components/StatStrip'
import Toolbar from './components/Toolbar'
import TableList from './components/TableList'
import FlowView from './components/flow/FlowView'
import TableView from './components/table/TableView'
import EstateView from './components/estate/EstateView'
import { DATA } from './data/dataset'
import type { ViewKey } from './types'

export default function App() {
  const [view, setView] = useState<ViewKey>('flow')
  const [query, setQuery] = useState('')
  const [selectedBcs, setSelectedBcs] = useState<Set<string>>(new Set())
  const [scopeOnly, setScopeOnly] = useState(true)
  const [selectedId, setSelectedId] = useState<string>(DATA.flow.id)

  const tables = useMemo(() => {
    const q = query.trim().toLowerCase()
    return DATA.tables
      .filter((t) => {
        if (scopeOnly && t.scope !== 'In Scope') return false
        if (selectedBcs.size && !t.bcs.some((b) => selectedBcs.has(b))) return false
        if (q) {
          const hay = [t.name, t.id, t.src, t.owner, t.domain, t.schema]
            .join(' ')
            .toLowerCase()
          if (!hay.includes(q)) return false
        }
        return true
      })
      .sort((a, b) => b.bcn - a.bcn || a.name.localeCompare(b.name))
  }, [query, selectedBcs, scopeOnly])

  // Keep the selection valid as filters change, without losing it needlessly.
  const effectiveId = tables.some((t) => t.id === selectedId)
    ? selectedId
    : (tables[0]?.id ?? null)
  const selected = DATA.tables.find((t) => t.id === effectiveId)

  const toggleBc = (bc: string) =>
    setSelectedBcs((prev) => {
      const next = new Set(prev)
      if (next.has(bc)) next.delete(bc)
      else next.add(bc)
      return next
    })

  const changeView = (nextView: ViewKey) => {
    setView(nextView)
    window.scrollTo({ top: 0, behavior: 'auto' })
  }

  const openTable = (id: string) => {
    setSelectedId(id)
    setScopeOnly(true)
    setView('table')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <>
      <Header />
      <StatStrip />
      <Toolbar
        query={query}
        onQuery={setQuery}
        selectedBcs={selectedBcs}
        onToggleBc={toggleBc}
        scopeOnly={scopeOnly}
        onToggleScope={() => setScopeOnly((v) => !v)}
        view={view}
        onView={changeView}
      />

      <div className={`page-shell ${view === 'table' ? 'wrap view-table' : 'wrap wide'}`}>
        {view === 'table' && (
          <TableList tables={tables} selectedId={effectiveId} onSelect={setSelectedId} />
        )}
        <main>
          {/* The flow stays mounted so the timeline does not restart on every switch. */}
          <div className={view === 'flow' ? undefined : 'hide'}>
            <FlowView active={view === 'flow'} />
          </div>
          {view === 'table' && (
            <TableView
              table={selected}
              onSelectTable={setSelectedId}
              onOpenFlow={() => {
                setView('flow')
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
            />
          )}
          {view === 'estate' && <EstateView onSelectTable={openTable} />}
        </main>
      </div>

      <footer>
        <div className="page-shell footer-inner">
          <span>Proprietary and confidential</span>
          <span>
            {DATA.meta.total} tables · {DATA.meta.pipelines} pipelines · {DATA.meta.triggers}{' '}
            triggers · source: Data Catalog V1.xlsx · lineage documented on the ADF side only
          </span>
        </div>
      </footer>
    </>
  )
}
