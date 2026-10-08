# Remindeer Backoffice — Project Context (decisioni tecniche e vincoli)

Fonte di verità per tutti i workflow BMAD su questo progetto. Non riaprire
discussione su punti marcati DECISO. Progetto gemello: repository "remindeer"
(landing pubblica), stesso backend Supabase, nessuna dipendenza di codice.

## Prodotto

Remindeer Backoffice è il pannello di amministrazione per Remindeer (ex Farmaconcorso),
piattaforma che aiuta neo-laureati in farmacia a memorizzare le ~3000 domande
ufficiali del concorso per le sedi farmaceutiche tramite mnemotecniche.

Il backoffice è lo strumento con cui il Product Owner esercita la proprietà
sui propri contenuti (domande, mnemotecniche, testi editoriali) senza accesso
diretto al database — vincolo di governance esplicito, non negoziabile
(Roadmap Backoffice §2, G10).

## Documenti di riferimento — fonte di verità, non reinventare

- `Roadmap_Backoffice_Farmaconcorso.md` (v1.0, 14/07/2026) — pianificazione
  operativa: milestone M0-M7, modello dati canonico (§3), gate di decisione,
  rischi. Scritta **prima** di ADR-002/003/004: alcune sue assunzioni sono
  state superate, vedi "Punti da riconciliare" sotto.
- ADR-001 (stack tecnico) — Supabase + Next.js per la landing; per il
  backoffice aveva scelto `/admin` integrato scartando Refine.
- ADR-002 (backoffice come progetto separato) — prima revisione: monorepo
  con due app Next.js, backoffice con secret key server-side.
- ADR-003 (accesso ai dati centralizzato) — funnel obbligatorio per
  applicazione: nessuna chiamata Supabase fuori da un punto unico; per
  Refine, il data provider ufficiale `@refinedev/supabase` è già il funnel.
- ADR-004 (repo separati) — supera parzialmente ADR-002: due repository Git
  indipendenti, nessun monorepo, nessun package condiviso.

## Stack tecnico — DECISO (questo repository)

- Frontend: Refine (headless) + Vite (SPA pura, niente SSR/Next.js) +
  shadcn/ui + Tailwind CSS + TypeScript
- Data/Auth provider: `@refinedev/supabase` ufficiale + pattern Refine
  documentato per Supabase Auth (email/password, nessun self-signup)
- Backend/DB: stesso progetto Supabase della landing (Postgres + Auth),
  regione UE
- Accesso dati: **regola del funnel (ADR-003)** — nessun componente/pagina
  chiama `supabaseClient` direttamente. CRUD generico via data provider
  Refine; tutto il resto via `src/providers/custom/`
- Repository: separato dalla landing (ADR-004), nessuna dipendenza di
  codice, nessun package condiviso — solo Supabase in comune

## Punti da riconciliare tra Roadmap e ADR più recenti

Non risolti d'autorità qui — vanno esplicitati nel PRD, non nascosti:

1. **Chiave Supabase lato backoffice.** ADR-002 assumeva un backoffice
   server-side (Next.js `/admin` o app Next.js dedicata) che usa la
   **secret key** lato server per bypassare le RLS dietro autenticazione
   admin. Lo stack effettivamente scelto (Refine + Vite) è una **SPA pura
   client-side**: non può mai contenere la secret key in sicurezza (finisce
   nel bundle pubblico). Questo richiede o (a) policy RLS esplicite che
   concedano agli admin autenticati i permessi necessari, mantenendo la
   publishable key anche nel backoffice, oppure (b) un livello server che
   ADR-002/003 non prevedono nello stack attuale. **Non è una scelta
   implementativa minore: va decisa esplicitamente**, non assunta.
2. **Refine come scelta di stack.** ADR-001 aveva scartato esplicitamente
   Refine per il backoffice ("backoffice regalato" vs. costruito su misura,
   coerente con 5-6 schermate). ADR-004 lo reintroduce come stack scelto dal
   PO, ribaltando quella motivazione senza un ADR che la superi
   esplicitamente — il cambio di rotta è menzionato solo di sfuggita dentro
   ADR-004 §Contesto.
3. **Perimetro dei contenuti gestiti.** La Roadmap (§3, modello dati
   canonico) copre solo domande/opzioni/categorie/mnemotecniche/utenti.
   ADR-002 estende il perimetro del backoffice ai testi editoriali della
   landing ("contenuti testuali principali"), ma **non esiste ancora un
   modello dati per i contenuti editoriali** — ADR-002 lo segnala come
   conseguenza aperta, non risolta.
4. **Repo separati vs. modello dati condiviso.** ADR-004 accetta
   esplicitamente che i tipi TypeScript dello schema Supabase vadano
   generati/aggiornati a mano in entrambi i repository, senza automazione:
   va tenuto presente nel PRD come vincolo operativo ricorrente, non un
   dettaglio.

## Vincoli

- Nessun self-signup admin: utenti admin creati manualmente su Supabase
- Ogni scrittura sui contenuti tracciata (registro modifiche, Roadmap §M0.4)
- Import/classificazione delle 3000 domande: operazioni idempotenti,
  reversibili o tracciate (Definition of Done specifica del backoffice,
  Roadmap §0)
- Cambiare la risposta corretta di una domanda richiede conferma esplicita
  e finisce nel registro modifiche (operazione più pericolosa del sistema)

## Scope di questa fase di pianificazione

Sessione corrente: generazione del PRD iniziale a partire dalla Roadmap
esistente, riconciliando le assunzioni superate (vedi sopra). Nessuna
generazione di epic/story in questa sessione — quello è uno step successivo,
dopo revisione del PRD.
