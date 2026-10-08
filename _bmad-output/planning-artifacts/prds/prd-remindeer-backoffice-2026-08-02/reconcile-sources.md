---
title: Input Reconciliation — PRD vs Source Documents
created: 2026-08-02
---

# Reconciliation: PRD vs Source Inputs

Scope: check whether `prd.md` accurately and completely reflects each source
below, and whether the three flagged contradictions (OQ-1, OQ-2, OQ-3) are
represented accurately relative to what the ADRs actually say.

---

## 1. Roadmap_Backoffice_Farmaconcorso.md (primary source)

Overall: very faithfully translated. The PRD correctly carries over the
milestone structure (M0–M7 → §4.1–4.7), the canonical data model as
Glossario, the MoSCoW priorities, most numeric justifications (5h vs 17h,
budget savings of the lean scenario), and even preserves the Roadmap's
opinionated voice via direct quotes ("il registro vale dieci volte quello
che è costato", "una risposta corretta sbagliata insegna a 500 persone la
cosa sbagliata"). Gates G2/G3/G5/G10/G11 are represented (G2 as OQ-6, G3/G10
implicitly via feature descriptions), and the lean scenario (§7) is
preserved as OQ-7 / §6.2 rather than silently resolved.

Gaps found:

1. **Open data-model decision on "categoria primaria" dropped.** Roadmap §3
   (`domanda_categoria`) explicitly flags an undecided question: *"una
   categoria primaria + eventuali secondarie (consigliato), oppure una sola
   categoria rigida?"* The PRD's Glossario (§3) and FR-8/FR-9 describe
   classification as settled without surfacing this as an open question —
   it is not listed in §8 Open Questions nor §9 Assumptions, even though
   the PRD's own §9 Assumptions Index is exactly the place other similarly
   undecided points get captured (e.g. session length, Redattore role).

2. **Explicit automated-test requirement for admin authorization dropped.**
   Roadmap §5 (API di amministrazione) states as a numbered rule: *"Nessun
   endpoint amministrativo raggiungibile con un token utente. Da verificare
   con un test automatico, come per il paywall."* PRD FR-2 covers
   server-side permission checks as a testable consequence, but never
   surfaces the Roadmap's explicit call for an automated regression test
   analogous to the free/premium paywall test — a specific, testable
   requirement, not just a design principle.

Both are minor/specific; nothing substantial from the Roadmap's core
planning content (milestones, risks, data model, runbooks) was silently
dropped or flattened.

---

## 2. ADR-001-stack-tecnico.md

Overall: correctly used as the origin of OQ-2 (Refine rejection) and
correctly *not* cited as a binding constraint in §0 (since its
backoffice-architecture decision was superseded by ADR-002/004) — this is
the right call, not an omission.

Gaps found:

1. **RLS-as-primary-security-boundary emphasis and its explicit automated-test
   requirement are dropped.** ADR-001 treats RLS as "punto critico...
   requisito di sicurezza di primo livello, non... dettaglio implementativo"
   and mandates *"un test automatico dedicato che verifichi, ad ogni deploy,
   che un utente free non possa ottenere domande premium nemmeno chiamando
   l'API direttamente."* This is directly relevant to OQ-1 (Supabase
   key/RLS in the SPA backoffice) but the PRD's OQ-1 discusses only *which*
   mechanism grants admin permissions (RLS vs. server layer), not ADR-001's
   parallel demand for a standing automated test verifying the boundary
   holds. FR-31 mentions "sicurezza e tracciamento" generically but does not
   carry this specific testable requirement forward.

2. **Budget/cost constraints that motivate the whole "lean scenario" are
   never stated.** ADR-001's Contesto section gives concrete numbers
   (~€5.000–6.000 initial budget, ~€1.500/year recurring) as the reason
   Supabase-direct and a lightweight backoffice were chosen over a custom
   Node API. The PRD's Roadmap-derived "lean scenario" discussion (§6.2,
   OQ-7) refers to day-savings but never states the underlying budget
   constraint that makes those savings matter — a reader of the PRD alone
   would not know *why* trimming 9-10 days is worth doing.

---

## 3. ADR-002-backoffice-progetto-separato.md

Overall: this is the ADR most central to OQ-1 and OQ-3, and both are
represented accurately. OQ-1 correctly states ADR-002's original assumption
(secret key server-side, bypassing RLS, behind admin auth) as the premise
that the later Refine+Vite SPA choice invalidates. OQ-3 correctly identifies
that ADR-002 widened the backoffice's content perimeter to include the
landing's core editorial text, while the Roadmap's canonical data model
(§3) does not cover it at all and even the Roadmap itself (§E5.3) marks
"Pagine editoriali" COULD/first-cut — the PRD's FR-27 flags this tension
explicitly and correctly, including quoting the Roadmap's own dismissive
line ("costa meno di una giornata di CMS").

Gaps found:

1. **Supabase CLI / migration-tooling requirement dropped.** ADR-002's
   Conseguenze lists as a concrete follow-up: *"Va introdotta la Supabase
   CLI (`supabase link`) nel progetto backoffice, oggi assente."* This is
   an operational/architecture-adjacent item, arguably below PRD altitude,
   but since the PRD does carry forward comparably operational ADR-002
   items (RLS policies as OQ-1, editorial content data model as OQ-3), its
   silent omission here is inconsistent rather than a deliberate scoping
   choice.

Nothing else of substance from ADR-002 was flattened — the decision
rationale (PO's explicit preference not to mix data/API code with the
public site, monorepo-vs-separate reasoning) is not needed at PRD altitude
and its absence is appropriate, not a gap.

---

## 4. ADR-003-accesso-dati-centralizzato.md

Overall: accurately and thoroughly reflected. The "Funnel di accesso dati"
glossary entry, the NFR under FR-3 ("ogni scrittura sui dati passa
esclusivamente dal funnel Refine/`providers/custom`"), and the recurring
phrase "mai chiamate dirette" throughout the PRD correctly capture ADR-003's
non-negotiable rule. The PRD also correctly avoids overstating the funnel's
effect — it doesn't claim the funnel replaces RLS-based permissions.

Gaps found:

1. **Funnel-compliance enforcement mechanism dropped.** ADR-003's "Punti
   aperti collegati" calls for *"una checklist di code review che verifichi
   il rispetto del funnel... un controllo automatico che cerchi
   `supabase.from(` fuori dalle cartelle designate."* This is a concrete,
   ADR-flagged follow-up (parallel to the RLS automated test in ADR-001)
   that the PRD does not carry forward anywhere, including §8 Open
   Questions where comparably-scoped items (OQ-5 2FA mechanism, OQ-7 lean
   scope) do get a slot.

This is a minor, single gap — the rest of ADR-003 (Supabase-direct decision,
per-application non-shared funnel, RLS still required underneath) is either
correctly reflected or correctly left out as below-PRD-altitude.

---

## 5. ADR-004-repo-separati.md

Overall: correctly used as the basis for "nessun monorepo, nessuna
dipendenza di codice con la landing" in §0, and correctly identified in
OQ-2 as the ADR that reintroduces Refine without formally re-litigating
ADR-001's rejection of it — this reading matches ADR-004's own text (its
Motivazione section treats Refine+shadcn as an already-given fact from the
PO, not a re-opened technical decision).

Gaps found:

1. **Manual cross-repo type-synchronization burden dropped, despite being
   explicitly flagged as must-keep.** ADR-004's Conseguenze states plainly:
   *"Nessuna condivisione automatica dei tipi dello schema dati... i tipi
   TypeScript vanno aggiornati manualmente in entrambi i repository... va
   tenuto a mente come attività ricorrente, non dimenticabile."*
   `_bmad-output/project-context.md` (§"Punti da riconciliare", point 4)
   independently flags this exact point as something that must be kept
   in the PRD as "un vincolo operativo ricorrente, non un dettaglio." The
   PRD's §8 Open Questions and §9 Assumptions Index contain no trace of
   it — this is the one gap in this reconciliation with the clearest paper
   trail showing it was meant to survive into the PRD and did not.

2. **"Backoffice as reusable template for future projects" motivation
   dropped.** ADR-004 gives as one of its stated reasons for repo
   separation the PO's intention to reuse the backoffice (Refine + shadcn +
   Supabase) as a starting point for future projects. This is a strategic/
   product-shaping fact (it argues for generic, non-Remindeer-specific patterns
   in the backoffice) that does not appear anywhere in the PRD's Vision
   (§1) or Non-Goals (§5), even though it plausibly bears on genericity vs.
   specificity trade-offs a future architecture phase would need to know
   about.

---

## Summary

| Source | Gaps found |
|---|---|
| Roadmap_Backoffice_Farmaconcorso.md | 2 |
| ADR-001-stack-tecnico.md | 2 |
| ADR-002-backoffice-progetto-separato.md | 1 |
| ADR-003-accesso-dati-centralizzato.md | 1 |
| ADR-004-repo-separati.md | 2 |

OQ-1, OQ-2, and OQ-3 were all checked word-by-word against the ADR text
they summarize and found accurate and complete relative to what the ADRs
say — no misrepresentation, no softened or overstated contradiction.
