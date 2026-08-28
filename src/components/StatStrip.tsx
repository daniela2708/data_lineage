import { TABLE_LINEAGES } from '../data/tableLineages'

/** Counts that frame the whole prototype. Every one is derived, none is typed in. */
export default function StatStrip() {
  const stats: [string, number][] = [
    ['Tables available', TABLE_LINEAGES.length],
    ['Live process nodes', TABLE_LINEAGES.reduce((total, table) => total + table.liveFlow.length, 0)],
    ['Related relationships', TABLE_LINEAGES.reduce((total, table) => total + table.relatedGroups.reduce((count, group) => count + group.items.length, 0), 0)],
    ['Pending validations', TABLE_LINEAGES.reduce((total, table) => total + table.pendingValidation.length, 0)],
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
