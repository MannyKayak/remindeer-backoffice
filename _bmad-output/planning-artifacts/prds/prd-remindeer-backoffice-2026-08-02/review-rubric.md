# PRD Quality Review — Remindeer Backoffice — Pannello di Amministrazione (2026-08-02)

## Overall verdict

This PRD earns its shape: a single-operator internal tool spec built on a genuinely detailed source Roadmap, with real unresolved architecture tensions surfaced honestly (OQ-1, OQ-2, OQ-3) rather than smoothed over. Decision-readiness, strategic coherence, and scope honesty are strong — the document knows what it doesn't know and says so. The one material defect is mechanical but systemic: all three Key User Journeys in §2.3 cite the wrong FR IDs as their realization (verified against the FRs' own correct "Realizza UJ-X" back-references in §4), which undermines exactly the traceability downstream story creation would lean on. Fix that and this is a strong, buildable PRD gated appropriately on two blocking Open Questions (OQ-1 architecture, OQ-6 source file format) that are honestly not this PRD's to resolve.

## Decision-readiness — strong

Trade-offs are named with what's given up, not just what's chosen: §6.2 states the lean-scenario saving (~9-10 giornate) explicitly as a sprint-planning decision not taken here, rather than silently assuming the full-interface path. §8 Open Questions are genuinely open — OQ-1 (Supabase key/RLS strategy under the SPA constraint) and OQ-2 (Refine reintroduced without a superseding ADR against ADR-001's explicit rejection) are real unresolved tensions, verified accurate against `docs/adr/ADR-001..004` and `_bmad-output/project-context.md`. `[NOTE FOR PM]` callouts land on real tensions (FR-6's G2 file-format risk, FR-27/OQ-3's ADR-002 contradiction, FR-19's "protect from scope cuts" case) rather than safe checkpoints. No instance of the "everything balances" red flag was found — FRs are prioritized MUST/SHOULD/COULD with reasons, not uniformly "important."

### Findings
(none — dimension is strong; no findings needed)

## Substance over theater — strong

No boilerplate NFRs: FR-31 specifies concrete mechanisms (2FA, failed-login throttling, filterable audit log, short session expiry) rather than "the system must be secure." The Vision (§1) is anchored to a specific, non-swappable governance constraint — "il PO ha piena proprietà dei dati, ma l'accesso diretto al database resta al team tecnico" — not a generic mission statement. Only one persona (PO) drives all UJs, appropriate for a single-operator tool — no persona padding. FR-13 (candidate-view preview) and FR-19 (mnemonic effectiveness ranking) both carry stated product rationale rather than being reflexive template entries.

### Findings
(none — dimension is strong; no findings needed)

## Strategic coherence — strong

The thesis is stated once (§1) and the feature set follows it: FR-3 (audit log) is mandated "dal primo giorno," FR-12's answer-change confirmation is called "l'operazione più pericolosa del sistema," and FR-30 (export) is marked non-negotiable because it's what makes the ownership claim "vera, e non solo teorica." Feature ordering (4.1 → 4.7) mirrors dependency logic (auth before everything), not ease-of-build convenience. Success Metrics validate the thesis: SM-3 measures classification review time against a stated baseline (5h vs 17h), not raw activity. Counter-metrics are present and non-trivial — SM-C1 (mass-ops without confirmation must stay zero) and SM-C2 (AI-confirmed-without-review coverage) both guard against the exact failure mode the thesis warns about (irreversible bulk damage, unsupervised classification).

### Findings
(none — dimension is strong; no findings needed)

## Done-ness clarity — adequate

Most MUST FRs carry explicit, testable Consequences (FR-1, FR-2, FR-3, FR-4, FR-9, FR-12, FR-14, FR-15, FR-20, FR-21, FR-25, FR-29, FR-30). Several SHOULD/COULD FRs, however, are thin or missing this section entirely, and one recurring phrase is vague in exactly the way the rubric flags.

### Findings
- **medium** Unbounded "breve" session expiry (§4.1 FR-1, §4.7 FR-31) — FR-1's consequence reads "La sessione ha una scadenza breve configurabile" and FR-31 repeats "sessioni admin con scadenza breve" with no number, default, or range. This is the "reasonable performance"-class vague adjective the rubric asks to flag every instance of. *Fix:* state a default (e.g. "8h, admin-configurable") or explicitly defer the number to architecture with a `[NOTE FOR PM]`.
- **low** FR-27 has no FR body (§4.6) — "Pagine editoriali (COULD — valutazione onesta: probabile primo taglio)" is followed only by a `[NOTE FOR PM]`; there's no statement of what the capability would actually do if built, only that it's contested by OQ-3. Defensible given OQ-3 is unresolved, but an engineer can't currently size or scope this FR even provisionally. *Fix:* either drop to a one-line placeholder capability statement, or fold entirely into OQ-3 and remove the FR number until scoped.
- **low** Several SHOULD FRs lack Consequences (§4.3 FR-10, §4.4 FR-16/17/18, §4.5 FR-22, §4.6 FR-26) — CRUD-shaped ones (FR-18, FR-26) are arguably self-evident, but FR-17 ("vista di avanzamento") and FR-22 (promo codes with usage limits/expiry) have testable behavior worth stating (e.g., does the counter update live? does a promo code stop working at `usi_massimi`?). *Fix:* add a one-line testable consequence to FR-17 and FR-22 at minimum, since both have countable state that's easy to get subtly wrong.

## Scope honesty — strong

Non-Goals (§5) does real work — it explicitly excludes CMS-generic scope, financial operations, cross-app session sharing, and all of Roadmap M7, and it flags the FR-27/ADR-002 tension rather than silently picking a side. `[ASSUMPTION: …]` tags exist at two genuine inference points (§2.2 Redattore-as-non-user, §4.1 FR-2 single-admin-in-v1) and both round-trip cleanly into §9's Assumptions Index — no drift found. Open-items density (7 OQs, 2 assumptions, 4 `[NOTE FOR PM]` callouts) is high for a document meant to gate a build, but the PRD itself names two of those OQs as blocking (OQ-1 for architecture, OQ-6 inherited from the Roadmap) and is explicit that this is intentional, not a smoothing failure — appropriate honesty for a PRD reconciling a pre-ADR planning document against post-ADR reality, not a red flag.

### Findings
(none — dimension is strong; no findings needed)

## Downstream usability — thin

Glossary (§3) is present and its terms are used consistently across FRs (Domanda/Opzione/Mnemotecnica/Segnalazione status vocabularies match the Roadmap's canonical model). FR IDs (FR-1 through FR-31) are contiguous with no gaps or duplicates. Each FR's own "Realizza UJ-X" back-reference is internally correct (verified: FR-4→UJ-3, FR-12→UJ-2, FR-14→UJ-1, FR-15→UJ-1, FR-23→UJ-2). However, the forward references in §2.3 — the rollup a downstream reader would actually trust to see "what satisfies this journey" — are wrong for all three UJs.

### Findings
- **high** UJ-1's realization list cites the wrong FRs (§2.3 UJ-1, line ~119) — "Realizza FR-9, FR-10" — but FR-9 (AI-classification review queue) and FR-10 (bulk classification reassignment) have nothing to do with UJ-1 (writing and publishing mnemonics in an evening session). FR-14 and FR-15 — the mnemonic editor and publishing flow — both independently declare "Realizza UJ-1" in §4.4, confirming the correct citation. *Fix:* change UJ-1's line to "Realizza FR-14, FR-15."
- **high** UJ-2's realization list cites the wrong FRs (§2.3 UJ-2, line ~135) — "Realizza FR-6, FR-14, FR-15" — but FR-6 is import normalization/dedup and FR-14/FR-15 are the mnemonic editor (UJ-1's domain), none relevant to UJ-2 (correcting a reported answer error via the report queue). FR-3, FR-12, and FR-23 all independently declare or clearly correspond to UJ-2 (audit log, answer edit with confirmation, report queue). *Fix:* change UJ-2's line to "Realizza FR-3, FR-12, FR-23."
- **medium** UJ-3's realization list is incomplete (§2.3 UJ-3, line ~147) — "Realizza FR-3, FR-4" — FR-4 is correctly cited (confirmed by FR-4's own "Realizza UJ-3"), but FR-3 (general audit log) is a weaker fit than the two FRs actually built for this journey: FR-5 (import report, explicitly what the journey's Resolution step reads — "il `lotto_import` resta consultabile") and FR-6 (normalization/dedup, what makes re-import safe). *Fix:* change UJ-3's line to "Realizza FR-4, FR-5, FR-6."

This pattern (offset consistent with FR-7 through FR-10 having been inserted after an earlier draft's numbering, without updating §2.3) is worth a full pass over the UJ section rather than a spot-fix, in case other citations drifted the same way.

## Shape fit — strong

Correctly shaped as a capability spec for a single-operator internal tool: three UJs total, each with a named protagonist (il PO / un amministratore tecnico) carrying context inline, not padded to hit a UJ quota. Success Metrics are operational (import run count without duplication, review time against a baseline) rather than forced into user-facing engagement metrics. The document does not over-formalize with persona multiplicity or B2B-style stakeholder journeys that wouldn't apply to a one-admin tool, and does not under-formalize either — the ⭐-marked "most-used" features (FR-14/15 mnemonic editor, FR-21 manual entitlement, FR-25 free set, FR-30 export) get proportionally more elaboration than peripheral SHOULD/COULD items, which is the right allocation of rigor for this shape.

### Findings
(none — dimension is strong; no findings needed)

## Mechanical notes

- **UJ → FR cross-references are broken for all three UJs** (see Downstream usability findings above) — this is the one cross-reference defect found; FR → UJ back-references, FR numbering, and OQ/SM/ASSUMPTION numbering are all otherwise contiguous and resolve correctly.
- **Assumptions Index roundtrip: clean.** Both inline `[ASSUMPTION: …]` tags (§2.2, §4.1 FR-2) are indexed in §9, and both §9 entries have a matching inline tag. The third §9 bullet (funnel/ADR-003 inheritance) is explicitly marked as *not* a PRD-level assumption, correctly distinguished from the other two.
- **Glossary drift: none found.** Domain-noun usage (Domanda, Mnemotecnica, Segnalazione, Lotto di import, Registro delle modifiche, Set gratuito, Funnel di accesso dati) is consistent in case and form across §3, §4, and §9.
- **UJ protagonist naming: adequate for the shape.** All three UJs name a protagonist role ("il PO," "un amministratore tecnico") with situational context inline (e.g. UJ-1's "dopo cena, si mette a scrivere mnemotecniche per un'ora") — appropriate given the single-operator shape; a named individual (vs. role) would be over-formalization here, not an improvement.
- **Required sections: present.** All sections implied by the checklist's shape guidance for an internal-tool capability spec are present (Vision, Target User with JTBD/Non-Users/UJs, Glossary, Features/FRs with MoSCoW, Non-Goals, MVP Scope, Success Metrics with counter-metrics, Open Questions, Assumptions Index).
