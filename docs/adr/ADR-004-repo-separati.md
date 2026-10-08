# ADR-004 — Repo separati per landing e backoffice

**Stato:** Accettata
**Data:** 2026-08-02
**Decisori:** Product Owner
**Supera parzialmente:** ADR-002 (clausola "Repository": monorepo con workspace)
**Si applica insieme a:** ADR-001, ADR-002 (per il resto), ADR-003

---

## Contesto

ADR-002 aveva scelto un monorepo con workspace npm (`apps/landing`, `apps/backoffice`) per condividere tipi dello schema dati Supabase e componenti del design system tra le due applicazioni, riducendo la duplicazione per un team piccolo.

Da allora sono state prese due decisioni che indeboliscono entrambi i motivi:

- **ADR-003** ha stabilito che l'accesso ai dati Supabase avviene tramite un funnel di funzioni dedicate, **separato per applicazione e non condiviso** in questa fase — proprio per tenere basso il costo di un eventuale cambio di rotta futuro. Il principale motivo tecnico per condividere codice tra landing e backoffice (i tipi/le funzioni di accesso ai dati) non si applica più.
- Il Product Owner ha indicato **Refine + shadcn** come stack per il backoffice. L'interfaccia amministrativa userà quindi un design system generico (shadcn), distinto dallo stile sticker outline/Fredoka-Inter pensato per il sito pubblico. Il secondo motivo per il monorepo (riuso dei componenti UI) non si applica più: un pannello gestionale non condivide l'identità visiva del sito pubblico.

Resta inoltre l'intenzione, già espressa dal PO, di poter **riusare il backoffice (Refine + shadcn + Supabase) come base di partenza per progetti futuri** — cosa più semplice se il backoffice vive in un repository autonomo, non incastrato nella storia e nella configurazione di un monorepo specifico di "Remindeer".

## Decisione

Landing e backoffice vivono in **due repository Git separati e indipendenti**, non in un monorepo.

- **Repository landing**: resta quello esistente (Next.js, App Router), con il funnel `lib/data/` introdotto secondo ADR-003.
- **Repository backoffice**: nuovo repository, Refine + shadcn, con il proprio funnel di accesso ai dati equivalente (stessa disciplina di ADR-003, codice non condiviso con la landing).
- **Punto di contatto tra i due repository**: solo il progetto Supabase condiviso (stesso database, stesse tabelle). Nessuna dipendenza di codice, nessun package npm condiviso, nessuna API tra le due applicazioni (coerente con ADR-003).
- **Deploy**: due progetti Vercel indipendenti, due pipeline separate.

## Motivazione

- I due motivi tecnici che giustificavano il monorepo in ADR-002 non valgono più con le scelte successive (funnel separato per ADR-003, design system diverso per la scelta di Refine + shadcn).
- Repository separati sono più coerenti con l'obiettivo di riusare il backoffice su progetti futuri: un repo Refine + shadcn + Supabase autonomo si clona e adatta più facilmente di una cartella dentro un monorepo specifico.
- Con la comunicazione diretta a Supabase stabilita in ADR-003, non c'è accoppiamento tecnico tra le due applicazioni che renda necessario un repository comune: il "punto di contatto" è solo il database, non il codice.
- Costo di questa struttura più alto di zero ma contenuto: due repository da inizializzare invece di uno, ma senza il setup di workspace npm che il monorepo avrebbe comunque richiesto.

## Conseguenze e rischi accettati

- **Nessuna condivisione automatica dei tipi dello schema dati.** Se lo schema Postgres cambia, i tipi TypeScript vanno aggiornati manualmente in entrambi i repository (o generati separatamente da ciascuno, es. con `supabase gen types`, eseguito in entrambi i progetti). Non è un problema bloccante — è esattamente il costo già accettato in ADR-003 in cambio di indipendenza — ma va tenuto a mente come attività ricorrente, non dimenticabile.
- **Le migration SQL restano nel repository backoffice** (come già stabilito nella conversazione che ha preceduto ADR-002), che resta l'unica fonte di verità dello schema. Il repository landing non possiede né genera migration proprie.
- **Due pipeline CI/CD e due configurazioni di ambiente da mantenere**, invece di una. Accettato in cambio dell'indipendenza dei due progetti.
- Se in futuro la duplicazione tra i due repository diventasse un problema concreto (non solo teorico), resta possibile estrarre un package npm condiviso pubblicato su un registry — senza dover tornare a un monorepo.

## Alternative scartate

- **Monorepo con workspace (ADR-002 originale)**: scartato perché entrambi i motivi che lo giustificavano non valgono più con le scelte successive.
- **Monorepo senza condivisione di codice** (due app nello stesso repo ma senza package condivisi): scartato — avrebbe comunque il costo di setup di un workspace, senza nessuno dei benefici che lo giustificherebbero.
