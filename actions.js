/**
 * ACTIONS (Handlingsmodul)
 * 
 * Utfører handlinger basert på scoring-resultatet.
 * Labels, trash, logging – alt som endrer state i Gmail.
 */

/**
 * Labels som brukes av filteret.
 * Opprettes automatisk ved første kjøring.
 */
function getLabels() {
  return {
    checked: GmailApp.getUserLabelByName("#EntropicMail-Checked") || GmailApp.createLabel("#EntropicMail-Checked"),
    killed: GmailApp.getUserLabelByName("#EntropicMail-Killed") || GmailApp.createLabel("#EntropicMail-Killed"),
    warning: GmailApp.getUserLabelByName("#EntropicMail-Warning") || GmailApp.createLabel("#EntropicMail-Warning")
  };
}

/**
 * Utfører handling basert på scorer-resultatet.
 * 
 * @param {GmailThread} thread - Gmail-tråden
 * @param {GmailMessage} message - Gmail-meldingen
 * @param {object} result - Resultat fra scoreEmail()
 * @param {string} sheetId - Google Sheet ID for logging
 */
function executeAction(thread, message, result, sheetId) {
  const labels = getLabels();

  message.markRead();

  switch (result.action) {
    case "KILL":
      thread.addLabel(labels.killed);
      thread.addLabel(labels.checked);
      thread.moveToTrash();
      logToSheet(sheetId, message.getFrom(), message.getSubject(), "DREPT", result.summary, result.totalScore);
      break;

    case "WARN":
      thread.addLabel(labels.warning);
      thread.addLabel(labels.checked);
      logToSheet(sheetId, message.getFrom(), message.getSubject(), "FARESONE", result.summary, result.totalScore);
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
 * @param {string} action - Handling (DREPT/FARESONE/OK)
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
