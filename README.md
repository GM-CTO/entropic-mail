# Entropic Mail

**Atferdsbasert e-postfilter som scorer meldinger med matematikk og mønstergjenkjenning – ikke hardkodede lister.**

> *Navnet kombinerer Shannon-entropi (kjernealgoritmen) med en hyllest til Anthropic (AI-partneren som hjalp bygge det).*

## Filosofi

Tradisjonelle spamfiltre jager etter spesifikke ord, domener og avsendere. Entropic Mail gjør det motsatt: den analyserer **atferd og struktur** for å avsløre spam som ikke er oppfunnet ennå.

- **Null hardkodede lister** – ingen ord-, domene- eller avsenderlister å vedlikeholde
- **Ren matematikk** – entropi, statistiske avvik, strukturell analyse
- **Tillitsbasert hvitlisting** – domener du faktisk kommuniserer med får tillit automatisk
- **Justerbar aggressivitet** – du bestemmer hvor brutalt filteret rydder

## Arkitektur

```
entropic-mail/
├── appsscript.json   # Google Apps Script manifest (V8 runtime)
│
│ # Engine – ren scoring-motor (ingen e-post-avhengigheter)
├── entropy.js        # Domene-entropi og tegnsett-analyse
├── headers.js        # Header-anomali-deteksjon
├── patterns.js       # Strukturelle mønster-avvik
├── trust.js          # Tillitssystem (erstatter hvitlister)
├── scorer.js         # Hovedmotor – koordinerer alle moduler
│
│ # Gmail – Google Apps Script integrasjon
├── fetcher.js        # Normaliserer Gmail-data til engine-format
├── actions.js        # Utfører handlinger (labels, trash, logging)
└── main.js           # Trigger-inngang og konfigurasjon
```

### Kjerneprinsipp: Separasjon

Engine-filene (entropy, headers, patterns, trust, scorer) vet ingenting om Gmail. De tar inn et strukturert objekt og returnerer en score. Dette gjør det mulig å:
- Teste motoren uten Gmail-tilgang
- Portere til Python/npm senere
- Bruke motoren mot IMAP, Outlook, eller andre e-postsystemer

## Scoring-moduler

| Modul | Hva den måler | Signal |
|-------|--------------|--------|
| **Entropy** | Shannon-entropi i domenenavn, tegnsett-blanding | Maskingenererte domener har høy entropi |
| **Headers** | Return-Path vs From, falske replies, bulk-infra | Teknisk juks i e-postens infrastruktur |
| **Patterns** | Subdomene-dybde, siffer-tetthet, domene-lengde | Strukturelle avvik fra normal e-post |
| **Trust** | Har du sendt til dette domenet før? | Atferdsbasert tillit erstatter hvitlister |

Hver modul returnerer en score og en forklaring. Totalscoren avgjør handlingen:
- **KILL** (score >= 5): Flytt til søppel
- **WARN** (score >= 3): Merk som mistenkelig
- **PASS** (score < 3): La i fred

## Kom i gang

### Steg 1: Opprett Apps Script-prosjektet

1. Gå til [script.google.com](https://script.google.com)
2. Klikk **Nytt prosjekt**
3. Gi prosjektet et navn (f.eks. "Entropic Mail")

### Steg 2: Legg inn koden

1. I editoren ser du en fil som heter `Kode.gs` — slett innholdet
2. For **hver .js-fil** i dette repoet, gjør følgende:
   - Klikk **+** ved siden av "Filer" i venstre panel
   - Velg **Script**
   - Gi filen samme navn (uten `.js` — editoren legger til `.gs` automatisk)
   - Lim inn innholdet fra filen
3. Filene du trenger: `entropy`, `headers`, `patterns`, `trust`, `scorer`, `fetcher`, `actions`, `main`
4. For `appsscript.json`: Klikk **Prosjektinnstillinger** (tannhjulet) → Huk av "Vis manifestfil i editoren" → Erstatt innholdet med `appsscript.json` fra repoet

### Steg 3: Sett opp logging-sheetet

Du trenger ikke opprette det manuelt — det er en setup-funksjon som gjør alt:

1. I editoren, velg funksjonen `setupEntropicMail` fra dropdown-menyen øverst
2. Klikk **Kjør** (play-knappen)
3. Første gang vil Google be om tillatelser — klikk gjennom:
   - "Gjennomgå tillatelser" → Velg din Google-konto
   - "Avansert" → "Gå til Entropic Mail (usikkert)" → "Tillat"
4. Sjekk **Utførelsesloggen** (Vis → Logger eller Ctrl+Enter)
5. Kopier **Sheet-ID** fra loggen
6. Lim inn Sheet-ID i `CONFIG.sheetId` i `main.js` (erstatt `"SETT_INN_DIN_SHEET_ID_HER"`)

Sheetet som opprettes har disse kolonnene:

| Dato | Fra | Emne | Handling | Oppsummering | Score |
|------|-----|------|----------|--------------|-------|

### Steg 4: Sett opp automatisk trigger

1. Klikk **Triggere** i venstre meny (klokke-ikonet), eller gå til Rediger → Triggere
2. Klikk **Legg til trigger** (nede til høyre)
3. Fyll inn:
   - Funksjon: **entropicMail**
   - Hendelseskilde: **Tidsbasert**
   - Type: **Minutt-timer**
   - Intervall: **Hvert 5. minutt**
4. Klikk **Lagre**

### Steg 5: Test i dry-run

Filteret starter nå i **dry-run-modus** — det analyserer e-postene dine og logger resultater til sheetet, men gjør **ingenting** med mailene dine. Ingen sletting, ingen labels, ingen endringer.

1. Vent noen timer og sjekk sheetet
2. Se over hva filteret ville ha drept (DRY-KILL) og advart om (DRY-WARN)
3. Er du enig? Sett `CONFIG.dryRun` til `false` i `main.js`
4. Uenig? Juster `CONFIG.scoring.threshold` (høyere = mindre aggressiv)

## Status

Under aktiv utvikling.

## Lisens

MIT
