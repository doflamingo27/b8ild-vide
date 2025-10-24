import React, { useState } from 'react';
import { extractFromFile } from '@/lib/extract/extractor';
import { saveExtraction } from '@/services/extractionService';
import { v4 as uuid } from 'uuid';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

type Props = {
  module: 'ao'|'factures'|'frais';
  entrepriseId: string;
  onSaved?: (id:string)=>void;
  onResult?: (r:any)=>void;
};

export default function AutoExtractUploader({ module, entrepriseId, onSaved, onResult }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const [extraction, setExtraction] = useState<any>(null);
  const { toast } = useToast();

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setLoading(true); setError(null); setExtraction(null);
    
    try {
      const res = await extractFromFile(f);
      setExtraction(res);
      onResult?.(res);

      // Construire payload & table cible
      const path = `${entrepriseId}/${module}/${uuid()}.${f.name.split('.').pop()}`;
      let table: 'tenders'|'factures_fournisseurs'|'frais_chantier' = 'frais_chantier';
      let payload:any = { 
        extraction_json: res, 
        confiance: res.confidence 
      };

      if (module==='ao') {
        table='tenders';
        payload = {
          ...payload,
          title: res.fields.aoRef ? `AO ${res.fields.aoRef}` : 'Appel d\'offres',
          buyer: res.fields.aoOrga ?? 'Non spécifié',
          city: res.fields.aoVille ?? null,
          postal_code: res.fields.aoCP ?? null,
          deadline: res.fields.aoDeadline ?? null,
          budget_max: res.fields.aoBudget ?? null,
          source: 'Import manuel',
          hash_contenu: res.fields.aoRef ?? null
        };
      } else if (module==='factures') {
        table='factures_fournisseurs';
        payload = {
          ...payload,
          montant_ht: res.fields.ht ?? null,
          tva_pct: res.fields.tvaPct ?? null,
          tva_montant: res.fields.tvaAmt ?? null,
          siret: res.fields.siret ?? null,
          date_facture: res.fields.dateDoc ?? null,
          categorie: 'Autres',
          fournisseur: 'Non spécifié'
        };
      } else {
        table='frais_chantier';
        payload = { 
          ...payload, 
          type_frais:'Autres', 
          montant_total: res.fields.net ?? res.fields.ttc ?? res.fields.ht ?? null 
        };
      }

      // Sauvegarde via RPC (gère RLS)
      const id = await saveExtraction(table, entrepriseId, payload);
      
      toast({
        title: res.confidence >= 0.8 ? "Extraction réussie" : "Extraction partielle",
        description: res.confidence >= 0.8 
          ? "Vérifiez les données extraites et enregistrez."
          : "Quelques champs à confirmer via Fast-Fix.",
      });
      
      onSaved?.(id);
    } catch (e:any) {
      console.error(e);
      const errMsg = e.message || 'Erreur extraction';
      setError(errMsg);
      toast({
        title: "Erreur d'extraction",
        description: errMsg,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors">
        <Input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={onFile}
          disabled={loading}
          className="hidden"
          id="extract-upload"
        />
        <label htmlFor="extract-upload" className="cursor-pointer flex flex-col items-center gap-3">
          {loading ? (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Analyse en cours...</p>
            </>
          ) : (
            <>
              <Upload className="h-12 w-12 text-muted-foreground" />
              <div>
                <p className="font-medium">Cliquez pour uploader</p>
                <p className="text-sm text-muted-foreground">PDF, JPG, PNG (max 20 Mo)</p>
              </div>
            </>
          )}
        </label>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {extraction && extraction.confidence < 0.8 && (
        <Alert className="bg-amber-50 border-amber-200">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <strong>Extraction partielle</strong> — Nous avons prérempli ce que nous avons pu.
            Cliquez "Ouvrir Fast-Fix" pour confirmer en 30 secondes.
          </AlertDescription>
        </Alert>
      )}

      {extraction && extraction.confidence >= 0.8 && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>Extraction réussie !</strong> Vérifiez les données et enregistrez.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
