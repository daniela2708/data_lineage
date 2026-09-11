import { useDeferredValue, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { DATA } from '../../data/dataset'
import { LINEAGE_REPORTS, type LineageReport, type ReportBlock } from '../../data/lineageReports'
import { schemaGroupsForReport, shouldGroupBySchema, type SchemaGroup } from '../../lib/schemaGroups'
import type { TableRec } from '../../types'

const REPORT_OPTIONS = LINEAGE_REPORTS.map((report) => ({
  report,
  table: DATA.tables.find((item) => item.name === report.tableName),
}))
const SOURCE_OPTIONS = [...new Set(REPORT_OPTIONS.map(({ table }) => table?.src).filter((source): source is string => Boolean(source)))].sort()
const PAIRED_SECTION_TITLES = new Set(['Dependencies', 'Findings', 'Pending validation', 'Important notes'])
const SVG_VIEWBOX = /viewBox=["'](?:-?[\d.]+\s+){2}([\d.]+)\s+([\d.]+)["']/i
const REPORT_NAME_LOOKUP = new Map(LINEAGE_REPORTS.map((report) => [report.tableName.toUpperCase(), report.tableName]))
const SCHEMA_GROUPS_BY_REPORT = new Map(LINEAGE_REPORTS.map((report) => [report.sourceSha256, schemaGroupsForReport(report)]))

function isTallDiagram(svg: string): boolean {
  const viewBox = svg.match(SVG_VIEWBOX)
  if (!viewBox) return false
  const width = Number(viewBox[1])
  const height = Number(viewBox[2])
  return width > 0 && height / width >= 0.78
}

function fitDiagramText(root: HTMLDivElement): void {
  const svg = root.querySelector('svg')
  if (!(svg instanceof SVGSVGElement)) return

  const boxes = [...svg.querySelectorAll('rect')].flatMap((rect) => {
    const x = Number(rect.getAttribute('x'))
    const y = Number(rect.getAttribute('y'))
    const width = Number(rect.getAttribute('width'))
    const height = Number(rect.getAttribute('height'))
    return rect.hasAttribute('stroke') && width >= 60 && height >= 18 && [x, y, width, height].every(Number.isFinite)
      ? [{ x, y, width, height, area: width * height }]
      : []
  })

  for (const text of svg.querySelectorAll('text')) {
    const x = Number(text.getAttribute('x'))
    const y = Number(text.getAttribute('y'))
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue
    const box = boxes
      .filter((candidate) => x >= candidate.x && x <= candidate.x + candidate.width && y >= candidate.y && y <= candidate.y + candidate.height)
      .sort((left, right) => left.area - right.area)[0]
    if (!box) continue

    const anchor = text.getAttribute('text-anchor') ?? 'start'
    const availableWidth = anchor === 'end'
      ? x - box.x - 10
      : anchor === 'middle'
        ? Math.min(x - box.x, box.x + box.width - x) * 2 - 12
        : box.x + box.width - x - 10
    if (availableWidth <= 0) continue

    const measuredWidth = text.getComputedTextLength()
    if (measuredWidth <= availableWidth) continue
    const originalSize = Number(text.getAttribute('font-size')) || 10.5
    const fittedSize = Math.max(8, originalSize * availableWidth / measuredWidth)
    text.style.fontSize = `${fittedSize}px`

    const resizedWidth = text.getComputedTextLength()
    if (resizedWidth > availableWidth) {
      text.setAttribute('textLength', String(availableWidth))
      text.setAttribute('lengthAdjust', 'spacingAndGlyphs')
    }
    text.dataset.fitted = 'true'
  }
}

function centerIsolatedTable(root: HTMLDivElement): void {
  const svg = root.querySelector('svg')
  if (!(svg instanceof SVGSVGElement)) return

  const tableBoxes = [...svg.children].filter((element): element is SVGRectElement => {
    if (!(element instanceof SVGRectElement)) return false
    const width = Number(element.getAttribute('width'))
    const height = Number(element.getAttribute('height'))
    return element.hasAttribute('stroke') && width >= 60 && height >= 18
  })
  if (tableBoxes.length !== 1) return

  const viewBox = svg.viewBox.baseVal
  const table = tableBoxes[0]
  const tableCenter = Number(table.getAttribute('x')) + Number(table.getAttribute('width')) / 2
  if (!Number.isFinite(tableCenter) || viewBox.width <= 0) return

  svg.setAttribute('viewBox', `${tableCenter - viewBox.width / 2} ${viewBox.y} ${viewBox.width} ${viewBox.height}`)
  svg.dataset.centered = 'isolated-table'
}

function FilterBox({ label, options, selected, onSelect, allLabel }: { label: string; options: string[]; selected: string; onSelect: (value: string) => void; allLabel?: string }) {
  const inputId = useId()
  const filterRef = useRef<HTMLElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const deferredQuery = useDeferredValue(query.trim().toLowerCase())
  const visibleOptions = deferredQuery ? options.filter((option) => option.toLowerCase().includes(deferredQuery)) : options

  useEffect(() => {
    if (!open) return

    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !filterRef.current?.contains(event.target)) setOpen(false)
    }
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      triggerRef.current?.focus()
    }

    document.addEventListener('pointerdown', closeOutside)
    document.addEventListener('keydown', closeWithEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOutside)
      document.removeEventListener('keydown', closeWithEscape)
    }
  }, [open])

  return <section ref={filterRef} className="filter-box" aria-labelledby={`${inputId}-label`}>
    <strong id={`${inputId}-label`}>{label}</strong>
    <button ref={triggerRef} className="filter-dropdown-trigger" type="button" aria-haspopup="listbox" aria-expanded={open} aria-controls={`${inputId}-menu`} onClick={() => setOpen((visible) => !visible)}><span>{selected || allLabel || `Choose ${label.toLowerCase()}`}</span><i aria-hidden="true" /></button>
    {open ? <div className="filter-dropdown-menu" id={`${inputId}-menu`}>
      <div className="filter-box-search"><i aria-hidden="true" /><input id={inputId} aria-label={`Search ${label}`} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${label.toLowerCase()}`} autoComplete="off" autoFocus /></div>
      <div className="filter-options-list" role="listbox" aria-labelledby={`${inputId}-label`}>
        {allLabel ? <button type="button" role="option" aria-selected={!selected} onClick={() => { onSelect(''); setOpen(false) }}>{allLabel}</button> : null}
        {visibleOptions.map((option) => <button type="button" role="option" aria-selected={selected === option} key={option} onClick={() => { onSelect(option); setOpen(false) }}>{option}</button>)}
        {!visibleOptions.length ? <span>No matching options</span> : null}
      </div>
    </div> : null}
  </section>
}

function TableSelector({ value, onChange }: { value: string; onChange: (name: string) => void }) {
  const [source, setSource] = useState('')
  const visibleOptions = REPORT_OPTIONS.filter(({ table }) => !source || table?.src === source)

  const selectSource = (nextSource: string) => {
    setSource(nextSource)
    const nextOptions = REPORT_OPTIONS.filter(({ table }) => !nextSource || table?.src === nextSource)
    const selectedRemainsVisible = nextOptions.some(({ report }) => report.tableName === value)
    if (!selectedRemainsVisible && nextOptions[0]) onChange(nextOptions[0].report.tableName)
  }

  return <section className="table-selector-card" aria-label="Lineage filters">
    <FilterBox label="Source system" options={SOURCE_OPTIONS} selected={source} onSelect={selectSource} allLabel="All source systems" />
    <FilterBox label="Table name" options={visibleOptions.map(({ report }) => report.tableName)} selected={value} onSelect={onChange} />
  </section>
}

function TableSummary({ table, report }: { table?: TableRec; report: LineageReport }) {
  const metadata = [['Database', table?.db], ['Schema', table?.schema], ['Source system', table?.src], ['Business cases', table?.bcs.join(', ')], ['Wave', table?.wave], ['Complexity', table?.cplx], ['Technical owner', table?.owner], ['Status', table?.status]]
  const volume = report.rowCount !== null && report.columnCount !== null
    ? `${report.rowCount.toLocaleString('en-US')} rows · ${report.columnCount.toLocaleString('en-US')} columns`
    : 'Volume not documented in report'

  return <details className="card table-summary-card table-summary-disclosure">
    <summary>
      <div className="summary-identity"><span className="flow-kicker">Selected table</span><div className="title-row"><h3>{report.tableName}</h3><span className="tid">{table?.id}</span></div></div>
      <div className="summary-glance">
        <span className="summary-source">{table?.src || 'Source not documented'}</span>
        <span className="summary-volume">{volume}</span>
        <span className="summary-toggle"><i aria-hidden="true" />Catalog details</span>
      </div>
    </summary>
    <div className="summary-details">
      <h2>Catalog details</h2>
      <div className="meta">{metadata.map(([label, value]) => <div key={label}><dt>{label}</dt><dd className={value ? undefined : 'empty'}>{value || 'Not documented'}</dd></div>)}</div>
    </div>
  </details>
}

function ReportBlockView({ block }: { block: ReportBlock }) {
  if (block.type === 'heading') return <h3 className="report-subheading">{block.text}</h3>
  if (block.type === 'paragraph') return <p className="report-intro">{block.text}</p>
  if (block.type === 'list') return <ul className="report-list">{block.items.map((item, index) => <li key={`${item.text}-${index}`}><span>{item.text}</span>{item.note ? <small>{item.note}</small> : null}</li>)}</ul>

  return <div className="report-table-scroll" tabIndex={0} role="region" aria-label="Scrollable report table">
    <table className="report-table"><tbody>{block.rows.map((row, rowIndex) => <tr key={`${row.map((cell) => cell.text).join('-')}-${rowIndex}`}>{row.map((cell, cellIndex) => {
      const Cell = cell.kind === 'header' ? 'th' : 'td'
      return <Cell className={`report-cell-${cell.kind}`} key={`${cell.text}-${cellIndex}`}>{cell.text}</Cell>
    })}</tr>)}</tbody></table>
  </div>
}

function ReportSection({ section }: { section: LineageReport['sections'][number] }) {
  const tone = section.title.toLowerCase().replaceAll(' ', '-')
  return <section className={`report-section-card report-section-${tone}`}>
    <div className="report-section-heading"><h2>{section.title}</h2><span>{section.blocks.length} source blocks</span></div>
    <div className="report-section-content">{section.blocks.map((block, index) => <ReportBlockView block={block} key={`${block.type}-${index}`} />)}</div>
  </section>
}

function ReportSections({ sections }: { sections: LineageReport['sections'] }) {
  const dependencies = sections.find((section) => section.title === 'Dependencies')
  const findings = sections.find((section) => section.title === 'Findings')
  const pendingValidation = sections.find((section) => section.title === 'Pending validation')
  const importantNotes = sections.find((section) => section.title === 'Important notes')
  const standalone = sections.filter((section) => !PAIRED_SECTION_TITLES.has(section.title))

  return <div className="report-sections">
    {standalone.map((section) => <ReportSection section={section} key={section.title} />)}
    {dependencies || findings ? <div className="report-section-stack">
      {dependencies ? <ReportSection section={dependencies} /> : null}
      {findings ? <ReportSection section={findings} /> : null}
    </div> : null}
    {pendingValidation || importantNotes ? <div className="report-section-pair">
      {pendingValidation ? <ReportSection section={pendingValidation} /> : null}
      {importantNotes ? <ReportSection section={importantNotes} /> : null}
    </div> : null}
  </div>
}

function SchemaExplorer({ groups, currentTable, onOpenReport }: { groups: SchemaGroup[]; currentTable: string; onOpenReport: (tableName: string) => void }) {
  const tableCount = groups.reduce((total, group) => total + group.tables.length, 0)

  return <section className="schema-explorer" aria-labelledby="schema-explorer-title">
    <div className="schema-explorer-heading">
      <div><span className="flow-kicker">Compact diagram index</span><h3 id="schema-explorer-title">Explore tables by schema</h3></div>
      <span>{groups.length} schemas · {tableCount} tables</span>
    </div>
    <div className="schema-group-grid">
      {groups.map((group) => <details className="schema-group" key={group.schema}>
        <summary>
          <span className="schema-group-icon" aria-hidden="true">{group.schema.slice(0, 2).toUpperCase()}</span>
          <span className="schema-group-name"><strong>{group.schema}</strong><small>{group.tables.length} tables</small></span>
          <i aria-hidden="true" />
        </summary>
        <ul>
          {group.tables.map((table) => {
            const reportName = REPORT_NAME_LOOKUP.get(table.tableName.toUpperCase())
            const canOpen = Boolean(reportName && reportName !== currentTable)
            return <li key={table.qualifiedName}>
              {canOpen ? <button type="button" onClick={() => onOpenReport(reportName!)}>
                <span>{table.tableName}</span><em>Open report</em>
              </button> : <div className={reportName ? 'is-current' : undefined}>
                <span>{table.tableName}</span><em>{reportName ? 'Current report' : 'Referenced table'}</em>
              </div>}
              {table.detail ? <small title={table.detail}>{table.detail}</small> : null}
            </li>
          })}
        </ul>
      </details>)}
    </div>
  </section>
}

function SourceDiagram({ report, hasDependencies, onOpenReport }: { report: LineageReport; hasDependencies: boolean; onOpenReport: (tableName: string) => void }) {
  const diagramRef = useRef<HTMLDivElement>(null)
  const tallDiagram = isTallDiagram(report.diagramSvg)
  const schemaGroups = SCHEMA_GROUPS_BY_REPORT.get(report.sourceSha256) ?? []
  const groupedDiagram = shouldGroupBySchema(schemaGroups)

  useLayoutEffect(() => {
    if (!diagramRef.current) return
    fitDiagramText(diagramRef.current)
    if (!hasDependencies) centerIsolatedTable(diagramRef.current)
  }, [hasDependencies, report.diagramSvg])

  return <section className={`report-diagram-card${tallDiagram ? ' is-tall' : ''}`}>
    <div className="report-diagram-heading">
      <div><span className="flow-kicker">Source lineage artifact</span><h2>{report.title}</h2><p>{report.subtitle}</p></div>
      <div className="report-source-actions">
        <span><i aria-hidden="true" />Source report verified</span>
        <a href={report.publicPath} target="_blank" rel="noreferrer">Open original HTML</a>
      </div>
    </div>
    <div className="report-legend" aria-label="Diagram legend"><span><i className="external" />External source</span><span><i className="live" />Live process</span><span><i className="injection" />Injection</span><span><i className="dependency" />Fact dependency</span><span><i className="target" />Target table</span><span><i className="legacy" />Inactive path</span></div>
    {groupedDiagram ? <SchemaExplorer groups={schemaGroups} currentTable={report.tableName} onOpenReport={onOpenReport} /> : null}
    <div className="report-diagram-scroll" tabIndex={0} role="region" aria-label={`Scrollable lineage diagram for ${report.tableName}`}>
      <div ref={diagramRef} className="report-diagram-svg" dangerouslySetInnerHTML={{ __html: report.diagramSvg }} />
    </div>
  </section>
}

export default function FlowView({ active: _active }: { active: boolean }) {
  const [selectedName, setSelectedName] = useState(LINEAGE_REPORTS[0]?.tableName ?? '')
  const report = LINEAGE_REPORTS.find((item) => item.tableName === selectedName) ?? LINEAGE_REPORTS[0]
  if (!report) return <p>No lineage HTML reports were generated.</p>
  const table = DATA.tables.find((item) => item.name === report.tableName)
  const hasDependencies = report.sections.some((section) => section.title === 'Dependencies')

  return <div>
    <TableSelector value={selectedName} onChange={setSelectedName} />
    <TableSummary table={table} report={report} key={report.sourceFile} />
    <SourceDiagram report={report} hasDependencies={hasDependencies} onOpenReport={setSelectedName} key={report.sourceSha256} />
    <ReportSections sections={report.sections} />
    <p className="report-footer">{report.footer}</p>
  </div>
}
