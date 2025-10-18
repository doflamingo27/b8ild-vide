import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCalculations } from "@/hooks/useCalculations";
import ExportManager from "@/components/ExportManager";

const Reports = () => {
  const [chantiers, setChantiers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChantiers();
  }, []);

  const loadChantiers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: entreprise } = await supabase
        .from("entreprises")
        .select("id")
        .eq("proprietaire_user_id", user.id)
        .single();

      if (!entreprise) return;

      const { data } = await supabase
        .from("chantiers")
        .select(`
          *,
          devis (montant_ht, montant_ttc, tva),
          factures_fournisseurs (*),
          equipe_chantier (
            membre_id,
            membres_equipe (*)
          ),
          frais_chantier (*)
        `)
        .eq("entreprise_id", entreprise.id)
        .order("created_at", { ascending: false });

      setChantiers(data || []);
    } catch (error) {
      console.error("Error loading chantiers:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black flex items-center gap-2">
          <FileText className="h-8 w-8" />
          Rapports
        </h1>
        <p className="text-muted-foreground mt-1">
          Consultez et exportez vos rapports de chantiers
        </p>
      </div>

      <div className="grid gap-4">
        {loading ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">Chargement...</p>
            </CardContent>
          </Card>
        ) : chantiers.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                Aucun chantier trouvé
              </p>
            </CardContent>
          </Card>
        ) : (
          chantiers.map((chantier) => {
            const membres = chantier.equipe_chantier?.map((ec: any) => ec.membres_equipe) || [];
            const devis = chantier.devis?.[0];
            const factures = chantier.factures_fournisseurs || [];
            const frais = chantier.frais_chantier || [];

            const coutsFixes = factures.reduce((sum: number, f: any) => sum + (f.montant_ht || 0), 0) +
                               frais.reduce((sum: number, f: any) => sum + (f.montant_total || 0), 0);

            const calculations = useCalculations({
              membres,
              budget_devis: devis?.montant_ht || 0,
              couts_fixes: coutsFixes,
              jours_effectifs: chantier.duree_estimee || 0,
            });

            return (
              <Card key={chantier.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{chantier.nom_chantier}</CardTitle>
                      <CardDescription>Client: {chantier.client}</CardDescription>
                    </div>
                    <ExportManager
                      chantierId={chantier.id}
                      chantierData={chantier}
                      membres={membres}
                      devis={devis}
                      factures={factures}
                      frais={frais}
                      calculations={calculations}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Budget</p>
                      <p className="text-lg font-bold">{(devis?.montant_ht || 0).toFixed(2)} €</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Rentabilité</p>
                      <p className="text-lg font-bold">{calculations.rentabilite_pct.toFixed(1)} %</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Jour critique</p>
                      <p className="text-lg font-bold">{calculations.jour_critique.toFixed(1)} j</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Statut</p>
                      <p className={`text-lg font-bold ${
                        calculations.statut === "success" ? "text-green-600" :
                        calculations.statut === "warning" ? "text-yellow-600" :
                        calculations.statut === "alert" ? "text-orange-600" :
                        "text-red-600"
                      }`}>
                        {calculations.statut === "success" ? "Excellent" :
                         calculations.statut === "warning" ? "Bon" :
                         calculations.statut === "alert" ? "Attention" :
                         "Critique"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Reports;
