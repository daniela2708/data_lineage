import { DATA } from '../data/dataset'
import { impact } from '../lib/tokens'
import type { TableRec } from '../types'

interface Props {
  tables: TableRec[]
  selectedId: string | null
  onSelect: (id: string) => void
}

/** The sidebar. Dot colour says how widely a change to that table would be felt. */
export default function TableList({ tables, selectedId, onSelect }: Props) {
  return (
    <aside>
      <div className="aside-h">
        <b>Tables</b>
        <em>
          {tables.length} shown of {DATA.tables.length}
        </em>
      </div>
      <div>
        {!tables.length && (
          <div className="row" style={{ color: 'var(--n-d2)' }}>
            Nothing matches those filters.
          </div>
        )}
        {tables.map((t) => (
          <button
            key={t.id}
            className="row"
            aria-selected={t.id === selectedId}
            onClick={() => onSelect(t.id)}
          >
            <div className="nm">{t.name}</div>
            <div className="mt">
              <span className="dot" style={{ background: impact(t.bcn) }} />
              <span className="tid">{t.id}</span>
              {!!t.bcs.length && <span className="tid">· {t.bcs.join(' ')}</span>}
            </div>
          </button>
        ))}
      </div>
    </aside>
  )
}
