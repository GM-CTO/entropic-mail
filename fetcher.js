/**
 * FETCHER (Gmail → Engine bro)
 * 
 * Henter e-postdata fra Gmail API og normaliserer det til
 * formatet som scoring-motoren forventer.
 * 
 * Denne filen er det ENESTE stedet som snakker med Gmail API.
 * Alt den gjør er å oversette Gmail-objekter til engine-format.
 */

/**
 * Bygger et NormalizedEmail-objekt fra en Gmail-melding.
 * 
 * @param {GmailMessage} message - Gmail message-objekt
 * @returns {NormalizedEmail} Normalisert e-post klar for scoring
 */
function normalizeMessage(message) {
  const fromRaw = message.getFrom();
  const subject = message.getSubject() || "";

  // Parse avsenderadresse og visningsnavn
  const addrMatch = fromRaw.match(/<([^>]+)>/);
  const fromAddress = addrMatch ? addrMatch[1].trim().toLowerCase() : fromRaw.trim().toLowerCase();
  const nameMatch = fromRaw.match(/^([^<]*)</);
  const displayName = nameMatch ? nameMatch[1].replace(/"/g, "").trim() : "";
  
  const [localPart, domain] = fromAddress.split("@");

  // Hent relevante headere
  const headers = {
    returnPath: safeGetHeader(message, "Return-Path"),
    inReplyTo: safeGetHeader(message, "In-Reply-To"),
    references: safeGetHeader(message, "References"),
    listUnsubscribe: safeGetHeader(message, "List-Unsubscribe"),
    received: safeGetHeader(message, "Received")
  };

  // Bygg trust-historikk
  const trustHistory = lookupTrustHistory(domain);

  return {
    fromAddress,
    localPart: localPart || "",
    domain: domain || "",
    displayName,
    subject,
    headers,
    trustHistory,
    lookupNameFn: null  // TODO: Implementer kontaktbok-oppslag
  };
}

/**
 * Henter en header fra en Gmail-melding uten å krasje.
 * 
 * @param {GmailMessage} message
 * @param {string} headerName
 * @returns {string}
 */
function safeGetHeader(message, headerName) {
  try {
    return message.getHeader(headerName) || "";
  } catch (e) {
    return "";
  }
}

/**
 * Slår opp korrespondanse-historikk for et domene.
 * Bruker Gmail sin søkefunksjon for å finne ut om brukeren
 * har sendt mail til eller svart på mail fra dette domenet.
 * 
 * Resultatene caches for å unngå å kjøre samme søk gjentatte ganger.
 * 
 * @param {string} domain - Domenet som skal sjekkes
 * @returns {object|null} Trust-historikk objekt
 */
function lookupTrustHistory(domain) {
  // Bruk cache for å unngå gjentatte søk i samme kjøring
  if (!lookupTrustHistory._cache) {
    lookupTrustHistory._cache = {};
  }

  if (lookupTrustHistory._cache[domain] !== undefined) {
    return lookupTrustHistory._cache[domain];
  }

  try {
    // Søk etter sendte mails til dette domenet
    const sentThreads = GmailApp.search(`in:sent to:@${domain}`, 0, 5);
    const sentToCount = sentThreads.length;

    // Finn siste sendte dato
    let daysSinceLastSent = 9999;
    if (sentToCount > 0) {
      const lastSentDate = sentThreads[0].getLastMessageDate();
      daysSinceLastSent = Math.floor((new Date() - lastSentDate) / (1000 * 60 * 60 * 24));
    }

    // Søk etter mottatte mails fra domenet
    const receivedThreads = GmailApp.search(`from:@${domain}`, 0, 5);
    const receivedFromCount = receivedThreads.length;

    // Sjekk om vi har svart på noen av dem
    let hasRepliedTo = false;
    if (receivedFromCount > 0 && sentToCount > 0) {
      hasRepliedTo = true;
    }

    const result = {
      sentToCount,
      receivedFromCount,
      hasRepliedTo,
      daysSinceLastSent
    };

    lookupTrustHistory._cache[domain] = result;
    return result;

  } catch (e) {
    console.log(`Trust-oppslag feilet for ${domain}: ${e.message}`);
    lookupTrustHistory._cache[domain] = null;
    return null;
  }
}
