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

## Kom i gang (Google Apps Script)

1. Opprett et nytt Google Apps Script-prosjekt på [script.google.com](https://script.google.com)
2. Kopier alle `.js`-filene og `appsscript.json` inn i editoren
3. Opprett en Google Sheet for logging og kopier Sheet-ID-en
4. Oppdater `CONFIG.sheetId` i `main.js` med din Sheet ID
5. La `CONFIG.dryRun` stå som `true` for å teste trygt
6. Sett opp en tidsbasert trigger for `entropicMail()` (f.eks. hvert 5. minutt)
7. Sjekk Sheet-loggen for å se hva filteret ville gjort
8. Når du er fornøyd, sett `CONFIG.dryRun` til `false`

## Status

Under aktiv utvikling.

## Lisens

MIT
