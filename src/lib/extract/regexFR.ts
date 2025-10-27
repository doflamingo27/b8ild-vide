export const R = {
  // Plus tolérant : capture "HT", "H.T.", "Base HT", "Total HT", "Montant HT", etc.
  HT: /(?:base|total|montant|sous[\s\-]?total)?\s*h[\.\s]?t\.?\s*[:\-]?\s*([0-9\s\.,]+)\s*€?/gi,
  
  // Capture TVA 20%, 20 %, 20.00%, etc.
  TVA_PCT: /t\.?v\.?a\.?\s*[:\-]?\s*(\d{1,2}(?:[,\.]\d{1,2})?)\s*%/gi,
  
  // TVA avec ou sans parenthèses
  TVA_AMT: /(?:montant\s+)?t\.?v\.?a\.?\s*(?:\([^)]*\))?\s*[:\-]?\s*([0-9\s\.,]+)\s*€?/gi,
  
  // TTC avec variations
  TTC: /(?:total|montant|net)?\s*t\.?t\.?c\.?\s*[:\-]?\s*([0-9\s\.,]+)\s*€?/gi,
  
  // Net à payer avec variations orthographiques
  NET: /net\s*(?:à|a)\s*payer\s*[:\-]?\s*([0-9\s\.,]+)\s*€?/gi,
  
  // SIRET et SIREN inchangés
  SIRET: /\b\d{3}\s?\d{3}\s?\d{3}\s?\d{5}\b/gi,
  SIREN: /\b\d{3}\s?\d{3}\s?\d{3}\b/gi,
  
  // Numéro de facture plus tolérant
  NUM_FACT: /(?:facture|n[°o]\.?|invoice)\s*[:\-]?\s*([A-Z0-9\-\/]+)/gi,
  
  // Date avec plus de formats
  DATE: /\b([0-3]?\d[\/\-\.][01]?\d[\/\-\.]\d{2,4})\b/g,
  
  EUR: /€|EUR|euro/gi,
  
  // AO - Patterns améliorés
  AO_DEADLINE: /(?:date\s*limite|date\s*de\s*remise|échéance).*?([0-3]?\d[\/\-][01]?\d[\/\-]\d{2,4})/gi,
  
  AO_CP: /\b(0[1-9]|[1-8]\d|9[0-5])\d{3}\b/g,
  
  AO_BUDGET: /(?:montant|budget|estimation).*?([0-9\s\.,]+)\s*€?/gi,
  
  AO_REF: /(?:réf(?:érence)?|n[°o])\.?\s*[:\-]?\s*([A-Z0-9\-\/]+)/gi,
  
  AO_ORGA: /(?:organisme|acheteur|maître\s+d['']ouvrage)\s*[:\-]?\s*([^\n]+)/gi,
  
  // Nouveau : Nom du fournisseur (ligne avant SIRET généralement)
  FOURNISSEUR: /(?:société|entreprise|sa|sarl|sas|eurl)\s+([A-Z][A-Za-z\s\-&]+)/gi,
};
