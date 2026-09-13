# Working in this repo

Prototype for a consulting discovery engagement. It is shown to the client, so what it says has to be defensible.

## Non negotiables

**Never invent data.** If a value is missing, leave it empty and let the UI show the gap. Do not fill in an owner, a cadence, a zone or a business case to make a screen look complete. An empty string is the documented absence of information and several findings depend on it staying visible.

**Never edit the client's own text.** `TableRec.note` is their comment history, copied verbatim. Do not clean it up, summarise it, or fix its typos.

**Say where a number comes from.** Anything the app works out itself, rather than reading from a source file, has to be labelled on screen as ours. The existing copy does this; keep it that way when you add to it.

**No em dashes in prose.** Not in the UI copy, not in comments, not in the README. Use a comma, a colon, or two sentences.

**No emojis.** Icons or plain text instead.

## Style

- TypeScript strict. No `any`, no non null assertions to get past a type error: fix the type.
- Functional components, hooks for behaviour, pure functions for data shaping. `lib/schemaGroups.ts` is deliberately free of React so the grouping can be reasoned about and tested on its own.
- Styling is global CSS with custom properties in `src/index.css`. Class names are shared with the design, so rename with care. The SVG in a lineage report arrives with its own literal colours from the source HTML, so it is styled by attribute selector, not by token.
- Comments explain why, not what. Do not narrate the obvious.
- **No browser storage.** No `localStorage`, no `sessionStorage`. State lives in React.

## Brand

Wizeline: Velocity Red `#E93D44`, Contrast Dark `#211E1E`, Contrast Light `#FCFBF5`. Space Mono uppercase for titles and labels, Nunito Sans for body. Rounded cards, generous whitespace, high contrast. The client logo and the Wizeline logomark sit together top right, unmodified, separated by a hairline. Footer stays "Proprietary and confidential".

Full palette is in `src/index.css`, as custom properties on `:root`.

## When you change the data

`src/data/lineage.json` is generated from the client workbooks. Do not hand edit it to fix a display problem: fix the component. The one exception is adding a new traced chain under `flow`, which is documented in the README.

If the shape changes, update `src/types.ts` first and let the compiler find the call sites.

## Checks before you finish

```bash
npm run build   # typecheck plus a production build, both must pass clean
```

If you touched the chrome, load both sections and scroll: the tab row and the lineage filter row stay pinned, meet with no gap, and never cover the heading below them. Their offset is `--bar-h`, which has to match the tab row's own height.
