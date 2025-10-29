export const R = {
  // ✅ ULTRA-TOLÉRANT : capture TOUS les montants près de mots-clés financiers
  HT: /(?:total|montant|sous[\s\-]?total|base).*?([0-9\s\.,]+)\s*€?\s*(?:HT|ht|H\.T\.)?/gi,
  
  // ✅ TVA % : accepter "TVA 20", "TVA: 20%", "T.V.A 20 %"
  TVA_PCT: /T\.?\s?V\.?\s?A\.?\s*[:\-]?\s*(\d{1,2}(?:[,\.]\d{1,2})?)\s*%?/gi,
  
  // ✅ TVA montant : très large
  TVA_AMT: /T\.?\s?V\.?\s?A\.?.*?([0-9\s\.,]+)\s*€?/gi,
  
  // ✅ TTC : accepter "Total 1234.56", "TTC : 1 234,56 €", "Net TTC"
  TTC: /(?:total|montant|net).*?(?:TTC|ttc|T\.T\.C\.)?.*?([0-9\s\.,]+)\s*€?/gi,
  
  // ✅ Net à payer : très large
  NET: /net\s*(?:à|a)?\s*(?:payer)?.*?([0-9\s\.,]+)\s*€?/gi,
  
  SIRET: /\b\d{3}\s?\d{3}\s?\d{3}\s?\d{5}\b/gi,
  SIREN: /\b\d{3}\s?\d{3}\s?\d{3}\b/gi,
  
  // ✅ N° facture : accepter "Facture 12345", "N° 12345", "Ref: ABC-123"
  NUM_FACT: /(?:facture|n[°o]\.?|ref\.?|invoice)\s*[:\-]?\s*([A-Z0-9\-\/]+)/gi,
  
  DATE: /\b([0-3]?\d[\/\-\.][01]?\d[\/\-\.]\d{2,4})\b/g,
  EUR: /€/,
  
  AO_DEADLINE: /date\s*limite.*?([0-3]?\d[\/\-\.][01]?\d[\/\-\.]\d{2,4})/gi,
  AO_CP: /\b(0[1-9]|[1-8]\d|9[0-5])\d{3}\b/g,
  AO_BUDGET: /(?:montant|budget).*?([0-9\s\.,]+)\s*€?/gi,
  AO_REF: /(?:réf\.|référence)\s*[:\-]?\s*([A-Z0-9\-\/]+)/gi,
  AO_ORGA: /(?:organisme|acheteur|maître\s*d['']ouvrage)\s*[:\-]?\s*(.+)/gi,
  FOURNISSEUR: /(?:société|entreprise|SA|SARL|SAS|EURL)\s+([A-Z][A-Za-z\s\-&]+)/gi,
};
