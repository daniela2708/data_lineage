# Catalog review

## CLUB_CARD_DIM sequencing

Current plan: SALES_POS_TX_F in Wave 2, CLUB_CARD_DIM in Wave 3.

Finding: SALES_POS_TX_F carries CLUB_CARD_KEY, so it needs the dimension to
exist first. As planned, the fact is scheduled before the dimension that
produces its keys. Evidence: the join in df_build_update_first_tx_dt, plus
CLUB_CARD_KEY present in both tables.

The dependency is not circular. It is three sequential steps: the base
dimension loads, then the fact, then a post load step fills FIRST_TX_DT by
reading the fact.

Proposed: move CLUB_CARD_DIM to Wave 2, alongside SALES_POS_TX_F. This follows
the rule the plan already uses for shared dimensions, where DT_DIM and LOC_DIM
sit in Wave 1 because later waves need them.

Build Seq within Wave 2 must reflect the internal order:
  CLUB_CARD_DIM base load, then SALES_POS_TX_F, then the CLUB_CARD_DIM post
  load enrichment. Record the enrichment as a note on the CLUB_CARD_DIM row
  rather than as a separate row, so the table stays a single unit of work.

Risk if unchanged: SALES_POS_TX_F would be migrated in Wave 2 with no customer
dimension to point at, and FIRST_TX_DT would be null when CLUB_CARD_DIM is
validated in Wave 3, producing a defect report that is not a defect.

Decision: pending.

**Update, from the CLUB_CARD_DIM table analysis (analysis/club_card_dim/):**
`CLUB_CARD_KEY` present in both tables is confirmed, 26 tables carry it per
`catalog/key_dependencies.csv`, including `SALES_POS_TX_F`. The "join in
df_build_update_first_tx_dt" evidence line above has not been independently
re-verified: that file has not been read in this project. Only the step's
position in the orchestrator, after the base dimension load and before the
next enrichment step, is confirmed
(`analysis/club_card_dim/fex/pf_ams_club_card_dim_process.fex`). The three
sequential steps description still holds by step order; the specific join
detail is carried forward, not newly confirmed.
