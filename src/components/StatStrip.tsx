import { DATA } from '../data/dataset'

/** Counts that frame the whole prototype. Every one is derived, none is typed in. */
export default function StatStrip() {
  const tracedTable = DATA.tables.find((table) => table.id === DATA.flow.id)
  const interactingPipelines = new Set([
    ...(tracedTable?.pipeIds.map((id) => DATA.pipelines.find((pipeline) => pipeline.id === id)?.name ?? id) ?? []),
    ...DATA.flow.nodes.flatMap((node) => (node.pipe ? [node.pipe] : [])),
  ])
  const stats: [string, number][] = [
    ['End-to-end trace', 1],
    ['Documented steps', DATA.flow.nodes.length],
    ['Interacting pipelines', interactingPipelines.size],
    ['Business cases', tracedTable?.bcs.length ?? 0],
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
