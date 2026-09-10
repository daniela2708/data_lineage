# Data Lineage Explorer

Interactive prototype for the data platform modernization discovery. React + Vite + TypeScript.

It presents every table-level lineage report found in `diagramas_html`: the source diagram,
orchestrator details, dependencies, findings, pending validations and important notes. The table
selector combines those reports with the catalog metadata from the client workbook.

## Running it

```bash
npm install
npm run dev        # http://localhost:5173
npm run generate:data # refresh the report from public/Data Catalog V1.xlsx
npm run validate:lineage-html # prove complete semantic coverage for every HTML report
```

```bash
npm run build      # typecheck, then a production build in dist/
npm run preview    # serve the build
npm run typecheck  # types only
```

Node 20 or newer.

## Deploying on Vercel

Import the GitHub repository into Vercel. The included `vercel.json` installs with `npm ci`, runs the production build, and publishes `dist`. No environment variables are required. The source workbook is used during the build but is removed from the public deployment output. Every source report is copied from `diagramas_html` to `dist/diagramas_html` so its original HTML remains available from the deployed viewer.

## Structure

```
src/
  App.tsx                    single-page application shell
  types.ts                   the dataset contract, documented field by field
  data/
    lineage.json             generated browser-ready cache of the Excel catalog
    lineageReports.json      generated structured content from every lineage HTML
    lineageReportSummary.json small summary used before the report module loads
    dataset.ts               typed access plus the derived slices used everywhere
  lib/
    tokens.ts                palette, fonts, and the two colour rules
    flowLayout.ts            pure geometry and timing for the animated chain
    text.ts                  label wrapping and truncation for the SVG views
  hooks/
    useFlowTimeline.ts       one requestAnimationFrame loop, play, pause, speed
  components/
    Header, StatStrip
    flow/    FlowView and the generated report renderer
    table/   TableView, LineageGraph
    estate/  EstateView
  index.css                  design tokens as custom properties, plus layout
```

## The two rules the visuals follow

**Impact colour** says how widely a change to a table would be felt, by the number of business cases that depend on it: one is green, two or three is aqua, four or more is red, none is grey. It is in `lib/tokens.ts` as `impact()`.

**Zone colour** walks the layers from dark to red as the data moves towards published: SQL Server, Landing, Raw, Bronze, Silver, Gold, CSV, Snowflake. Also in `lib/tokens.ts` as `zoneColor()`.

## HTML lineage ingestion

`scripts/generate-lineage-reports.mjs` discovers every `*_lineage.html` file in
`diagramas_html`. It retains the original SVG, headings, paragraphs, tables and lists as typed
report data. The build fails if a source information carrier is not represented exactly once.
`scripts/validate_lineage_html_content.py` independently compares all generated report content
with all source HTML files and can also verify the exact files published in `dist` with `--dist`.

## Rules the data follows

- **An empty string means not documented.** The UI renders those as "Not documented" or a dashed placeholder. Never fill a gap with a guess: the visible gap is the finding.
- **Comment history is verbatim.** The `note` field on a table is the client's own text, unedited and unsummarised.
- **Derived is labelled as derived.** The chain, the pipelines and the triggers come from source files. Anything the prototype works out itself says so on screen.

## Where the data comes from

The report's table catalog is generated from `public/Data Catalog V1.xlsx`, sheet `Hoja 1`. Running `npm run dev` or `npm run build` refreshes `src/data/lineage.json` automatically. You can also refresh it directly with `npm run generate:data`.

The workbook is authoritative for the table fields below. The lineage fields that the workbook does not contain remain curated application metadata:

| Part | Source |
| --- | --- |
| Table name, domain, source, type, database, schema | `Data Catalog V1.xlsx`, tab `Hoja 1` |
| Scope and business cases | Derived directly from `Tiene Use Case` and `Use Case - TA` in that tab |
| Disposition, status, complexity, owner, comment history | `Data Catalog V1.xlsx`, tab `Hoja 1` |
| Stable IDs, presentation layers, waves, pipeline links and legacy-reporting flags | Curated application metadata retained across catalog refreshes |
| Table-level diagrams, orchestrators, dependencies, findings and open points | Every `diagramas_html/*_lineage.html` file |

Known limits, both visible in the app: lineage is complete on the Azure Data Factory side only, since the legacy orchestration layer appears in none of the source files, and 24 of the tables in scope have no pipeline recorded at all.

## Fonts

Space Mono and Nunito Sans load from Google Fonts in `index.html`. Offline they fall back to the system stack and the layout holds.

Proprietary and confidential.
