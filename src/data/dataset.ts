import raw from './lineage.json'
import type { Dataset } from '../types'

/**
 * The table catalog is generated from public/Data Catalog V1.xlsx. The JSON is
 * checked in so the browser does not have to parse a workbook at runtime. Run
 * npm run generate:data to refresh it; src/types.ts describes the contract.
 */
export const DATA = raw as unknown as Dataset

/** Tables in Phase 1 scope, the default working set. */
export const scopedTables = DATA.tables.filter((t) => t.scope === 'In Scope')

/** In scope and with no pipeline recorded: where the tracing effort sits. */
export const tablesWithoutPipeline = scopedTables.filter((t) => !t.pipeIds.length)

/** In scope and read by the legacy reporting estate. */
export const tablesInLegacyReporting = scopedTables.filter((t) => t.inwf)

/** Every business case that appears on a table, sorted. */
export const businessCases = [...new Set(DATA.tables.flatMap((t) => t.bcs))].sort()
