# 🛡️ Entropic Mail

**Atferdsbasert e-postfilter som scorer meldinger med matematikk og mønstergjenkjenning – ikke hardkodede lister.**

> *Navnet kombinerer Shannon-entropi (kjernealgoritmen) med en hyllest til Anthropic (AI-partneren som hjalp bygge det).*

## Filosofi

Tradisjonelle spamfiltre jager etter spesifikke ord, domener og avsendere. Entropic Mail gjør det motsatt: den analyserer **atferd og struktur** for å avsløre spam som ikke er oppfunnet ennå.

- **Null hardkodede svartelister** – ingen ord- eller domenelister å vedlikeholde
- **Ren matematikk** – entropi, statistiske avvik, strukturell analyse
- **Tillitsbasert hvitlisting** – domener du faktisk kommuniserer med får tillit automatisk
- **Justerbar aggressivitet** – du bestemmer hvor brutalt filteret rydder

## Arkitektur

```
src/
├── engine/          # Ren scoring-motor (ingen e-post-avhengigheter)
│   ├── scorer.js    # Hovedmotor – koordinerer alle moduler
│   ├── entropy.js   # Domene-entropi og tegnsett-analyse
│   ├── headers.js   # Header-anomali-deteksjon
│   ├── patterns.js  # Strukturelle mønster-avvik
│   └── trust.js     # Tillitssystem (erstatter hvitlister)
│
├── gmail/           # Google Apps Script integrasjon
│   ├── main.js      # Trigger og Gmail API-kall
│   ├── fetcher.js   # Henter e-postdata og normaliserer til engine-format
│   └── actions.js   # Utfører handlinger (labels, trash, logging)
│
docs/                # Dokumentasjon
tests/               # Test-data og verifisering
```

### Kjerneprinsipp: Separasjon

`engine/` vet ingenting om Gmail. Den tar inn et strukturert objekt og returnerer en score. Dette gjør det mulig å:
- Teste motoren uten Gmail-tilgang
- Portere til Python/npm senere
- Bruke motoren mot IMAP, Outlook, eller andre e-postsystemer

## Scoring-moduler

| Modul | Hva den måler | Signal |
|-------|--------------|--------|
| **Entropy** | Shannon-entropi i domenenavn | Maskingenererte domener har høy entropi |
| **Headers** | Return-Path vs From mismatch, falske replies | Teknisk juks i e-postens infrastruktur |
| **Patterns** | Subdomene-dybde, siffer-tetthet, TLD-statistikk | Strukturelle avvik fra normal e-post |
| **Trust** | Har du sendt til dette domenet før? | Atferdsbasert tillit erstatter hvitlister |

Hver modul returnerer en score og en forklaring. Totalscoren avgjør handlingen.

## Kom i gang (Google Apps Script)

1. Opprett et nytt Google Apps Script-prosjekt på [script.google.com](https://script.google.com)
2. Kopier filene fra `src/engine/` og `src/gmail/` inn i editoren
3. Oppdater `CONFIG.sheetId` i `main.js` med din Google Sheet ID
4. Sett opp en tidsbasert trigger for `entropicMail()` (f.eks. hvert 5. minutt)

## Status

🚧 **Under aktiv utvikling** – Versjon 4.0 bygges fra scratch med ren atferdsbasert arkitektur.

## Lisens

MIT
