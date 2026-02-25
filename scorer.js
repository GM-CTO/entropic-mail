/**
 * ENTROPIC MAIL – SCORER (Hovedmotor)
 * 
 * Koordinerer alle scoring-moduler og returnerer en samlet vurdering.
 * 
 * Denne filen er "hjernen" – den vet ingenting om Gmail, IMAP, eller
 * andre e-postsystemer. Den tar inn et normalisert objekt og returnerer
 * en score med full forklaring.
 * 
 * Arkitektur:
 *   E-postklient → Fetcher (normaliserer) → Scorer (vurderer) → Actions (handler)
 */

/**
 * Normalisert e-post-format som scorer forventer.
 * Gmail-laget (fetcher.js) er ansvarlig for å bygge dette objektet.
 * 
 * @typedef {object} NormalizedEmail
 * @property {string} fromAddress - Full e-postadresse (lowercase)
 * @property {string} localPart - Delen før @
 * @property {string} domain - Fullt domenenavn
 * @property {string} displayName - Visningsnavn fra From-feltet
 * @property {string} subject - Emnefelt (original, ikke normalisert)
 * @property {object} headers - Relevante headere
 * @property {string} headers.returnPath - Return-Path
 * @property {string} headers.inReplyTo - In-Reply-To
 * @property {string} headers.references - References
 * @property {string} headers.listUnsubscribe - List-Unsubscribe
 * @property {string} headers.received - Sammensatte Received-headere
 * @property {object|null} trustHistory - Korrespondanse-historikk (fra Gmail-laget)
 * @property {function|null} lookupNameFn - Navne-oppslag funksjon (valgfri)
 */

// Standardverdier for konfigurasjonen
const DEFAULT_CONFIG = {
  threshold: 5,        // Poenggrense for å klassifisere som spam
  warningZone: 3,      // Poeng over dette = faresone (men ikke drept)
  userEmail: null,      // Brukerens e-post (for self-spoofing-deteksjon)

  // Modul-vekter (multiplikatorer for å justere aggressivitet)
  weights: {
    entropy: 1.0,
    headers: 1.0,
    patterns: 1.0,
    trust: 1.0
  }
};

/**
 * Hovedfunksjon: Scorer en e-post og returnerer en komplett vurdering.
 * 
 * @param {NormalizedEmail} email - Normalisert e-postobjekt
 * @param {object} config - Konfigurasjon (valgfri, bruker defaults)
 * @returns {object} Komplett vurdering med score, handling og forklaring
 */
function scoreEmail(email, config) {
  const cfg = { ...DEFAULT_CONFIG, ...config, weights: { ...DEFAULT_CONFIG.weights, ...(config || {}).weights } };

  const results = {
    entropy: { score: 0, reasons: [] },
    headers: { score: 0, reasons: [] },
    patterns: { score: 0, reasons: [] },
    trust: { score: 0, reasons: [], trustLevel: "unknown" }
  };

  // Kjør entropy-modul
  results.entropy = scoreEntropy(email.domain, email.subject);
  results.entropy.score *= cfg.weights.entropy;

  // Kjør headers-modul
  results.headers = scoreHeaders({
    subject: email.subject,
    fromDomain: email.domain,
    returnPath: email.headers.returnPath,
    inReplyTo: email.headers.inReplyTo,
    references: email.headers.references,
    listUnsubscribe: email.headers.listUnsubscribe,
    received: email.headers.received
  });
  results.headers.score *= cfg.weights.headers;

  // Kjør patterns-modul
  results.patterns = scorePatterns({
    localPart: email.localPart,
    domain: email.domain,
    subject: email.subject,
    displayName: email.displayName,
    fromAddress: email.fromAddress,
    userEmail: cfg.userEmail || null
  });
  results.patterns.score *= cfg.weights.patterns;

  // Kjør trust-modul
  results.trust = scoreTrust({
    history: email.trustHistory,
    displayName: email.displayName,
    fromDomain: email.domain,
    lookupNameFn: email.lookupNameFn || null
  });
  results.trust.score *= cfg.weights.trust;

  // Beregn totalscore
  const totalScore = results.entropy.score + results.headers.score + 
                     results.patterns.score + results.trust.score;

  // Samle alle reasons
  const allReasons = [
    ...results.entropy.reasons,
    ...results.headers.reasons,
    ...results.patterns.reasons,
    ...results.trust.reasons
  ];

  // Bestem handling
  let action, label;
  if (totalScore >= cfg.threshold) {
    action = "KILL";
    label = "Drept";
  } else if (totalScore >= cfg.warningZone) {
    action = "WARN";
    label = "Faresone";
  } else {
    action = "PASS";
    label = "OK";
  }

  return {
    action,
    label,
    totalScore: Math.round(totalScore * 10) / 10,
    threshold: cfg.threshold,
    trustLevel: results.trust.trustLevel,
    
    // Moduldetaljer (for logging/debugging/dashboard)
    modules: {
      entropy: results.entropy.score,
      headers: results.headers.score,
      patterns: results.patterns.score,
      trust: results.trust.score
    },
    
    reasons: allReasons,
    
    // Menneskelesbar oppsummering
    summary: `${label} (${Math.round(totalScore * 10) / 10}p) – ${allReasons.length > 0 ? allReasons.join(" | ") : "Ingen funn"}`
  };
}

// Eksporter
if (typeof module !== "undefined") {
  module.exports = { scoreEmail, DEFAULT_CONFIG };
}
