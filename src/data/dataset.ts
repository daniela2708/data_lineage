import raw from './lineage.json'
import type { Dataset } from '../types'

/**
 * The table catalog is generated from public/Data Catalog V1.xlsx. The JSON is
 * checked in so the browser does not have to parse a workbook at runtime. Run
 * npm run generate:data to refresh it; src/types.ts describes the contract.
 */
export const DATA = raw as unknown as Dataset

/** Tables in Phase 1 scope. anomalies.test.ts checks the count against the summary. */
export const scopedTables = DATA.tables.filter((t) => t.scope === 'In Scope')
