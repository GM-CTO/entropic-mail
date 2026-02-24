/**
 * HEADERS-MODUL
 * 
 * Analyserer e-postheadere for tekniske anomalier som avslører
 * spam, phishing og masseutsendelser.
 * 
 * E-postheadere lyver sjelden fordi de settes av infrastrukturen,
 * ikke av innholdet. En spammer kan skrive hva som helst i emnefeltet,
 * men Return-Path og In-Reply-To avsløres av hvordan mailen faktisk ble sendt.
 */

/**
 * Sjekker om en e-post later som den er et svar (RE:/FW:) uten
 * å faktisk være del av en tråd. Klassisk phishing-teknikk for å
 * få mottakeren til å tro de har en pågående samtale.
 * 
 * @param {string} subject - E-postens emnefelt
 * @param {string} inReplyTo - In-Reply-To header (tom = ingen tråd)
 * @param {string} references - References header (tom = ingen tråd)
 * @returns {object} { isFake: boolean, score: number, reason: string }
 */
function detectFakeReply(subject, inReplyTo, references) {
  const replyPattern = /^\s*(RE|FW|FWD|SV|VS|SVAR)\s*:\s*/i;
  const looksLikeReply = replyPattern.test(subject);
  const hasThreadHeaders = (inReplyTo && inReplyTo.trim() !== "") || 
                           (references && references.trim() !== "");

  if (looksLikeReply && !hasThreadHeaders) {
    return { 
      isFake: true, 
      score: 3, 
      reason: "Falsk reply: Emnet sier RE:/SV: men ingen tråd-headere finnes (+3)" 
    };
  }

  return { isFake: false, score: 0, reason: "" };
}

/**
 * Sjekker om Return-Path matcher avsenderdomenet.
 * Et mismatch betyr at e-posten ble sendt fra en annen infrastruktur
 * enn det avsenderadressen påstår.
 * 
 * @param {string} returnPath - Return-Path header
 * @param {string} fromDomain - Domenet fra From-adressen
 * @returns {object} { mismatch: boolean, score: number, reason: string }
 */
function detectReturnPathMismatch(returnPath, fromDomain) {
  if (!returnPath || returnPath.trim() === "") {
    return { mismatch: false, score: 0, reason: "" };
  }

  const rpDomain = extractDomain(returnPath);
  if (!rpDomain) return { mismatch: false, score: 0, reason: "" };

  // Trekk ut rot-domenet for sammenligning (ignorer subdomener)
  const rpRoot = getRootDomain(rpDomain);
  const fromRoot = getRootDomain(fromDomain);

  if (rpRoot !== fromRoot) {
    return {
      mismatch: true,
      score: 3,
      reason: `Return-Path mismatch: sendt via ${rpRoot}, påstår ${fromRoot} (+3)`
    };
  }

  return { mismatch: false, score: 0, reason: "" };
}

/**
 * Oppdager masseutsendelse-infrastruktur i headere.
 * E-post sendt via SendGrid, Amazon SES, Mailchimp osv. er nesten
 * alltid nyhetsbrev eller markedsføring – ikke personlig korrespondanse.
 * 
 * NB: Dette er ikke en svarteliste av tjenester, men en deteksjon av
 * masseutsendelse-ATFERD basert på infrastruktur-signaler.
 * 
 * @param {string} returnPath - Return-Path header
 * @param {string} receivedHeaders - Sammensatte Received-headere
 * @returns {object} { isBulk: boolean, score: number, reason: string }
 */
function detectBulkInfrastructure(returnPath, receivedHeaders) {
  const combined = ((returnPath || "") + " " + (receivedHeaders || "")).toLowerCase();

  // Mønster som indikerer masseutsendelse-infrastruktur
  const bulkPatterns = [
    { pattern: /bounce/, signal: "bounce-håndtering" },
    { pattern: /sendgrid/, signal: "SendGrid" },
    { pattern: /amazonses/, signal: "Amazon SES" },
    { pattern: /mailchimp/, signal: "Mailchimp" },
    { pattern: /mailgun/, signal: "Mailgun" },
    { pattern: /constantcontact/, signal: "Constant Contact" },
    { pattern: /campaign-?archive/, signal: "kampanje-arkiv" },
    { pattern: /mcsv\.net/, signal: "Mailchimp CDN" },
    { pattern: /mandrillapp/, signal: "Mandrill" }
  ];

  const detected = [];
  for (const { pattern, signal } of bulkPatterns) {
    if (pattern.test(combined)) {
      detected.push(signal);
    }
  }

  if (detected.length > 0) {
    return {
      isBulk: true,
      score: 2,
      reason: `Masseutsendelse-infra: ${detected.join(", ")} (+2)`
    };
  }

  return { isBulk: false, score: 0, reason: "" };
}

/**
 * Sjekker om List-Unsubscribe header finnes.
 * Tilstedeværelse betyr at avsender har en masseutsendelse-plattform.
 * 
 * @param {string} listUnsubscribe - List-Unsubscribe header
 * @returns {object} { hasUnsub: boolean, score: number, reason: string }
 */
function detectUnsubscribeHeader(listUnsubscribe) {
  if (listUnsubscribe && listUnsubscribe.trim() !== "") {
    return {
      hasUnsub: true,
      score: 1.5,
      reason: "List-Unsubscribe header funnet – masseutsendelse (+1.5)"
    };
  }

  return { hasUnsub: false, score: 0, reason: "" };
}

/**
 * Hoved-scoring for header-modulen.
 * 
 * @param {object} headers - Normalisert header-objekt
 * @param {string} headers.subject - Emnefelt
 * @param {string} headers.fromDomain - Avsenderdomene
 * @param {string} headers.returnPath - Return-Path header
 * @param {string} headers.inReplyTo - In-Reply-To header
 * @param {string} headers.references - References header
 * @param {string} headers.listUnsubscribe - List-Unsubscribe header
 * @param {string} headers.received - Sammensatte Received-headere
 * @returns {object} { score: number, reasons: string[] }
 */
function scoreHeaders(headers) {
  let score = 0;
  const reasons = [];

  const fakeReply = detectFakeReply(headers.subject, headers.inReplyTo, headers.references);
  if (fakeReply.isFake) { score += fakeReply.score; reasons.push(fakeReply.reason); }

  const rpMismatch = detectReturnPathMismatch(headers.returnPath, headers.fromDomain);
  if (rpMismatch.mismatch) { score += rpMismatch.score; reasons.push(rpMismatch.reason); }

  const bulk = detectBulkInfrastructure(headers.returnPath, headers.received);
  if (bulk.isBulk) { score += bulk.score; reasons.push(bulk.reason); }

  const unsub = detectUnsubscribeHeader(headers.listUnsubscribe);
  if (unsub.hasUnsub) { score += unsub.score; reasons.push(unsub.reason); }

  return { score, reasons };
}

// --- Hjelpefunksjoner ---

function extractDomain(headerValue) {
  const match = headerValue.match(/@([^>\s,]+)/);
  return match ? match[1].toLowerCase() : null;
}

function getRootDomain(domain) {
  const parts = domain.split(".");
  if (parts.length < 2) return domain;

  // Heuristikk for ccTLDs: hvis nest-siste del er kort (co, com, org, net, ac)
  // og siste del er kort (uk, br, jp, au), bruk 3 deler.
  // Eksempel: mail.google.co.uk → google.co.uk (ikke co.uk)
  if (parts.length >= 3) {
    const secondLast = parts[parts.length - 2];
    const last = parts[parts.length - 1];
    if (secondLast.length <= 3 && last.length <= 2) {
      return parts.slice(-3).join(".");
    }
  }

  return parts.slice(-2).join(".");
}

// Eksporter
if (typeof module !== "undefined") {
  module.exports = { 
    detectFakeReply, detectReturnPathMismatch, detectBulkInfrastructure,
    detectUnsubscribeHeader, scoreHeaders 
  };
}
