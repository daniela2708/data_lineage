import { useEffect, useState } from 'react'
import LineageGraph from './LineageGraph'
import { DATA } from '../../data/dataset'
import { C } from '../../lib/tokens'
import { joinDot } from '../../lib/text'
import type { TableRec } from '../../types'

interface Props {
  table: TableRec | undefined
  onOpenFlow: () => void
  onSelectTable: (id: string) => void
}

const NOTE_INITIAL_ENTRIES = 4

interface NoteEntry {
  date: string
  dateTime?: string
  text: string
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const

function displayDate(value: string): Pick<NoteEntry, 'date' | 'dateTime'> {
  const [monthText, dayText, yearText] = value.split('/')
  const month = Number(monthText)
  const day = Number(dayText)
  const monthName = MONTH_NAMES[month - 1]
  if (!monthName || !day) return { date: value }
  if (!yearText) return { date: `${monthName} ${day}` }

  const numericYear = Number(yearText)
  const year = yearText.length === 2 ? 2000 + numericYear : numericYear
  return {
    date: `${monthName} ${day}`,
    dateTime: `${year}-${monthText.padStart(2, '0')}-${dayText.padStart(2, '0')}`,
  }
}

function noteEntries(note: string): NoteEntry[] {
  return note
    .split(/(?=(?<![\d/])\d{1,2}\/\d{1,2}(?:\/\d{2,4})?:)/g)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const match = part.match(/^(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?):\s*/)
      return match
        ? { ...displayDate(match[1]), text: part.slice(match[0].length) }
        : { date: 'Recorded', text: part }
    })
}

function NoteTimeline({ note, expanded }: { note: string; expanded: boolean }) {
  const entries = noteEntries(note)
  const visible = expanded ? entries : entries.slice(0, NOTE_INITIAL_ENTRIES)

  return (
    <div className="note-history">
      {visible.map((entry, index) => (
        <article className="history-entry" key={`${entry.date}-${index}`}>
          <time dateTime={entry.dateTime}>{entry.date}</time>
          <p>{entry.text}</p>
        </article>
      ))}
    </div>
  )
}

function statusColor(status: string): string {
  if (/Failed|Blocked/.test(status)) return C.red
  if (status === 'Complete') return C.ecosystem
  return C.blue
}

function RelationshipExplorer({
  table,
  onSelectTable,
}: {
  table: TableRec
  onSelectTable: (id: string) => void
}) {
  const isTraced = table.id === DATA.flow.id
  const upstream = isTraced
    ? Array.from(
        new Map(
          DATA.flow.nodes
            .flatMap((node) => node.side ?? [])
            .map((input) => [input.id ?? input.label, input]),
        ).values(),
      )
    : []
  const allSharedPipelineTables = DATA.tables
    .filter(
      (candidate) =>
        candidate.id !== table.id &&
        candidate.pipeIds.some((pipelineId) => table.pipeIds.includes(pipelineId)),
    )
    .sort((a, b) => a.name.localeCompare(b.name))
  const sharedPipelineTables = allSharedPipelineTables.slice(0, 8)

  return (
    <div className="relationship-explorer">
      <div className="relationship-heading">
        <div>
          <span className="relationship-kicker">Relationship explorer</span>
          <h3>Dependencies and related tables</h3>
          <p>Follow documented inputs, identify evidence gaps, or open a related catalog table.</p>
        </div>
        <span>Evidence from source files</span>
      </div>

      <div className="relationship-grid">
        <section className="relationship-column">
          <div className="relationship-title">
            <span className="relationship-type">Upstream inputs</span>
            <strong>{upstream.length || '—'}</strong>
          </div>
          <p>{isTraced ? 'Documented in the end-to-end trace' : 'No table-level trace recorded'}</p>
          <div className="relationship-items">
            {upstream.length ? (
              upstream.map((input) =>
                input.id ? (
                  <button key={input.id} onClick={() => input.id && onSelectTable(input.id)}>
                    <strong>{input.label}</strong>
                    <span>{input.id} · Open table</span>
                  </button>
                ) : (
                  <div key={input.label}>
                    <strong>{input.label}</strong>
                    <span>Not linked to a catalog ID</span>
                  </div>
                ),
              )
            ) : (
              <div className="relationship-empty">Not documented</div>
            )}
          </div>
        </section>

        <section className="relationship-column">
          <div className="relationship-title">
            <span className="relationship-type">Downstream consumers</span>
            <strong>{isTraced ? 'Gap' : '—'}</strong>
          </div>
          <p>{isTraced ? 'Finding from the end-to-end diagram' : 'No consumer trace recorded'}</p>
          <div className="relationship-items">
            <div className="relationship-empty">
              {isTraced ? DATA.flow.downstream : 'Not documented'}
            </div>
          </div>
        </section>

        <section className="relationship-column derived">
          <div className="relationship-title">
            <span className="relationship-type">Shares a pipeline</span>
            <strong>{allSharedPipelineTables.length}</strong>
          </div>
          <p>Derived relationship, not a confirmed dependency. Showing up to 8.</p>
          <div className="relationship-items">
            {sharedPipelineTables.length ? (
              sharedPipelineTables.map((related) => (
                <button key={related.id} onClick={() => onSelectTable(related.id)}>
                  <strong>{related.name}</strong>
                  <span>
                    {related.pipeIds
                      .filter((pipelineId) => table.pipeIds.includes(pipelineId))
                      .join(', ')}{' '}
                    · {related.id} · Open table
                  </span>
                </button>
              ))
            ) : (
              <div className="relationship-empty">No other catalogued table shares its pipeline</div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

export default function TableView({ table, onOpenFlow, onSelectTable }: Props) {
  const [showAllNote, setShowAllNote] = useState(false)

  // A new table means a new note, so collapse it again.
  useEffect(() => setShowAllNote(false), [table?.id])

  if (!table) return null

  const pills: [string, string][] = []
  if (table.scope) pills.push([table.scope, table.scope === 'In Scope' ? C.ecosystem : C.nD2])
  if (table.disp) pills.push([table.disp, C.dark])
  if (table.status) pills.push([table.status, statusColor(table.status)])

  const meta: [string, string][] = [
    ['Database', table.db],
    ['Schema', table.schema],
    ['Source system', table.src],
    ['Business cases', table.bcs.join(', ')],
    ['Wave', table.wave],
    ['Complexity', table.cplx],
    ['Technical owner', table.owner],
    ['Pipelines', table.pipeIds.join(', ')],
  ]

  const isTraced = table.name.toUpperCase() === DATA.flow.table.toUpperCase()
  const historyCount = noteEntries(table.note).length
  const longNote = historyCount > NOTE_INITIAL_ENTRIES

  return (
    <div>
      <div className="card">
        <div className="title-row">
          <h3>{table.name}</h3>
          <span className="tid">{table.id}</span>
          <span>
            {pills.map(([txt, bg]) => (
              <span
                key={txt}
                className="pill"
                style={{ background: bg, color: '#fff', marginRight: 6 }}
              >
                {txt}
              </span>
            ))}
          </span>
        </div>
        <p className="lead">
          {joinDot([table.domain, table.type, table.layer])}
          {table.inwf ? ' · read by legacy reporting' : ' · not in the legacy reporting list'}
        </p>

        <div className="meta">
          {meta.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd className={v ? undefined : 'empty'}>{v || 'Not documented'}</dd>
            </div>
          ))}
        </div>

        {isTraced && (
          <button className="chip solid" style={{ marginTop: 14 }} onClick={onOpenFlow}>
            Open the animated flow for this table
          </button>
        )}
      </div>

      <div className="card">
        <h2>Documented loading path</h2>
        <p className="section-intro">
          This is the recorded route into {table.name}: where it starts, what schedules the load,
          which pipelines move it, and the business cases it supports.
        </p>
        <LineageGraph table={table} />
        <RelationshipExplorer table={table} onSelectTable={onSelectTable} />
      </div>

      {!!table.note && (
        <div className="card history-card">
          <div className="history-heading">
            <div>
              <h2>Recorded against this table</h2>
              <p>Verbatim update history from the source catalog, shown in its recorded order.</p>
            </div>
            <span>{historyCount} entries</span>
          </div>
          {/* Verbatim from the client catalog. Never edited or summarised. */}
          <NoteTimeline note={table.note} expanded={showAllNote} />
          {longNote && (
            <button
              className="chip history-toggle"
              onClick={() => setShowAllNote((v) => !v)}
            >
              {showAllNote ? 'Show recent entries' : `Show all ${historyCount} entries`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
