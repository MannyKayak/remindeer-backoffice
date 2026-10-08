# ADR-001 — Stack tecnico di Farmaconcorso

**Stato:** Accettata
**Data:** 2026-08-02
**Decisori:** Product Owner + partner tecnico
**Gate risolto:** G1 (Roadmap Frontend, §2)

---

## Contesto

Farmaconcorso è un sito web responsive (non app nativa) che deve gestire:
- un catalogo di ~3000 domande ufficiali con opzioni, correzioni ministeriali e mnemotecniche;
- un motore di esercitazione con salvataggio automatico, pausa/ripresa e timer autorevole lato server (requisito non negoziabile);
- login, permessi free/premium, pagamenti (Stripe, in una fase successiva);
- un backoffice per il PO (5-6 schermate, uso quotidiano).

Vincoli di progetto:
- budget iniziale ~5.000–6.000 €, costi ricorrenti ~1.500 €/anno;
- niente infrastrutture sofisticate da amministrare;
- niente stack tecnologico interno del partner di sviluppo, per motivi di proprietà del codice;
- piena proprietà di database e contenuti in capo al Product Owner, con dato esportabile in ogni momento;
- team di sviluppo piccolo, metodologia "fail fast", sprint di 2-3 settimane.

## Opzioni considerate

**Opzione A — Next.js full-stack + Postgres gestito (Neon), autenticazione scritta a mano**
Un solo repo/deploy, massimo controllo su auth e query, ma richiede scrivere da zero autenticazione, gestione ruoli e permessi. Stima: +4/6 giornate rispetto a C.

**Opzione B — Vite/React (SPA) + backend Node separato (Fastify)**
Separazione netta backend/frontend, riutilizzabile per eventuali concorsi futuri. Scartata: SEO nullo senza aggiungere SSR (a quel punto tanto vale Next.js), due deploy e due ambienti da mantenere allineati — la più costosa in giornate a parità di risultato, senza vantaggi concreti a questo budget.

**Opzione C — Next.js + Supabase (Postgres + Auth + Storage + Row Level Security) — SCELTA**

## Decisione

Si adotta l'**Opzione C**: Next.js (React) come frontend e API layer, Supabase come backend-as-a-service per database Postgres, autenticazione utenti e storage.

- **Frontend/API**: Next.js, Tailwind CSS, deploy su Vercel.
- **Database**: Postgres gestito da Supabase, regione UE (requisito GDPR).
- **Autenticazione**: Supabase Auth (email/password, eventuali provider OAuth in futuro).
- **Backoffice**: sezione `/admin` nella stessa applicazione (Opzione B2 della Roadmap Backoffice), non Refine — coerente con un perimetro di 5-6 schermate amministrative, dove costruire le tabelle a mano costa meno che integrare e mantenere un framework admin dedicato.
- **ORM/accesso dati**: Prisma per lo schema e le migrazioni versionate nel repo, anche in presenza di Supabase — mantiene la definizione dello schema come codice, indipendente dallo strumento di hosting.
- **Pagamenti**: Stripe, integrato solo in fase successiva (M4), con modello di permessi (`entitlement`) disaccoppiato da Stripe fin dall'inizio.

## Motivazione

- È l'opzione più rapida per arrivare a un MVP funzionante: autenticazione, gestione utenti e regole di accesso ai dati sono in gran parte già pronte, con un risparmio stimato di 4-6 giornate di sviluppo rispetto a scrivere auth a mano.
- Il dato resta Postgres standard: nessun lock-in tecnico, esportabile in qualunque momento — rispetta il vincolo di piena proprietà del PO.
- Free tier generoso in avvio, poi costi contenuti (~25 €/mese), compatibili col budget ricorrente indicato.
- Un solo repo e un solo deploy riducono la superficie di manutenzione per un team piccolo.

## Conseguenze e rischi accettati

- **Le regole di sicurezza a livello di riga (Row Level Security) sono il punto critico**: un errore lì significa che un utente free potrebbe leggere le domande premium. Va trattato come un requisito di sicurezza di primo livello, non come dettaglio implementativo:
  - le RLS non sono l'unica barriera: ogni endpoint che restituisce contenuto deve comunque verificare esplicitamente i permessi lato server;
  - va previsto un test automatico dedicato che verifichi, ad ogni deploy, che un utente free non possa ottenere domande premium nemmeno chiamando l'API direttamente (coerente con FE-M4-E1-T03 della Roadmap Frontend).
- Dipendenza da due fornitori (Vercel + Supabase) invece di uno solo. Mitigata dal fatto che sia Next.js sia Postgres sono portabili: si può migrare fuori da entrambi senza riscrivere l'applicazione, se necessario in futuro.
- I job lunghi (es. classificazione AI delle 3000 domande) vanno eseguiti come script separati dal team tecnico, non come funzioni serverless — coerente con l'approccio "lean" già previsto nella Roadmap Backoffice per l'import e la classificazione.

## Alternative scartate

- **Opzione A** (Postgres gestito + auth manuale): scartata non per demerito tecnico, ma perché a parità di risultato costa più giornate di sviluppo con questo budget, senza benefici che contino per l'MVP.
- **Opzione B** (SPA + backend separato): scartata per assenza di SEO senza SSR aggiuntivo e per la maggiore superficie di manutenzione (due deploy, due ambienti).
- **Refine per il backoffice**: scartato a favore di una sezione `/admin` nella stessa app Next.js, perché il perimetro amministrativo è piccolo (5-6 schermate) e riusa i componenti del design system già previsti per il frontend pubblico.
- **Strumenti pronti sul database (Directus, Supabase Studio) come backoffice principale**: esclusi per uso quotidiano del PO — espongono il database senza logica applicativa, nessuna validazione, nessuna protezione da operazioni massive sbagliate. Restano utilizzabili dal solo team tecnico come strumento di emergenza.

## Cosa si rinuncia a fare scegliendo così

Si rinuncia al controllo granulare e "a mano" di autenticazione e query che avrebbe offerto l'Opzione A, in cambio di velocità di sviluppo. Si accetta una dipendenza in più (Supabase) rispetto a un singolo fornitore di hosting. Si rinuncia a un backoffice "regalato" come quello che avrebbe offerto Refine, in cambio di uno più leggero e su misura.
