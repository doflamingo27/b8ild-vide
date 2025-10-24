import { supabase } from '@/integrations/supabase/client';

export async function saveExtraction(
  table: 'factures_fournisseurs'|'frais_chantier'|'tenders',
  entrepriseId: string,
  payload: any
) {
  const { data, error } = await supabase.rpc('insert_extraction_service', {
    p_table: table,
    p_data: payload,
    p_entreprise_id: entrepriseId
  });
  if (error) throw error;
  return data;
}
