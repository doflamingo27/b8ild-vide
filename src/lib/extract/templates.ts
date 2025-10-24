import { supabase } from '@/integrations/supabase/client';

export type Template = { id:string; fournisseur_nom?:string; siret?:string; anchors:any; };

export async function getTemplateFor(entrepriseId: string, providerKey: {siret?:string|null; nom?:string|null}) {
  const { data } = await supabase
    .from('fournisseurs_templates')
    .select('*')
    .eq('entreprise_id', entrepriseId)
    .or(`siret.eq.${providerKey.siret ?? ''},fournisseur_nom.eq.${providerKey.nom ?? ''}`)
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

export async function upsertTemplate(entrepriseId: string, payload: { fournisseur_nom?:string; siret?:string; anchors:any; field_positions?: any }) {
  const record = {
    entreprise_id: entrepriseId,
    fournisseur_nom: payload.fournisseur_nom || '',
    siret: payload.siret,
    anchors: payload.anchors,
    field_positions: payload.field_positions || {}
  };
  
  await supabase.from('fournisseurs_templates').upsert(record);
}
