import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import XLSX from 'xlsx'

const workbookPath = new URL('../public/Data Catalog V1.xlsx', import.meta.url)
const outputPath = new URL('../src/data/lineage.json', import.meta.url)
const SHEET = 'Hoja 1'

const text = (value) => (value == null ? '' : String(value).trim())
const businessCases = (value) => {
  const matches = text(value).toUpperCase().match(/(?:UC|BC)\s*\d+/g) ?? []
  return [...new Set(matches.map((item) => item.replace(/\s+/g, '').replace(/^UC/, 'BC')))]
}

const workbook = XLSX.readFile(fileURLToPath(workbookPath), { cellDates: true })
const worksheet = workbook.Sheets[SHEET]

if (!worksheet) {
  throw new Error(`The required sheet "${SHEET}" is missing from Data Catalog V1.xlsx`)
}

const rows = XLSX.utils.sheet_to_json(worksheet, { defval: null, raw: true })
const previous = JSON.parse(await readFile(outputPath, 'utf8'))
const previousByName = new Map(previous.tables.map((table) => [table.name, table]))

const tables = rows
  .filter((row) => text(row['Table Name - TA']))
  .map((row, index) => {
    const name = text(row['Table Name - TA'])
    const prior = previousByName.get(name)
    const bcs = businessCases(row['Use Case - TA'])
    const domain = text(row['Domain - TA'])
    const type = text(row['Table Type - TA'])
    const fallbackId = `TBL-${domain.replace(/[^A-Z0-9]/gi, '').slice(0, 3).toUpperCase() || 'UNK'}-${type.replace(/[^A-Z0-9]/gi, '').slice(0, 2).toUpperCase() || 'OT'}-${String(index + 1).padStart(3, '0')}`

    return {
      id: prior?.id ?? fallbackId,
      name,
      schema: text(row.Schema),
      db: text(row.Database),
      domain,
      type,
      src: text(row['Source - TA']),
      scope: text(row['Tiene Use Case']).toLowerCase() === 'si' ? 'In Scope' : 'Out of Scope',
      bcs,
      bcn: bcs.length,
      // These presentation and lineage fields are not catalog columns. They
      // retain their curated values while every catalog field is refreshed.
      layer: prior?.layer ?? '',
      wave: prior?.wave ?? '',
      disp: text(row.Disposition),
      status: text(row.Status),
      cplx: text(row.Complexity),
      owner: text(row.Owner),
      pipes: prior?.pipes ?? [],
      pipeIds: prior?.pipeIds ?? [],
      inwf: prior?.inwf ?? false,
      note: text(row['Most important comments']),
    }
  })

if (!tables.length) {
  throw new Error(`No table rows were found in the "${SHEET}" sheet`)
}

const dataset = {
  ...previous,
  tables,
  meta: {
    inScope: tables.filter((table) => table.scope === 'In Scope').length,
    total: tables.length,
    pipelines: previous.pipelines.length,
    triggers: previous.triggers.length,
  },
}

await writeFile(outputPath, `${JSON.stringify(dataset, null, 1)}\n`)
console.log(`Generated ${tables.length} tables from public/Data Catalog V1.xlsx (${SHEET})`)
