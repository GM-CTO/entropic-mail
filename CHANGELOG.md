# Changelog

Alle endringer i prosjektet dokumenteres her.
Formatet er basert på [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Nytt
- Prosjektet heter nå **Entropic Mail** (entropi + Anthropic)
- Prosjektstruktur med separasjon mellom engine og Gmail-integrasjon
- Entropy-modul for domeneanalyse (Shannon-entropi)
- Header-anomali-deteksjon (Return-Path mismatch, falske replies)
- Pattern-modul (subdomene-dybde, siffer-tetthet, generisk prefix)
- Tillitssystem basert på sendt-historikk (erstatter hardkodede hvitlister)

### Fjernet
- Alle hardkodede domene-hvitlister
- Alle hardkodede ord-svartelister
- Hardkodet TLD-blokkering
- Statiske trigger-ord med flat scoring

## [3.3.0] - 2025 (Legacy)

Siste versjon av det originale Google Apps Script-filteret med hybrid tilnærming
(hardkodede lister + noe atferdsanalyse). Arkivert som referanse i `legacy/`.
