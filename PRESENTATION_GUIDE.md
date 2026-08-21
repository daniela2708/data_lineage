# Data Lineage Explorer Presentation Guide

## Presentation objective

Show how the explorer turns the data catalog into a navigable experience that answers three questions:

1. How does a table travel from its source system to Snowflake?
2. What information and relationships are documented for each table?
3. What does the full Phase 1 scope look like, and where are the documentation gaps?

Suggested duration: 8–12 minutes.

## Before you begin

- Open the application with **Animated flow** selected.
- Confirm that the animation is on the first step. Use **Restart** if needed.
- Keep the browser zoom at 100%.
- Have the `CLUB_CARD_DIM` table ready for the demonstration.
- Remember that the catalog's primary source is the `Hoja 1` sheet in `Data Catalog V1.xlsx`.

## Opening, 1 minute

### What to show

The header, summary metrics, and three navigation options:

- **Animated flow**
- **Table view**
- **Whole estate**

### Suggested script

> Today I will show you Data Lineage Explorer, a prototype that turns the data catalog into an interactive tool. The goal is to move from a static list of tables to a view that makes it easy to understand the data journey, inspect a specific table, and see the full Phase 1 scope.
>
> At the top, we have a catalog summary. It currently contains 159 tables, 63 of which are identified as in scope for Phase 1. We also have 9 documented pipelines and 18 triggers.
>
> The application has three views. The first shows an end-to-end journey, the second lets us investigate any table, and the third provides an overview of the entire estate.

### Key message

The explorer does not replace the catalog. It makes the catalog easier to inspect, explain, and validate.

---

## View 1: Animated flow, 3 minutes

### What it contains

This view presents the only fully documented end-to-end journey currently available: `CLUB_CARD_DIM`.

The flow has 10 steps:

1. `LogixXS` in SQL Server, with four operational source tables.
2. `STG_CLUB_CARD_DIM.parquet` in Landing.
3. `stg_club_card_dim` in Raw.
4. `pstg / club_card_dim` in Bronze.
5. The accumulated `club_card_dim` in Bronze.
6. The conformed `club_card_dim` in Silver.
7. `club_card_dim` in Gold.
8. `club_card_dim.csv` for loading.
9. `TEMP.CLUB_CARD_DIM` as a temporary Snowflake table.
10. `BI_PROD.WMBI.CLUB_CARD_DIM` as the published table.

It also shows:

- The pipeline or notebook associated with each movement.
- Additional tables read during certain steps.
- The merge keys: `CLUB_CARD_ID` and `HOUSEHOLD_ID`.
- Two legacy routes recorded for the same table.
- Items that still need to be defined.
- The evidence gap around downstream consumers.

### What to do on screen

1. Press **Restart**.
2. Press **Play**.
3. Let the animation advance two or three steps.
4. Show that you can use **Pause** and change the speed to **2x**.
5. Click an intermediate step, preferably Bronze or Silver.
6. Point out the **The step showing now** card.
7. Scroll down to **Recorded alongside the chain**.

### Suggested script

> We will begin with the animated view. Here, we follow `CLUB_CARD_DIM` from its operational source to its publication in Snowflake.
>
> The journey begins in LogixXS within SQL Server, where four operational tables were identified. The information then moves through Landing in Parquet format, continues to Raw, passes through the Bronze, Silver, and Gold layers, is exported as CSV, and is finally loaded into a temporary table before being published as `BI_PROD.WMBI.CLUB_CARD_DIM` in Snowflake.
>
> The animation lets us follow the process step by step. At each point, we can see where the information is located, which pipeline or notebook moves it, and which other tables are read during processing.
>
> In Bronze, for example, we see not only the primary table but also related reads such as `sales_pos_tx_f`, `dt_dim`, and other versions of `club_card_dim`.
>
> Below the journey, we have additional information. The upsert into Raw uses `CLUB_CARD_ID` and `HOUSEHOLD_ID` as merge keys. We also record two legacy paths and two open items: the columns used in certain joins and confirmation of which secondary tables should remain in the design.
>
> There is another important finding: no downstream consumer could be confirmed. This does not mean one does not exist; it means none is evidenced in the reviewed sources. The application shows this gap explicitly instead of filling it with an assumption.

### Key message

This view does more than visualize the known path. It also makes the areas requiring further investigation visible.

### Transition

> We have seen the detailed journey of one table. Now we will move to a view that lets us inspect any of the 159 catalog tables.

---

## View 2: Table view, 3 minutes

### What it contains

This view lets you:

- Search by table name, ID, source system, owner, domain, or schema.
- Filter by Phase 1 scope or show all tables.
- Filter by business case.
- Inspect the domain, type, layer, database, schema, source, wave, complexity, owner, and pipelines.
- View the documented path from source to business cases.
- Explore upstream inputs, downstream consumers, and tables that share a pipeline.
- Read the catalog comment history without editing or summarizing the original text.

### What to do on screen

1. Select **Table view**.
2. Briefly show the **Phase 1 / All tables** selector.
3. Enter `CLUB_CARD_DIM` in the search box.
4. Open the table.
5. Point out the primary statuses and metadata.
6. Walk through the diagram from left to right.
7. Show the **Relationship explorer**.
8. Scroll to the table history and use **Show all** only if time allows.
9. Optionally, click **Open the animated flow for this table** to demonstrate the connection between views.

### Suggested script

> In Table view, we can search for and analyze a specific table. We can limit the search to the 63 Phase 1 tables or inspect all 159 tables in the full catalog. We can also filter by associated business cases.
>
> I will search for `CLUB_CARD_DIM` again. The card header shows its stable identifier and primary statuses. Below that, we find its metadata: database, schema, source system, business cases, wave, complexity, technical owner, and documented pipelines.
>
> The loading path reads from left to right. First, we see the system where the information begins; then the trigger that starts the load; next, the pipelines that transport it; the table being loaded; and finally, the business cases it supports.
>
> When a stage appears as a dashed card, it is not an interface error. It means the source does not contain that information. We deliberately keep these gaps visible because they are useful discovery findings.
>
> The Relationship explorer separates three concepts. First, documented upstream inputs. Second, downstream consumers, where an evidence gap may exist. Third, other tables that share a pipeline. This final relationship is derived and is not presented as a confirmed dependency.
>
> Finally, we have the history recorded against the table. The text appears exactly as it does in the catalog, without correction or summarization, preserving traceability to the original evidence.

### Key message

This view serves as a table-level investigation point and clearly distinguishes documented evidence, missing information, and derived relationships.

### Transition

> So far, we have examined one table in detail. To close, we will zoom out and see how the entire Phase 1 scope is distributed.

---

## View 3: Whole estate, 2 minutes

### What it contains

This view groups in-scope tables by the pipeline that loads them.

- Each marker represents a table.
- Color represents impact based on the number of associated business cases.
- A table may appear on more than one line if it participates in multiple pipelines.
- The dashed line groups tables without a recorded pipeline.
- Below the diagram is a trigger inventory with frequency, status, and counts of related pipelines and tables.

Impact legend:

- Gray: no business cases.
- Green: one business case.
- Aqua: two or three business cases.
- Red: four or more business cases.
- Dashed outline: no recorded pipeline.

### What to do on screen

1. Select **Whole estate**.
2. Point out the pipeline lines.
3. Explain the color legend.
4. Point out the **No pipeline recorded** line.
5. Click a marker to show that it opens the table record.
6. Return and scroll down to the trigger table if time allows.

### Suggested script

> The third view gives us an estate-wide perspective of Phase 1. Each line represents a pipeline, and each marker represents a table associated with that pipeline.
>
> Color does not represent technical status. It represents the breadth of business impact. Green means one business case, aqua means two or three, and red means four or more. This helps us visually identify tables that may have a broader impact.
>
> A table may appear on multiple lines when it is associated with more than one pipeline. This repetition is intentional and helps explain the coverage of each process.
>
> The line with dashed markers groups in-scope tables that do not have a recorded pipeline. These tables represent a clear opportunity for investigation and documentation.
>
> At the bottom, we can also review the recorded triggers, their frequency and status, and how many pipelines and tables they reach.

### Key message

This view helps prioritize lineage work by combining business scope, technical coverage, and documentation gaps in one place.

---

## Closing, 1 minute

### Suggested script

> In summary, the explorer provides three levels of detail. We can follow an end-to-end journey, investigate an individual table, or review the full Phase 1 scope.
>
> The primary catalog is generated from `Data Catalog V1.xlsx`. The tool preserves gaps as gaps, retains the original comments, and labels derived relationships so they are not confused with confirmed dependencies.
>
> Today, we have 159 cataloged tables, 63 in scope, and one fully traced journey. The natural next step is to document additional end-to-end journeys and complete the pipelines or consumers that are not yet evidenced.

## Likely questions and suggested answers

### Is the diagram drawn manually?

> No. It is generated from a data structure. Once another table's journey is documented, the same interface can represent it without designing a new diagram from scratch.

### Does all the information come from Excel?

> The primary table catalog is generated from the `Hoja 1` sheet in `Data Catalog V1.xlsx`. Items not contained in the workbook—such as stable identifiers, the detailed `CLUB_CARD_DIM` journey, and certain presentation relationships—are maintained as curated metadata and distinguished from catalog data.

### Why do some sections say “Not documented”?

> Because the value does not appear in the reviewed sources. It remains visible to turn missing information into a finding and avoid inventing data.

### Does sharing a pipeline mean one table depends on another?

> Not necessarily. The application labels it as a derived relationship. It helps identify operationally related tables but does not confirm a direct dependency.

### Why is only one table traced end to end?

> `CLUB_CARD_DIM` is the fully traced case supported by the available evidence. It serves as a template for showing how future journeys will be represented once documented.

### Can the report be updated when the Excel workbook changes?

> Yes. The build process regenerates the catalog from the Excel file, so changes to the columns used by the report appear in the application during the next deployment.

### Is the Excel workbook publicly available on Vercel?

> No. The file is used during the build to generate the catalog and is removed from the public deployment output.

### Does the tool modify the original comments?

> No. The history is preserved verbatim to retain the evidence exactly as recorded in the catalog.

## Short version, 3-minute presentation

> Data Lineage Explorer turns the data catalog into three interactive views. At the top, we see 159 registered tables, 63 within the Phase 1 scope, plus 9 pipelines and 18 triggers.
>
> In Animated flow, we follow `CLUB_CARD_DIM` from four operational tables in SQL Server through Landing, Raw, Bronze, Silver, and Gold to publication in Snowflake. The view shows pipelines, notebooks, additional reads, merge keys, and open items.
>
> In Table view, we can search for any table and review its metadata, loading path, relationships, and textual catalog history. Gaps appear as “Not documented,” and derived relationships are clearly identified.
>
> In Whole estate, we see all Phase 1 tables grouped by pipeline. Colors represent how many business cases each table affects, and dashed markers identify tables without a recorded pipeline.
>
> The primary source is `Data Catalog V1.xlsx`. The goal is to simplify lineage validation, prioritize documentation gaps, and progressively expand the end-to-end journeys.

## Presenter reminders

- Say “evidence not found” rather than claiming that a process does not exist.
- Clarify that sharing a pipeline does not confirm a dependency.
- Do not read every technical name in the flow; explain the overall story first.
- Use `CLUB_CARD_DIM` as the narrative thread between Animated flow and Table view.
- If time is short, omit the trigger list and use the short closing version.
- End with the next step: document more complete journeys and resolve the visible gaps.
