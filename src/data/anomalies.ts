export type AnomalyResolution =
  | 'no-action'
  | 'needs-files'
  | 'client-question'
  | 'client-decision'
  | 'escalate'

export type AnomalyTable = {
  name: string
  wave?: string
  note?: string
}

export type Anomaly = {
  id: string
  name: string
  description: string
  impact: string
  resolutionType: AnomalyResolution
  isLineageDefect: boolean
  tables: readonly AnomalyTable[]
  notes?: readonly string[]
}

export type OpenQuestion = {
  id: string
  title: string
  summary: string
  resolutionType: AnomalyResolution
  groups: readonly {
    title: string
    tables: readonly AnomalyTable[]
  }[]
  notes: readonly string[]
}

export const ANOMALY_SUMMARY = {
  phaseOneTables: 63,
  fullyTraced: 31,
  withAnomaly: 32,
  anomalyTypes: 8,
} as const

export const RESOLUTION_LABELS: Record<AnomalyResolution, string> = {
  'no-action': 'No action',
  'needs-files': 'Needs files',
  'client-question': 'Client question',
  'client-decision': 'Client decision',
  escalate: 'Escalate now',
}

export const ANOMALIES: readonly Anomaly[] = [
  {
    id: 'external-system',
    name: 'Not an Oracle table, external system',
    description: 'These in-scope entries are external systems or manual processes, not WMBI Oracle tables. Their absence from the Oracle dictionary and table lineage is expected, not a lineage gap.',
    impact: 'Nothing. They are correctly out of the dictionary and lineage.',
    resolutionType: 'no-action',
    isLineageDefect: false,
    tables: [
      { name: 'Organization', note: 'Workday, external HR system' },
      { name: 'Worker', note: 'Workday, external HR system' },
      { name: 'Supervisory Organization', note: 'Workday, external HR system' },
      { name: 'Historical Purchase Order Cost', note: 'Retalix / Biceps, external' },
      { name: 'Historical Purchases', note: 'Retalix / Biceps, external' },
      { name: 'SALES PLAN SPREADSHEET INPUTS', note: 'A manual intake process, not a table. Documented separately.' },
    ],
    notes: ['These entries require new connectors rather than refactors. External-system lead time and third-party coordination should run as a parallel track from week 1.'],
  },
  {
    id: 'no-source-no-pipeline',
    name: 'No source table and no pipeline identified',
    description: 'Neither a feeding source table nor a loading pipeline was found in the material available for analysis.',
    impact: 'Lineage cannot be stated at all.',
    resolutionType: 'needs-files',
    isLineageDefect: true,
    tables: [
      { name: 'CATGY_RPT_COMP', wave: 'Wave 3' },
      { name: 'LOC_ID_EXCL_DT_XREF', wave: 'Wave 4' },
      { name: 'POINTS_EARNED_REDEEMED_F', wave: 'Wave 3' },
      { name: 'POS_POINTS_EARN_F', wave: 'Wave 3' },
      { name: 'AMS_POS_POINTS_EARN_F', wave: 'Wave 3' },
      { name: 'AMS_TX_REWARD_F', wave: 'Wave 3' },
      { name: 'MANUAL_POINT_ADJ_F', wave: 'Wave 3' },
      { name: 'WAREHOUSE_SHIPT_F', wave: 'Wave 4' },
      { name: 'LABOR_DAILY_BUDGET_F', wave: 'Wave 5' },
    ],
    notes: ['The loyalty use case, UC4, cannot be estimated confidently until these gaps are resolved.'],
  },
  {
    id: 'loader-unidentified',
    name: 'Loading process not identified',
    description: 'A source is visible, but the process that loads the target table has not been identified.',
    impact: 'Transformations are unknown and cannot be reproduced.',
    resolutionType: 'needs-files',
    isLineageDefect: true,
    tables: [
      { name: 'GL_DEPT_DIM', wave: 'Wave 1', note: 'Only placeholder references found.' },
      { name: 'AMS_OFFER_DIM', wave: 'Wave 1', note: 'Source known; loading process not identified.' },
      { name: 'ITEM_PRICE_F', wave: 'Wave 1' },
      { name: 'ITEM_COST_F', wave: 'Wave 2' },
      { name: 'LOC_DSD_INVOICE_F', wave: 'Wave 2' },
      { name: 'ITEM_MARKDOWN_DEFAULT_DIM', wave: 'Wave 3' },
    ],
  },
  {
    id: 'file-drop',
    name: 'Appears to be loaded from a file drop',
    description: 'The staging shape and absence of a source connection indicate a file-based feed rather than a database connection.',
    impact: 'Owner and delivery mechanism are unknown.',
    resolutionType: 'client-question',
    isLineageDefect: true,
    tables: [
      { name: 'DT_DIM', wave: 'Wave 1' },
      { name: 'STORE_START_END_DATE', wave: 'Wave 1' },
      { name: 'SALES_DAILY_BUDGET_F', wave: 'Wave 1' },
      { name: 'CLUB_CARD_ATTRIB_DIM', wave: 'Wave 3' },
      { name: 'LABOR_PREM_COST_F', wave: 'Wave 5' },
    ],
  },
  {
    id: 'dead-loader',
    name: 'Loading process is dead',
    description: 'A process exists in DataMigrator, but no execution activity was found.',
    impact: 'Migrating it would migrate something nobody maintains.',
    resolutionType: 'client-decision',
    isLineageDefect: true,
    tables: [
      { name: 'PRICE_LVL_DIM', wave: 'Wave 1', note: 'An associated staging table exists, but loading-pipeline activity was not found.' },
      { name: 'CUSTOMER_SGM_DIM', wave: 'Wave 3', note: 'The loader has no execution activity.' },
      { name: 'SHK_DAILY_LABOR_EXPORT_F', wave: 'Wave 5', note: 'The loader has no execution activity.' },
    ],
    notes: ['A dead loader and a static reference table can look the same in the evidence. Whether to migrate as-is or retire the table is a business question.'],
  },
  {
    id: 'source-unknown-process-known',
    name: 'Source table unknown, process known',
    description: 'The live writer is known, but it is a fact-side injector whose caller and upstream source have not been identified.',
    impact: 'The live writer is a fact-side injector whose caller is unidentified.',
    resolutionType: 'needs-files',
    isLineageDefect: true,
    tables: [
      {
        name: 'OPERATOR_DIM',
        wave: 'Wave 5',
        note: 'The original TLOG loading chain has been frozen since 2016. A fact-side injector maintains much of the table: 1,615 of 2,194 rows, approximately 74%, are placeholder records rather than real operator records.',
      },
    ],
  },
  {
    id: 'pipeline-stale-data',
    name: 'Pipeline runs but the data is stale',
    description: 'The integration flow-irc-data.fex has run daily since June 2020 and reports success, but carries no new reclamation scan data.',
    impact: 'A production feed has been silently broken since April.',
    resolutionType: 'escalate',
    isLineageDefect: true,
    tables: [
      { name: 'RECLM_SCAN_DETAIL_F', wave: 'Wave 2', note: 'No new data has arrived since approximately April 25, 2026—more than four months before the analysis. The pipeline continues to succeed daily without reporting a failure.' },
    ],
  },
  {
    id: 'not-fed-long-time',
    name: 'Has not been fed in a long time',
    description: 'The table contains a very large historical volume but has not received new data for years.',
    impact: 'It may not belong in migration scope at all.',
    resolutionType: 'client-decision',
    isLineageDefect: true,
    tables: [
      { name: 'CUSTOMER_ATTR_XREF', wave: 'Wave 3', note: 'Approximately 124 million rows are present, but the data has been frozen since 2019. Whether it still belongs in migration scope is a business decision.' },
    ],
  },
] as const

export const FULLY_TRACED_TABLES = [
  { name: 'LOC_DIM', wave: 'Wave 1' },
  { name: 'POS_DEPT_DIM', wave: 'Wave 1' },
  { name: 'ITEM_DIM', wave: 'Wave 1' },
  { name: 'CATGY_DIM', wave: 'Wave 1' },
  { name: 'LOC_LINK_CD_XREF', wave: 'Wave 1' },
  { name: 'AMS_OFFER_GRP_XREF', wave: 'Wave 1' },
  { name: 'PRICE_TYPE_DIM', wave: 'Wave 1' },
  { name: 'SCENARIO_DIM', wave: 'Wave 1' },
  { name: 'TX_TYPE_DIM', wave: 'Wave 1' },
  { name: 'AD_GRP_DIM', wave: 'Wave 1' },
  { name: 'LINK_CD_DIM', wave: 'Wave 1' },
  { name: 'LOC_AD_GRP_XREF', wave: 'Wave 1' },
  { name: 'LOC_CATGY_PRICING_STRAT_XREF', wave: 'Wave 1' },
  { name: 'LOC_DEPT_PRICING_STRAT_XREF', wave: 'Wave 1' },
  { name: 'POS_ITEM_TYPE_DIM', wave: 'Wave 1' },
  { name: 'VENDOR_DIM', wave: 'Wave 1' },
  { name: 'SALES_POS_LN_F', wave: 'Wave 1' },
  { name: 'CLUB_CARD_DIM', wave: 'Wave 1' },
  { name: 'POS_TAX_CLASS_DIM', wave: 'Wave 2' },
  { name: 'ADJ_CD_DIM', wave: 'Wave 2' },
  { name: 'WAREHOUSE_SUPPL_DIM', wave: 'Wave 2' },
  { name: 'SHIPPER_ITEM_XREF', wave: 'Wave 2' },
  { name: 'VENDOR_COST_ZONE_XREF', wave: 'Wave 2' },
  { name: 'VENDOR_LOC_XREF', wave: 'Wave 2' },
  { name: 'VENDOR_ITEM_XREF', wave: 'Wave 2' },
  { name: 'SALES_POS_TX_F', wave: 'Wave 2' },
  { name: 'INV_AS_COUNTED_F', wave: 'Wave 2' },
  { name: 'DAILY_LOC_FUEL_F', wave: 'Wave 2' },
  { name: 'SUNOCO_FUEL_PRTNR_PRGM_F', wave: 'Wave 2' },
  { name: 'VENDOR_ITEM_ADJ_F', wave: 'Wave 2' },
  { name: 'CLUB_CARD_ATTRIB_XREF', wave: 'Wave 3' },
] as const

export const QUESTIONS_FOR_WEIS: readonly OpenQuestion[] = [
  {
    id: 'missing-datamigrator-files',
    title: 'Missing DataMigrator files',
    summary: 'Sixteen tables across anomaly groups 2, 3, and 6 are blocked because the relevant DataMigrator files have not been provided or identified.',
    resolutionType: 'needs-files',
    groups: [
      {
        title: 'Missing source and/or pipeline',
        tables: [
          { name: 'CATGY_RPT_COMP', wave: 'Wave 3' }, { name: 'LOC_ID_EXCL_DT_XREF', wave: 'Wave 4' },
          { name: 'POINTS_EARNED_REDEEMED_F', wave: 'Wave 3' }, { name: 'POS_POINTS_EARN_F', wave: 'Wave 3' },
          { name: 'AMS_POS_POINTS_EARN_F', wave: 'Wave 3' }, { name: 'AMS_TX_REWARD_F', wave: 'Wave 3' },
          { name: 'MANUAL_POINT_ADJ_F', wave: 'Wave 3' }, { name: 'WAREHOUSE_SHIPT_F', wave: 'Wave 4' },
          { name: 'LABOR_DAILY_BUDGET_F', wave: 'Wave 5' }, { name: 'OPERATOR_DIM', wave: 'Wave 5' },
        ],
      },
      {
        title: 'Loading process not identified',
        tables: [
          { name: 'GL_DEPT_DIM', wave: 'Wave 1' }, { name: 'AMS_OFFER_DIM', wave: 'Wave 1' },
          { name: 'ITEM_PRICE_F', wave: 'Wave 1' }, { name: 'ITEM_COST_F', wave: 'Wave 2' },
          { name: 'LOC_DSD_INVOICE_F', wave: 'Wave 2' }, { name: 'ITEM_MARKDOWN_DEFAULT_DIM', wave: 'Wave 3' },
        ],
      },
    ],
    notes: ['This is the most important technical blocker and requires IT action.'],
  },
  {
    id: 'still-current',
    title: 'Are these tables still current and should they be migrated?',
    summary: 'The evidence suggests these feeds are inactive or stale. The application must not decide whether to drop them; Weis must confirm whether a report or process still needs each table to be current.',
    resolutionType: 'client-decision',
    groups: [{
      title: 'Tables requiring a business decision',
      tables: [
        { name: 'CUSTOMER_ATTR_XREF', wave: 'Wave 3', note: 'Approximately 124 million rows; not fed since 2019.' },
        { name: 'CUSTOMER_SGM_DIM', wave: 'Wave 3', note: 'Loader has no execution activity.' },
        { name: 'SHK_DAILY_LABOR_EXPORT_F', wave: 'Wave 5', note: 'Loader has no execution activity.' },
        { name: 'PRICE_LVL_DIM', wave: 'Wave 1', note: 'Staging exists; no pipeline activity was found.' },
        { name: 'RECLM_SCAN_DETAIL_F', wave: 'Wave 2', note: 'Pipeline succeeds daily, but no new data has arrived since approximately April 25, 2026.' },
      ],
    }],
    notes: ['No table should be dropped unilaterally. This is a business decision, not an automated technical conclusion.'],
  },
  {
    id: 'file-feed-owners',
    title: 'Who owns the file-based feeds?',
    summary: 'Five tables appear to receive files rather than database connections. Their producer, delivery schedule, and file format are undocumented.',
    resolutionType: 'client-question',
    groups: [{
      title: 'File-based feeds',
      tables: [
        { name: 'DT_DIM', wave: 'Wave 1' }, { name: 'STORE_START_END_DATE', wave: 'Wave 1' },
        { name: 'SALES_DAILY_BUDGET_F', wave: 'Wave 1' }, { name: 'CLUB_CARD_ATTRIB_DIM', wave: 'Wave 3' },
        { name: 'LABOR_PREM_COST_F', wave: 'Wave 5' },
      ],
    }],
    notes: [
      'If a file stops arriving, there may be no loud failure; the warehouse data simply becomes stale.',
      'DT_DIM is a retail-calendar dependency. Confirm whether it is generated by a script or loaded from a file, who decides fiscal boundaries, and how those boundaries reach the warehouse.',
    ],
  },
] as const

export type TableAnomaly = { anomaly: Anomaly; table: AnomalyTable }

export const ANOMALY_BY_TABLE = new Map<string, TableAnomaly>(
  ANOMALIES.flatMap((anomaly) => anomaly.tables.map((table) => [table.name.toUpperCase(), { anomaly, table }] as const)),
)

export const FULLY_TRACED_NAMES = new Set(FULLY_TRACED_TABLES.map((table) => table.name.toUpperCase()))

export function anomalyForTable(tableName: string): TableAnomaly | undefined {
  return ANOMALY_BY_TABLE.get(tableName.toUpperCase())
}

export function isFullyTraced(tableName: string): boolean {
  return FULLY_TRACED_NAMES.has(tableName.toUpperCase())
}
