export type TableMap = { libelle:string; qte:string; pu:string; total:string; };

export function inferTableColumns(headers: string[]): Partial<TableMap> {
  const h = headers.map(x => x.toLowerCase());
  function find(...alts:string[]) { 
    const idx = h.findIndex(v => alts.some(a => v.includes(a)));
    return idx >= 0 ? headers[idx] : undefined;
  }
  return {
    libelle: find('désignation','designation','libell','article'),
    qte:     find('qte','quantité','quantite'),
    pu:      find('pu','prix unitaire','prix ht'),
    total:   find('total','montant'),
  };
}
