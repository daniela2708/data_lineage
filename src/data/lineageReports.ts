import raw from './lineageReports.json'

export type ReportCell = {
  text: string
  kind: 'header' | 'group' | 'item' | 'value'
}

export type ReportBlock =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'table'; rows: ReportCell[][] }
  | { type: 'list'; items: { text: string; note?: string }[] }

export type LineageReport = {
  tableName: string
  qualifiedTable: string
  title: string
  subtitle: string
  sourceFile: string
  publicPath: string
  sourceSha256: string
  diagramSvg: string
  rowCount: number | null
  columnCount: number | null
  sections: { title: string; blocks: ReportBlock[] }[]
  footer: string
  carrierCount: number
}

type LineageReportDataset = { reports: LineageReport[] }

export const LINEAGE_REPORTS = (raw as LineageReportDataset).reports
export const LINEAGE_REPORT_BY_TABLE = new Map(LINEAGE_REPORTS.map((report) => [report.tableName, report]))
