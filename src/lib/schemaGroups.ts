import type { LineageReport } from '../data/lineageReports'

/** Only the parts of a report this reads, so the detail chunk is the only input needed. */
type SchemaGroupSource = Pick<LineageReport, 'tableName' | 'qualifiedTable' | 'sections'>

const QUALIFIED_TABLE = /\b([A-Za-z][A-Za-z0-9_$#]*)\.([A-Za-z][A-Za-z0-9_$#]*)\b/g
const UNQUALIFIED_TABLES = /^([A-Za-z][A-Za-z0-9_$#]*(?:\s*\/\s*[A-Za-z][A-Za-z0-9_$#]*)*)\s*(?::|$)/
const FILE_EXTENSIONS = new Set(['csv', 'fex', 'html', 'js', 'json', 'mjs', 'py', 'sql', 'ts', 'tsx', 'xlsx'])
const UNKNOWN_SCHEMA = 'Schema not documented'

export type SchemaTableReference = {
  schema: string
  tableName: string
  qualifiedName: string
  detail: string
}

export type SchemaGroup = {
  schema: string
  tables: SchemaTableReference[]
}

/**
 * Pull table references from the verified Dependencies section without changing
 * the source SVG. File names such as loader.fex are deliberately ignored.
 */
export function schemaGroupsForReport(report: SchemaGroupSource): SchemaGroup[] {
  const dependencies = report.sections.find((section) => section.title === 'Dependencies')
  if (!dependencies) return []

  const bySchema = new Map<string, Map<string, SchemaTableReference>>()
  const targetTable = report.qualifiedTable.toUpperCase()
  let upstream = true

  const addReference = (schema: string, tableName: string, detail: string) => {
    const schemaKey = schema.toUpperCase()
    const tableKey = `${schema}.${tableName}`.toUpperCase()
    if (tableKey === targetTable || tableName.toUpperCase() === report.tableName.toUpperCase()) return
    const schemaTables = bySchema.get(schemaKey) ?? new Map<string, SchemaTableReference>()
    const current = schemaTables.get(tableKey)

    if (!current || (!current.detail && detail)) {
      schemaTables.set(tableKey, {
        schema,
        tableName,
        qualifiedName: schema === UNKNOWN_SCHEMA ? tableName : `${schema}.${tableName}`,
        detail,
      })
    }
    bySchema.set(schemaKey, schemaTables)
  }

  for (const block of dependencies.blocks) {
    if (block.type === 'heading') {
      upstream = !block.text.toLowerCase().startsWith('depends on this table')
      continue
    }
    if (!upstream) continue
    if (block.type !== 'table') continue

    for (const row of block.rows) {
      for (const cell of row) {
        const matches = [...cell.text.matchAll(QUALIFIED_TABLE)]
          .filter((match) => !FILE_EXTENSIONS.has(match[2].toLowerCase()))
        const finalMatch = matches.at(-1)
        const detail = finalMatch
          ? cell.text.slice((finalMatch.index ?? 0) + finalMatch[0].length).replace(/^[\s:;,.·/–—-]+/, '').trim()
          : ''

        for (const match of matches) {
          const [, schema, tableName] = match
          addReference(schema, tableName, detail)
        }

        if (!matches.length && (cell.kind === 'item' || cell.kind === 'value')) {
          const unqualified = cell.text.match(UNQUALIFIED_TABLES)
          if (!unqualified) continue
          const detailStart = unqualified[0].length
          const unqualifiedDetail = cell.text.slice(detailStart).replace(/^[\s:;,.·/–—-]+/, '').trim()
          for (const tableName of unqualified[1].split('/').map((name) => name.trim())) {
            addReference(UNKNOWN_SCHEMA, tableName, unqualifiedDetail)
          }
        }
      }
    }
  }

  return [...bySchema.values()]
    .map((tables) => {
      const sortedTables = [...tables.values()].sort((left, right) => left.tableName.localeCompare(right.tableName))
      return { schema: sortedTables[0].schema, tables: sortedTables }
    })
    .sort((left, right) => right.tables.length - left.tables.length || left.schema.localeCompare(right.schema))
}

export function shouldGroupBySchema(groups: SchemaGroup[]): boolean {
  return groups.reduce((total, group) => total + group.tables.length, 0) > 3
}
