/**
 * ENTROPY-MODUL
 * 
 * Analyserer domenenavn med informasjonsteori for å oppdage
 * maskingenererte eller mistenkelige domener.
 * 
 * Prinsipp: Legitime domener (dnb.no, vg.no) har lav entropi og
 * gjenkjennbare mønstre. Spam-domener (xk7q-deals99.xyz) har høy
 * entropi fordi de er tilfeldig generert.
 * 
 * Ingen hardkoding – kun matematikk.
 */

/**
 * Beregner Shannon-entropi for en tekststreng.
 * Høyere verdi = mer tilfeldighet/kaos i strengen.
 * 
 * @param {string} str - Strengen som skal analyseres
 * @returns {number} Entropi-verdi (0 = helt uniform, ~4.5+ = høy tilfeldighet)
 */
function shannonEntropy(str) {
  if (!str || str.length === 0) return 0;

  const freq = {};
  for (const char of str) {
    freq[char] = (freq[char] || 0) + 1;
  }

  const len = str.length;
  let entropy = 0;

  for (const count of Object.values(freq)) {
    const p = count / len;
    if (p > 0) {
      entropy -= p * Math.log2(p);
    }
  }

  return Math.round(entropy * 1000) / 1000;
}

/**
 * Teller antall unike tegnsett i en streng.
 * Blanding av tegnsett (latin + kyrillisk) er et sterkt spam-signal.
 * 
 * @param {string} str - Strengen som skal analyseres
 * @returns {object} { count: antall tegnsett, sets: liste over tegnsett funnet }
 */
function characterSetMix(str) {
  const sets = new Set();

  for (const char of str) {
    const code = char.codePointAt(0);
    if (code >= 0x0041 && code <= 0x007A) sets.add("latin");
    else if (code >= 0x0400 && code <= 0x04FF) sets.add("cyrillic");
    else if (code >= 0x4E00 && code <= 0x9FFF) sets.add("cjk");
    else if (code >= 0x0600 && code <= 0x06FF) sets.add("arabic");
    else if (code >= 0x0370 && code <= 0x03FF) sets.add("greek");
    else if (code >= 0x0030 && code <= 0x0039) sets.add("digits");
    else if (code >= 0x2000 && code <= 0x206F) sets.add("invisible-formatting");
    else if (code >= 0x200B && code <= 0x200D) sets.add("zero-width");
  }

  return { count: sets.size, sets: Array.from(sets) };
}

/**
 * Oppdager usynlige Unicode-tegn som brukes for å omgå filtre.
 * Zero-width spaces, joiners osv. har ingen legitim bruk i e-postemner.
 * 
 * @param {string} str - Strengen som skal sjekkes
 * @returns {object} { found: boolean, count: antall, types: hvilke typer }
 */
function invisibleCharacters(str) {
  const invisible = {
    "\\u200B": "zero-width space",
    "\\u200C": "zero-width non-joiner",
    "\\u200D": "zero-width joiner",
    "\\uFEFF": "byte order mark",
    "\\u00AD": "soft hyphen",
    "\\u034F": "combining grapheme joiner",
    "\\u2060": "word joiner",
    "\\u2062": "invisible times",
    "\\u2063": "invisible separator"
  };

  const found = [];
  let count = 0;

  for (const char of str) {
    const escaped = "\\u" + char.codePointAt(0).toString(16).padStart(4, "0");
    if (invisible[escaped]) {
      count++;
      if (!found.includes(invisible[escaped])) {
        found.push(invisible[escaped]);
      }
    }
  }

  return { found: count > 0, count, types: found };
}

/**
 * Hoved-scoring for entropi-modulen.
 * Tar inn et domene og returnerer en score med forklaring.
 * 
 * @param {string} domain - Fullt domenenavn (f.eks. "mail.example.com")
 * @param {string} subject - E-postens emnefelt
 * @returns {object} { score: number, reasons: string[] }
 */
function scoreEntropy(domain, subject) {
  let score = 0;
  const reasons = [];

  // 1. Domene-entropi
  const domainBase = domain.split(".").slice(0, -1).join(".");
  const entropy = shannonEntropy(domainBase);

  if (entropy > 4.0) {
    score += 4;
    reasons.push(`Svært høy domene-entropi: ${entropy} (+4)`);
  } else if (entropy > 3.5) {
    score += 2;
    reasons.push(`Høy domene-entropi: ${entropy} (+2)`);
  }

  // 2. Tegnsett-blanding i domene
  const charMix = characterSetMix(domain);
  if (charMix.count > 2) {
    score += 3;
    reasons.push(`Tegnsett-blanding i domene: ${charMix.sets.join(", ")} (+3)`);
  }

  // 3. Usynlige tegn i emne
  const invisibles = invisibleCharacters(subject || "");
  if (invisibles.found) {
    score += 3;
    reasons.push(`Usynlige tegn i emne: ${invisibles.count}x ${invisibles.types.join(", ")} (+3)`);
  }

  // 4. Tegnsett-blanding i emne (homoglyfangrep)
  const subjectMix = characterSetMix(subject || "");
  if (subjectMix.sets.includes("cyrillic") && subjectMix.sets.includes("latin")) {
    score += 4;
    reasons.push(`Homoglyf-mistanke: Latin+kyrillisk i emne (+4)`);
  }

  return { score, reasons };
}

// Eksporter for bruk i andre moduler
if (typeof module !== "undefined") {
  module.exports = { shannonEntropy, characterSetMix, invisibleCharacters, scoreEntropy };
}
