# ADR-003 — Accesso ai dati centralizzato dietro un funnel, con Supabase diretto

**Stato:** Accettata
**Data:** 2026-08-02
**Decisori:** Product Owner
**Si applica insieme a:** ADR-001 (stack), ADR-002 (backoffice come progetto separato)
**Gate risolto:** discussione su Supabase come BaaS vs API Node custom

---

## Contesto

In ADR-001 si era scelto Supabase come backend-as-a-service (Postgres + Auth + API generata automaticamente + RLS), motivato dalla velocità di sviluppo per un team piccolo con budget contenuto. In ADR-002 si era assunto che landing e backoffice comunicassero entrambi direttamente con Supabase, senza un'API intermedia.

Discutendo l'architettura è emersa un'alternativa concreta — un'API Node custom (Fastify/NestJS + Prisma) davanti a Postgres — con vantaggi reali (permessi centralizzati nel codice invece che nelle RLS, contratto esplicito tra frontend/backoffice e dati, stack più riusabile su progetti futuri) ma un costo altrettanto reale: giornate di sviluppo aggiuntive per scrivere da zero autenticazione, endpoint e validazioni che Supabase offre già pronte — proprio il costo che ADR-001 aveva scelto di evitare.

Il Product Owner ha scelto di **non decidere ora** tra le due strade in modo definitivo: vuole procedere subito con Supabase diretto per velocità, ma senza che questa scelta diventi un vincolo costoso da disfare in futuro, se dovesse rendersi necessaria un'API intermedia (per logica di business più complessa, per riuso dello stack su altri progetti, o per altri motivi non ancora previsti).

## Decisione

Si conferma **Supabase diretto** (coerente con ADR-001): sia la landing sia il backoffice comunicano con Supabase tramite `supabase-js`, senza un'API intermedia, in questa fase.

Si introduce però un vincolo **non negoziabile**, valido da subito e per tutto lo sviluppo, in entrambe le applicazioni:

> **Nessun componente, pagina, azione o schermata del backoffice può chiamare `supabase.from(...)` (o equivalenti) direttamente.** Ogni accesso ai dati passa esclusivamente da un insieme di funzioni dedicate, raccolte in un unico punto per applicazione (proposta: `lib/data/` nella landing, equivalente nel backoffice), con nomi espliciti legati al dominio (es. `getDomandeGratuite()`, `submitQuizCompletion()`, `getTestoSezione(chiave)`), non generici (mai una funzione tipo `queryTable(nome, filtri)` che espone di fatto Supabase al chiamante).

- **Un funnel per applicazione**, non condiviso tra landing e backoffice in questa fase: ciascuna ha il proprio insieme di funzioni di accesso ai dati, seguendo la stessa disciplina ma senza codice in comune. Questo evita di dover impostare da subito un monorepo con package condiviso, mantenendo la velocità di sviluppo prioritaria in questa fase. La condivisione di codice tra le due applicazioni resta un'ottimizzazione possibile in futuro, non un prerequisito.
- **Vale anche per Refine**, se scelto per il backoffice: si userà il data provider Supabase ufficiale (`@refinedev/supabase`), che è già di per sé un funnel — Refine astrae l'accesso ai dati dietro un'interfaccia intercambiabile. Non va aggirato con chiamate dirette a Supabase sparse nei componenti del backoffice.
- **Vale anche per Supabase Auth**: le chiamate `supabase.auth.*` passano da un unico modulo di autenticazione per applicazione, non sparse nei componenti.

## Motivazione

- Mantiene la velocità di sviluppo che ha motivato la scelta di Supabase in ADR-001: nessuna API da scrivere ora.
- Rende il costo di un eventuale cambio di rotta futuro (introduzione di un'API intermedia) un **refactor mirato** — si riscrive l'interno delle funzioni del funnel — invece di una riscrittura che tocca ogni componente dell'applicazione. Il costo di questa protezione è quasi nullo: il progetto è oggi ancora piccolo (una tabella, una scrittura, nessun backoffice scritto), quindi introdurre questa disciplina ora costa pochissimo rispetto a introdurla quando il codice sarà cresciuto.
- Non obbliga a una decisione prematura tra Supabase diretto e API Node — la decisione resta aperta e a basso costo, rimandabile al momento in cui emergerà un bisogno concreto (es. logica di business che le RLS non riescono a esprimere bene, o necessità di riusare il backend su un altro progetto).

## Conseguenze e rischi accettati

- **Il funnel va rispettato con disciplina**, altrimenti la protezione è solo teorica. Va trattato come una regola di code review: ogni PR che introduce una chiamata diretta a `supabase.from()` fuori da `lib/data/` va respinta, indipendentemente da chi la scrive.
- **Le RLS restano comunque il meccanismo di permessi attivo in questa fase** — il funnel centralizza *dove* si chiama Supabase, ma non sostituisce la necessità di scrivere le policy RLS corrette (già segnalato come requisito di sicurezza di primo livello in ADR-001). Il funnel rende più facile, in futuro, spostare quella logica di permessi nel codice di un'API — non la rende superflua oggi.
- **La duplicazione tra i due funnel (landing e backoffice)** è un costo accettato in cambio di velocità di impianto: alcune funzioni (es. lettura di una domanda pubblicata) potrebbero esistere, con piccole differenze, in entrambe le applicazioni. Se in futuro la duplicazione diventa un problema concreto, si estrae un package condiviso — decisione rimandata, non preclusa da questa scelta.
- **La scelta tra Supabase diretto e API Node resta esplicitamente aperta** per il futuro: questo ADR non la chiude, la rimanda a quando ci sarà un bisogno concreto che la giustifichi.

## Alternative scartate

- **API Node custom da subito**: scartata per questa fase — costo in giornate non giustificato senza un bisogno concreto che vada oltre quello che Supabase offre già.
- **Nessun vincolo di centralizzazione (chiamate Supabase libere ovunque)**: scartata — renderebbe qualunque cambio di rotta futuro una riscrittura totale, vanificando la possibilità di tornare sulla decisione con basso costo.
- **Funnel condiviso tra landing e backoffice fin da subito (richiede monorepo)**: rimandata, non scartata — resta un'opzione futura se la duplicazione tra i due funnel diventa un problema concreto.

## Punti aperti collegati

- La struttura repo (monorepo vs repo separati per landing/backoffice) resta una decisione sospesa, indipendente da questo ADR — va chiusa separatamente.
- Va scritta una checklist di code review che verifichi il rispetto del funnel (es. un controllo automatico che cerchi `supabase.from(` fuori dalle cartelle `lib/data/` designate).
