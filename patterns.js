/**
 * PATTERNS-MODUL
 * 
 * Analyserer strukturelle mønstre i e-postadresser og domener
 * for å oppdage avvik fra normal korrespondanse.
 * 
 * Ingen ord-lister – kun strukturell matematikk.
 */

/**
 * Analyserer subdomene-strukturen til et domene.
 * Legitime domener har sjelden mer enn 2 nivåer (mail.google.com).
 * Phishing-domener bruker dype subdomener for å skjule det ekte domenet
 * (secure.login.google.com.evil-site.xyz).
 * 
 * @param {string} domain - Fullt domenenavn
 * @returns {object} { depth: number, score: number, reason: string }
 */
function analyzeSubdomainDepth(domain) {
  const parts = domain.split(".");
  const depth = parts.length;

  if (depth >= 5) {
    return { depth, score: 4, reason: `Unormal subdomene-dybde: ${depth} nivåer (+4)` };
  }
  if (depth === 4) {
    return { depth, score: 2, reason: `Dyp subdomene-struktur: ${depth} nivåer (+2)` };
  }

  return { depth, score: 0, reason: "" };
}

/**
 * Måler siffer-tetthet i en e-postadresse.
 * Mange sifre i adressen indikerer auto-generert konto.
 * 
 * Returnerer en gradert score basert på ratio, ikke absolutt antall.
 * "user123@mail.com" er normalt, "u8x7k2m9@mail.com" er det ikke.
 * 
 * @param {string} localPart - Delen før @ i e-postadressen
 * @returns {object} { ratio: number, score: number, reason: string }
 */
function analyzeDigitDensity(localPart) {
  if (!localPart || localPart.length === 0) return { ratio: 0, score: 0, reason: "" };

  const digitCount = (localPart.match(/[0-9]/g) || []).length;
  const ratio = digitCount / localPart.length;

  if (ratio > 0.5) {
    return { ratio, score: 3, reason: `Svært høy siffer-tetthet: ${(ratio * 100).toFixed(0)}% (+3)` };
  }
  if (ratio > 0.3) {
    return { ratio, score: 1.5, reason: `Høy siffer-tetthet: ${(ratio * 100).toFixed(0)}% (+1.5)` };
  }

  return { ratio, score: 0, reason: "" };
}

/**
 * Analyserer domenenavnets lengde relativt til TLD.
 * Korte, gjenkjennbare domener (vg.no, dnb.no) er mer
 * troverdige enn lange, komplekse domener.
 * 
 * @param {string} domain - Fullt domenenavn
 * @returns {object} { length: number, score: number, reason: string }
 */
function analyzeDomainLength(domain) {
  // Fjern TLD for å måle den "meningsbærende" delen
  const parts = domain.split(".");
  const meaningful = parts.slice(0, -1).join(".");
  const len = meaningful.length;

  if (len > 30) {
    return { length: len, score: 2, reason: `Uvanlig langt domenenavn: ${len} tegn (+2)` };
  }
  if (len > 20) {
    return { length: len, score: 1, reason: `Langt domenenavn: ${len} tegn (+1)` };
  }

  return { length: len, score: 0, reason: "" };
}

/**
 * Sjekker for bindestreker i domenet.
 * Mange bindestreker er et klassisk mønster for phishing-domener
 * (secure-login-bank-verify.com).
 * 
 * @param {string} domain - Fullt domenenavn
 * @returns {object} { count: number, score: number, reason: string }
 */
function analyzeHyphenUsage(domain) {
  const parts = domain.split(".");
  const meaningful = parts.slice(0, -1).join(".");
  const hyphenCount = (meaningful.match(/-/g) || []).length;

  if (hyphenCount >= 3) {
    return { count: hyphenCount, score: 3, reason: `Mange bindestreker i domene: ${hyphenCount}x (+3)` };
  }
  if (hyphenCount === 2) {
    return { count: hyphenCount, score: 1, reason: `Flere bindestreker i domene: ${hyphenCount}x (+1)` };
  }

  return { count: hyphenCount, score: 0, reason: "" };
}

/**
 * Sjekker om emnet inneholder emoji.
 * Emoji i e-postemner er nesten utelukkende brukt av
 * markedsføringsmail og spam.
 * 
 * @param {string} subject - E-postens emnefelt
 * @returns {object} { hasEmoji: boolean, score: number, reason: string }
 */
function detectEmojiInSubject(subject) {
  if (!subject) return { hasEmoji: false, score: 0, reason: "" };

  const emojiPattern = /\p{Extended_Pictographic}/u;

  if (emojiPattern.test(subject)) {
    return {
      hasEmoji: true,
      score: 3,
      reason: "Emoji i emnefelt – typisk for markedsføring/spam (+3)"
    };
  }

  return { hasEmoji: false, score: 0, reason: "" };
}

/**
 * Hoved-scoring for pattern-modulen.
 * 
 * @param {object} email - Normalisert e-postobjekt
 * @param {string} email.localPart - Delen før @ i avsenderadressen
 * @param {string} email.domain - Fullt avsenderdomene
 * @param {string} email.subject - Emnefelt
 * @returns {object} { score: number, reasons: string[] }
 */
function scorePatterns(email) {
  let score = 0;
  const reasons = [];

  const checks = [
    analyzeSubdomainDepth(email.domain),
    analyzeDigitDensity(email.localPart),
    analyzeDomainLength(email.domain),
    analyzeHyphenUsage(email.domain),
    detectEmojiInSubject(email.subject)
  ];

  for (const check of checks) {
    if (check.score > 0) {
      score += check.score;
      reasons.push(check.reason);
    }
  }

  return { score, reasons };
}

// Eksporter
if (typeof module !== "undefined") {
  module.exports = {
    analyzeSubdomainDepth, analyzeDigitDensity,
    analyzeDomainLength, analyzeHyphenUsage, detectEmojiInSubject, scorePatterns
  };
}
