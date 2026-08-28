export type LineageTone = 'live' | 'injection' | 'dependency' | 'target' | 'legacy'

export interface LineageNode {
  role: string
  name: string
  /** Prose the evidence artifact records against this node. Absent where it records none. */
  detail?: string
  /** Join and key columns the evidence artifact lists on this node. */
  keys?: string[]
  /** The flow that moves rows out of this node and into the next one. */
  process?: string
  tone?: LineageTone
}

export interface RelatedItem {
  name: string
  detail?: string
}

export interface RelatedGroup {
  id: string
  label: string
  description: string
  tone: Exclude<LineageTone, 'live' | 'target'>
  items: RelatedItem[]
}

export interface TableLineage {
  tableName: string
  title: string
  evidence: string
  rowCount?: number
  columnCount?: number
  orchestrator: string
  cadence: string
  scheduleObserved: string
  alerts: string
  neverRuns: string
  liveFlow: LineageNode[]
  relatedGroups: RelatedGroup[]
  findings: string[]
  pendingValidation: string[]
}

const itemSourceDependencies = [
  ['HQAnalytics.ITEM_MASTER', 'Actual source on SQL Server, external to the warehouse.'],
  ['HQAnalytics.TCI_DOMAIN_LOOKUPS', 'Feeds item format, status and type descriptions.'],
  ['HQAnalytics.BUYERS', 'Feeds buyer and merchandiser names.'],
  ['HQAnalytics.STORE_DEPARTMENT', 'Feeds ITEM_POS_DEPT_DESC.'],
  ['HQAnalytics.CATEGORY', 'Feeds category, subcategory and merchandiser number.'],
  ['HQAnalytics.PRIVATE_LABEL_TYPE', 'Joined but unused; feeds nothing.'],
  ['HQAnalytics.UNITS_OF_MEASURE', 'Feeds ITEM_SIZE_DESC.'],
  ['HQAnalytics.CONTROL_SUBSTANCES', 'Feeds controlled-substance code and description.'],
  ['HQAnalytics.VENDOR_ITEM', 'Feeds ITEM_WAREHOUSE_CD.'],
  ['HQAnalytics.POS_TAX_CLASSES', 'Feeds ITEM_SNAP_FL.'],
  ['HQAnalytics.ITEM_SCALE_FLAGS', 'Feeds scale-related attributes.'],
].map(([name, detail]) => ({ name, detail }))

const clubDownstreams = [
  'AMS_POINT_ACT_F', 'AMS_POS_POINTS_EARN_F', 'AMS_TX_REWARD_F', 'CLUB_CARD_ATTRIB_XREF',
  'CLUB_CARD_DIM_BKUP_PRE_AMS', 'CLUB_CARD_VWM', 'CUSTOMER_ATTR_XREF', 'FUEL_PRTNR_PRGM_F',
  'HOUSEHOLD_40_DAY_TOP_20_VWM', 'ITEM_LOC_CUST_SALES_YTD_MVW', 'MANUAL_POINT_ADJ_F',
  'MARKETFORCE_SURV_RESP_F', 'MARKETFORCE_WEIS2GO_F', 'MEGA_SALE_AMS_TX_IDS_VWM',
  'MEGA_SALE_TX_IDS_VWM', 'MLOG$_SALES_POS_TX_F', 'POINTS_EARNED_REDEEMED_F',
  'POINTS_EARN_REDEEM_FV2', 'POS_POINTS_EARNED_REDEEMED_VWM', 'POS_POINTS_EARN_F',
  'POS_POINTS_EARN_VWM', 'POS_TX_TENDER_F', 'SALES_POS_LN_F', 'SALES_POS_TX_F',
  'SHK_DAILY_ORDER_EXPORT_F', 'SUNOCO_FUEL_PRTNR_PRGM_F',
].map((name) => ({ name, detail: 'Confirmed in code.' }))

export const TABLE_LINEAGES: TableLineage[] = [
  {
    tableName: 'CLUB_CARD_DIM',
    title: 'Current AMS live chain',
    evidence: 'public/club_card_dim_lineage.html',
    rowCount: 13_109_987,
    columnCount: 41,
    orchestrator: 'pf_ams_club_card_dim_process',
    cadence: 'Recurring, every 1 day; starts at 05:00 per file header',
    scheduleObserved: 'Not documented',
    alerts: 'tscott@weismarkets.com',
    neverRuns: 'DEP_0 / df_build_pstg_ams_clubcard_src_feed',
    liveFlow: [
      { role: 'Source system', name: 'AMS_PROD.LogixXS.dbo', detail: 'CardIDs · Customers · CustomerExt · CustomerPreferences', keys: ['CLUB_CARD_ID'], process: 'move_data/wmbi_pstg_ams_clubcard_src_feed' },
      { role: 'Pre-staging', name: 'WMBI_ETL.PSTG_AMS_CLUBCARD_SRC_FEED', keys: ['CLUB_CARD_ID'], process: 'df_build_pstg_club_card_dim' },
      { role: 'Processing stage', name: 'WMBI_ETL.PSTG_CLUB_CARD_DIM', keys: ['CHECKSUM_VAL', 'CLUB_CARD_ID'], process: 'df_build_stg_club_card_dim' },
      { role: 'Staging', name: 'WMBI_ETL.STG_CLUB_CARD_DIM_AMS', keys: ['CLUB_CARD_KEY'], process: 'df_build_insert_update_club_card_dim' },
      { role: 'Target table', name: 'WMBI.CLUB_CARD_DIM', detail: '13,109,987 rows · 41 columns', keys: ['CLUB_CARD_KEY PK', 'CLUB_CARD_ID UK', 'CHECKSUM_VAL UK'], tone: 'target' },
    ],
    relatedGroups: [
      { id: 'injections', label: 'Injection processes', description: 'External processes that inject placeholder members.', tone: 'injection', items: [
        { name: 'WMBI_ETL.STG_MARKETFORCE_SURV_RESP', detail: 'Survey load; confirmed in df_ins_unappr_val_club_card_dim_no_date_param.' },
        { name: 'WMBI_ETL.STG_POS_POINTS_EARNED_F', detail: 'POS points load; injection file not yet identified.' },
      ] },
      { id: 'post-load', label: 'Post-load dependencies', description: 'Reads and updates performed on the loaded target.', tone: 'dependency', items: [
        { name: 'df_build_update_household_fl', detail: 'Only re-evaluates households still in frozen 2020 staging.' },
        { name: 'df_build_update_first_tx_dt', detail: 'Reads WMBI.SALES_POS_TX_F and WMBI.DT_DIM.' },
        { name: 'df_build_update_points_earn_fl', detail: 'Uses the same frozen staging limit.' },
      ] },
      { id: 'legacy', label: 'Legacy / inactive path', description: 'Historical EME chain; last execution 2020-08-12.', tone: 'legacy', items: [
        { name: 'WMBI_ETL.STG_CLUB_CARD_DIM → WMBI.CLUB_CARD_DIM', detail: 'Frozen EME chain; 15,019,410 historical rows.' },
      ] },
      { id: 'downstreams', label: 'Confirmed downstream dependencies', description: 'Tables confirmed in code to depend on this target.', tone: 'dependency', items: clubDownstreams },
    ],
    findings: [
      'Two different loading processes have fed this table. The old one stopped in 2020; the current one runs daily.',
      'Serious: household-level benefit flags only inspect households in staging frozen since 2020.',
      'Serious: the points-earning correction also only compares against the frozen 2020 staging table.',
      'Confirmed: the final upsert overwrites basket discount and points earning flags with staging values, which are empty from the true source.',
      'Confirmed: the change fingerprint uses name, address and contact fields only; benefit-only changes are not detected.',
      '26 other tables depend on this one, including the two largest transaction tables in the warehouse.',
    ],
    pendingValidation: [
      'Whether CLUB_CARD_DIM should move to Wave 2 is still pending a decision.',
      'df_build_update_first_tx_dt (DEP_5) has not been read yet.',
      'The file that injects placeholders from STG_POS_POINTS_EARNED_F has not been identified.',
      'The orchestrator that calls df_ins_unappr_val_club_card_dim_no_date_param has not been identified.',
      'Whether SRC_REC_STAT_CD is populated only for EME-sourced rows has not been confirmed.',
      'Blank versus real values for BSKT_DISC_OPT_FL and EARN_POINTS_FL have not been measured by recency.',
      "CLUB_CARD_DIM's observed run schedule from a log is still unknown.",
      'The 15,183 stub-member figure has not been reconciled against this session’s 240,954.',
    ],
  },
  {
    tableName: 'ITEM_DIM', title: 'HQ item master live load', evidence: 'public/item_dim_lineage.html',
    rowCount: 758_653, columnCount: 52, orchestrator: 'df_preload_item_dim',
    cadence: 'Recurring, daily at 02:00', scheduleObserved: 'STG_ITEM last run 2026-08-26 02:01:36.839; matches',
    alerts: 'Jeffery.Farrington@weismarkets.com, %user_email', neverRuns: 'None found',
    liveFlow: [
      { role: 'Source system', name: 'HQAnalytics.ITEM_MASTER', detail: 'External SQL Server · incremental by change date', keys: ['ITEM_ID'], process: 'df_preload_item_dim' },
      { role: 'Staging', name: 'WMBI_ETL.STG_ITEM', detail: 'Truncated and reloaded daily', keys: ['ITEM_SCAN_CD_ID'], process: 'df_upsert_item_dim' },
      { role: 'Target table', name: 'WMBI.ITEM_DIM', detail: '758,653 rows · 52 columns', keys: ['ITEM_KEY PK', 'ITEM_SCAN_CD_ID UK'], tone: 'target' },
    ],
    relatedGroups: [
      { id: 'injections', label: 'Injection processes', description: 'Active placeholder-member injection paths.', tone: 'injection', items: [
        { name: 'WMBI_ETL.PSTG_VENDOR_ITEM_XREF', detail: "Reusable template; REC_UPDT_SRC_SYS = 'UNAPPROVED_VAL'." },
        { name: 'WMBI_ETL.PSTG_SALES_POS_LINE', detail: "Dedicated flow; REC_UPDT_SRC_SYS = 'UNAPPROVED VAL'." },
      ] },
      { id: 'dependencies', label: 'Other process dependencies', description: 'Tables read by the live and injection processes.', tone: 'dependency', items: itemSourceDependencies },
      { id: 'legacy', label: 'Superseded one-time load', description: 'Historical Run Once path; last execution 2013-08-21.', tone: 'legacy', items: [
        { name: 'WMBI_ETL.STG_ITEM → WMBI.ITEM_DIM', detail: 'df_wmbi_upsert_item_dim; superseded one-time load.' },
      ] },
      { id: 'downstreams', label: 'Inferred downstreams', description: 'Candidates inferred from naming; verification required.', tone: 'dependency', items: ['ITEM_COST_F','ITEM_PRICE_F','INV_AS_COUNTED_F','LOC_DSD_INVOICE_F','RECLM_SCAN_DETAIL_F','SALES_POS_LN_F','VENDOR_ITEM_XREF','WAREHOUSE_SHIPT_F'].map((name) => ({ name: `WMBI.${name}`, detail: 'Inferred from naming; not confirmed.' })) },
    ],
    findings: [
      '4.3 percent of rows (32,643) are not a clean approved member from the main load.',
      "One writer source is recorded as both 'UNAPPROVED_VAL' and 'UNAPPROVED VAL'; whether this is one flow is unconfirmed.",
      'CORE_POS_ITEM_FL is populated on 99.9 percent of rows but its writer has not been identified.',
      'A recovery driver retains a reachable path to the decommissioned 2013 flow; production use is unconfirmed.',
      'The live upsert defaults unresolved ITEM_KEY to -1; one live row still carries an invalid key.',
      'The master unapproved-dimension driver step named for ITEM_DIM actually writes to LOC_DIM; the true UNAPPROVED_VAL source remains unidentified.',
    ],
    pendingValidation: [
      'Which flow writes the STORE_INVENTORY source has not been identified.',
      'Which process populates CORE_POS_ITEM_FL has not been identified.',
      'Whether the recovery variant pf_wmbi_01_1030_etl_driver_aov_recov is ever invoked has not been confirmed.',
    ],
  },
  {
    tableName: 'VENDOR_ITEM_XREF', title: 'HQ vendor item live load', evidence: 'public/vendor_item_xref_lineage.html',
    rowCount: 1_012_418, columnCount: 28, orchestrator: 'pf_vendor_xref_master_driver',
    cadence: 'Recurring, daily at 02:15', scheduleObserved: 'Target max update 2026-08-26 04:04:36.096; plausible run window',
    alerts: 'Not recorded', neverRuns: 'None found',
    liveFlow: [
      { role: 'Source system', name: 'HQAnalytics.VENDOR_ITEM', detail: 'External SQL Server · incremental by change date across 9 joined tables', keys: ['VI_ID'], process: 'df_preload_vendor_item_xref' },
      { role: 'Pre-staging', name: 'WMBI_ETL.PSTG_VENDOR_ITEM_XREF', detail: 'Truncated and reloaded daily', keys: ['ITEM_SCAN_CD_ID'], process: 'df_upsert_vendor_item_xref' },
      { role: 'Target table', name: 'WMBI.VENDOR_ITEM_XREF', detail: '1,012,418 rows · 28 columns', keys: ['VENDOR_ITEM_KEY PK', 'VENDOR_ITEM_ID UK', 'ITEM_KEY UK', 'VENDOR_KEY UK'], tone: 'target' },
    ],
    relatedGroups: [
      { id: 'dependencies', label: 'Source and key dependencies', description: 'Source joins and dimensions used to resolve surrogate keys.', tone: 'dependency', items: [
        { name: 'HQAnalytics.ITEM_MASTER', detail: 'Resolves direct and price-association master items.' },
        { name: 'HQAnalytics.VENDOR_MASTER', detail: 'Resolves direct and price-association master vendors.' },
        { name: 'HQAnalytics.WHSE_VENDOR_ITEM', detail: 'Feeds warehouse vendor item source ID and manufacturer item code.' },
        { name: 'HQAnalytics.WHSE_SUPPLIER', detail: 'Feeds WAREHOUSE_SUPPL_CD.' },
        { name: 'HQAnalytics.PRICE_ASSOCIATION_CODE', detail: 'Feeds price-association code and description.' },
        { name: 'HQAnalytics.PRICE_ASSOCIATED_ITEMS', detail: 'Resolves price-association master item and vendor.' },
        { name: 'HQAnalytics.COST_ASSOCIATION_CODE', detail: 'Feeds cost-association code and description.' },
        { name: 'HQAnalytics.COST_ASSOCIATED_ITEMS', detail: 'Resolves cost-association master item.' },
        { name: 'WMBI.ITEM_DIM', detail: 'Resolves ITEM_KEY.' },
        { name: 'WMBI.VENDOR_DIM', detail: 'Resolves VENDOR_KEY.' },
        { name: 'WMBI.WAREHOUSE_SUPPL_DIM', detail: 'Resolves WAREHOUSE_SUPPL_KEY.' },
      ] },
      { id: 'legacy', label: 'Dead staging path', description: 'Last execution 2021-08-06; never reaches the target.', tone: 'legacy', items: [
        { name: 'PSTG_VENDOR_ITEM_XREF → STG_VENDOR_ITEM_XREF', detail: 'df_wmbi_load_vendor_item_xref; resolved surrogate keys, then dead end.' },
      ] },
      { id: 'downstreams', label: 'Inferred downstreams', description: 'Candidates inferred from naming; verification required.', tone: 'dependency', items: ['WMBI.ITEM_COST_F','WMBI.LOC_DSD_INVOICE_F','WMBI.VENDOR_ITEM_ADJ_F'].map((name) => ({ name, detail: 'Inferred from naming; not confirmed.' })) },
    ],
    findings: [],
    pendingValidation: ["The full text of the two 'Unapproved val originated in' source labels was truncated by the DBeaver grid and has not been captured."],
  },
]

export const TABLE_LINEAGE_BY_NAME = new Map(TABLE_LINEAGES.map((lineage) => [lineage.tableName, lineage]))
