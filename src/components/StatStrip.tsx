import { DATA, tablesInLegacyReporting, tablesWithoutPipeline } from '../data/dataset'

/** Counts that frame the whole prototype. Every one is derived, none is typed in. */
export default function StatStrip() {
  const stats: [string, number][] = [
    ['Tables tracked', DATA.meta.total],
    ['In Phase 1 scope', DATA.meta.inScope],
    ['Traced end to end', 1],
    ['Pipelines', DATA.meta.pipelines],
    ['Triggers', DATA.meta.triggers],
    ['Read by legacy reporting', tablesInLegacyReporting.length],
    ['No pipeline recorded', tablesWithoutPipeline.length],
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
