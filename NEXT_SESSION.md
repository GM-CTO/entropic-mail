# Entropic Mail – Handover

## Hva er dette?
Atferdsbasert e-postfilter for Gmail som kjører som Google Apps Script. Bruker matematikk og mønstergjenkjenning — null hardkodede lister.

## Status: Kjører live
Filteret er deployet og kjører på ta.johnsen@gmail.com med trigger hvert 5. minutt. Dry-run er skrudd AV — filteret dreper spam aktivt.

## Hva vi har gjort denne sesjonen

### Bugfikser (commit db6147a)
1. `invisibleCharacters()` matchet aldri pga uppercase/lowercase hex-mismatch — fikset
2. `hasRepliedTo` var uoppnåelig kode — fjernet, forenklet trust til sent nylig (-5) / sent noen gang (-3) / aldri sendt (0)
3. `markRead()` markerte ALLE mails som lest inkl. legitime — nå kun KILL
4. `characterSetMix` zero-width overlap (dead code) — fikset rekkefølge
5. `getRootDomain` feilet på .co.uk/.com.br — heuristisk ccTLD-fix
6. `getLabels()` kalte API per melding — cachet per kjøring
7. Fjernet `analyzeGenericPrefix` — hardkodet ordliste med 26 ord, brøt med filosofien
8. Lagt til `DRY_RUN`-modus og `appsscript.json` manifest

### Nye features (commit eace496, ace640c)
9. **Self-spoofing-deteksjon**: Levenshtein-avstand sjekker om display name ligner brukerens eget brukernavn. +5 eksakt, +4 nær (avstand ≤2), +3 inneholder. Brukerens e-post hentes automatisk via `Session.getActiveUser().getEmail()`.
10. **Entropi-terskel senket** fra 3.5 til 3.2 — fanger flere tilfeldige domener uten false positives på legitime domener.

### Setup (commit b3de3e5)
11. `setupEntropicMail()` funksjon som auto-oppretter Sheet med headers, formatering, frosne rader
12. Full steg-for-steg guide i README

## Testresultater fra live-kjøring
- 41 KILL, 4 WARN, 6 PASS av 50 tråder
- 100% korrekt på KILL — null false positives
- WARN-sonen hadde spam som burde vært KILL (fikset med entropi-justering + spoofing)
- PASS hadde noen som slapp gjennom (spoofing-sjekken fanger nå ta.johnsen/TA.JOHNSEN-varianter)

## Kjente gjenstående issues

### Spam som fortsatt kan slippe gjennom
- E-poster fra ekte domener (outlook.com, gmail.com) med vanlige navn ("Astrid", "Odilia Gest", "Tonya Loggins") — disse har lav entropi, ingen RP-mismatch, og ingen strukturelle avvik. Vanskelig å fange uten innholdsanalyse.
- "Statens vegvesen" - purring som ser legitim ut strukturelt

### Mulige forbedringer
- **Innholdsanalyse**: Sjekke om emne/body inneholder urgency-patterns, matematisk (ikke ordlister)
- **Språk-mismatch**: Svensk emne fra .com-domene til norsk bruker
- **Repeat-offender scoring**: Hvis samme domene-mønster dukker opp gjentatte ganger
- **Dashboard**: Google Sheet med pivottabell for statistikk over tid

## Filstruktur
```
entropy.js    — Shannon-entropi, tegnsett, usynlige tegn
headers.js    — Fake reply, RP-mismatch, bulk-infra, unsubscribe
patterns.js   — Subdybde, sifre, domene-lengde, bindestreker, emoji, self-spoofing
trust.js      — Tillitscore basert på sendt-historikk
scorer.js     — Koordinerer alle moduler, summerer score
fetcher.js    — Gmail API → normalisert objekt
actions.js    — Labels, trash, Sheet-logging, dry-run
main.js       — Config, trigger-funksjon, setup-funksjon
```

## Config (i main.js / main.gs)
- `sheetId`: Google Sheet ID for logging
- `dryRun`: true = bare logg, false = live
- `scoring.threshold`: 5 (KILL-grense)
- `scoring.warningZone`: 3 (WARN-grense)
- `scoring.userEmail`: auto-hentet fra Session
- `scoring.weights`: 1.0 for alle moduler (justerbare)
- `batchSize`: 10 (endret fra 50)
