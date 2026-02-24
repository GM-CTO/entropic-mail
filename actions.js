/**
 * ACTIONS (Handlingsmodul)
 *
 * Utfører handlinger basert på scoring-resultatet.
 * Labels, trash, logging – alt som endrer state i Gmail.
 *
 * Støtter DRY_RUN-modus: logger alt men gjør ingenting i Gmail.
 */

// Label-cache – opprettes én gang per kjøring, ikke per melding
let _labelCache = null;

/**
 * Henter (eller oppretter) labels. Caches per kjøring.
 * @returns {object} { checked, killed, warning }
 */
function getLabels() {
  if (_labelCache) return _labelCache;

  _labelCache = {
    checked: GmailApp.getUserLabelByName("#EntropicMail-Checked") || GmailApp.createLabel("#EntropicMail-Checked"),
    killed: GmailApp.getUserLabelByName("#EntropicMail-Killed") || GmailApp.createLabel("#EntropicMail-Killed"),
    warning: GmailApp.getUserLabelByName("#EntropicMail-Warning") || GmailApp.createLabel("#EntropicMail-Warning")
  };

  return _labelCache;
}

/**
 * Utfører handling basert på scorer-resultatet.
 *
 * I DRY_RUN-modus logges alt til Sheet, men Gmail forblir urørt.
 *
 * @param {GmailThread} thread - Gmail-tråden
 * @param {GmailMessage} message - Gmail-meldingen
 * @param {object} result - Resultat fra scoreEmail()
 * @param {string} sheetId - Google Sheet ID for logging
 * @param {boolean} dryRun - Hvis true, bare logg – ikke endre Gmail
 */
function executeAction(thread, message, result, sheetId, dryRun) {
  // Alltid logg til Sheet (også i dry-run) for KILL og WARN
  if (result.action === "KILL") {
    logToSheet(sheetId, message.getFrom(), message.getSubject(),
      dryRun ? "DRY-KILL" : "DREPT", result.summary, result.totalScore);
  } else if (result.action === "WARN") {
    logToSheet(sheetId, message.getFrom(), message.getSubject(),
      dryRun ? "DRY-WARN" : "FARESONE", result.summary, result.totalScore);
  }

  // I dry-run stopper vi her – ingen Gmail-endringer
  if (dryRun) return;

  const labels = getLabels();

  switch (result.action) {
    case "KILL":
      thread.addLabel(labels.killed);
      thread.addLabel(labels.checked);
      message.markRead();
      thread.moveToTrash();
      break;

    case "WARN":
      thread.addLabel(labels.warning);
      thread.addLabel(labels.checked);
      break;

    case "PASS":
      thread.addLabel(labels.checked);
      break;
  }
}

/**
 * Logger resultat til Google Sheet for analyse og debugging.
 *
 * @param {string} sheetId - Sheet ID
 * @param {string} from - Avsender
 * @param {string} subject - Emne
 * @param {string} action - Handling (DREPT/FARESONE/OK/DRY-KILL/DRY-WARN)
 * @param {string} summary - Oppsummering fra scorer
 * @param {number} score - Total poengsum
 */
function logToSheet(sheetId, from, subject, action, summary, score) {
  try {
    const ss = SpreadsheetApp.openById(sheetId);
    const sheet = ss.getSheets()[0];
    sheet.appendRow([
      new Date(),
      from,
      subject,
      action,
      summary,
      score
    ]);
  } catch (e) {
    console.log("Sheet-logg feilet: " + e.message);
  }
}
