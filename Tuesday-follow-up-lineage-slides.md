# Tuesday Project Follow-up

## Slide 1 — Verified Lineage as a Migration Foundation

**Turning fragmented legacy knowledge into implementation-ready evidence.**

Weis Markets × Wizeline  
Phase 1 Data Modernization Discovery

**Visual direction**

- White canvas with a thin Weis-red accent line.
- Minimal source → evidence → implementation motif across the lower third.
- Subtle left-to-right reveal of the motif after the title appears.

**Speaker notes**

Today’s update is about turning fragmented knowledge of the current Oracle ecosystem into evidence the implementation team can confidently use. Mariana has established a repeatable table-level lineage process that verifies how data actually moves today—not how we assume it moves based on names or outdated documentation. This creates a reliable foundation for migration planning, sequencing, and delivery.

---

## Slide 2 — Why Verified Current State Matters

### Implementation cannot move confidently on assumptions

| What we need to know | Why it matters |
|---|---|
| **What exists today** | Defines the real migration scope |
| **How each table is loaded** | Prevents missed processes and incomplete rebuilds |
| **What depends on it** | Protects downstream reports and business workflows |
| **What is live vs. obsolete** | Avoids migrating dead or superseded paths |

> The previous migration stalled. The next phase needs a verified map of the current ecosystem before implementation decisions are made.

**Visual direction**

- Four compact evidence pillars around a central “Migration confidence” anchor.
- Reveal each pillar sequentially; finish by emphasizing the central anchor.

**Speaker notes**

The previous migration effort remained partially completed after several years. One contributing risk is beginning implementation without a sufficiently verified view of the current state. Before deciding what to rebuild or retire, the team needs to know what truly runs, what it reads, what it writes, and what could break downstream. This discovery closes that confidence gap using production evidence.

---

## Slide 3 — A Repeatable, Evidence-Based Process

### From source evidence to validated migration input

```text
SOURCE FILES + ORACLE DATA
             ↓
    TABLE EVIDENCE FOLDER
             ↓
         lineage.yml
             ↓
 GENERATED HTML + EXCEL DELIVERABLES
             ↓
   VALIDATED MIGRATION INPUT
```

**Repeatable** · Same method for every Phase 1 table  
**Evidence-based** · Claims traced to code, data, or explicit inference  
**Independently validated** · Relationships are tested rather than assumed

**Visual direction**

- Use one continuous horizontal pipeline with five differentiated stages.
- Code evidence, data evidence, and inferred evidence use small neutral badges—not competing colors.
- Animate a restrained pulse through the pipeline from left to right.

**Speaker notes**

Mariana has built more than individual diagrams. She has created a repeatable discovery process. Each table receives a dedicated evidence folder, a normalized lineage definition, and generated deliverables. Code and data are evaluated independently, and inferred relationships remain clearly identified as requiring validation. Because the process is repeatable and auditable, implementation can trace decisions back to their supporting evidence.

---

## Slide 4 — Business Value for Implementation

### Confidence before code

1. **Reduces migration uncertainty**  
   Replaces assumptions with verified current-state evidence.

2. **Identifies sequencing and downstream impact**  
   Shows what must migrate first and what could be affected.

3. **Separates live from legacy or dead paths**  
   Prevents unnecessary rebuilds and preserves important history.

4. **Creates reusable, auditable evidence**  
   Gives implementation a durable reference for design and validation.

**Visual direction**

- Four balanced benefit cards with minimal line icons.
- Use Weis red only for the active emphasis; retain neutral supporting colors.
- Introduce cards with a short staggered fade.

**Speaker notes**

The immediate value is lower uncertainty, but the impact goes further. Verified lineage makes migration dependencies and implementation order visible. It separates active processes from historical paths that should be reviewed rather than automatically rebuilt. It also creates an auditable asset that engineering, product, and validation teams can reuse throughout implementation.

---

## Slide 5 — Current Blockers and Risks

### Progress is strong; evidence access remains critical

| Current constraint | Delivery impact |
|---|---|
| **VPN instability** | Slows access to Oracle and TIBCO evidence |
| **Open relationships** | Some dependencies still require confirmation |
| **Complex dependency sets** | Require careful visualization and review |
| **Access and SME availability** | Needed to resolve uncertainty efficiently |

**Message:** These are manageable discovery constraints—not failures in the process. Visibility allows the team to address them directly.

**Visual direction**

- Use a measured risk panel rather than warning-heavy graphics.
- Amber indicators for constraints; red reserved for genuinely blocking items.
- Keep the “manageable constraints” message visually prominent.

**Speaker notes**

The process is working, but its speed depends on reliable evidence access. VPN instability has slowed direct review of Oracle and TIBCO artifacts. A subset of relationships remains deliberately marked as pending rather than being promoted to confirmed without proof. Continued SME feedback is also important for resolving business context that code and data alone cannot fully explain.

---

## Slide 6 — Next Steps and Leadership Ask

### Carry discovery momentum into implementation

**Continue** generating lineage for the remaining Phase 1 tables  
**Validate** open findings and inferred relationships with SMEs  
**Prioritize** implementation order using dependency and impact evidence  
**Productize** the artifacts through the interactive Data Lineage Explorer  
**Connect** discovery outputs directly to implementation planning

### Ask

Maintain stable system access, timely SME participation, and a direct handoff from discovery into implementation.

**Visual direction**

- Show the five actions as a forward path ending at “Implementation-ready migration plan.”
- Reveal the leadership ask last with a restrained red underline.

**Speaker notes**

The immediate priority is to continue applying this process across the remaining Phase 1 tables and validate open questions with the right SMEs. The lineage should then inform implementation order, not remain a standalone discovery artifact. The interactive Explorer will make this evidence easier to navigate across technical and leadership audiences. The leadership ask is straightforward: protect access, enable timely validation, and keep the lineage connected to implementation decisions.

