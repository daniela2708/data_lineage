/**
 * Curated from CLUB_CARD_DIM_lineage_Oracle.html, prepared by Data Engineering.
 * Candidate downstreams inferred only from names are intentionally excluded.
 */
export const ORACLE_LINEAGE = {
  evidenceDate: '2026-08-18',
  target: 'WMBI.CLUB_CARD_DIM',
  rowCount: 13_106_526,
  columnCount: 41,
  cadence: 'Daily; exact schedule pending confirmation',
  orchestrator: 'pf_ams_club_card_dim_process',
  liveChain: [
    { stage: 'Source system', name: 'AMS_PROD.LogixXS.dbo', detail: 'CardIDs · Customers · CustomerExt · CustomerPreferences' },
    { stage: 'Pre-staging', name: 'WMBI_ETL.PSTG_AMS_CLUBCARD_SRC_FEED', detail: 'Truncated and fully reloaded on every run' },
    { stage: 'Staging', name: 'WMBI_ETL.STG_CLUB_CARD_DIM_AMS', detail: 'Live AMS staging table' },
    { stage: 'Target', name: 'WMBI.CLUB_CARD_DIM', detail: '13,106,526 rows · 41 columns' },
  ],
  injections: [
    { name: 'STG_MARKETFORCE_SURV_RESP', detail: 'Survey responses · injects placeholder members' },
    { name: 'STG_POS_POINTS_EARNED_F', detail: 'Points earned · injects placeholder members' },
  ],
  factDependencies: [
    { name: 'WMBI.SALES_POS_TX_F', detail: 'Provides FIRST_TX_DT · bidirectional dependency' },
    { name: 'WMBI.DT_DIM', detail: 'Resolves ACCT_EFF_DT_KEY to a calendar date' },
  ],
  targetColumns: [
    { name: 'CLUB_CARD_KEY', note: 'Primary key' },
    { name: 'CLUB_CARD_ID', note: 'Unique business key' },
    { name: 'HOUSEHOLD_ID', note: 'Household grouping' },
    { name: 'CUST_ID', note: 'Customer identifier' },
    { name: 'FIRST_TX_DT', note: 'Derived from SALES_POS_TX_F' },
    { name: 'REC_UPDT_SRC_SYS', note: 'Not reliable' },
    { name: 'EARN_POINTS_FL', note: 'Original source lost in 2020' },
    { name: 'HOUSEHOLD_ID_OLD', note: 'No known writer' },
  ],
  postLoadSteps: [
    { name: 'df_build_update_household_fl', detail: 'Updates household flags' },
    { name: 'df_build_update_first_tx_dt', detail: 'Reads SALES_POS_TX_F and DT_DIM' },
    { name: 'df_build_update_points_earn_fl', detail: 'Original source was lost in 2020' },
  ],
  trigger: {
    name: 'WMBI.CLUB_CARD_SEQ_TR',
    detail: 'Enabled on INSERT; assigns the surrogate key so fact loads can create a member.',
  },
  deadChains: [
    { source: 'vw_wmbi_club_card / eme_customer', staging: 'WMBI_ETL.STG_CLUB_CARD_DIM', lastActivity: 'Last load: August 2020' },
    { source: 'Original 2013 generation', staging: 'WMBI_ETL.STG_CLUB_CARD', lastActivity: '0 rows · unchanged since 2016' },
  ],
  createdTables: [
    { name: 'WMBI_ETL.PSTG_AMS_CLUBCARD_SRC_FEED', status: 'Live' },
    { name: 'WMBI_ETL.STG_CLUB_CARD_DIM_AMS', status: 'Live' },
    { name: 'WMBI_ETL.STG_CLUB_CARD_DIM', status: 'Dead since 2020' },
    { name: 'WMBI_ETL.STG_CLUB_CARD', status: 'Dead; unchanged since 2016' },
  ],
  requiredTables: [
    { name: 'AMS_PROD.LogixXS.dbo', detail: 'CardIDs, Customers, CustomerExt and CustomerPreferences · live source' },
    { name: 'WMBI.SALES_POS_TX_F', detail: 'Computes FIRST_TX_DT · confirmed circular dependency' },
    { name: 'WMBI.DT_DIM', detail: 'Converts ACCT_EFF_DT_KEY to a calendar date' },
    { name: 'WMBI_ETL.STG_MARKETFORCE_SURV_RESP', detail: 'Injects placeholder members from survey responses' },
    { name: 'WMBI_ETL.STG_POS_POINTS_EARNED_F', detail: 'Injects placeholder members from POS points' },
  ],
  downstreams: [
    { name: 'WMBI.SALES_POS_TX_F', detail: 'Confirmed in code; carries CLUB_CARD_KEY and is also read post-load' },
    { name: 'WebFOCUS reports', detail: 'Approximately 1,100 reports in the report catalogue' },
    { name: 'BI_PROD.WMBI in Snowflake', detail: 'Copy synchronized separately by ADF' },
  ],
  candidateDownstreams: [
    { group: 'Loyalty facts', names: 'POINTS_EARNED_REDEEMED_F · AMS_POINT_ACT_F · AMS_POS_POINTS_EARN_F · AMS_TX_REWARD_F · POS_POINTS_EARNED_F · MANUAL_POINT_ADJ_F' },
    { group: 'Customer-level facts', names: 'POS_TX_TENDER_F · MARKETFORCE_WEIS2GO_F · FUEL_PRTNR_PRGM_F · SUNOCO_FUEL_PRTNR_PRGM_F · RX_DAILY_SCRIPT_F · RX_WKLY_SCRIPT_F' },
    { group: 'Cross-references', names: 'CLUB_CARD_ATTRIB_XREF · AMS_OFFER_GRP_XREF · CUSTOMER_ATTR_XREF' },
  ],
  generations: [
    { period: '2013', flow: 'df_wmbi_upsert_club_card_dim', source: 'STG_CLUB_CARD' },
    { period: '~2014–2020', flow: 'df_upsert_club_card_dim', source: 'STG_CLUB_CARD_DIM · EME' },
    { period: '2020–today', flow: 'df_build_insert_update_club_card_dim', source: 'STG_CLUB_CARD_DIM_AMS' },
  ],
  legacyEnrichmentFlows: [
    { name: 'df_club_card_resolve_household_flags', writesTo: 'Dimension' },
    { name: 'df_club_card_resolve_first_tx_dt', writesTo: 'Dimension' },
    { name: 'df_club_card_resolve_earn_points_fl_stg', writesTo: 'Staging' },
    { name: 'df_club_card_resolve_earn_points_fl_update', writesTo: 'Dimension' },
  ],
  openQuestion: 'Should STG_CLUB_CARD_DIM and STG_CLUB_CARD be migrated, or can they be retired?',
  liveFlows: [
    'move_data/wmbi_pstg_ams_clubcard_src_feed',
    'df_build_pstg_club_card_dim',
    'df_build_stg_club_card_dim',
    'df_build_insert_update_club_card_dim',
    'df_build_update_household_fl',
    'df_build_update_first_tx_dt',
    'df_build_update_points_earn_fl',
  ],
  findings: [
    'The source for EARN_POINTS_FL was lost when the EME chain stopped in 2020.',
    'The SALES_POS_TX_F dependency is bidirectional and is not declared or sequencing-checked.',
    'One additional pre-staging target may exist and still needs confirmation.',
    'Two obsolete staging chains remain deployed even though they no longer execute.',
  ],
} as const
