import rawIndex from './lineageReports.json'

export type ReportCell = {
  text: string
  kind: 'header' | 'group' | 'item' | 'value'
}

export type ReportBlock =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'table'; rows: ReportCell[][] }
  | { type: 'list'; items: { text: string; note?: string }[] }

export type ReportSection = { title: string; blocks: ReportBlock[] }

/** What the table picker and the summary card need, held in memory for all reports. */
export type LineageReportIndexEntry = {
  tableName: string
  qualifiedTable: string
  title: string
  subtitle: string
  sourceFile: string
  publicPath: string
  sourceSha256: string
  rowCount: number | null
  columnCount: number | null
  carrierCount: number
}

/** The body of one report: the diagram and every parsed section. */
export type LineageReportDetail = {
  sections: ReportSection[]
  diagramSvg: string
  footer: string
}

export type LineageReport = LineageReportIndexEntry & LineageReportDetail

export const LINEAGE_REPORTS: LineageReportIndexEntry[] = (rawIndex as { reports: LineageReportIndexEntry[] }).reports
export const LINEAGE_REPORT_BY_TABLE = new Map(LINEAGE_REPORTS.map((report) => [report.tableName, report]))

/**
 * One chunk per report rather than one bundle for all 57. The explorer shows a
 * single table at a time, so the diagram and sections of the other 56 are never
 * read. scripts/generate-lineage-reports.mjs writes these files; the loader is
 * keyed by sourceFile so the two stay in step.
 */
const detailModules = import.meta.glob<{ default: LineageReportDetail }>('./reportDetails/*.json')

const detailCache = new Map<string, Promise<LineageReportDetail>>()

export function loadReportDetail(sourceFile: string): Promise<LineageReportDetail> {
  const cached = detailCache.get(sourceFile)
  if (cached) return cached

  const path = `./reportDetails/${sourceFile.replace(/[.]html$/, '')}.json`
  const load = detailModules[path]
  if (!load) return Promise.reject(new Error(`No lineage detail file was generated for ${sourceFile}`))

  const pending = load().then((module) => module.default)
  detailCache.set(sourceFile, pending)
  return pending
}
