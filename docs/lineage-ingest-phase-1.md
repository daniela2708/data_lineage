# Lineage ingestion, phase 1

## Input recommendation

Ask Mariana for `lineage.yml`, or for a versioned JSON export generated beside the HTML. The HTML is a presentation format with no semantic SVG grouping, so changes to its layout can change parsing behavior even when its information is unchanged. YAML or JSON would preserve the concepts directly, remove the geometry heuristic, and make schema validation possible.

The current implementation still treats HTML as the input contract. `HtmlLineageSource` implements the `LineageSource` interface, so a future YAML source can produce the same `LineageDoc` without changing persistence or rendering.

## Assumptions in this phase

- `Orchestrator`, `Dependencies`, and `Pending validation` are required report sections. `Findings` remains optional.
- An outer SVG rectangle whose stroke is one of the documented role colors defines a node. A short rounded rectangle with another stroke is a flow chip.
- Text inside a node boundary belongs to that node. Text outside nodes and chips is a group label.
- A marker-ended line must meet a source and destination node within five SVG units.
- Empty table cells are data and are preserved as empty strings.
- `ingestedAt` records the application ingestion time. Tests inject a fixed clock so snapshots are deterministic.

## Questions for Mariana

- Can the generator emit the source YAML or a JSON document with a versioned schema and a generation timestamp?
- Are `Orchestrator`, `Dependencies`, and `Pending validation` guaranteed, or should any of them be optional in future reports?
- Can node and edge IDs be emitted in the SVG so connectivity does not need to be inferred from endpoints?
- Are unlabelled arrows intentionally distinct atoms, or do they inherit the nearest labelled flow?
- Can new role colors be introduced, and if so, where will the role-to-color contract be versioned?
