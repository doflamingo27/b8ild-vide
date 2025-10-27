export type DocType = 'invoice'|'receipt'|'ao'|'table'|'unknown';

export type ExtractionResult = {
  type: DocType;
  rawText: string[];
  fields: {
    ht?: number|null;
    tvaPct?: number|null;
    tvaAmt?: number|null;
    ttc?: number|null;
    net?: number|null;
    siret?: string|null;
    siren?: string|null;
    numFacture?: string|null;
    dateDoc?: string|null;
    currency?: 'EUR'|'OTHER'|null;
    fournisseur?: string|null;
    // AO
    aoDeadline?: string|null;
    aoBudget?: number|null;
    aoRef?: string|null;
    aoOrga?: string|null;
    aoCP?: string|null;
    aoVille?: string|null;
  };
  confidence: number;
  candidates?: Record<string, any>;
  debug?: any;
};
