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
 * Beregner Levenshtein-avstand mellom to strenger.
 * Ren matematikk – måler minimum antall redigeringer (innsetting,
 * sletting, erstatning) for å gjøre den ene strengen til den andre.
 *
 * @param {string} a - Første streng
 * @param {string} b - Andre streng
 * @returns {number} Antall redigeringer
 */
function levenshteinDistance(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = [];

  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = a[j - 1] === b[i - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // sletting
        matrix[i][j - 1] + 1,      // innsetting
        matrix[i - 1][j - 1] + cost // erstatning
      );
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Oppdager om avsender utgir seg for å være deg.
 * Spammere bruker ofte mottakerens eget navn som display name
 * for å bygge falsk tillit, inkludert varianter med endret casing,
 * manglende bokstaver, eller tillagte tegn.
 *
 * Bruker Levenshtein-avstand for fuzzy matching – ren matematikk,
 * ingen hardkodede lister.
 *
 * @param {string} displayName - Avsenderens visningsnavn
 * @param {string} fromAddress - Avsenderens e-postadresse
 * @param {string} userEmail - Brukerens egen e-postadresse (fra config)
 * @returns {object} { isSpoofed: boolean, score: number, reason: string }
 */
function detectSelfSpoofing(displayName, fromAddress, userEmail) {
  if (!userEmail || !displayName) return { isSpoofed: false, score: 0, reason: "" };

  const userLocal = userEmail.split("@")[0].toLowerCase();
  const userDomain = userEmail.split("@")[1].toLowerCase();
  const fromDomain = (fromAddress.split("@")[1] || "").toLowerCase();

  // Hvis mailen kommer fra brukerens eget domene, ignorer
  if (fromDomain === userDomain) return { isSpoofed: false, score: 0, reason: "" };

  // Normaliser for sammenligning (fjern punktum, bindestreker, understrek, mellomrom)
  const normalize = (s) => s.toLowerCase().replace(/[.\-_\s]/g, "");

  const normalizedDisplay = normalize(displayName);
  const normalizedUser = normalize(userLocal);

  // Også sjekk local-part til avsenderadressen
  const fromLocal = normalize(fromAddress.split("@")[0] || "");

  // Beregn avstand for både display name og from local part
  const displayDistance = levenshteinDistance(normalizedDisplay, normalizedUser);
  const fromLocalDistance = levenshteinDistance(fromLocal, normalizedUser);
  const minDistance = Math.min(displayDistance, fromLocalDistance);
  const matchedOn = displayDistance <= fromLocalDistance ? displayName : fromAddress.split("@")[0];

  // Eksakt match
  if (minDistance === 0) {
    return {
      isSpoofed: true,
      score: 5,
      reason: `Avsender utgir seg for å være deg: "${matchedOn}" fra ${fromDomain} (+5)`
    };
  }

  // Nært match (1-2 redigeringer) – typosquatting
  if (minDistance <= 2 && normalizedUser.length >= 4) {
    return {
      isSpoofed: true,
      score: 4,
      reason: `Avsender ligner ditt brukernavn: "${matchedOn}" (avstand: ${minDistance}) fra ${fromDomain} (+4)`
    };
  }

  // Display name inneholder brukernavnet
  if (normalizedDisplay.includes(normalizedUser) && normalizedUser.length >= 4) {
    return {
      isSpoofed: true,
      score: 3,
      reason: `Avsendernavn inneholder ditt brukernavn: "${displayName}" fra ${fromDomain} (+3)`
    };
  }

  return { isSpoofed: false, score: 0, reason: "" };
}

/**
 * Hoved-scoring for pattern-modulen.
 * 
 * @param {object} email - Normalisert e-postobjekt
 * @param {string} email.localPart - Delen før @ i avsenderadressen
 * @param {string} email.domain - Fullt avsenderdomene
 * @param {string} email.subject - Emnefelt
 * @param {string} [email.displayName] - Visningsnavn fra From-feltet
 * @param {string} [email.fromAddress] - Full e-postadresse
 * @param {string} [email.userEmail] - Brukerens egen e-postadresse
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
    detectEmojiInSubject(email.subject),
    detectSelfSpoofing(email.displayName || "", email.fromAddress || "", email.userEmail || null)
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
    analyzeDomainLength, analyzeHyphenUsage, detectEmojiInSubject,
    levenshteinDistance, detectSelfSpoofing, scorePatterns
  };
}
