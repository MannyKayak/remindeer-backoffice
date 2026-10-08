# ADR-002 — Backoffice come progetto separato dalla landing

**Stato:** Accettata
**Data:** 2026-08-02
**Decisori:** Product Owner
**Supera parzialmente:** ADR-001 (sezione "Decisione", punto "Backoffice")
**Gate risolto:** G10 (Roadmap Backoffice, §2)

---

## Contesto

ADR-001 aveva scelto di costruire il backoffice come sezione `/admin` all'interno della stessa applicazione Next.js della landing (Opzione B2 della Roadmap Backoffice), motivato da: perimetro amministrativo piccolo (5-6 schermate), riuso dei componenti del design system, un solo repo e un solo deploy da mantenere per un team piccolo.

Nel frattempo il progetto landing è stato avviato (Next.js 16, App Router, React 19, Tailwind v4) come repository autonomo, oggi in sviluppo locale senza hosting attivo. Contiene:
- una singola tabella Supabase (`quiz_completions`) con Row Level Security attiva e **nessuna policy definita** — accessibile solo dalla secret key server-side;
- un'unica migration SQL versionata dentro il repo della landing;
- contenuto quiz (10 domande) e testi principali della landing hardcoded nel codice, dichiarati esplicitamente come placeholder in attesa dei contenuti reali del PO;
- nessuna autenticazione, nessun concetto di ruolo/admin, nessuna route API.

Il Product Owner ha espresso una preferenza esplicita: non vuole che la gestione dei dati e delle API viva mescolata al codice del sito pubblico. Vuole inoltre che il backoffice governi, oltre alle domande e mnemotecniche già previste in Roadmap Backoffice, anche i contenuti testuali principali della landing e in prospettiva del sito, lasciando hardcoded solo testi minori non strategici. Questo allarga il perimetro amministrativo rispetto alle "5-6 schermate" ipotizzate in ADR-001, indebolendo uno dei motivi originari per cui si era scartata un'applicazione separata.

## Opzioni considerate

**Opzione 1 — Confermare ADR-001: sezione `/admin` nello stesso repo Next.js**
Nessun costo di impianto aggiuntivo, ma va contro la preferenza esplicita del PO e diventa meno giustificata ora che il perimetro dei contenuti gestiti cresce oltre le poche schermate previste inizialmente.

**Opzione 2 — Due repository Git indipendenti (landing e backoffice separati)**
Massima indipendenza tra i due progetti, zero setup di workspace. Scartata: landing e backoffice condivideranno lo stesso schema dati Supabase e, in parte, lo stesso design system — senza un monorepo i tipi TypeScript dello schema e i componenti UI condivisi andrebbero duplicati a mano o pubblicati come pacchetto npm privato, con rischio concreto di disallineamento nel tempo per un team piccolo.

**Opzione 3 — Monorepo con due applicazioni Next.js indipendenti (`apps/landing`, `apps/backoffice`), Supabase come unico backend condiviso — SCELTA**

## Decisione

Si adotta l'**Opzione 3**: il backoffice diventa un'applicazione Next.js separata dalla landing, nello stesso repository Git (monorepo con workspace npm), entrambe collegate allo stesso progetto Supabase.

- **Repository**: un solo repo Git, struttura a workspace (`apps/landing`, `apps/backoffice`, eventuale `packages/` per tipi e componenti condivisi).
- **Comunicazione dati**: nessuna API intermedia tra le due applicazioni. Ciascuna parla direttamente con Supabase, con credenziali diverse per scopo:
  - `apps/backoffice` usa la secret key server-side per lettura/scrittura completa (bypassa RLS), dietro autenticazione admin;
  - `apps/landing` continua a usare la secret key server-side per le proprie scritture (es. `quiz_completions`, invariato rispetto a oggi) e userà la publishable key, vincolata da policy RLS di sola lettura sui contenuti pubblicati, per mostrare i contenuti gestiti dal backoffice (domande gratuite, testi editoriali).
- **Migration e schema**: le migration SQL si spostano in `apps/backoffice`, che diventa l'unica fonte di verità dello schema dati. La landing non possiede più migration proprie.
- **Autenticazione admin**: Supabase Auth (email/password), gestita interamente dentro `apps/backoffice`.
- **Deploy**: due deploy Vercel separati a partire dallo stesso monorepo (pattern standard, nessun costo aggiuntivo di infrastruttura).
- **Perimetro contenuti gestiti dal backoffice**: domande, opzioni, correzioni ministeriali, mnemotecniche (come già definito in Roadmap Backoffice §3) più i contenuti testuali principali della landing/sito. Restano hardcoded nel codice solo testi minori non strategici, da individuare caso per caso.

## Motivazione

- Rispetta la preferenza esplicita del PO di non mescolare gestione dati/API e codice del sito pubblico.
- Il perimetro di contenuti gestibili cresciuto (non più solo 5-6 schermate di dominio "quiz") rende un'applicazione dedicata più sostenibile nel tempo di una sezione `/admin` che avrebbe dovuto ospitare anche l'editing dei testi del sito pubblico.
- Il monorepo mantiene basso il costo di manutenzione per un team piccolo — lo stesso principio che guidava ADR-001 — pur avendo due applicazioni: un solo repo, tipi e componenti condivisibili, nessun secondo fornitore da introdurre (resta Vercel + Supabase).
- Comunicazione diretta di entrambe le app con Supabase, senza API intermedia, evita di introdurre un livello di infrastruttura che il vincolo di budget e complessità non giustifica — coerente con il motivo per cui Supabase era stato scelto in ADR-001 (BaaS completo, niente backend da scrivere a mano).

## Conseguenze e rischi accettati

- **Le policy RLS, oggi assenti, vanno scritte prima di esporre qualsiasi lettura pubblica.** La tabella `quiz_completions` nega oggi tutto l'accesso salvo la secret key; ogni nuova tabella di contenuto pubblicato (domande gratuite, testi landing) dovrà avere policy esplicite di sola lettura sulle sole righe "pubblicate". Resta, come già indicato in ADR-001, un requisito di sicurezza di primo livello: un errore qui espone contenuti premium o non pubblicati.
- **Va introdotto un modello dati per i contenuti editoriali** (testi della landing), che oggi non esiste — non è coperto dal modello dati canonico della Roadmap Backoffice, pensato per domande/mnemotecniche. Va deciso separatamente (tabella generica chiave/valore per blocchi di testo vs. tabelle dedicate per sezione).
- **Va introdotta la Supabase CLI** (`supabase link`) nel progetto backoffice, oggi assente: le migration finora sono state applicate senza un collegamento CLI esplicito tracciato nel repo.
- **Il confine tra "contenuto gestibile da backoffice" e "testo minore hardcoded"** non è ancora definito in modo puntuale, solo per criterio qualitativo ("importanza strategica"). Senza una lista concreta, si rischia di sovradimensionare il backoffice rispetto al budget — rischio già segnalato in Roadmap Backoffice §8 ("Backoffice sovradimensionato rispetto al budget", probabilità Alta). Va tradotto in una lista prima di disegnare le schermate.
- **Nessun costo di infrastruttura aggiuntivo**: restano un solo fornitore hosting (Vercel, due progetti dallo stesso monorepo) e un solo fornitore database/auth (Supabase) — il vincolo di budget di ADR-001 resta rispettato.

## Alternative scartate

- **Opzione 1** (confermare `/admin` integrato): scartata per preferenza esplicita del PO e perché il perimetro dei contenuti gestiti è cresciuto oltre l'ipotesi originaria di ADR-001.
- **Opzione 2** (due repo indipendenti): scartata per il rischio di disallineamento tra schema dati e design system condivisi, senza un reale vantaggio per un team piccolo.
- **API intermedia tra backoffice e landing**: scartata come meccanismo di comunicazione — accoppierebbe la disponibilità delle due app tra loro e richiederebbe costruire e mantenere un layer che Supabase, con RLS ben scritte, rende superfluo.

## Cosa si rinuncia a fare scegliendo così

Si rinuncia al risparmio di impianto che avrebbe offerto una sezione `/admin` nello stesso progetto (nessun secondo deploy, nessuna scelta di workspace), in cambio di separazione netta tra sito pubblico e strumento di gestione contenuti — coerente con la direzione che il progetto ha preso allargando il perimetro editoriale del backoffice oltre le sole domande.
