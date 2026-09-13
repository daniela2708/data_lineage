import { useDeferredValue, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { DATA } from '../../data/dataset'
import AnomalyFinding, { TableStatusBadge } from '../anomalies/AnomalyFinding'
import OverviewHeader from '../OverviewHeader'
import StatStrip from '../StatStrip'
import {
  LINEAGE_REPORTS,
  LINEAGE_REPORT_BY_TABLE,
  loadReportDetail,
  type LineageReportDetail,
  type LineageReportIndexEntry,
  type ReportBlock,
  type ReportSection,
} from '../../data/lineageReports'
import { schemaGroupsForReport, shouldGroupBySchema, type SchemaGroup } from '../../lib/schemaGroups'
import type { TableRec } from '../../types'

const TABLE_BY_NAME = new Map(DATA.tables.map((table) => [table.name, table]))
const REPORT_OPTIONS = LINEAGE_REPORTS.map((report) => ({ report, table: TABLE_BY_NAME.get(report.tableName) }))
const SOURCE_OPTIONS = [...new Set(REPORT_OPTIONS.map(({ table }) => table?.src).filter((source): source is string => Boolean(source)))].sort()
const PAIRED_SECTION_TITLES = new Set(['Dependencies', 'Findings', 'Pending validation', 'Important notes'])
const SVG_VIEWBOX = /viewBox=["'](?:-?[\d.]+\s+){2}([\d.]+)\s+([\d.]+)["']/i
const REPORT_NAME_LOOKUP = new Map(LINEAGE_REPORTS.map((report) => [report.tableName.toUpperCase(), report.tableName]))

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

    // The tightest box containing the label is the one that actually clips it.
    let box: (typeof boxes)[number] | undefined
    for (const candidate of boxes) {
      if (x < candidate.x || x > candidate.x + candidate.width) continue
      if (y < candidate.y || y > candidate.y + candidate.height) continue
      if (!box || candidate.area < box.area) box = candidate
    }
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

/**
 * The diagram and sections of one report arrive as their own chunk, so the
 * picker and the catalog summary stay interactive while a table is opened.
 */
function useReportDetail(sourceFile: string) {
  const [state, setState] = useState<{ sourceFile: string; detail: LineageReportDetail | null; failure: string }>(
    { sourceFile, detail: null, failure: '' },
  )

  useEffect(() => {
    let current = true
    setState({ sourceFile, detail: null, failure: '' })
    loadReportDetail(sourceFile).then(
      (detail) => { if (current) setState({ sourceFile, detail, failure: '' }) },
      (error: unknown) => {
        if (current) setState({ sourceFile, detail: null, failure: error instanceof Error ? error.message : 'The lineage report could not be read.' })
      },
    )
    return () => { current = false }
  }, [sourceFile])

  // A stale chunk must never render under the heading of another table.
  return state.sourceFile === sourceFile ? state : { detail: null, failure: '' }
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

const optionsForSource = (source: string) => REPORT_OPTIONS.filter(({ table }) => !source || table?.src === source)

function TableSelector({ value, onChange }: { value: string; onChange: (name: string) => void }) {
  const [source, setSource] = useState('')
  const visibleOptions = useMemo(() => optionsForSource(source), [source])

  const selectSource = (nextSource: string) => {
    setSource(nextSource)
    const nextOptions = optionsForSource(nextSource)
    const selectedRemainsVisible = nextOptions.some(({ report }) => report.tableName === value)
    if (!selectedRemainsVisible && nextOptions[0]) onChange(nextOptions[0].report.tableName)
  }

  return <>
    <section className="lineage-filter-bar" aria-label="Lineage filters">
      <div className="table-selector-filters">
        <FilterBox label="Source system" options={SOURCE_OPTIONS} selected={source} onSelect={selectSource} allLabel="All source systems" />
        <FilterBox label="Table name" options={visibleOptions.map(({ report }) => report.tableName)} selected={value} onSelect={onChange} />
      </div>
    </section>
    <section className="lineage-overview" aria-labelledby="lineage-overview-title">
      <OverviewHeader
        eyebrow="Phase 1 discovery"
        title="Lineage overview"
        titleId="lineage-overview-title"
        description="Explore lineage by source system and table name to see how data moves through the current environment."
      />
      <StatStrip />
    </section>
  </>
}

function TableSummary({ table, report }: { table?: TableRec; report: LineageReportIndexEntry }) {
  const metadata = [['Database', table?.db], ['Schema', table?.schema], ['Source system', table?.src], ['Business cases', table?.bcs.join(', ')], ['Wave', table?.wave], ['Complexity', table?.cplx], ['Technical owner', table?.owner], ['Status', table?.status]]
  const volume = report.rowCount !== null && report.columnCount !== null
    ? `${report.rowCount.toLocaleString('en-US')} rows · ${report.columnCount.toLocaleString('en-US')} columns`
    : 'Volume not documented in report'

  return <details className="card table-summary-card table-summary-disclosure">
    <summary>
      <div className="summary-identity"><span className="flow-kicker">Selected table</span><div className="title-row"><h3>{report.tableName}</h3><span className="tid">{table?.id}</span></div></div>
      <div className="summary-glance">
        <TableStatusBadge tableName={report.tableName} />
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

function ReportSectionCard({ section }: { section: ReportSection }) {
  const tone = section.title.toLowerCase().replaceAll(' ', '-')
  return <section className={`report-section-card report-section-${tone}`}>
    <div className="report-section-heading"><h2>{section.title}</h2><span>{section.blocks.length} source blocks</span></div>
    <div className="report-section-content">{section.blocks.map((block, index) => <ReportBlockView block={block} key={`${block.type}-${index}`} />)}</div>
  </section>
}

function ReportSections({ sections }: { sections: ReportSection[] }) {
  const { dependencies, findings, pendingValidation, importantNotes, standalone } = useMemo(() => {
    const paired: Record<string, ReportSection | undefined> = {}
    const rest: ReportSection[] = []
    for (const section of sections) {
      if (PAIRED_SECTION_TITLES.has(section.title)) paired[section.title] = section
      else rest.push(section)
    }
    return {
      dependencies: paired.Dependencies,
      findings: paired.Findings,
      pendingValidation: paired['Pending validation'],
      importantNotes: paired['Important notes'],
      standalone: rest,
    }
  }, [sections])

  return <div className="report-sections">
    {standalone.map((section) => <ReportSectionCard section={section} key={section.title} />)}
    {dependencies || findings ? <div className="report-section-stack">
      {dependencies ? <ReportSectionCard section={dependencies} /> : null}
      {findings ? <ReportSectionCard section={findings} /> : null}
    </div> : null}
    {pendingValidation || importantNotes ? <div className="report-section-pair">
      {pendingValidation ? <ReportSectionCard section={pendingValidation} /> : null}
      {importantNotes ? <ReportSectionCard section={importantNotes} /> : null}
    </div> : null}
  </div>
}

function reportProcessLabel(sections: ReportSection[]): string {
  const orchestrator = sections.find((section) => section.title === 'Orchestrator')
  if (!orchestrator) return 'Documented loading process'

  for (const block of orchestrator.blocks) {
    if (block.type !== 'table') continue
    const flowRow = block.rows.find((row) => row[0]?.text.trim().toLowerCase() === 'flow')
    if (flowRow?.[1]?.text) return flowRow[1].text
  }
  return 'Documented loading process'
}

function SourceGroup({ group, currentTable, onOpenReport }: { group: SchemaGroup; currentTable: string; onOpenReport: (tableName: string) => void }) {
  return <details className="compact-source-group">
    <summary>
      <span className="compact-group-stack" aria-hidden="true"><i /><i /><i /></span>
      <span className="compact-group-copy"><strong>{group.schema}</strong><small>{group.tables.length} source tables</small></span>
      <span className="compact-group-toggle" aria-hidden="true" />
    </summary>
    <ul>
      {group.tables.map((table) => {
        const reportName = REPORT_NAME_LOOKUP.get(table.tableName.toUpperCase())
        const openableReport = reportName && reportName !== currentTable ? reportName : ''
        return <li className="compact-source-table" key={table.qualifiedName}>
          <div>
            <span>{table.tableName}</span>
            <em>{table.schema}</em>
          </div>
          {table.detail ? <small>{table.detail}</small> : null}
          {openableReport ? <button type="button" onClick={() => onOpenReport(openableReport)}>Open table report</button> : null}
        </li>
      })}
    </ul>
  </details>
}

function CompactSourceDiagram({ groups, report, detail, onOpenReport }: { groups: SchemaGroup[]; report: LineageReportIndexEntry; detail: LineageReportDetail; onOpenReport: (tableName: string) => void }) {
  const tableCount = groups.reduce((total, group) => total + group.tables.length, 0)
  const volume = report.rowCount !== null && report.columnCount !== null
    ? `${report.rowCount.toLocaleString('en-US')} rows · ${report.columnCount.toLocaleString('en-US')} columns`
    : 'Volume not documented'

  return <div className="compact-lineage" role="region" aria-label={`${tableCount} upstream source tables grouped by schema, feeding ${report.qualifiedTable}`}>
    <section className="compact-lineage-stage compact-source-stage" aria-label="Grouped upstream source tables">
      <div className="compact-stage-label"><span>Upstream sources</span><em>{groups.length} {groups.length === 1 ? 'schema' : 'schemas'} · {tableCount} tables</em></div>
      <div className="compact-source-groups">
        {groups.map((group) => <SourceGroup group={group} currentTable={report.tableName} onOpenReport={onOpenReport} key={group.schema} />)}
      </div>
    </section>
    <div className="compact-lineage-connector" aria-hidden="true"><span>feeds</span><i /></div>
    <section className="compact-process-node" aria-label="Loading process">
      <span>Loading process</span>
      <strong>{reportProcessLabel(detail.sections)}</strong>
      <small>Aggregated upstream path</small>
    </section>
    <div className="compact-lineage-connector" aria-hidden="true"><span>writes</span><i /></div>
    <section className="compact-target-node" aria-label="Target table">
      <span>Target table</span>
      <strong>{report.qualifiedTable}</strong>
      <small>{volume}</small>
    </section>
  </div>
}

function SourceDiagram({ report, detail, onOpenReport }: { report: LineageReportIndexEntry; detail: LineageReportDetail; onOpenReport: (tableName: string) => void }) {
  const diagramRef = useRef<HTMLDivElement>(null)
  const [originalOpen, setOriginalOpen] = useState(false)
  const tallDiagram = isTallDiagram(detail.diagramSvg)
  const hasDependencies = detail.sections.some((section) => section.title === 'Dependencies')
  const schemaGroups = useMemo(
    () => schemaGroupsForReport({ tableName: report.tableName, qualifiedTable: report.qualifiedTable, sections: detail.sections }),
    [detail.sections, report.qualifiedTable, report.tableName],
  )
  const groupedDiagram = shouldGroupBySchema(schemaGroups)

  useLayoutEffect(() => {
    if (!diagramRef.current) return
    fitDiagramText(diagramRef.current)
    if (!hasDependencies) centerIsolatedTable(diagramRef.current)
  }, [hasDependencies, originalOpen, detail.diagramSvg])

  return <section className={`report-diagram-card${tallDiagram ? ' is-tall' : ''}`}>
    <div className="report-diagram-heading">
      <div><span className="flow-kicker">Source lineage artifact</span><h2>{report.title}</h2><p>{report.subtitle}</p></div>
      <div className="report-source-actions">
        <span><i aria-hidden="true" />Source report verified</span>
        <a href={report.publicPath} target="_blank" rel="noreferrer">Open original HTML</a>
      </div>
    </div>
    <div className="report-legend" aria-label="Diagram legend"><span><i className="external" />External source</span><span><i className="live" />Live process</span><span><i className="injection" />Injection</span><span><i className="dependency" />Fact dependency</span><span><i className="target" />Target table</span><span><i className="legacy" />Inactive path</span></div>
    {groupedDiagram ? <>
      <CompactSourceDiagram groups={schemaGroups} report={report} detail={detail} onOpenReport={onOpenReport} />
      <details className="original-diagram-disclosure" onToggle={(event) => setOriginalOpen(event.currentTarget.open)}>
        <summary><span><strong>Full verified diagram</strong><small>Show every original node and connection</small></span><i aria-hidden="true" /></summary>
        <div className="report-diagram-scroll" tabIndex={0} role="region" aria-label={`Scrollable full lineage diagram for ${report.tableName}`}>
          <div ref={diagramRef} className="report-diagram-svg" dangerouslySetInnerHTML={{ __html: detail.diagramSvg }} />
        </div>
      </details>
    </> : <div className="report-diagram-scroll" tabIndex={0} role="region" aria-label={`Scrollable lineage diagram for ${report.tableName}`}>
      <div ref={diagramRef} className="report-diagram-svg" dangerouslySetInnerHTML={{ __html: detail.diagramSvg }} />
    </div>}
  </section>
}

function ReportBody({ report, onSelectTable }: { report: LineageReportIndexEntry; onSelectTable: (tableName: string) => void }) {
  const { detail, failure } = useReportDetail(report.sourceFile)

  if (failure) return <p className="lineage-loading" role="alert">{failure}</p>
  if (!detail) return <p className="lineage-loading">Loading the lineage report for {report.tableName}…</p>

  return <>
    <SourceDiagram report={report} detail={detail} onOpenReport={onSelectTable} />
    <ReportSections sections={detail.sections} />
    <p className="report-footer">{detail.footer}</p>
  </>
}

export default function FlowView({ selectedTableName, onSelectTable }: { selectedTableName: string; onSelectTable: (tableName: string) => void }) {
  const report = LINEAGE_REPORT_BY_TABLE.get(selectedTableName) ?? LINEAGE_REPORTS[0]
  if (!report) return <p>No lineage HTML reports were generated.</p>

  return <div>
    <TableSelector value={report.tableName} onChange={onSelectTable} />
    <TableSummary table={TABLE_BY_NAME.get(report.tableName)} report={report} key={report.sourceFile} />
    <AnomalyFinding tableName={report.tableName} />
    <ReportBody report={report} onSelectTable={onSelectTable} key={report.sourceSha256} />
  </div>
}
