import { createHash } from 'node:crypto'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { HTMLElement, parse } from 'node-html-parser'

const sourceDirectory = resolve('diagramas_html')
const outputPath = resolve('src/data/lineageReports.json')
const summaryOutputPath = resolve('src/data/lineageReportSummary.json')

const normalize = (value) => value.trim().replace(/\s+/g, ' ')
const textOf = (element) => normalize(element.text)

function edgeSignature(element) {
  return [
    element.tagName,
    element.getAttribute('x1') ?? '',
    element.getAttribute('y1') ?? '',
    element.getAttribute('x2') ?? '',
    element.getAttribute('y2') ?? '',
    element.getAttribute('d') ?? '',
    element.getAttribute('stroke') ?? '',
    element.getAttribute('stroke-dasharray') ?? '',
    element.getAttribute('marker-end') ?? '',
  ].join('|')
}

function diagramCarriers(svgSource) {
  const svg = parse(svgSource).querySelector('svg')
  if (!svg) throw new Error('The lineage report has no SVG diagram')
  return [
    ...svg.querySelectorAll('text').map(textOf),
    ...svg.querySelectorAll('line, path')
      .filter((element) => element.getAttribute('marker-end') !== undefined)
      .map(edgeSignature),
  ]
}

function sourceCarriers(root) {
  const title = root.querySelector('h1')
  const subtitle = root.querySelector('p.sub')
  const svg = root.querySelector('svg')
  const foot = root.querySelector('p.foot')
  if (!title || !subtitle || !svg || !foot) throw new Error('The lineage report metadata is incomplete')

  return [
    textOf(title),
    textOf(subtitle),
    ...diagramCarriers(svg.toString()),
    ...root.querySelectorAll('h2').map(textOf),
    ...root.querySelectorAll('h3').map(textOf),
    ...root.querySelectorAll('p.intro').map(textOf),
    ...root.querySelectorAll('tr').map((row) => row.querySelectorAll('th, td').map(textOf).join('\u241f')),
    ...root.querySelectorAll('li').map(textOf),
    textOf(foot),
  ]
}

function generatedCarriers(report) {
  return [
    report.title,
    report.subtitle,
    ...diagramCarriers(report.diagramSvg),
    ...report.sections.map((section) => section.title),
    ...report.sections.flatMap((section) => section.blocks.filter((block) => block.type === 'heading').map((block) => block.text)),
    ...report.sections.flatMap((section) => section.blocks.filter((block) => block.type === 'paragraph').map((block) => block.text)),
    ...report.sections.flatMap((section) => section.blocks.filter((block) => block.type === 'table').flatMap((block) => block.rows.map((row) => row.map((cell) => cell.text).join('\u241f')))),
    ...report.sections.flatMap((section) => section.blocks.filter((block) => block.type === 'list').flatMap((block) => block.items.map((item) => normalize(`${item.text} ${item.note ?? ''}`)))),
    report.footer,
  ]
}

function assertCompleteCoverage(root, report, sourceFile) {
  const source = sourceCarriers(root)
  const generated = generatedCarriers(report)
  if (JSON.stringify(source) !== JSON.stringify(generated)) {
    throw new Error(`${sourceFile} did not retain every semantic information carrier`)
  }
  return source.length
}

function parseTable(element) {
  return {
    type: 'table',
    rows: element.querySelectorAll('tr').map((row) => row.querySelectorAll('th, td').map((cell) => ({
      text: textOf(cell),
      kind: cell.tagName === 'TH' ? 'header' : cell.classNames.includes('group-head') ? 'group' : cell.classNames.includes('group-item') ? 'item' : 'value',
    }))),
  }
}

function parseList(element) {
  return {
    type: 'list',
    items: element.querySelectorAll('li').map((item) => {
      const noteElement = item.querySelector('.why')
      const fullText = textOf(item)
      const note = noteElement ? textOf(noteElement) : ''
      const text = note && fullText.endsWith(note) ? fullText.slice(0, -note.length).trim() : fullText
      return note ? { text, note } : { text }
    }),
  }
}

function parseSections(elements) {
  const sections = []
  let current

  for (const element of elements) {
    if (element.tagName === 'H2') {
      current = { title: textOf(element), blocks: [] }
      sections.push(current)
      continue
    }
    if (!current || element.classNames.includes('foot')) continue

    if (element.tagName === 'H3') current.blocks.push({ type: 'heading', text: textOf(element) })
    else if (element.tagName === 'P') current.blocks.push({ type: 'paragraph', text: textOf(element) })
    else if (element.tagName === 'TABLE') current.blocks.push(parseTable(element))
    else if (element.tagName === 'UL') current.blocks.push(parseList(element))
    else throw new Error(`Unsupported content element ${element.tagName} under ${current.title}`)
  }
  return sections
}

function parseReport(input, sourceFile) {
  const root = parse(input, { lowerCaseTagName: false, comment: false })
  const elements = root.childNodes.filter((node) => node instanceof HTMLElement)
  const titleElement = root.querySelector('h1')
  const subtitleElement = root.querySelector('p.sub')
  const diagramElement = root.querySelector('svg')
  const footerElement = root.querySelector('p.foot')
  if (!titleElement || !subtitleElement || !diagramElement || !footerElement) {
    throw new Error(`${sourceFile} is missing required report metadata`)
  }

  const qualifiedTable = textOf(titleElement).split(':')[0]?.trim() ?? ''
  const tableName = qualifiedTable.split('.').at(-1) ?? ''
  if (!tableName) throw new Error(`${sourceFile} has no target table name`)

  const diagramText = diagramElement.querySelectorAll('text').map(textOf)
  const volume = diagramText.map((value) => value.match(/^([\d,]+) rows · ([\d,]+) columns$/)).find(Boolean)
  const report = {
    tableName,
    qualifiedTable,
    title: textOf(titleElement),
    subtitle: textOf(subtitleElement),
    sourceFile,
    publicPath: `/diagramas_html/${sourceFile}`,
    sourceSha256: createHash('sha256').update(input).digest('hex'),
    diagramSvg: diagramElement.toString(),
    rowCount: volume ? Number(volume[1].replaceAll(',', '')) : null,
    columnCount: volume ? Number(volume[2].replaceAll(',', '')) : null,
    sections: parseSections(elements),
    footer: textOf(footerElement),
  }
  return { ...report, carrierCount: assertCompleteCoverage(root, report, sourceFile) }
}

const sourceFiles = (await readdir(sourceDirectory)).filter((name) => name.endsWith('.html')).sort()
if (!sourceFiles.length) throw new Error('No lineage HTML reports were found in diagramas_html')

const reports = []
for (const sourceFile of sourceFiles) {
  reports.push(parseReport(await readFile(resolve(sourceDirectory, sourceFile), 'utf8'), sourceFile))
}

const tableNames = new Set()
for (const report of reports) {
  if (tableNames.has(report.tableName)) throw new Error(`Duplicate lineage report for ${report.tableName}`)
  tableNames.add(report.tableName)
}

const catalog = JSON.parse(await readFile(resolve('src/data/lineage.json'), 'utf8'))
const summary = {
  reportCount: reports.length,
  carrierCount: reports.reduce((total, report) => total + report.carrierCount, 0),
  catalogTableCount: catalog.tables.length,
}
await Promise.all([
  writeFile(outputPath, `${JSON.stringify({ reports }, null, 1)}\n`),
  writeFile(summaryOutputPath, `${JSON.stringify(summary, null, 1)}\n`),
])
console.log(`Generated ${reports.length} lineage reports from diagramas_html with complete semantic coverage`)
