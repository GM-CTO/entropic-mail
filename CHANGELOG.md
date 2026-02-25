# Changelog

Alle endringer i prosjektet dokumenteres her.
Formatet er basert på [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [4.1.0] - 2026-02-25

### Nytt
- **Self-spoofing-deteksjon**: Oppdager når avsender utgir seg for å være deg (display name matcher ditt brukernavn). Bruker Levenshtein-avstand for fuzzy matching — fanger eksakte treff (+5), nære varianter som manglende/ekstra bokstaver (+4), og inneholder-treff (+3). Brukerens e-post hentes automatisk via `Session.getActiveUser().getEmail()`.
- **DRY_RUN-modus**: Ny config-flag som logger alt til Google Sheet uten å gjøre endringer i Gmail. Logger DRY-KILL/DRY-WARN for trygg testing mot ekte mail.
- **`setupEntropicMail()`-funksjon**: Kjør én gang for å auto-opprette Google Sheet med kolonneoverskrifter, formatering og frosne rader. Printer Sheet-ID og URL til loggen.
- **`appsscript.json` manifest**: V8 runtime, OAuth scopes for Gmail og Sheets, Europe/Oslo timezone.
- **Label-caching**: Labels hentes/opprettes én gang per kjøring i stedet for per melding.

### Endret
- **Entropi-terskel senket** fra 3.5 til 3.2 for laveste score-bucket (+2). Fanger flere tilfeldige domener uten false positives på legitime domener (intersport.no, google.com, dnb.no forblir under).
- **`getRootDomain` håndterer nå ccTLDs** (.co.uk, .com.br) med heuristikk: hvis nest-siste del er ≤3 tegn og siste er ≤2 tegn, brukes 3 deler.
- **`markRead()` kun for KILL**: Tidligere ble alle meldinger markert som lest, inkludert legitime. Nå markeres kun KILL-meldinger som lest.
- **README synket med faktisk filstruktur**: Flat struktur (ingen src/-mapper), oppdatert kom-i-gang-guide med steg-for-steg.

### Fikset
- **`invisibleCharacters()` case-mismatch**: Hex-nøklene brukte uppercase (`\u200B`) men `toString(16)` ga lowercase (`\u200b`). Usynlige tegn ble aldri detektert. Fikset til lowercase.
- **`characterSetMix` zero-width overlap**: Range 0x200B-0x200D var subset av 0x2000-0x206F. Zero-width-sjekken ble aldri nådd. Fikset rekkefølge i if/else-kjeden.
- **`hasRepliedTo` uoppnåelig kode**: Ble satt til true kun når `sentToCount > 0`, men trust.js sjekket den kun når `sentToCount === 0`. Fjernet konseptet, forenklet til tre tiers: sendt nylig (-5), sendt noen gang (-3), aldri sendt (0).

### Fjernet
- **`analyzeGenericPrefix`**: Inneholdt 26 hardkodede ord (info, support, noreply, etc.) — brøt med kjernefilosofien om null hardkodede lister. Fjernet helt (+1 poeng, minimal påvirkning).

## [4.0.0] - 2026-02-24

### Nytt
- Prosjektet heter nå **Entropic Mail** (entropi + Anthropic)
- Prosjektstruktur med separasjon mellom engine og Gmail-integrasjon
- Entropy-modul for domeneanalyse (Shannon-entropi)
- Header-anomali-deteksjon (Return-Path mismatch, falske replies)
- Pattern-modul (subdomene-dybde, siffer-tetthet, domene-lengde, bindestreker, emoji)
- Tillitssystem basert på sendt-historikk (erstatter hardkodede hvitlister)

### Fjernet
- Alle hardkodede domene-hvitlister
- Alle hardkodede ord-svartelister
- Hardkodet TLD-blokkering
- Statiske trigger-ord med flat scoring

## [3.3.0] - 2025 (Legacy)

Siste versjon av det originale Google Apps Script-filteret med hybrid tilnærming
(hardkodede lister + noe atferdsanalyse). Arkivert som referanse.
