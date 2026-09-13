import { describe, expect, it } from 'vitest'
import { DATA, scopedTables } from './dataset'
import { LINEAGE_REPORT_BY_TABLE } from './lineageReports'
import {
  ANOMALIES,
  ANOMALY_SUMMARY,
  FULLY_TRACED_TABLES,
  QUESTIONS_FOR_WEIS,
  anomalyForTable,
} from './anomalies'

describe('anomaly source data', () => {
  it('preserves the executive summary totals', () => {
    expect(ANOMALY_SUMMARY).toEqual({ phaseOneTables: 63, fullyTraced: 31, withAnomaly: 32, anomalyTypes: 8 })
    expect(scopedTables).toHaveLength(ANOMALY_SUMMARY.phaseOneTables)
    expect(FULLY_TRACED_TABLES).toHaveLength(ANOMALY_SUMMARY.fullyTraced)
    expect(ANOMALIES).toHaveLength(ANOMALY_SUMMARY.anomalyTypes)
    expect(ANOMALIES.reduce((total, anomaly) => total + anomaly.tables.length, 0)).toBe(ANOMALY_SUMMARY.withAnomaly)
  })

  it('preserves the eight category counts in source order', () => {
    expect(ANOMALIES.map((anomaly) => anomaly.tables.length)).toEqual([6, 9, 6, 5, 3, 1, 1, 1])
  })

  it('maps every classified entry to one unique Phase 1 catalog record', () => {
    const tableNames = ANOMALIES.flatMap((anomaly) => anomaly.tables.map((table) => table.name))
    expect(new Set(tableNames).size).toBe(tableNames.length)
    for (const tableName of tableNames) {
      const catalogTable = DATA.tables.find((table) => table.name === tableName)
      expect(catalogTable, tableName).toBeDefined()
      expect(catalogTable?.scope, tableName).toBe('In Scope')
      expect(anomalyForTable(tableName)?.table.name).toBe(tableName)
    }
  })

  it('keeps external entries as classifications rather than lineage defects', () => {
    const external = ANOMALIES[0]
    expect(external.isLineageDefect).toBe(false)
    expect(external.resolutionType).toBe('no-action')
    expect(external.tables).toHaveLength(6)
  })

  it('preserves the three high-value single-table findings', () => {
    expect(anomalyForTable('OPERATOR_DIM')?.table.note).toContain('1,615 of 2,194 rows')
    expect(anomalyForTable('OPERATOR_DIM')?.table.note).toContain('74%')
    expect(anomalyForTable('RECLM_SCAN_DETAIL_F')?.table.note).toContain('April 25, 2026')
    expect(anomalyForTable('CUSTOMER_ATTR_XREF')?.table.note).toContain('124 million rows')
    expect(anomalyForTable('CUSTOMER_ATTR_XREF')?.table.note).toContain('2019')
  })

  it('preserves the three Weis question groups and their table totals', () => {
    expect(QUESTIONS_FOR_WEIS).toHaveLength(3)
    expect(QUESTIONS_FOR_WEIS.map((question) => question.groups.flatMap((group) => group.tables).length)).toEqual([16, 5, 5])
    expect(QUESTIONS_FOR_WEIS[2].notes.join(' ')).toContain('retail-calendar')
  })

  it('can connect every Oracle anomaly table to an existing lineage report', () => {
    const oracleAnomalies = ANOMALIES.slice(1).flatMap((anomaly) => anomaly.tables)
    for (const table of oracleAnomalies) expect(LINEAGE_REPORT_BY_TABLE.has(table.name), table.name).toBe(true)
  })
})
