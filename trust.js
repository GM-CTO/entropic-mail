/**
 * TRUST-MODUL (Tillitssystem)
 * 
 * Erstatter hardkodede hvitlister med atferdsbasert tillit.
 * 
 * Kjerneprinsipp: Et domene er til å stole på hvis DU har initiert
 * kommunikasjon med det. Har du sendt e-post til noen@dnb.no?
 * Da er dnb.no et tillitsdomene – ikke fordi det står på en liste,
 * men fordi du faktisk bruker det.
 * 
 * Denne modulen definerer LOGIKKEN for tillit.
 * Selve oppslaget mot sendt-historikk gjøres i Gmail-laget (fetcher.js).
 */

/**
 * Beregner tillitsscore basert på korrespondanse-historikk.
 * 
 * @param {object} history - Historikk-data fra Gmail-laget
 * @param {number} history.sentToCount - Antall ganger du har sendt til dette domenet
 * @param {number} history.daysSinceLastSent - Dager siden siste sendte mail til domenet
 * @returns {object} { trustLevel: string, score: number, reason: string }
 */
function calculateTrust(history) {
  // Ingen historikk = ukjent avsender (ikke mistenkelig, bare ukjent)
  if (!history) {
    return { trustLevel: "unknown", score: 0, reason: "Ukjent domene – ingen korrespondanse-historikk" };
  }

  // Høy tillit: Du har sendt e-post til dette domenet nylig
  if (history.sentToCount > 0 && history.daysSinceLastSent < 90) {
    return {
      trustLevel: "high",
      score: -5,
      reason: `Høy tillit: Du har sendt ${history.sentToCount} mail hit, sist for ${history.daysSinceLastSent}d siden (-5)`
    };
  }

  // Middels tillit: Du har sendt e-post, men det var lenge siden
  if (history.sentToCount > 0) {
    return {
      trustLevel: "medium",
      score: -3,
      reason: `Middels tillit: Du har sendt mail hit, men sist for ${history.daysSinceLastSent}d siden (-3)`
    };
  }

  // Ingen tillit: Aldri sendt til dette domenet
  return { trustLevel: "none", score: 0, reason: "Ingen tillit: Du har aldri sendt mail til dette domenet" };
}

/**
 * Sjekker om avsender forsøker å spoofe en kjent kontakt.
 * Hvis visningsnavnet matcher et navn du har sendt mail til,
 * men domenet er feil, er det et sterkt phishing-signal.
 * 
 * @param {string} displayName - Visningsnavnet i From-feltet
 * @param {string} fromDomain - Faktisk avsenderdomene
 * @param {function} lookupNameFn - Funksjon som sjekker om navn finnes i kontakter
 * @returns {object} { isSpoofed: boolean, score: number, reason: string }
 */
function detectNameSpoofing(displayName, fromDomain, lookupNameFn) {
  if (!displayName || !lookupNameFn) {
    return { isSpoofed: false, score: 0, reason: "" };
  }

  const knownContact = lookupNameFn(displayName);

  if (knownContact && knownContact.domain !== fromDomain) {
    return {
      isSpoofed: true,
      score: 5,
      reason: `Navne-spoofing: "${displayName}" hører til ${knownContact.domain}, men mail kom fra ${fromDomain} (+5)`
    };
  }

  return { isSpoofed: false, score: 0, reason: "" };
}

/**
 * Hoved-scoring for trust-modulen.
 * 
 * @param {object} params
 * @param {object} params.history - Korrespondanse-historikk
 * @param {string} params.displayName - Visningsnavn
 * @param {string} params.fromDomain - Avsenderdomene
 * @param {function} params.lookupNameFn - Navne-oppslag (valgfri)
 * @returns {object} { score: number, reasons: string[], trustLevel: string }
 */
function scoreTrust(params) {
  let score = 0;
  const reasons = [];

  const trust = calculateTrust(params.history);
  score += trust.score;
  if (trust.reason) reasons.push(trust.reason);

  if (params.lookupNameFn) {
    const spoof = detectNameSpoofing(params.displayName, params.fromDomain, params.lookupNameFn);
    if (spoof.isSpoofed) {
      score += spoof.score;
      reasons.push(spoof.reason);
    }
  }

  return { score, reasons, trustLevel: trust.trustLevel };
}

// Eksporter
if (typeof module !== "undefined") {
  module.exports = { calculateTrust, detectNameSpoofing, scoreTrust };
}
