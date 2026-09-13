/**
 * Shapes of the lineage dataset.
 *
 * Everything here mirrors src/data/lineage.json, whose catalog records are
 * generated from public/Data Catalog V1.xlsx. Empty string means "not documented": a visible
 * gap is more useful than a guessed value, so nothing is ever filled in.
 */

/** Medallion layer or system a step of the chain lives in. */
export type Zone =
  | 'SQL Server'
  | 'Landing'
  | 'Raw'
  | 'Bronze'
  | 'Silver'
  | 'Gold'
  | 'CSV'
  | 'Snowflake'

/** One table in the catalog. */
export interface TableRec {
  /** Fixed length key, TBL-<domain>-<type>-<nnn>, rebuildable from the row. */
  id: string
  name: string
  schema: string
  db: string
  domain: string
  /** Dimension, Fact, Budget, Snapshot, Other. */
  type: string
  /** Source system as recorded in the catalog. */
  src: string
  /** 'In Scope' when the table is in Phase 1. */
  scope: string
  /** Business cases served, BC1 to BC5. */
  bcs: string[]
  /** Length of bcs, precomputed so lists can sort without mapping. */
  bcn: number
  layer: string
  wave: string
  /** Keep As Is, Refactor, Build, Out of Scope. */
  disp: string
  status: string
  cplx: string
  owner: string
  /** ADF pipeline names. */
  pipes: string[]
  /** Same pipelines as PL-nnn ids. */
  pipeIds: string[]
  /** True when the legacy reporting estate reads this table. */
  inwf: boolean
  /** Verbatim comment history from the client catalog. Never edited. */
  note: string
}

export interface Pipeline {
  id: string
  name: string
  tool: string
  freq: string[]
  status: string
  src: string
  tgt: string
  /** Table ids this pipeline loads. */
  tables: string[]
  jobs: string[]
  /** True when the pipeline is confirmed by the end to end diagram. */
  fromDiagram: boolean
}

export interface Trigger {
  id: string
  name: string
  freq: string[]
  status: string
  /** Pipeline ids this trigger starts. */
  pipes: string[]
  /** Table ids reached through those pipelines. */
  tables: string[]
}

/** A table read at a step without being the step itself. */
export interface FlowSide {
  label: string
  /** 'origin' for the operational sources, 'reads' for a lookup at that layer. */
  kind: 'origin' | 'reads'
  /** Table id when the side input is a catalogued table. */
  id?: string
}

/** One step of a traced chain. */
export interface FlowNode {
  zone: Zone | string
  label: string
  detail: string
  /** Pipeline or notebook that moves the data into this step. */
  pipe?: string
  side?: FlowSide[]
}

/** A table traced from source system to published table. */
export interface Flow {
  table: string
  id: string
  nodes: FlowNode[]
  /** Columns the upsert merges on. */
  keys: string[]
  legacy: { label: string; detail: string }[]
  downstream: string
  openPoints: string[]
}

export interface Meta {
  inScope: number
  total: number
  pipelines: number
  triggers: number
}

export interface Dataset {
  tables: TableRec[]
  pipelines: Pipeline[]
  triggers: Trigger[]
  flow: Flow
  meta: Meta
}
