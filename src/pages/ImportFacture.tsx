import React from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import AutoExtractUploader from '@/components/AutoExtractUploader';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Receipt } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ImportFacturePage() {
  const { user } = useAuth();

  const { data: entreprise } = useQuery({
    queryKey: ['entreprise', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('entreprises')
        .select('id')
        .eq('proprietaire_user_id', user!.id)
        .single();
      return data;
    },
    enabled: !!user
  });

  if (!entreprise) return <DashboardLayout><div>Chargement...</div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto p-6">
        <div className="flex items-center gap-3">
          <Receipt className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Importer une Facture / un Frais</h1>
            <p className="text-sm text-muted-foreground">
              Extraction automatique des montants HT, TVA, TTC, SIRET et date
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Upload Document</CardTitle>
            <CardDescription>
              Téléchargez une facture ou un justificatif de frais
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AutoExtractUploader 
              module="factures" 
              entrepriseId={entreprise.id}
              onSaved={(id) => console.log('Facture saved:', id)}
            />
          </CardContent>
        </Card>

        <div className="bg-muted/50 rounded-lg p-4 text-sm">
          <p className="font-medium mb-2">✨ Extraction automatique :</p>
          <ul className="space-y-1 text-muted-foreground">
            <li>• Montants HT, TVA (%), TVA (€), TTC</li>
            <li>• Numéro de facture et date</li>
            <li>• SIRET du fournisseur</li>
            <li>• Validation automatique des totaux</li>
          </ul>
        </div>
      </div>
    </DashboardLayout>
  );
}
