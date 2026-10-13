---
title: Remindeer Backoffice — Pannello di Amministrazione
status: final
created: 2026-08-02
updated: 2026-10-13
---

# PRD: Remindeer Backoffice — Pannello di Amministrazione
*Working title — "Remindeer Backoffice" da confermare come nome definitivo del prodotto/repository.*

## 0. Scopo del documento

Questo PRD guida la costruzione del pannello di amministrazione di Remindeer
(ex Farmaconcorso): lo strumento con cui il Product Owner gestisce le ~3000
domande ufficiali del concorso, le loro mnemotecniche, gli utenti e i
permessi, senza accesso diretto al database. È rivolto a chi implementerà
il backoffice (sviluppo), a chi lo validerà a valle (architettura,
epiche/storie) e al PO stesso come specifica di cosa viene costruito e in
che ordine.

**Fonte primaria di questo PRD:** `docs/Roadmap_Backoffice_Farmaconcorso.md`
(v1.0, 14/07/2026) — documento di pianificazione già dettagliato (milestone,
stime, modello dati canonico, rischi), qui tradotto nel formato PRD di
questo progetto, non riscritto da zero. Le stime in giornate-uomo e la
scomposizione task-per-task restano nella Roadmap come riferimento
operativo; questo PRD ne astrae le funzionalità (Feature/FR) e ne eredita
le priorità MoSCoW.

**Vincoli architetturali vincolanti** (non ridiscussi qui, vedi
`_bmad-output/project-context.md` e `docs/adr/`): ADR-002 (repo separato
dalla landing), ADR-003 (funnel di accesso dati centralizzato — ogni FR che
tocca Supabase in questo documento assume il data provider Refine o la
cartella `providers/custom/`, mai chiamate dirette), ADR-004 (nessun
monorepo, nessuna dipendenza di codice con la landing).

**Tre contraddizioni tra la Roadmap e le decisioni più recenti (ADR-002/
003/004) sono state rilevate e non risolte d'autorità in questo PRD** — sono
esplicitate in §8 Open Questions (OQ-1, OQ-2, OQ-3).

**Aggiornamento 2026-10-13.** OQ-1 e OQ-3 sono state chiuse durante
l'implementazione; OQ-2 resta aperta. Il lavoro è proseguito per spec di
funzionalità in `_bmad-output/specs/`, che sono il contratto di ciò che è
costruito: Domande (`spec-questions-crud`), accesso della landing alle
domande (`spec-landing-question-access`), Newsletter (`spec-newsletter`),
Contenuti pagine (`spec-page-contents`). Lo stato aggiornato è in
`_bmad-output/project-context.md`. La sezione Newsletter non corrisponde a
nessuna FR di questo documento: è nata da una richiesta successiva del PO.

## 1. Vision

Remindeer aiuta i neo-laureati in farmacia a superare il concorso pubblico per le
sedi farmaceutiche tramite mnemotecniche associate alle ~3000 domande
ufficiali. Il backoffice è la metà invisibile di quel prodotto: senza di
esso, le mnemotecniche non esistono, le domande non sono classificate, e il
PO non ha modo di correggere un errore o gestire un utente senza chiedere
al team tecnico di intervenire sul database.

Il vincolo di governance che definisce questo prodotto è netto: *il PO ha
piena proprietà dei dati, ma l'accesso diretto al database resta al team
tecnico*, per evitare danni irreversibili a un asset che rappresenta mesi di
lavoro (Roadmap §2, G10). Il backoffice non è quindi un accessorio: è il
solo modo in cui il PO può esercitare quella proprietà — scrivere una
mnemotecnica, correggere una risposta, sbloccare un premium — senza poter
rompere nulla che un audit trail non possa disfare.

Il backoffice è anche, con ogni probabilità, lo strumento che il PO userà
più a lungo di qualunque altra parte del prodotto: mentre il sito pubblico,
una volta costruito, cambia raramente, l'editor delle mnemotecniche verrà
usato ogni giorno per mesi (Roadmap §4, M3). L'ergonomia di quella singola
schermata vale, in tempo risparmiato, più di qualunque altra scelta di
questo documento.

Un motivo ulteriore, dichiarato dal PO in ADR-004 e non derivato dalla
Roadmap, guida la scelta di repository e stack: il PO intende poter riusare
questo backoffice (Refine + shadcn + Supabase) come base di partenza per
progetti futuri, non solo per Remindeer. Questo non aggiunge FR a questo
documento, ma è un vincolo di genericità sullo sfondo: dove una scelta
implementativa può restare specifica di dominio o generica senza costo
aggiuntivo, la genericità è preferibile — decisione che spetta
all'architettura, non a questo PRD, ma che va portata avanti come contesto.

## 2. Target User

### 2.1 Jobs To Be Done

- Come PO, voglio importare le 3000 domande ufficiali una volta e poterlo
  rifare senza creare duplicati, così posso correggere errori di
  formattazione senza ripartire da zero.
- Come PO, voglio scrivere e pubblicare mnemotecniche in autonomia, senza
  chiamare uno sviluppatore per ogni modifica.
- Come PO, voglio classificare le domande per argomento con l'aiuto dell'AI
  ma verificando io stesso i casi dubbi, così la tassonomia riflette la mia
  conoscenza del dominio, non un giudizio automatico non supervisionato.
- Come PO, voglio poter sbloccare manualmente un accesso premium (beta
  tester, vendita a mano, rimborso), così posso vendere prima di aver
  integrato Stripe.
- Come PO, voglio vedere e gestire le segnalazioni degli utenti su domande
  o mnemotecniche, così gli errori vengono corretti prima che minino la
  fiducia nel prodotto.
- Come PO, voglio poter esportare tutti i miei contenuti in un formato
  aperto in qualunque momento, così la mia proprietà sui dati non dipende
  da nessun fornitore o partner tecnico specifico.
- Come amministratore tecnico, voglio che ogni scrittura sui contenuti sia
  tracciata, così un errore (specialmente sulla risposta corretta di una
  domanda) sia sempre reversibile e attribuibile.

### 2.2 Non-Users (v1)

- **Candidati/utenti finali del quiz** — non accedono al backoffice in
  nessuna forma; sono gli utenti del prodotto "landing" (repository
  separato).
- **Self-signup di amministratori** — esplicitamente escluso. Gli account
  admin sono creati manualmente su Supabase Auth dal team tecnico; non
  esiste un flusso di registrazione pubblica in questo prodotto.
- **Ruolo "Redattore"** — la Roadmap lo prevede come ruolo futuro (§E0.1,
  T03) ma segnala esplicitamente il dubbio se serva davvero all'inizio.
  Trattato come [ASSUMPTION: non-user in v1] — vedi FR-2 e OQ-4.

### 2.3 Key User Journeys

- **UJ-1. Il PO scrive una sessione di mnemotecniche di getto, una sera.**
  - **Persona + contesto:** il PO, dopo cena, si mette a scrivere
    mnemotecniche per un'ora — è il lavoro che farà più spesso in assoluto
    nei prossimi mesi (Roadmap §4, M3).
  - **Entry state:** autenticato (sessione admin attiva), entra
    nell'editor mnemotecniche.
  - **Path:** apre la coda "prossima domanda senza mnemotecnica" → vede la
    domanda e la risposta corretta ben visibili → scrive testo/scena da
    immaginare, sceglie lo stile (neutro/ironico/audace) → la bozza si
    salva automaticamente mentre scrive → passa alla domanda successiva
    con un tasto.
  - **Climax:** dopo 30 mnemotecniche scritte, chiude senza pubblicare
    nulla — sono ancora `bozza`.
  - **Resolution:** il giorno dopo, a mente fredda, le rilegge e le
    pubblica una per una (flusso `bozza → in_revisione → pubblicata`).
    Realizza FR-14, FR-15.
  - **Edge case:** il browser si chiude a metà frase — grazie al
    salvataggio automatico della bozza, non perde il lavoro.

- **UJ-2. Il PO corregge un errore segnalato da un candidato.**
  - **Persona + contesto:** un candidato segnala che la risposta corretta
    di una domanda è sbagliata.
  - **Entry state:** autenticato, arriva dalla coda segnalazioni.
  - **Path:** apre la segnalazione → vede il collegamento diretto alla
    domanda → verifica sul bando ufficiale (fuori dal sistema) → modifica
    la risposta corretta → conferma esplicita richiesta → il cambio finisce
    nel registro delle modifiche → segna la segnalazione come "risolta" →
    (idealmente) risponde al candidato.
  - **Climax:** la conferma esplicita e il fatto che tutto sia tracciato
    gli danno sicurezza di non aver rotto nulla che non si possa ricostruire.
  - **Resolution:** la domanda è corretta, l'audit trail mostra chi, cosa,
    quando, e cos'era prima. Realizza FR-3, FR-12, FR-23.

- **UJ-3. Il PO importa per la terza volta il file delle 3000 domande**,
  dopo aver corretto degli errori di formattazione nel file sorgente.
  - **Entry state:** autenticato, ruolo con permesso di import (Tecnico o
    Proprietario).
  - **Path:** carica il file → il sistema mostra un'anteprima (create /
    aggiornate / invariate / scartate, con motivo) → conferma → l'import
    gira → riceve un report consultabile.
  - **Climax:** nessuna domanda duplicata, nessuna mnemotecnica già scritta
    persa — l'import è idempotente per costruzione.
  - **Resolution:** il `lotto_import` resta consultabile per sempre.
    Realizza FR-4, FR-5, FR-6.
  - **Edge case:** il file contiene righe malformate — vengono scartate con
    motivo esplicito nel report, non importate a metà.

## 3. Glossario

*Le stesse entità del modello dati canonico della Roadmap (§3), qui come
vocabolario vincolante per il resto del documento e per i lavori a valle
(architettura, epiche). Nomi in italiano perché è il linguaggio del dominio
(bando di concorso, farmacia) — i nomi di implementazione (tabelle, tipi
TypeScript) potranno differire, ma il vocabolario concettuale è questo.*

- **Domanda** — una domanda ufficiale del concorso. Ha un `numero_ufficiale`
  univoco (l'ancora verso il bando, usata per il re-import senza duplicati),
  uno stato (bozza / pubblicata / ritirata / annullata da ministero).
- **Opzione** — una delle quattro risposte possibili di una Domanda,
  identificata da `id`, mai da posizione (l'ordine viene mescolato a runtime
  lato frontend).
- **Correzione ufficiale** — un cambiamento (risposta corretta, testo,
  annullamento) applicato a una Domanda dopo una comunicazione ministeriale
  successiva alla pubblicazione. Entità a sé, non una modifica anonima:
  conserva lo stato precedente e non riscrive le statistiche storiche degli
  utenti.
- **Categoria** — un argomento (farmacologia, legislazione, ecc.) con
  criteri di inclusione ed esclusione espliciti, usati sia per la
  classificazione AI sia dal revisore umano.
- **Classificazione** — l'assegnazione di una Domanda a una o più Categorie,
  con origine (ai/umano), confidenza, modello e versione del prompt usati.
- **Mnemotecnica** — contenuto (testo o scena da immaginare) associato a una
  Domanda per aiutare a ricordarne la risposta corretta. Più varianti per
  Domanda sono ammesse; solo una è `pubblicata` alla volta.
- **Segnalazione** — una notifica da un utente (o anonima) su un errore in
  una Domanda o Mnemotecnica, con stato di gestione.
- **Amministratore** — un account con accesso al backoffice, con un ruolo
  (Proprietario / Redattore / Tecnico — vedi FR-2).
- **Registro delle modifiche** (*audit log*) — la traccia di ogni scrittura
  sui contenuti: chi, cosa, quando, differenza prima→dopo.
- **Lotto di import** — l'esito di un'esecuzione di import: file, righe
  lette, create/aggiornate/scartate, report.
- **Set gratuito** — l'insieme configurabile delle domande accessibili senza
  premium (v1: "prime 100", ma modificabile dal PO senza rilascio software).
- **Funnel di accesso dati** — il vincolo architetturale (ADR-003): nessuna
  chiamata Supabase fuori dal data provider Refine o da `providers/custom/`.
  Termine di implementazione, non di dominio, ma vincolante per ogni FR che
  tocca dati.

## 4. Features

### 4.1 Accessi e Ruoli

**Descrizione:** fondamenta del backoffice — chi entra, con quali poteri, e
la garanzia che ogni azione lasci traccia. Corrisponde a Roadmap M0. Deve
esistere prima di qualunque altra feature, perché tutte le altre assumono
un amministratore autenticato con un ruolo.

#### FR-1: Autenticazione amministratori

Un amministratore può accedere al backoffice con email e password tramite
Supabase Auth. Nessun candidato/utente finale della landing può autenticarsi
qui — sono spazi di autenticazione separati anche se sullo stesso progetto
Supabase.

**Consequences (testable):**
- Nessun flusso di registrazione pubblica esiste nell'interfaccia (self-
  signup assente per costruzione, non solo nascosto).
- Un tentativo di accesso con credenziali di un utente finale (non
  amministratore) viene rifiutato.
- La sessione scade automaticamente dopo un periodo di inattività
  configurabile (Roadmap M6, E6.3). [ASSUMPTION: valore esatto non fissato
  qui — "breve" nella Roadmap resta un aggettivo, non un numero; il valore
  concreto (es. 30/60 minuti) va deciso in fase di architettura, vedi OQ-5.]

**Out of Scope:**
- 2FA è MUST secondo la Roadmap (`BO-M0-E1-T02`) ma la sua implementazione
  concreta (TOTP, email, altro) non è specificata qui — vedi OQ-5.

#### FR-2: Ruoli e permessi lato server

Un amministratore ha esattamente un ruolo: **Proprietario** (tutto tranne
operazioni distruttive di massa), **Redattore** (domande, mnemotecniche,
categorie, segnalazioni — nessun accesso a utenti/pagamenti) o **Tecnico**
(import, classificazione, configurazione, operazioni massive).

**Consequences (testable):**
- I permessi sono verificati lato server (nel data provider / funnel), non
  solo nascondendo elementi dell'interfaccia: una chiamata dati da un
  Redattore verso una risorsa utenti/pagamenti viene rifiutata anche se
  l'interfaccia non la mostra.
- [ASSUMPTION: in v1 esiste realisticamente un solo amministratore attivo
  (il PO, ruolo Proprietario). I ruoli Redattore/Tecnico sono implementati
  da subito nel modello permessi (costa poco ora, costa una riscrittura
  dopo — Roadmap §E0.1) ma potrebbero non avere un secondo utente reale
  finché il PO non decide di delegare.]

#### FR-3: Registro delle modifiche (audit log)

Ogni scrittura sui contenuti gestiti dal backoffice genera una voce nel
registro delle modifiche: amministratore, azione, entità, id entità,
differenza (prima → dopo), momento.

**Consequences (testable):**
- Attivo dal primo giorno di sviluppo, non aggiunto in un secondo momento
  (Roadmap: "il giorno in cui una risposta corretta risulta sbagliata e
  nessuno sa chi l'ha cambiata, il registro vale dieci volte quello che è
  costato").
- Il registro è consultabile e filtrabile da un amministratore con permesso
  sufficiente (Roadmap M6, E6.3).
- Nessuna eccezione: anche le operazioni massive (import, classificazione
  bulk) generano una voce di riepilogo nel registro.

**Feature-specific NFRs:**
- Ogni scrittura sui dati passa esclusivamente dal funnel Refine/
  `providers/custom` (ADR-003): il registro delle modifiche si aggancia lì,
  non a chiamate sparse.

---

### 4.2 Import e Normalizzazione delle Domande

**Descrizione:** la pipeline che porta le ~3000 domande ufficiali dal file
sorgente al database, in modo ripetibile e sicuro. Corrisponde a Roadmap M1.
**Blocco critico:** nessuno ha ancora ispezionato il file sorgente reale
(Gate G2) — la forma di questa feature dipende in modo sostanziale da cosa
si scopre. Vedi OQ-6.

#### FR-4: Import idempotente

Un Tecnico o Proprietario può eseguire l'import di un file sorgente di
domande più volte senza creare duplicati: l'ancora è il `numero_ufficiale`.
Il sistema distingue create / aggiornate / invariate / scartate per ogni
riga.

**Consequences (testable):**
- Rieseguire l'import dello stesso file immutato produce zero righe create
  e zero aggiornate (tutte "invariate").
- Un import interrotto a metà non lascia il database in uno stato
  incoerente.
- Il risultato dell'import è sempre riportato come `lotto_import`
  consultabile (FR-5), mai applicato silenziosamente.

Realizza UJ-3.

#### FR-5: Report di importazione

Al termine di ogni import: quante righe create, aggiornate, scartate (con
motivo), elenco delle anomalie rilevate. Salvato come entità consultabile,
non solo mostrato una volta a schermo.

**Consequences (testable):**
- Il report resta accessibile dopo che l'amministratore ha chiuso la
  schermata di import (persistito, non solo in memoria).

#### FR-6: Normalizzazione e riconoscimento duplicati

Il testo importato viene normalizzato in modo ripetibile e documentato
(spazi, virgolette tipografiche, codifica caratteri); il testo grezzo
originale è conservato accanto a quello normalizzato. Domande sospette
duplicate vengono segnalate per decisione umana, mai cancellate in
automatico.

**Consequences (testable):**
- La regola di normalizzazione, se cambiata, può essere riapplicata al
  testo grezzo senza richiedere una riscrittura manuale riga per riga.

**Notes:**
- [NOTE FOR PM] La stima Roadmap (5-7 gg per M1) è esplicitamente
  condizionata alla scoperta che il file sorgente sia "ragionevole" (Excel/
  CSV pulito). Se risultasse un PDF scansionato, questa intera feature
  cambia forma e costo (Roadmap §G2, scarto da 1-2gg a 8-15gg). Non
  ridimensionare le FR di questa sezione finché G2 non è chiuso.

#### FR-7: Correzioni ministeriali (SHOULD)

Un Tecnico o Proprietario può registrare una correzione ufficiale
successiva (cambio risposta corretta, testo, o annullamento) su una
Domanda, conservando lo stato precedente. Le statistiche storiche già
calcolate sugli utenti non vengono riscritte retroattivamente.

**Out of Scope:**
- La notifica agli utenti che avevano risposto secondo la versione
  precedente è esplicitamente opzionale (Roadmap: "bonus prodotto quasi
  gratuito", non MUST).

---

### 4.3 Classificazione per Argomento

**Descrizione:** assegnare ogni Domanda a una o più Categorie, con l'aiuto
di un modello AI misurato contro un campione di riferimento scritto dal PO,
poi rivisto da un umano. Corrisponde a Roadmap M2. Dipende dal Gate G3
(tassonomia — lavoro del PO, non tecnico).

#### FR-8: Esecuzione della classificazione (script, non interfaccia)

Un Tecnico esegue la classificazione AI su tutte le domande come processo
batch (script), salvando categoria, confidenza, modello e versione del
prompt per ciascuna. **Non è un'interfaccia web** — sono minuti di
elaborazione, non una richiesta interattiva (Roadmap §E2.3).

**Consequences (testable):**
- Ogni esecuzione di classificazione è tracciata come entità a sé
  (`esecuzione_classificazione`), consultabile in seguito.

#### FR-9: Coda di revisione umana ordinata per confidenza

Un amministratore rivede le classificazioni AI una domanda alla volta,
**ordinate dalla meno sicura alla più sicura**, confermando o correggendo
la categoria.

**Consequences (testable):**
- L'interfaccia è utilizzabile interamente da tastiera (conferma, cambio
  categoria, salta) — è un requisito di velocità, non di comodità: la
  Roadmap stima la differenza tra 5 ore e 17 ore di lavoro del PO nella
  differenza tra tastiera e mouse.
- Ogni azione salva immediatamente e avanza alla domanda successiva.

**Out of Scope:**
- L'alternativa "foglio di calcolo" per la revisione (Roadmap §7, scenario
  lean) è una scelta di scope da fare esplicitamente in fase di
  pianificazione sprint, non implementata di default qui — vedi §6.2.

#### FR-10: Assegnazione massiva con filtri (SHOULD)

Un amministratore può selezionare un insieme di domande per criteri
testuali/categoria e riassegnarle in blocco, per correggere errori
sistematici dell'AI.

**Consequences (testable):**
- Ogni operazione massiva richiede conferma esplicita con anteprima
  ("stai per modificare N domande — procedere?"), coerente con la regola
  generale delle API di amministrazione (Roadmap §5).

---

### 4.4 Editing Domande e Produzione Mnemotecniche ⭐

**Descrizione:** la feature che il PO userà più di ogni altra, per mesi.
Corrisponde a Roadmap M3. L'ergonomia (velocità, zero attriti, nessuna
perdita di lavoro) è un requisito di prodotto, non un dettaglio di
implementazione. Realizza UJ-1.

#### FR-11: Elenco domande con ricerca e filtri

Un amministratore può cercare nel testo delle domande e filtrare per:
categoria, stato, presenza/assenza di mnemotecnica pubblicata,
classificazione revisionata sì/no, presenza di segnalazioni, appartenenza
al set gratuito.

**Consequences (testable):**
- Il filtro "senza mnemotecnica" è disponibile ed è, per stima di utilizzo
  atteso, il più usato in assoluto nei mesi successivi al lancio (Roadmap
  §E3.1).

#### FR-12: Modifica di una domanda

Un amministratore con permesso sufficiente può modificare testo, opzioni,
risposta corretta, categoria, stato di una Domanda.

**Consequences (testable):**
- Cambiare la **risposta corretta** richiede una conferma esplicita
  distinta dal salvataggio generico, e genera sempre una voce nel registro
  delle modifiche (FR-3) — è l'operazione più pericolosa del sistema
  (Roadmap: "una risposta corretta sbagliata insegna a 500 persone la cosa
  sbagliata, e il danno di fiducia è irreversibile").

Realizza UJ-2.

#### FR-13: Anteprima "come la vede il candidato" (SHOULD)

Un amministratore può vedere una Domanda renderizzata con lo stile del
frontend pubblico, per accorgersi in anticipo di problemi di layout
(formule chimiche, opzioni lunghe).

#### FR-14: Editor mnemotecniche a fuoco singolo

Una schermata mostra la Domanda e la sua risposta corretta ben visibili
sopra, un campo per il contenuto della mnemotecnica sotto, il tipo (testo /
scena da immaginare) e lo stile (neutro / ironico / audace).

**Consequences (testable):**
- La bozza si salva automaticamente mentre l'amministratore scrive (nessuna
  perdita di contenuto su chiusura accidentale del browser).
- Un solo comando porta alla "prossima domanda senza mnemotecnica".

Realizza UJ-1.

#### FR-15: Flusso di pubblicazione mnemotecniche

Una Mnemotecnica passa per gli stati `bozza → in_revisione → pubblicata`.
Solo le `pubblicata` sono visibili agli utenti finali (letti dalla landing
tramite le policy RLS pubbliche, non da questo sistema).

**Consequences (testable):**
- Una mnemotecnica scritta e salvata come bozza non è mai visibile agli
  utenti finché non transita esplicitamente per `pubblicata`.

Realizza UJ-1.

#### FR-16: Varianti e cronologia mnemotecniche (SHOULD)

Più Mnemotecniche possono esistere per la stessa Domanda (varianti); una
sola è `pubblicata` alla volta.

**Notes:**
- Base per un futuro test A/B e per l'idea "proponi la tua" della community
  (Roadmap M7, esplicitamente fuori scope qui — vedi §5).

#### FR-17: Vista di avanzamento produzione mnemotecniche (SHOULD)

Un contatore mostra "N / M mnemotecniche del primo set pubblicate, K in
revisione" — l'unico indicatore che collega il lavoro editoriale del PO
alla data di lancio del free tier.

**Consequences (testable):**
- Il contatore riflette lo stato reale (`pubblicata` / `in_revisione`)
  senza ritardo percepibile dopo che un amministratore pubblica o mette in
  revisione una mnemotecnica — non un valore calcolato a intervalli fissi.

#### FR-18: Gestione categorie (SHOULD)

CRUD delle Categorie con i loro criteri di inclusione/esclusione — gli
stessi che alimentano il prompt di classificazione (FR-8).

#### FR-19: Classifica mnemotecniche per efficacia (SHOULD)

Le Mnemotecniche pubblicate sono ordinabili per rapporto "mi aiuta / non mi
aiuta" (dato alimentato dalla landing, non da questo sistema), incrociato
con il tasso di risposte corrette sulla domanda associata.

**Notes:**
- [NOTE FOR PM] La Roadmap la definisce "l'unico dato oggettivo" per
  scrivere le mnemotecniche mancanti — vale la pena proteggerla da tagli di
  scope anche se è SHOULD, perché il suo valore cresce nel tempo, non
  all'inizio.

---

### 4.5 Utenti, Permessi e Segnalazioni

**Descrizione:** gestione degli utenti finali dal lato amministrativo —
non le loro credenziali, ma il loro livello di accesso e i problemi che
segnalano. Corrisponde a Roadmap M4.

#### FR-20: Elenco e scheda utente

Un amministratore può cercare un utente per email e vedere: registrazione,
ultimo accesso, prove svolte, livello di permesso.

**Consequences (testable):**
- Nessuna password è visibile o modificabile dall'amministratore, in nessun
  punto dell'interfaccia.
- La cancellazione di un account su richiesta (GDPR) è tracciata nel
  registro delle modifiche.

#### FR-21: Concessione manuale dei permessi ⭐

Un amministratore con permesso sufficiente può sbloccare un accesso premium
per un utente specifico con un'azione a due click, indicandone l'origine
(codice promo, concessione manuale, ecc.).

**Consequences (testable):**
- L'operazione è indipendente da Stripe: funziona anche prima che
  l'integrazione pagamenti esista (Roadmap: "permette di vendere le prime
  30 volte a mano").

#### FR-22: Codici promo (SHOULD)

Generazione di codici con limite di utilizzi, scadenza, conteggio degli
utilizzi effettuati.

**Consequences (testable):**
- Un codice smette di funzionare esattamente al raggiungimento di
  `usi_massimi` o dopo la data di scadenza, qualunque delle due condizioni
  si verifichi prima.

#### FR-23: Coda segnalazioni

Un amministratore vede le segnalazioni degli utenti (errore nel testo,
risposta corretta contestata, mnemotecnica poco chiara), con stato e
collegamento diretto all'entità segnalata.

**Consequences (testable):**
- Ogni segnalazione ha uno stato tra nuova / presa_in_carico / risolta /
  scartata, e chi l'ha gestita.

Realizza UJ-2.

#### FR-24: Pagamenti in sola lettura (SHOULD)

Un amministratore vede l'elenco dei pagamenti con riferimento a Stripe.

**Out of Scope:**
- Nessuna operazione finanziaria (rimborsi, ecc.) è eseguibile da questo
  sistema — si fa dal cruscotto di Stripe.

---

### 4.6 Contenuti, Configurazione e Set Gratuito

**Descrizione:** le leve che il PO deve poter azionare senza un rilascio
software. Corrisponde a Roadmap M5.

#### FR-25: Gestione del set gratuito ⭐

Un amministratore aggiunge o rimuove una Domanda dal set gratuito tramite
un'interfaccia, senza intervento dello sviluppatore.

**Consequences (testable):**
- Il sistema avvisa se una domanda del set gratuito non ha una
  Mnemotecnica pubblicata associata (vetrina vuota altrimenti).

#### FR-26: Configurazione globale (SHOULD)

Un amministratore può modificare: data del concorso (per il countdown sulla
landing), prezzo mostrato, interruttori di funzionalità — senza rilascio di
codice.

#### FR-27: Pagine editoriali (COULD — valutazione onesta: probabile primo
taglio)

Un amministratore potrebbe modificare i testi di pagine editoriali del sito
pubblico (es. "Il metodo", FAQ, chi siamo) senza intervento dello
sviluppatore.

**Stato 2026-10-13: realizzata in parte.** OQ-3 è chiusa e il PO ha chiesto
la sezione "Contenuti pagine", specificata in
`_bmad-output/specs/spec-page-contents/`. Copre oggi una sola pagina, la
home: titolo, sottotitolo, immagine hero, CTA e statistiche. Pagine come
"Il metodo", FAQ e chi siamo non esistono ancora nella landing e restano
fuori. Modello dati e criteri di verifica sono nella spec, non qui.

**Notes:**
- [NOTE FOR PM] La Roadmap la marca esplicitamente come non-MVP ("cambiare
  tre pagine due volte l'anno via sviluppatore costa meno di una giornata
  di CMS"). **Contraddice però ADR-002**, che ha ampliato il perimetro del
  backoffice per includere proprio i contenuti testuali principali della
  landing su richiesta esplicita del PO. Questa tensione era OQ-3: chiusa a
  favore di ADR-002.

---

### 4.7 Operatività: Backup, Esportazione, Sicurezza

**Descrizione:** poco visibile, ma è ciò che separa un incidente da un
prodotto. Corrisponde a Roadmap M6.

#### FR-28: Verifica del backup automatico

È verificato (non dato per scontato) che il backup giornaliero incluso nel
piano Supabase sia effettivamente attivo.

#### FR-29: Prova di ripristino reale

Una procedura scritta di ripristino di un backup su un ambiente di prova
viene eseguita almeno una volta, e i dati vengono verificati come completi.

**Consequences (testable):**
- La procedura esiste come documento versionato (non solo eseguita a
  memoria), coerente con i Runbook di Roadmap §6.

#### FR-30: Esportazione dei contenuti ⭐

Un amministratore può esportare in formato aperto (CSV/JSON) domande,
opzioni, risposte corrette, categorie, mnemotecniche.

**Consequences (testable):**
- L'esportazione copre l'intero contenuto gestito dal backoffice in un
  formato leggibile senza software proprietario.
- [NOTE FOR PM] Questa FR è ciò che rende vera, e non solo teorica, la frase
  "il PO ha piena proprietà dei suoi contenuti" (Roadmap §E6.2). Non è
  negoziabile per taglio di scope senza una decisione esplicita del PO.

#### FR-31: Sicurezza e tracciamento

2FA obbligatoria per gli amministratori (vedi OQ-5 per il meccanismo),
limitazione dei tentativi di accesso falliti, registro delle modifiche
consultabile e filtrabile, sessioni admin con scadenza breve.

## 5. Non-Goals (Explicit)

- **Non è un CMS generico.** Il backoffice gestisce le entità del modello
  dati canonico (§3) e i contenuti editoriali della landing, pagina per
  pagina e campo per campo (OQ-3, chiusa) — non diventa uno strumento di
  gestione contenuti generico per qualunque futuro bisogno: niente pagine
  create dall'interfaccia, niente testo formattato libero.
- **Non sostituisce Stripe per le operazioni finanziarie.** Rimborsi e
  gestione pagamenti restano nel cruscotto Stripe (FR-24).
- **Non è raggiungibile dagli utenti finali della landing in nessuna
  forma** — nessuna condivisione di sessione, nessun endpoint comune oltre
  al database Supabase condiviso (coerente con ADR-002/004).
- **Non implementa in v1** la moderazione della community, la gestione
  immagini mnemoniche generate, l'analitica avanzata dei contenuti, i test
  A/B tra varianti, il supporto multi-concorso, badge/livelli/classifiche —
  tutti esplicitamente Roadmap M7 (post-MVP), non ripianificati qui.
- **Non decide qui** se e come esporre un'API amministrativa versionata
  oltre a quanto il data provider Refine offre di default — fuori scope per
  questo PRD, eventualmente materia di architettura.

## 6. MVP Scope

### 6.1 In Scope (MVP)

Tutte le FR marcate MUST sopra: FR-1, FR-2, FR-3 (Accessi/Ruoli/Registro),
FR-4, FR-5 (Import idempotente + report), FR-8, FR-9 (Classificazione
eseguita + coda di revisione), FR-11, FR-12, FR-14, FR-15 (Elenco domande,
modifica, editor mnemotecniche, flusso di pubblicazione), FR-20, FR-21,
FR-23 (Utenti, concessione permessi manuale, segnalazioni), FR-25
(Set gratuito), FR-28, FR-29, FR-30, FR-31 (Backup verificato, ripristino
provato, esportazione, sicurezza).

### 6.2 Out of Scope for MVP

- Tutte le FR marcate SHOULD/COULD sopra sono candidate al taglio secondo
  lo **scenario lean** della Roadmap (§7), che stima un risparmio di ~9-10
  giornate spostando import/classificazione a script eseguiti dal team
  tecnico e la revisione della classificazione + le prime mnemotecniche su
  foglio di calcolo invece che su interfaccia dedicata.
  [NOTE FOR PM] Questa è una decisione di **pianificazione sprint**, non
  presa in questo PRD: la Roadmap la lascia esplicitamente aperta
  ("leggere §7 prima di pianificare"). Va decisa con il PO prima
  dell'architettura, non assunta.
- FR-27 (Pagine editoriali) — marcata COULD dalla Roadmap. Anticipata in
  parte su richiesta del PO: contenuti della home modificabili (vedi FR-27 e
  `spec-page-contents`). Il resto delle pagine editoriali resta fuori.
- Tutto Roadmap M7 (post-MVP): moderazione community, immagini mnemoniche
  generate, analitica contenuti avanzata, test A/B, multi-concorso,
  gamification.
- Redattore come ruolo con un secondo utente reale attivo (FR-2 esiste nel
  modello permessi, ma senza un secondo amministratore reale in v1 — vedi
  OQ-4).

## 7. Success Metrics

**Primary**
- **SM-1**: Le prime 100 mnemotecniche del set gratuito sono pubblicate
  entro la finestra Set–Novembre indicata in Roadmap §9 (bloccano il
  rilascio pubblico di fine novembre). Valida FR-14, FR-15, FR-17.
- **SM-2**: L'import delle 3000 domande è eseguito almeno 3-4 volte durante
  lo sviluppo senza generare duplicati né perdere mnemotecniche/
  classificazioni già associate. Valida FR-4.
- **SM-3**: La revisione umana della classificazione AI (~3000 domande) è
  completata dal PO in tempo utile, misurata contro la stima Roadmap di ~5
  ore con coda ordinata per confidenza (vs. 17 ore stimate senza). Valida
  FR-9.

**Secondary**
- **SM-4**: Tempo dalla segnalazione di un utente alla risoluzione (correzione
  applicata + registro aggiornato). Valida FR-12, FR-23.
- **SM-5**: Zero incidenti in cui una risposta corretta è stata modificata
  senza conferma esplicita o senza traccia nel registro. Valida FR-3, FR-12.

**Counter-metrics (do not optimize)**
- **SM-C1**: Numero di operazioni massive eseguite senza anteprima di
  conferma — deve restare a zero. Un aumento di velocità nelle operazioni
  massive non giustifica la rimozione della conferma esplicita.
  Counterbalances SM-1, SM-3.
- **SM-C2**: Copertura di classificazione "confermata dall'AI senza
  revisione umana" oltre la soglia di accuratezza misurata (§FR-8/FR-9) —
  la velocità della coda di revisione non deve tradursi in domande saltate
  senza controllo. Counterbalances SM-3.

## 8. Open Questions

1. **OQ-1 — RISOLTA (2026-09-27): opzione (a).** La SPA usa solo la
   publishable key e i permessi sono policy RLS: scrive solo chi è in
   `public.admins` (funzione `is_admin()`), gli altri utenti autenticati
   leggono soltanto, il login del backoffice rifiuta chi non è admin. Per
   ciò che richiede un segreto (invio newsletter) esiste una Edge Function
   Supabase: è il "livello server minimo" dell'opzione (b), limitato a quel
   caso. Dettagli in `spec-questions-crud/data-model.md`. Testo originale:
   *Chiave Supabase e RLS nel backoffice.* ADR-002 assumeva un backoffice server-side che usa la
   secret key per bypassare le RLS dietro autenticazione admin. Lo stack
   scelto (Refine + Vite, SPA pura) non può contenere la secret key in
   sicurezza. Va deciso: (a) policy RLS esplicite che concedano agli admin
   autenticati i permessi di scrittura necessari, mantenendo la
   publishable key anche nel backoffice, oppure (b) l'introduzione di un
   livello server minimo non previsto oggi da ADR-002/003/004. Nessuna
   delle FR di questo documento assume una risposta specifica — tutte
   assumono solo "un amministratore autenticato ha i permessi necessari",
   qualunque sia il meccanismo.
2. **OQ-2. Refine come scelta di stack non formalmente riconciliata con
   ADR-001.** ADR-001 aveva scartato esplicitamente Refine per il
   backoffice. ADR-004 lo reintroduce senza un ADR che superi
   esplicitamente quella motivazione. Non blocca questo PRD (le FR sono
   agnostiche rispetto al framework UI), ma andrebbe chiuso con un ADR-005
   prima che l'assenza di una decisione formale diventi un problema in
   revisione tecnica.
3. **OQ-3 — RISOLTA (2026-10-13).** (a) Il PO ha scelto i contenuti della
   home: titolo, sottotitolo, immagine hero, CTA, statistiche. (b) Modello
   dati: tabella `page_contents`, una riga per pagina con un documento JSON,
   letto dalla landing tramite la RPC `get_page_content()`; né chiave/valore
   generico né una tabella per sezione. La landing legge il documento lato
   server e rigenera la pagina a ogni salvataggio, così i contenuti arrivano
   come HTML completo a visitatori e motori di ricerca. Dettagli in
   `spec-page-contents`. Testo originale: *Perimetro dei contenuti editoriali
   della landing.* ADR-002
   include i testi principali della landing nel perimetro del backoffice;
   la Roadmap (§3, modello dati canonico) non li copre affatto, e li
   classifica anzi come COULD/primo taglio (FR-27). Non esiste un modello
   dati per questi contenuti. Va deciso col PO: (a) quali testi sono
   "strategici" abbastanza da meritare un editor, (b) che modello dati
   usare (tabella chiave/valore generica vs. tabelle dedicate per sezione).
4. **OQ-4. Il ruolo Redattore serve davvero in v1?** La Roadmap stessa pone
   il dubbio (§E0.1, T03). FR-2 lo implementa nel modello permessi per
   costo marginale, ma nessuna FR assume un secondo amministratore reale.
   Da confermare col PO prima di pianificare eventuali schermate di
   gestione amministratori.
5. **OQ-5. Meccanismo 2FA e durata sessione.** FR-1/FR-31 richiedono 2FA
   obbligatoria e scadenza sessione breve, ma non specificano il
   meccanismo 2FA (TOTP, magic link, altro — dipende da cosa supporta
   nativamente Supabase Auth) né il valore esatto della scadenza (es.
   30/60 minuti) — entrambi da fissare in fase di architettura.
6. **OQ-6 (blocking, dalla Roadmap stessa — non introdotta da questo PRD).
   Formato del file sorgente delle 3000 domande (Gate G2).** Nessuno ha
   ancora aperto il file. La forma e il costo di FR-4/FR-5/FR-6 dipendono
   in modo sostanziale dalla risposta — vedi Roadmap §2 per lo scarto di
   stima (1-2gg vs 8-15gg).
7. **OQ-7. Ambito dello scenario "lean" (Roadmap §7).** Quali FR SHOULD di
   §6.2 restano interfaccia dedicata e quali diventano script/foglio di
   calcolo è una decisione di pianificazione sprint non presa in questo
   PRD.
8. **OQ-8. Categoria primaria + secondarie, o categoria unica rigida?**
   La Roadmap (§3, `domanda_categoria`) pone la domanda esplicitamente senza
   rispondere ("alcune domande stanno legittimamente a cavallo tra
   legislazione e gestione della farmacia"). FR-8/FR-9 descrivono la
   classificazione assumendo implicitamente un modello, ma la scelta va
   presa esplicitamente dal PO prima di FR-8 — non è una FR di questo
   documento risolverla.
9. **OQ-9. Test automatico di enforcement (autorizzazione + funnel).** Tre
   fonti chiedono, indipendentemente, un controllo automatico che questo
   PRD non traduce ancora in una FR: Roadmap §5 ("nessun endpoint
   amministrativo raggiungibile con un token utente — da verificare con un
   test automatico, come per il paywall"), ADR-001 (test dedicato che
   verifichi ad ogni deploy che un utente free non ottenga domande
   premium), ADR-003 ("un controllo automatico che cerchi `supabase.from(`
   fuori dalle cartelle designate"). Le tre richieste sono imparentate
   (verificare che i confini — ruoli, RLS, funnel — tengano davvero, non
   solo sulla carta) ma non identiche. Vanno tradotte in una o più FR/NFR
   di test in fase di architettura, non assunte come già coperte da FR-2/
   FR-31.
   **Stato 2026-10-13: coperta in parte.** `tests/api/` (`npm run test:api`)
   verifica sul progetto Supabase reale cosa possono fare un visitatore
   anonimo, un utente autenticato non admin e un admin. Mancano ancora
   l'esecuzione automatica a ogni deploy e il controllo sul funnel
   (`supabase.from(` fuori dalle cartelle designate).
10. **OQ-10 (vincolo operativo, non una vera domanda aperta — riportato
    qui perché assente altrove nel documento). Sincronizzazione manuale
    dei tipi tra i due repository.** ADR-004 accetta esplicitamente che, in
    assenza di condivisione di codice tra landing e backoffice, i tipi
    TypeScript dello schema Supabase vadano aggiornati a mano (o
    rigenerati separatamente) in entrambi i repository ad ogni cambio di
    schema. Non è negoziabile qui, ma va portato in architettura come
    attività operativa ricorrente, non dimenticabile — non un rischio da
    mitigare, un costo già accettato da tenere visibile.

## 9. Assumptions Index

- §2.2 — Ruolo Redattore trattato come non-user in v1 (nessun secondo
  amministratore reale assunto), pur essendo modellato in FR-2. Vedi OQ-4.
- §4.1, FR-2 — In v1 esiste realisticamente un solo amministratore attivo
  (il PO, ruolo Proprietario).
- Tutte le FR relative a scritture su Supabase assumono il rispetto del
  funnel ADR-003 (data provider Refine / `providers/custom/`), mai chiamate
  dirette da un componente — vincolo ereditato dal progetto, non
  un'assunzione di questo PRD.
- §4.1, FR-1 — la scadenza sessione ("breve") non ha un valore numerico
  fissato in questo PRD. Vedi OQ-5.
