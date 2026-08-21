import { businessCases, DATA } from '../data/dataset'
import type { ViewKey } from '../types'

interface Props {
  query: string
  onQuery: (q: string) => void
  selectedBcs: Set<string>
  onToggleBc: (bc: string) => void
  scopeOnly: boolean
  onToggleScope: () => void
  view: ViewKey
  onView: (v: ViewKey) => void
}

const VIEWS: [ViewKey, string][] = [
  ['flow', 'Animated flow'],
  ['table', 'Table view'],
  ['estate', 'Whole estate'],
]

export default function Toolbar({
  query,
  onQuery,
  selectedBcs,
  onToggleBc,
  scopeOnly,
  onToggleScope,
  view,
  onView,
}: Props) {
  return (
    <div className="bar">
      <div className="page-shell bar-inner">
        <div className="view-switcher">
          <span className="lbl">Explore by</span>
          <div className="seg" role="group" aria-label="View">
            {VIEWS.map(([key, label]) => (
              <button key={key} aria-pressed={view === key} onClick={() => onView(key)}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {view === 'table' && (
        <div className="filter-strip">
          <div className="page-shell table-filters">
            <div className="filter-group">
              <span className="lbl">Scope</span>
              <div className="scope-seg" role="group" aria-label="Table scope">
                <button
                  aria-pressed={scopeOnly}
                  onClick={() => !scopeOnly && onToggleScope()}
                >
                  Phase 1 <small>{DATA.meta.inScope}</small>
                </button>
                <button
                  aria-pressed={!scopeOnly}
                  onClick={() => scopeOnly && onToggleScope()}
                >
                  All tables <small>{DATA.meta.total}</small>
                </button>
              </div>
            </div>

            <label className="filter-group search-filter">
              <span className="lbl">Find</span>
              <input
                type="search"
                value={query}
                onChange={(e) => onQuery(e.target.value)}
                placeholder="Table, ID, source system, owner"
                aria-label="Search tables"
              />
            </label>

            <div className="filter-group">
              <span className="lbl">Business case</span>
              <div className="filter-options">
                {businessCases.map((bc) => (
                  <button
                    key={bc}
                    className="chip red"
                    aria-pressed={selectedBcs.has(bc)}
                    onClick={() => onToggleBc(bc)}
                  >
                    {bc}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
