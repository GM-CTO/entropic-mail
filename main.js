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
 * Funksjonene fra engine/* og gmail/* er tilgjengelige direkte.
 * 
 * Rekkefølge i Script Editor:
 * 1. src/engine/entropy.js
 * 2. src/engine/headers.js
 * 3. src/engine/patterns.js
 * 4. src/engine/trust.js
 * 5. src/engine/scorer.js
 * 6. src/gmail/fetcher.js
 * 7. src/gmail/actions.js
 * 8. src/gmail/main.js (denne filen)
 */

// ============================================================
// KONFIGURASJON
// ============================================================
const CONFIG = {
  sheetId: "SETT_INN_DIN_SHEET_ID_HER",
  
  // Scoring-konfig (juster for aggressivitet)
  scoring: {
    threshold: 5,      // Over dette = KILL
    warningZone: 3,    // Over dette = WARNING
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

      // 3. Utfør handling
      executeAction(thread, message, result, CONFIG.sheetId);

      // 4. Oppdater statistikk
      if (result.action === "KILL") stats.killed++;
      else if (result.action === "WARN") stats.warned++;
      else stats.passed++;
    });
  });

  // Logg kjøringsstatistikk
  if (stats.killed + stats.warned > 0) {
    console.log(`Entropic Mail: ${stats.killed} drept, ${stats.warned} advart, ${stats.passed} passert av ${threads.length} tråder`);
  }
}
