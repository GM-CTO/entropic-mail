/**
 * MAIN (Google Apps Script inngangsport)
 * 
 * Entropic Mail v4.0 – Atferdsbasert e-postfilter
 * 
 * Dette er den eneste filen som kjøres som trigger.
 * Den kobler sammen Gmail (fetcher/actions) med motoren (scorer).
 * 
 * VIKTIG FOR GOOGLE APPS SCRIPT:
 * Google Apps Script bruker IKKE module.exports/import.
 * Alle filer i prosjektet deler samme globale scope.
 * Funksjonene fra de andre filene er tilgjengelige direkte.
 *
 * Filer i prosjektet:
 * 1. entropy.js   – Entropi-analyse (engine)
 * 2. headers.js   – Header-anomalier (engine)
 * 3. patterns.js  – Strukturelle mønstre (engine)
 * 4. trust.js     – Tillitssystem (engine)
 * 5. scorer.js    – Hovedmotor (engine)
 * 6. fetcher.js   – Gmail → engine-bro (gmail)
 * 7. actions.js   – Handlinger (gmail)
 * 8. main.js      – Trigger-inngang (denne filen)
 */

// ============================================================
// KONFIGURASJON
// ============================================================
const CONFIG = {
  sheetId: "SETT_INN_DIN_SHEET_ID_HER",

  // DRY RUN: Sett til true for å bare logge – ingen Gmail-endringer.
  // Bruk dette for å teste filteret trygt mot ekte mail.
  dryRun: true,

  // Scoring-konfig (juster for aggressivitet)
  scoring: {
    threshold: 5,      // Over dette = KILL
    warningZone: 3,    // Over dette = WARNING
    userEmail: Session.getActiveUser().getEmail(),  // Hentes automatisk fra innlogget konto
    weights: {
      entropy: 1.0,    // Domene-analyse
      headers: 1.0,    // Header-anomalier
      patterns: 1.0,   // Strukturelle mønstre
      trust: 1.0       // Tillitssystem (negative scores)
    }
  },

  // Hvor mange tråder som prosesseres per kjøring
  batchSize: 50
};

// ============================================================
// HOVEDFUNKSJON (sett denne som trigger)
// ============================================================

/**
 * Prosesserer uleste e-poster gjennom scoring-motoren.
 * Sett opp som tidsbasert trigger (f.eks. hvert 5. minutt).
 */
function entropicMail() {
  const query = `is:unread -label:#EntropicMail-Checked -label:#EntropicMail-Killed -label:#EntropicMail-Warning -in:trash`;
  const threads = GmailApp.search(query, 0, CONFIG.batchSize);

  if (threads.length === 0) return;

  let stats = { killed: 0, warned: 0, passed: 0 };

  threads.forEach(thread => {
    const messages = thread.getMessages();

    messages.forEach(message => {
      if (!message.isUnread() || message.isInTrash()) return;

      // 1. Normaliser e-posten (Gmail → engine-format)
      const email = normalizeMessage(message);

      // 2. Kjør scoring-motoren
      const result = scoreEmail(email, CONFIG.scoring);

      // 3. Utfør handling (dry-run = bare logg, ingen Gmail-endringer)
      executeAction(thread, message, result, CONFIG.sheetId, CONFIG.dryRun);

      // 4. Oppdater statistikk
      if (result.action === "KILL") stats.killed++;
      else if (result.action === "WARN") stats.warned++;
      else stats.passed++;
    });
  });

  // Logg kjøringsstatistikk
  const mode = CONFIG.dryRun ? "[DRY RUN] " : "";
  if (stats.killed + stats.warned > 0) {
    console.log(`${mode}Entropic Mail: ${stats.killed} drept, ${stats.warned} advart, ${stats.passed} passert av ${threads.length} tråder`);
  }
}

// ============================================================
// SETUP (kjør denne én gang for å sette opp alt)
// ============================================================

/**
 * Kjør denne funksjonen manuelt én gang.
 * Den oppretter en Google Sheet for logging, setter opp
 * kolonneoverskrifter, og gir deg Sheet-ID-en du trenger.
 *
 * Etter kjøring: Kopier Sheet-ID fra loggen inn i CONFIG.sheetId.
 */
function setupEntropicMail() {
  // 1. Opprett Sheet
  const ss = SpreadsheetApp.create("Entropic Mail – Logg");
  const sheet = ss.getSheets()[0];
  sheet.setName("Logg");

  // 2. Sett opp kolonneoverskrifter
  const headers = ["Dato", "Fra", "Emne", "Handling", "Oppsummering", "Score"];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  // 3. Formater overskriftsraden
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight("bold");
  headerRange.setBackground("#1a1a2e");
  headerRange.setFontColor("#ffffff");

  // 4. Sett kolonnebredder
  sheet.setColumnWidth(1, 150);  // Dato
  sheet.setColumnWidth(2, 250);  // Fra
  sheet.setColumnWidth(3, 300);  // Emne
  sheet.setColumnWidth(4, 100);  // Handling
  sheet.setColumnWidth(5, 500);  // Oppsummering
  sheet.setColumnWidth(6, 80);   // Score

  // 5. Frys overskriftsraden
  sheet.setFrozenRows(1);

  // 6. Opprett Gmail-labels
  getLabels();

  // 7. Vis Sheet-ID i loggen
  const sheetId = ss.getId();
  const sheetUrl = ss.getUrl();

  console.log("===========================================");
  console.log("Entropic Mail er satt opp!");
  console.log("===========================================");
  console.log("");
  console.log("Sheet-ID (kopier denne inn i CONFIG.sheetId):");
  console.log(sheetId);
  console.log("");
  console.log("Sheet-URL (legg til som bokmerke):");
  console.log(sheetUrl);
  console.log("");
  console.log("Neste steg:");
  console.log("1. Kopier Sheet-ID over inn i CONFIG.sheetId");
  console.log("2. Sett opp en tidsbasert trigger for entropicMail()");
  console.log("   (Rediger → Triggere → Legg til → entropicMail → Hvert 5. minutt)");
  console.log("3. La dryRun stå som true til du er fornøyd med loggen");
}
