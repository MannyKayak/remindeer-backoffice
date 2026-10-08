# Farmaconcorso — Roadmap Backoffice

**Versione 1.0 — 14/07/2026**
Documento di pianificazione operativa. Non è una specifica contrattuale né un preventivo.

Documento gemello: `Roadmap_Frontend_Farmaconcorso.md` (app candidati, motore quiz, persistenza, free tier, pagamenti lato utente).

---

## 0. Come leggere questo documento

Stesse convenzioni del file gemello. **Prefisso ID: `BO-`** (es. `BO-M2-E1-T03`).
Stime in giornate-uomo, conservative. Priorità MoSCoW. Definition of Done identica, con **un'aggiunta specifica del backoffice:**

> **Ogni operazione che modifica i dati deve essere reversibile o tracciata.** Il backoffice tocca l'asset del progetto: 3000 domande, le loro risposte corrette, le mnemotecniche. Un'operazione massiva sbagliata e non tracciata è il singolo modo più veloce di distruggere mesi di lavoro. Ogni scrittura passa per il registro delle modifiche (`BO-M6-E3`).

**Perimetro di questo file:**
- Modello dati **canonico** (§3) — è la fonte di verità anche per il frontend
- Pipeline di import e normalizzazione delle 3000 domande
- Classificazione per argomento (AI + revisione umana)
- Pannello di amministrazione: domande, categorie, mnemotecniche, utenti, permessi, segnalazioni
- Operatività: backup, esportazione, sicurezza, tracciamento

---

## 1. Sintesi esecutiva

| # | Milestone | Esito osservabile | Stima | Sprint |
|---|---|---|---|---|
| **M0** | Fondamenta e accessi | Un admin entra, un non-admin no | 2–3 gg | S1 |
| **M1** | Dominio dati e import delle 3000 domande | Le 3000 domande sono nel database, normalizzate, riconoscibili | 5–7 gg | S1–S2 |
| **M2** | Classificazione per argomento | Ogni domanda ha una categoria, verificata da un umano | 4–6 gg | S2–S3 |
| **M3** | Editing domande e mnemotecniche | Il PO scrive e pubblica mnemotecniche da solo, senza chiamare nessuno | 5–7 gg | S3–S4 |
| **M4** | Utenti, permessi, segnalazioni | Si sblocca un premium a mano, si gestisce un errore segnalato | 3–4 gg | S5 |
| **M5** | Contenuti, configurazione, set gratuito | Il PO cambia le 100 domande gratuite senza toccare il codice | 2–3 gg | S5 |
| **M6** | Operatività: backup, export, sicurezza | Il database si ripristina davvero, e il PO ha una copia dei suoi contenuti | 2–3 gg | S6 |
| **M7** | Post-MVP | Backlog | — | — |

**Totale backoffice completo: ~23–33 gg.**
**Totale in versione "lean" (§7): ~8–12 gg.** La differenza — 15/20 giornate — è probabilmente il taglio più intelligente disponibile in tutto il progetto. Leggere §7 **prima** di pianificare.

---

## 2. Gate di decisione

| ID | Decisione | Blocca | Chi decide |
|---|---|---|---|
| **G2** | Formato del file sorgente delle 3000 domande | Tutta M1 | PO (deve **procurare il file**) |
| **G3** | Tassonomia delle categorie | Tutta M2 | PO |
| **G5** | Quali 100 domande sono gratuite | M5 (set gratuito) + free tier | PO |
| **G10** | Quale tipo di backoffice si costruisce | Tutta la roadmap | PO + partner tecnico |
| **G11** | Chi ha accesso al backoffice e con quali poteri | M0 | PO |

### ⚠️ G2 — Il rischio più sottovalutato dell'intero progetto

**Nessuno ha ancora guardato il file sorgente delle 3000 domande.** Finché non lo si apre, la stima dell'import (5–7 gg) è un'ipotesi, non un numero. Lo scarto tra gli scenari è enorme:

| Scenario | Costo import |
|---|---|
| Excel/CSV pulito, una riga per domanda, colonne separate | **1–2 gg** |
| Word o PDF **testuale** con formattazione regolare | **3–5 gg** |
| PDF **scansionato** (immagini di testo) → serve OCR + correzione a mano | **8–15 gg**, con errori residui inevitabili |
| Domande contenenti tabelle, formule, immagini | **+3–5 gg**, e cambia anche il frontend |

**Azione, questa settimana:** procurarsi il file ufficiale e aprirlo. È un'ora di lavoro che può spostare la stima del progetto di **due settimane**. È il primo task in assoluto della roadmap, prima ancora delle decisioni sullo stack.

### G10 — Quale backoffice costruire: tre opzioni

Il vincolo di governance è netto e va rispettato: *il PO ha piena proprietà dei dati, ma l'accesso diretto al database resta al team tecnico* (per evitare danni irreversibili). Quindi **il backoffice non è un lusso: è il modo in cui il PO esercita la proprietà sui propri contenuti senza poter rompere niente.**

**Opzione B1 — Refine, applicazione separata** *(ipotesi di partenza nella discovery)*
- **Pro:** griglie dati, filtri, modifica in linea e autenticazione praticamente pronte. Separazione netta tra sito pubblico e amministrazione. Ottimo se il backoffice diventerà davvero il centro di lavoro quotidiano del PO.
- **Contro:** una seconda applicazione da configurare, deployare, aggiornare e proteggere. **+2/3 gg** solo di impianto rispetto a B2. Un'altra dipendenza da mantenere per anni.

**Opzione B2 — Sezione `/admin` dentro l'applicazione principale**
- **Pro:** un repo, un deploy, un'autenticazione, un sistema di componenti (quelli del design system, già pagati). **La più economica in giornate.** Il controllo dei permessi è dove è già il resto della logica.
- **Contro:** le tabelle e i filtri si costruiscono a mano (Refine li regala). Conviene se il numero di schermate amministrative è **contenuto** — ed è esattamente il nostro caso: sono 5-6 schermate, non 40.
- 👉 **Raccomandata**, con questo budget e questo perimetro.

**Opzione B3 — Strumento pronto sul database (Directus, Supabase Studio…)**
- **Pro:** costo di sviluppo quasi nullo.
- **Contro:** ⚠️ **entra in conflitto diretto con il vincolo di governance.** Sono strumenti che espongono il database senza logica applicativa: nessuna validazione, nessun flusso di pubblicazione, nessuna protezione dall'operazione massiva sbagliata. Directus almeno offre ruoli e permessi; Supabase Studio è, di fatto, accesso diretto al database con un'interfaccia gradevole. **Da escludere per l'uso quotidiano del PO.** Utilizzabile dal solo team tecnico come strumento di emergenza.

---

## 3. Modello dati canonico

Questa è la **fonte di verità** per frontend e backoffice. Dizionario dei dati, non implementazione: nomi e campi da rifinire col partner tecnico, ma i *concetti* sono quelli che seguono e sono il risultato dei vincoli di prodotto.

### Contenuti

**`domanda`**
`id` · `numero_ufficiale` (univoco — è l'ancora verso il bando, serve a fidarsi e a re-importare senza duplicare) · `testo` · `stato` (bozza / pubblicata / ritirata / annullata_da_ministero) · `fonte` (riferimento al bando o al file) · `hash_testo` (per il riconoscimento dei duplicati) · `note_interne` · `creato_il` · `aggiornato_il`

**`opzione`**
`id` · `domanda_id` · `testo` · `lettera_originale` (A/B/C/D come nel bando) · `è_corretta` · `ordine_originale`
> ⚠️ Il frontend **non deve mai** identificare una risposta per posizione (1/2/3/4), perché l'ordine viene mescolato a ogni esecuzione. Sempre per `id` dell'opzione. Vedi `FE-M1-E1-T03`.

**`correzione_ufficiale`**
`id` · `domanda_id` · `tipo` (cambio della risposta corretta / correzione del testo / annullamento della domanda) · `descrizione` · `riferimento` (atto ufficiale) · `data_ufficiale` · `applicata_da` · `applicata_il` · `stato_precedente` (istantanea di com'era prima)
> **Perché è un'entità a sé e non una semplice modifica:** le correzioni ministeriali arrivano *dopo*, e un candidato che ha memorizzato la risposta vecchia deve poter capire cosa è cambiato. Sovrascrivere e basta cancella un'informazione che ha valore per l'utente — e la trasparenza qui è anche un argomento di fiducia verso i competitor che si limitano a sovrascrivere.

**`categoria`**
`id` · `nome` · `slug` · `descrizione` · `criteri_di_inclusione` · `criteri_di_esclusione` · `ordine` · `colore`
> I due campi sui criteri non sono burocrazia: sono **il materiale con cui si scrive il prompt di classificazione** (M2) e con cui un revisore umano decide i casi di confine. Senza, l'AI classificherà male e il revisore sarà incoerente con se stesso dopo la duecentesima domanda.

**`domanda_categoria`**
`domanda_id` · `categoria_id` · `è_primaria` · `origine` (ai / umano) · `confidenza` (0–1) · `modello` · `versione_prompt` · `revisionata_da` · `revisionata_il`
> Tenere `origine`, `confidenza` e `versione_prompt` costa nulla e permette di ordinare la coda di revisione **dalle classificazioni meno sicure**: si guardano prima le 400 domande dubbie invece di scorrere linearmente 3000 domande di cui 2600 già giuste. È la differenza tra 3 ore e 8 ore di lavoro del PO.
> *Decisione da prendere:* una categoria primaria + eventuali secondarie (consigliato), oppure una sola categoria rigida? Alcune domande stanno legittimamente a cavallo tra legislazione e gestione della farmacia.

**`mnemotecnica`**
`id` · `domanda_id` · `tipo` (testo / scena da immaginare) · `contenuto` · `stile` (neutro / ironico / audace) · `stato` (bozza / in_revisione / pubblicata / archiviata) · `versione` · `autore` · `creata_il` · `pubblicata_il`
> Più mnemotecniche per la stessa domanda sono ammesse (varianti): serve per il test A/B futuro e per l'idea "proponi la tua" della community. Solo una è `pubblicata` alla volta.

**`feedback_mnemotecnica`**
`id` · `mnemotecnica_id` · `utente_id` o `id_anonimo` · `valore` (mi_aiuta / non_mi_aiuta) · `creato_il`
> Alimentato da `FE-M1-E5-T03`. **È il dato più prezioso di tutto il progetto**: dice quali mnemotecniche funzionano davvero, e quindi come scrivere le 2.800 mancanti. Senza, la produzione futura si basa sul gusto personale.

### Esercizio

**`prova`** — `id` · `tipo` (demo_free / simulazione_ufficiale / per_argomento / solo_errori) · `nome` · `seme` · `domande[]` (elenco fissato) · `utente_id` (nullo se di sistema) · `creata_il`
> Vedi `FE-M1-E1-T01`: **senza il concetto di prova fissata, il confronto "prima vs seconda esecuzione" non esiste.** È il perno della promessa del prodotto.

**`tentativo`** — `id` · `prova_id` · `utente_id` **o** `id_anonimo` · `modalità` (simulazione / flashcard) · `stato` (in_corso / in_pausa / completato / abbandonato) · `numero_sulla_prova` (1°, 2°, 3°…) · `iniziato_il` · `intervalli_di_pausa[]` · `limite_tempo` · `completato_il` · `corrette` · `errate` · `non_date` · `durata_effettiva`

**`risposta_tentativo`** — `id` · `tentativo_id` · `domanda_id` · `opzione_scelta_id` (nullo = non data) · `è_corretta` · `ordine_opzioni_presentato[]` · `risposta_il` · `tempo_impiegato_ms` · `id_client` (idempotenza) · `sincronizzata_il`
> `ordine_opzioni_presentato` **va salvato**, non ricalcolato. Vedi la trappola descritta in `FE-M1-E1-T03`.

### Utenti e permessi

**`utente`** — `id` · `email` · `nome` · `metodo_accesso` · `data_concorso` (per il countdown) · `preferenze` (avanzamento automatico, velocità) · `creato_il` · `ultimo_accesso`

**`permesso`** (*entitlement*) — `id` · `utente_id` · `livello` (free / premium) · `origine` (stripe / codice_promo / concessione_manuale) · `valido_da` · `valido_a` (nullo = permanente) · `riferimento_stripe` · `stato` · `note`
> **Disaccoppiato da Stripe di proposito.** Permette di regalare accessi, gestire rimborsi, vendere a mano prima ancora di integrare Stripe (vedi §7 del file frontend) e cambiare modello di pricing senza toccare la logica dei contenuti.

**`pagamento`** — `id` · `utente_id` · `importo` · `valuta` · `tipo` (una_tantum / abbonamento) · `stato` · `riferimento_stripe` · `riferimento_fattura` · `creato_il`

**`codice_promo`** — `codice` · `tipo` (sconto / accesso_gratuito) · `valore` · `usi_massimi` · `usi_effettuati` · `scadenza` · `attivo`

**`segnalazione`** — `id` · `domanda_id` / `mnemotecnica_id` · `utente_id` o anonimo · `tipo` (errore nel testo / risposta corretta sbagliata / mnemotecnica poco chiara / altro) · `messaggio` · `stato` (nuova / presa_in_carico / risolta / scartata) · `gestita_da` · `note_interne` · `creata_il`

### Amministrazione e operatività

**`amministratore`** — `id` · `email` · `ruolo` (proprietario / redattore / tecnico) · `2FA_attiva` · `ultimo_accesso`
**`registro_modifiche`** (*audit log*) — `id` · `amministratore_id` · `azione` · `entità` · `entità_id` · `differenza` (prima → dopo) · `momento` · `ip`
**`lotto_import`** — `id` · `nome_file` · `hash_file` · `righe_lette` · `create` · `aggiornate` · `scartate` · `report` · `eseguito_da` · `eseguito_il`
**`esecuzione_classificazione`** — `id` · `modello` · `versione_prompt` · `n_domande` · `costo` · `accuratezza_sul_campione` · `eseguita_il`
**`configurazione`** — `chiave` · `valore` · `descrizione` (data del concorso, set gratuito attivo, prezzo, interruttori di funzionalità)
**`pagina_contenuto`** — `slug` · `titolo` · `corpo` · `meta` · `pubblicata`

---

## 4. Milestone, epiche, task

---

### M0 — Fondamenta backoffice e accessi
**Stima: 2–3 gg.** **Esito:** un amministratore entra, chiunque altro no, e ogni azione lascia traccia.

#### E0.1 — Impianto (MUST)

**`BO-M0-E1-T01` — Struttura dell'applicazione admin** · 1 gg · MUST · dipende da **G10**
Se opzione B2: sezione `/admin` protetta, con la propria navigazione, che riusa i componenti del design system già costruiti in `FE-M0-E3`.

**`BO-M0-E1-T02` — Autenticazione amministratori** · 0,5 gg · MUST
Separata da quella degli utenti finali. **2FA obbligatoria** — chi entra qui può modificare le risposte corrette di 3000 domande.

**`BO-M0-E1-T03` — Ruoli e permessi** · 0,5 gg · MUST · dipende da **G11**
- **Proprietario** (PO): tutto tranne le operazioni distruttive di massa.
- **Redattore**: domande, mnemotecniche, categorie, segnalazioni. Nessun accesso a utenti e pagamenti.
- **Tecnico**: import, esecuzioni di classificazione, configurazione, operazioni massive.
- *Criteri:* i ruoli si applicano **lato server**, non nascondendo bottoni. Un redattore che chiama l'API dei pagamenti riceve un rifiuto.
- *Nota:* servirà davvero un redattore? Forse no, all'inizio. Ma i tre ruoli costano mezza giornata **ora** e una riscrittura **dopo**, quando il PO vorrà far scrivere mnemotecniche a qualcuno senza dargli le chiavi di casa.

**`BO-M0-E1-T04` — Registro delle modifiche, dal primo giorno** · 0,5 gg · MUST
Ogni scrittura sui contenuti finisce nel registro: chi, cosa, quando, com'era prima.
- *Perché subito e non "quando serve":* il giorno in cui una risposta corretta risulta sbagliata e nessuno sa chi l'ha cambiata, il registro vale dieci volte quello che è costato. Aggiungerlo dopo significa non avere la storia proprio del periodo più caotico, quello iniziale.

---

### M1 — Dominio dati e import delle 3000 domande
**Stima: 5–7 gg** *(⚠️ ipotesi valida solo per un sorgente ragionevole — vedi G2)*.
**Esito:** le 3000 domande sono nel database, normalizzate, con il loro numero ufficiale, senza duplicati, e il re-import non combina disastri.

#### E1.1 — Analisi del sorgente (MUST) — 1 gg

**`BO-M1-E1-T01` — Procurarsi e ispezionare il file ufficiale** ⚠️ · 0,5 gg · MUST · **BLOCCANTE PER TUTTO**
- *Criteri:* si sa esattamente com'è fatto il file (formato, struttura, regolarità), quante domande contiene davvero, se ci sono tabelle/formule/immagini, come sono indicate le risposte corrette, e **quanto costa l'import** (§G2).
- *Questo è il task numero uno dell'intero progetto.* Prima delle decisioni sullo stack, prima di tutto.

**`BO-M1-E1-T02` — Documento delle anomalie note** · 0,5 gg · SHOULD
Elenco dei casi strani individuati (domande annullate, doppioni, caratteri speciali, formule chimiche, unità di misura, apici e pedici). Va scritto **prima** di programmare il parser: ogni anomalia scoperta dopo costa tre volte tanto.

#### E1.2 — Parsing e normalizzazione (MUST) — 2–3 gg

**`BO-M1-E2-T01` — Estrazione strutturata** · 1,5 gg · MUST
Dal formato sorgente a: numero ufficiale, testo, quattro opzioni, risposta corretta.

**`BO-M1-E2-T02` — Normalizzazione del testo** · 1 gg · MUST
Spazi doppi, virgolette tipografiche, trattini, codifica dei caratteri, µ/°/±, maiuscole incoerenti, "a capo" spuri dentro le frasi.
- *Criteri:* la normalizzazione è **ripetibile e documentata**; si conserva il testo grezzo originale accanto a quello normalizzato. Se domani si scopre che una regola era sbagliata, si rigenera invece di riscrivere a mano 3000 righe.

**`BO-M1-E2-T03` — Riconoscimento dei duplicati** · 0,5 gg · SHOULD
Domande identiche o quasi (le raccolte ministeriali ne contengono spesso).
- *Criteri:* i sospetti duplicati non vengono cancellati: vengono **segnalati** per una decisione umana.

#### E1.3 — Import ripetibile e sicuro (MUST) — 1,5 gg

**`BO-M1-E3-T01` — Import idempotente** · 1 gg · MUST
- *Criteri:* rieseguire l'import dello stesso file **non crea duplicati** (l'ancora è il `numero_ufficiale`). Il sistema distingue: creata / aggiornata / invariata / scartata.
- *Perché è MUST:* l'import verrà rieseguito. Sempre. Almeno tre o quattro volte, perché la prima versione avrà dei problemi. Un import non idempotente significa "svuota il database e ricomincia" — cioè perdere le mnemotecniche e le classificazioni già associate. È un disastro annunciato, ed è banale da prevenire.

**`BO-M1-E3-T02` — Report di importazione** · 0,5 gg · MUST
Al termine: X create, Y aggiornate, Z scartate con motivo, elenco delle anomalie. Salvato come `lotto_import`, consultabile.

#### E1.4 — Correzioni ministeriali (SHOULD) — 1 gg

**`BO-M1-E4-T01` — Registrazione e applicazione di una correzione** · 1 gg · SHOULD
- *Criteri:* si registra la correzione, si applica alla domanda, si conserva lo stato precedente. Le statistiche già calcolate sugli utenti **non vengono riscritte retroattivamente** (chi aveva risposto "giusto" secondo la vecchia versione non diventa retroattivamente sbagliato: sarebbe incomprensibile e ingiusto). Le nuove esecuzioni usano la versione corretta.
- *Bonus prodotto quasi gratuito:* mostrare all'utente "questa domanda è stata corretta ufficialmente il [data]" è un elemento di credibilità che i competitor non hanno. Costa un'etichetta.

---

### M2 — Classificazione per argomento (AI + revisione umana)
**Stima: 4–6 gg.** **Esito:** ogni domanda ha una categoria e un umano l'ha guardata.

> La discovery pone giustamente la domanda: *quanto incide la qualità del prompt sul rischio di classificazioni sbagliate?* La risposta si ottiene misurando, non discutendo. Questa milestone è costruita esattamente per misurarlo prima di applicare qualcosa a 3000 domande.

#### E2.1 — Tassonomia (MUST) — 0,5 gg · dipende da **G3**

**`BO-M2-E1-T01` — Definizione delle categorie con i loro confini** · 0,5 gg · MUST · `contenuti-PO`
Farmacologia, chimica farmaceutica, legislazione, veterinaria, galenica, gestione della farmacia, normativa sanitaria, … Per ognuna: descrizione, **cosa ci sta dentro**, **cosa NON ci sta**, un caso di confine risolto a titolo di esempio.
- *Criteri:* 8–12 categorie. Meno di 8 e non servono a nulla (una categoria da 800 domande non aiuta nessuno a ripassare); più di 15 e il confine tra l'una e l'altra diventa arbitrario, la classificazione incoerente e l'utente confuso.
- *Nota:* **questo è lavoro del PO, non dello sviluppatore.** Ed è il fattore che determina l'80% della qualità della classificazione automatica: un prompt scritto su una tassonomia vaga produrrà risultati vaghi, per quanto bene sia scritto.

#### E2.2 — Pilota misurato (MUST) — 1,5 gg

**`BO-M2-E2-T01` — Campione di riferimento** · 0,5 gg · MUST · `contenuti-PO`
Il PO classifica **a mano** 100–150 domande, scelte a caso. Questo è il metro di paragone.

**`BO-M2-E2-T02` — Prompt di classificazione, primo giro** · 0,5 gg · MUST
Il prompt include: la tassonomia con i criteri di inclusione/esclusione, alcuni esempi svolti, la richiesta di un livello di confidenza e la possibilità esplicita di rispondere **"non lo so"** (fondamentale: un modello a cui non è permesso dubitare inventa, e le sue invenzioni sembrano sicure).

**`BO-M2-E2-T03` — Misura dell'accuratezza e iterazione** · 0,5 gg · MUST
Si esegue il prompt sul campione, si confronta con le classificazioni del PO, si contano gli errori **per categoria** (non solo in totale: quasi sempre 2-3 categorie fanno il grosso degli errori, e sono quelle il cui confine è mal definito → si torna alla tassonomia, non al prompt).
- *Criteri:* si arriva a **≥ 90% di accuratezza sul campione** prima di eseguire su tutte e 3000. Se dopo tre iterazioni non ci si arriva, il problema è la tassonomia (E2.1), non il prompt — e insistere sul prompt è tempo buttato.
- *Costo API:* trascurabile (3000 domande, prompt brevi → pochi euro). Il costo vero è **il tempo del PO**, non i token.

#### E2.3 — Esecuzione massiva (MUST) — 0,5 gg
Su tutte le 3000, salvando categoria, confidenza, modello e versione del prompt. Eseguita come script dal team tecnico (non da un'interfaccia web: sono minuti di elaborazione, non una richiesta HTTP).

#### E2.4 — Revisione umana (MUST) — 2–3 gg *(oppure 0,5 gg — vedi §7)*

**`BO-M2-E4-T01` — Coda di revisione a tastiera** · 2 gg · MUST
Una schermata, una domanda alla volta, **ordinata per confidenza crescente** (prima le più dubbie).
- *Criteri d'uso:* si conferma con `Invio`, si cambia categoria con i tasti `1–9`, si salta con `→`. **Zero uso del mouse.** Ogni azione salva subito e passa alla successiva.
- *Il conto che giustifica il design:* 3000 domande × 6 secondi = **5 ore** di lavoro del PO. Con un'interfaccia a mouse, 3000 × 20 secondi = **17 ore**. La differenza è di due giornate della persona più preziosa del progetto. Il valore di questa schermata è tutto nella velocità: se non è veloce, non serve a niente.
- *Alternativa lean:* vedi **§7** — la revisione via foglio di calcolo costa **0,5 gg invece di 2**, e per il PO è probabilmente anche più comoda.

**`BO-M2-E4-T02` — Assegnazione massiva con filtri** · 0,5 gg · SHOULD
"Tutte le domande che contengono 'D.Lgs' e sono classificate come farmacologia → mostrale". Serve per le correzioni in blocco quando l'AI sbaglia in modo *sistematico* — e quando sbaglia, sbaglia sempre in modo sistematico.

---

### M3 — Editing domande e produzione mnemotecniche
**Stima: 5–7 gg.** **Esito:** il PO scrive, rivede e pubblica mnemotecniche in autonomia. È lo strumento che userà **ogni giorno per mesi**: qui l'ergonomia vale più dell'estetica.

#### E3.1 — Gestione domande (MUST) — 2 gg

**`BO-M3-E1-T01` — Elenco con ricerca e filtri** · 1 gg · MUST
Filtri per: categoria, stato, **presenza di mnemotecnica** (il filtro più usato in assoluto nei prossimi mesi), classificazione revisionata sì/no, presenza di segnalazioni, appartenenza al set gratuito. Ricerca nel testo.

**`BO-M3-E1-T02` — Modifica di una domanda** · 0,5 gg · MUST
Testo, opzioni, risposta corretta, categoria, stato.
- *Criteri:* cambiare la **risposta corretta** richiede una conferma esplicita e finisce nel registro delle modifiche. È l'operazione più pericolosa dell'intero backoffice: una risposta corretta sbagliata insegna a 500 persone la cosa sbagliata, e il danno di fiducia è irreversibile.

**`BO-M3-E1-T03` — Anteprima "come la vede il candidato"** · 0,5 gg · SHOULD
Renderizza la domanda con il design del frontend. Evita di scoprire dopo che una formula chimica manda a capo il testo o che un'opzione lunga sfonda il bottone su mobile.

#### E3.2 — Editor delle mnemotecniche ⭐ (MUST) — 2,5 gg

> **Il cuore operativo del backoffice.** Qui il PO passerà decine di ore. Ogni secondo risparmiato per mnemotecnica va moltiplicato per 200 (adesso) e potenzialmente per 3000 (dopo).

**`BO-M3-E2-T01` — Editor a fuoco singolo** · 1 gg · MUST
Schermata con: la domanda e la **risposta corretta** ben visibili sopra, il campo mnemotecnica sotto, il tipo (testo / scena da immaginare), lo stile (neutro / ironico / audace).
- *Criteri:* salvataggio automatico della bozza (**non far perdere una mnemotecnica scritta bene a chi sta costruendo un prodotto contro la perdita dei progressi**), navigazione "prossima domanda senza mnemotecnica" con un solo tasto.

**`BO-M3-E2-T02` — Flusso di pubblicazione** · 0,5 gg · MUST
`bozza` → `in revisione` → `pubblicata`. Solo le pubblicate arrivano agli utenti.
- *Perché serve:* permette al PO di scrivere di getto 30 mnemotecniche in una sera senza che finiscano online a metà, e di rileggerle a mente fredda il giorno dopo. Le mnemotecniche audaci scritte a mezzanotte vanno riguardate alla luce del sole.

**`BO-M3-E2-T03` — Varianti e cronologia** · 0,5 gg · SHOULD
Più mnemotecniche per domanda, una sola pubblicata. Base per il test A/B futuro e per l'idea "proponi la tua" della community.

**`BO-M3-E2-T04` — Vista di avanzamento della produzione** · 0,5 gg · SHOULD
"147 / 200 mnemotecniche del primo set — 12 in revisione". Alimenta il binario contenuti e dice, in ogni momento, **se il rilascio del free tier è a rischio o no**. È l'unico indicatore che collega il lavoro del PO alla data di lancio.

#### E3.3 — Categorie (SHOULD) — 0,5 gg
CRUD delle categorie con i loro criteri di inclusione/esclusione (gli stessi che alimentano il prompt di M2).

#### E3.4 — Feedback sulle mnemotecniche (SHOULD) — 1 gg

**`BO-M3-E4-T01` — Classifica delle mnemotecniche per efficacia** · 1 gg · SHOULD
Ordinate per rapporto "mi aiuta / non mi aiuta" (dati da `FE-M1-E5-T03`), incrociate con il tasso di risposte corrette sulla domanda associata.
- *Perché conta più di quanto sembri:* è **l'unico dato oggettivo** che dirà come scrivere le 2.800 mnemotecniche mancanti. Senza, la produzione futura si baserà sul gusto di chi scrive — che è esattamente il modo in cui si spendono migliaia di euro per contenuti che nessuno usa.

---

### M4 — Utenti, permessi e segnalazioni
**Stima: 3–4 gg.**

#### E4.1 — Gestione utenti (MUST) — 1 gg
Elenco, ricerca per email, scheda utente (registrazione, ultimo accesso, prove fatte, livello di permesso).
- *Criteri:* **nessuna password visibile o modificabile** dall'admin. Cancellazione dell'account su richiesta (GDPR), con relativa tracciatura.

#### E4.2 — Concessione manuale dei permessi ⭐ (MUST) — 1 gg
Sbloccare il premium a un utente con due click: beta tester, influencer, cliente che ha pagato con bonifico, gestione di un rimborso.
- *Perché è MUST anche se sembra un dettaglio:* **è la funzionalità che permette di vendere prima di aver integrato Stripe** (vedi §7 del file frontend). Con questa schermata, le prime 30 vendite si fanno a mano — e si scopre quanto la gente è davvero disposta a pagare **prima** di costruire la macchina dei pagamenti su un modello di pricing che oggi non è ancora deciso. Un giorno di lavoro che ne fa risparmiare otto e riduce un rischio di business.

#### E4.3 — Codici promo (SHOULD) — 0,5 gg
Generazione, limiti d'uso, scadenza, conteggio degli utilizzi.

#### E4.4 — Segnalazioni (MUST) — 1 gg
Coda delle segnalazioni degli utenti (errore nel testo, risposta corretta contestata, mnemotecnica poco chiara), con stato e collegamento diretto alla domanda.
- *Perché è MUST:* con 3000 domande importate da un file, **ci saranno errori**. Gli utenti sono il vostro controllo qualità gratuito e ostinato. Un candidato che segnala un errore e vede che viene corretto diventa un sostenitore; uno che segnala e non riceve nulla se ne va e lo racconta in giro.

#### E4.5 — Pagamenti in sola lettura (SHOULD) — 0,5 gg
Elenco dei pagamenti con riferimento a Stripe. **Nessuna operazione finanziaria dal backoffice**: i rimborsi si fanno dal cruscotto di Stripe, che è progettato per quello ed è già conforme. Qui serve solo vedere lo stato senza dover aprire un'altra applicazione.

---

### M5 — Contenuti, configurazione, set gratuito
**Stima: 2–3 gg.**

#### E5.1 — Gestione del set gratuito ⭐ (MUST) — 1 gg · dipende da **G5**
Selezione delle 100 domande gratuite tramite un'interfaccia, non tramite codice.
- *Criteri:* si aggiunge/rimuove una domanda dal set gratuito senza rilasciare software. Avviso se una domanda del set gratuito **non ha una mnemotecnica pubblicata** (sarebbe una vetrina senza il prodotto in mostra).
- *Perché è un'entità configurabile e non una regola fissa:* "le prime 100" è una scelta di **marketing**, non tecnica. Il PO vorrà cambiarle — dopo aver visto quali funzionano meglio in conversione. Deve poterlo fare da solo, in cinque minuti.

#### E5.2 — Configurazione globale (SHOULD) — 0,5 gg
Data del concorso (per il countdown in dashboard), prezzo mostrato, interruttori di funzionalità.

#### E5.3 — Pagine editoriali (COULD) — 1 gg
Modifica dei testi delle pagine "Il metodo", FAQ, chi siamo senza passare dallo sviluppatore.
- *Valutazione onesta:* è comodo, ma **non è MVP**. Cambiare tre pagine due volte l'anno via sviluppatore costa meno di una giornata di CMS. Primo candidato al taglio.

---

### M6 — Operatività: backup, esportazione, sicurezza
**Stima: 2–3 gg.** Poco spettacolare, ma è ciò che separa un prodotto da un incidente.

#### E6.1 — Backup e ripristino (MUST) — 1 gg

**`BO-M6-E1-T01` — Backup automatico giornaliero** · 0,5 gg · MUST
Incluso nei database gestiti (Neon, Supabase). Va **verificato che sia attivo**, non dato per scontato.

**`BO-M6-E1-T02` — Prova di ripristino reale** ⚠️ · 0,5 gg · MUST
Ripristinare davvero un backup su un ambiente di prova, e verificare che i dati ci siano tutti.
- *Criteri:* la procedura è **scritta** e qualcuno **l'ha eseguita almeno una volta**. Un backup mai ripristinato non è un backup: è una speranza. Metà delle aziende scopre che i propri backup erano vuoti il giorno in cui servono.

#### E6.2 — Esportazione dei contenuti ⭐ (MUST) — 1 gg
Esportazione in formato aperto (CSV/JSON) di: domande, opzioni, risposte corrette, categorie, mnemotecniche.
- *Perché è MUST e non un vezzo:* la discovery dice che *il PO ha piena proprietà del database e dei contenuti, ma l'accesso diretto al database resta al team tecnico*. **Questa funzione è ciò che rende quella frase vera invece che teorica.** Con un bottone "Esporta tutto", il PO ha in mano il proprio asset — senza poter rompere niente e senza dipendere da nessuno. Se un domani cambiasse partner tecnico, i contenuti sono suoi, in un file, oggi. Costa una giornata e vale come una clausola contrattuale.

#### E6.3 — Sicurezza e tracciamento (MUST) — 0,5–1 gg
2FA obbligatoria per gli admin, limitazione dei tentativi di accesso, registro delle modifiche consultabile e filtrabile, sessioni admin con scadenza breve.

---

### M7 — Post-MVP (backlog)

- **Moderazione della community:** approvazione delle mnemotecniche proposte dagli utenti (con input vincolato: due elementi + un'azione, oppure una sola emoji). *Il modello dati la prevede già; la funzionalità no.*
- **Gestione delle immagini mnemoniche:** caricamento, associazione, prompt usati per generarle. Solo dopo la validazione del metodo.
- **Analitica dei contenuti:** quali domande sbagliano tutti (candidate a una mnemotecnica migliore), quali mnemotecniche funzionano meglio, quali categorie sono più deboli.
- **Test A/B tra varianti di mnemotecnica** — la ragione per cui il modello dati ammette varianti fin dall'inizio.
- **Import di un secondo concorso** (estensione ad altri concorsi pubblici): richiede un livello "concorso" sopra le domande. **Da non fare ora**, ma da non rendere impossibile: aggiungere un campo `concorso_id` alle domande oggi costa zero, aggiungerlo tra un anno costa una migrazione su tutte le tabelle.
- **Gestione di badge, livelli, classifiche** (segue la gamification del frontend).

---

## 5. API di amministrazione

Stesse regole del contratto pubblico, più tre specifiche:

1. **Ogni scrittura passa dal registro delle modifiche.** Nessuna eccezione.
2. **Le operazioni massive richiedono conferma esplicita** e restituiscono un'anteprima ("stai per modificare 847 domande — procedere?").
3. **Nessun endpoint amministrativo raggiungibile con un token utente.** Da verificare con un test automatico, come per il paywall.

Endpoint principali: gestione domande / opzioni / correzioni / categorie / mnemotecniche · classificazione (esecuzione, revisione, assegnazione massiva) · import (caricamento, anteprima, esecuzione, report) · set gratuito · utenti e permessi · segnalazioni · esportazione · configurazione.

---

## 6. Runbook operativi

Procedure scritte, da tenere nel repo. Sono quattro pagine che valgono ore di panico.

**Import di una nuova versione delle domande** → backup → import su staging → lettura del report → verifica manuale di 10 domande a campione → import in produzione → controllo del conteggio.

**Arrivo di una correzione ministeriale** → registrazione della correzione → applicazione → verifica che le statistiche storiche non siano state riscritte → (opzionale) avviso agli utenti.

**Segnalazione di una risposta corretta sbagliata** → verifica sul bando ufficiale → se confermata: correzione + tracciamento + risposta all'utente che ha segnalato (**sempre**: è il vostro miglior controllo qualità e va coltivato).

**Rimborso** → rimborso da Stripe → revoca del permesso dal backoffice → verifica che l'utente non abbia più accesso premium.

**Incidente in produzione** → chi si accorge (monitoraggio) → chi decide → come si ripristina → cosa si comunica agli utenti. *Un fermo della piattaforma costa iscrizioni mancate, non solo tempo tecnico.*

---

## 7. Scenario "lean": come tagliare 15 giornate senza fare danni

Se il budget è quello indicato (vedi §7 del file frontend: **il perimetro completo non ci sta**), il backoffice è il posto giusto dove tagliare — a patto di tagliare con criterio.

**Il principio:** ciò che il team tecnico fa **una volta** può restare uno script. Ciò che il PO fa **tutti i giorni** deve avere un'interfaccia.

| Attività | Versione completa | Versione lean | Risparmio |
|---|---|---|---|
| Import delle 3000 domande | Interfaccia di caricamento con anteprima e report | **Script** eseguito dal tecnico. Report in un file di testo. Si fa 3-4 volte in tutta la vita del progetto. | **–2 gg** |
| Classificazione AI | Interfaccia di esecuzione | **Script** eseguito dal tecnico | **–1 gg** |
| **Revisione della classificazione** | Coda a tastiera nel backoffice | **Foglio di calcolo**: si esporta (domanda, categoria proposta, confidenza), il PO corregge in Excel/Google Sheets — ordinando per confidenza, filtrando per categoria, correggendo a blocchi — e si reimporta. | **–1,5 gg** |
| Scrittura delle prime 150-200 mnemotecniche | Editor nel backoffice | **Foglio di calcolo** + import. Il PO scrive dove è già a suo agio, anche offline, anche sul divano. | **–2 gg** |
| Pagine editoriali | CMS | Testi nel codice, modificati dallo sviluppatore | **–1 gg** |
| Anteprima, varianti, cronologia mnemotecniche | Sì | Rimandate | **–1 gg** |
| Codici promo | Sì | Rimandati (si sblocca a mano) | **–0,5 gg** |
| **Totale risparmiato** | | | **~9–10 gg** |

**Backoffice lean (~8–12 gg), cosa resta — e non è tagliabile:**
- ✅ Accessi, ruoli, registro delle modifiche (M0)
- ✅ Modifica di una singola domanda + segnalazioni (M3.1, M4.4) — perché gli errori arrivano ogni giorno, non una volta
- ✅ **Concessione manuale del premium** (M4.2) — perché è ciò che permette di vendere senza Stripe
- ✅ Gestione del set gratuito (M5.1) — perché è una leva di marketing, non una configurazione tecnica
- ✅ Esportazione dei contenuti (M6.2) — perché è la proprietà dell'asset
- ✅ Backup **con prova di ripristino** (M6.1)

**I limiti del foglio di calcolo, detti chiaramente:** nessuna validazione, nessun tracciamento, rischio di rompere il formato (una colonna spostata e l'import fa danni), nessun lavoro in parallelo. Vanno mitigati con un import **rigoroso e idempotente** (`BO-M1-E3-T01`) che rifiuta i file malformati invece di importarli a metà — e con un backup prima di ogni import.

**Quando smettere di usare il foglio di calcolo:** quando il PO passa dalle 200 mnemotecniche del primo set alle 3000. A quel punto l'editor dedicato si ripaga in poche settimane di lavoro risparmiato — ma a quel punto avrete anche già validato il metodo e saprete che vale la pena costruirlo. **Che è esattamente l'ordine giusto in cui fare le cose.**

---

## 8. Rischi (backoffice)

| Rischio | Impatto | Probabilità | Mitigazione |
|---|---|---|---|
| **Il file sorgente è un PDF scansionato** | **Molto alto** (+8/15 gg) | **Ignota — nessuno l'ha guardato** | `BO-M1-E1-T01`, **questa settimana** |
| Import non idempotente → domande duplicate o dati persi | Alto | Media | `BO-M1-E3-T01` |
| Tassonomia vaga → classificazione inutilizzabile | Alto | Media | `BO-M2-E1-T01`: criteri di inclusione **ed esclusione** |
| Revisione dei 3000 mai completata dal PO | Alto | **Alta** | Coda ordinata per confidenza (o foglio di calcolo). Senza, sono 17 ore che nessuno farà mai |
| Risposta corretta modificata per errore | **Molto alto** | Bassa | Conferma esplicita + registro delle modifiche |
| Backup mai verificato | **Molto alto** | Media | `BO-M6-E1-T02`, ripristino reale |
| Errori nelle domande importate | Medio | **Certa** | Coda delle segnalazioni (M4.4): gli utenti come controllo qualità |
| Backoffice sovradimensionato rispetto al budget | Medio | **Alta** | §7 |

---

## 9. Il binario contenuti (product owner)

Il backoffice è uno strumento. **Il contenuto è il prodotto**, e il suo unico produttore è il PO. Questo binario corre in parallelo allo sviluppo ed è, con ogni probabilità, **il vero percorso critico del progetto**: il software può essere pronto a novembre, ma senza 100 mnemotecniche pubblicate il free tier non ha niente da mostrare.

| Quando | Cosa produce il PO | Serve a |
|---|---|---|
| **Luglio** | Procurare il file sorgente delle 3000 domande | Sbloccare l'intera stima (**G2**) |
| Luglio–agosto | Tassonomia delle categorie con criteri di inclusione/esclusione | Sbloccare la classificazione (**G3**) |
| Agosto | Campione di 100-150 domande classificate a mano | Misurare l'accuratezza dell'AI |
| Settembre | Copy della landing, scelta delle 100 domande gratuite (**G5**) | Free tier |
| Set–novembre | **Mnemotecniche 1–100** ⚠️ | **Bloccano il rilascio pubblico di fine novembre** |
| Ottobre | Revisione della classificazione (~5 ore) | Allenamento per argomento |
| Ott–novembre | Testo della pagina "Il metodo" (**con parole proprie**, non copiato dalle fonti raccolte) | Credibilità del metodo |
| Dicembre | Mnemotecniche 101–200 | Set completo per la validazione |

**Il numero da tenere sott'occhio:** se scrivere una buona mnemotecnica richiede 15-20 minuti (scriverla, rileggerla, scartarla, riscriverla — perché le prime versioni non funzionano quasi mai), le prime 100 sono **25-35 ore di lavoro concentrato**. Non sono una serata. Vanno messe a calendario adesso, con una scadenza vera, o a novembre il software sarà pronto e la vetrina sarà vuota.
