import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, Building, Receipt, Users, DollarSign, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ChantierFinances {
  id: string;
  nom_chantier: string;
  client: string;
  budget_ht: number;
  total_factures: number;
  total_frais: number;
  total_equipe: number;
  marge: number;
  rentabilite_pct: number;
  statut: string;
}

const FinancialManagement = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [chantiers, setChantiers] = useState<ChantierFinances[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadFinancialData();
    }
  }, [user]);

  const loadFinancialData = async () => {
    try {
      setLoading(true);

      // Récupérer l'entreprise
      const { data: entreprise } = await supabase
        .from('entreprises')
        .select('id')
        .eq('proprietaire_user_id', user?.id)
        .single();

      if (!entreprise) return;

      // Récupérer tous les chantiers avec leurs métriques
      const { data: chantiersData } = await supabase
        .from('chantiers')
        .select(`
          id,
          nom_chantier,
          client,
          budget_ht,
          statut
        `)
        .eq('entreprise_id', entreprise.id);

      if (!chantiersData) return;

      // Pour chaque chantier, calculer les totaux
      const chantiersWithFinances = await Promise.all(
        chantiersData.map(async (chantier) => {
          // Total factures
          const { data: factures } = await supabase
            .from('factures_fournisseurs')
            .select('montant_ht')
            .eq('chantier_id', chantier.id);
          const total_factures = factures?.reduce((sum, f) => sum + Number(f.montant_ht || 0), 0) || 0;

          // Total frais
          const { data: frais } = await supabase
            .from('frais_chantier')
            .select('montant_total')
            .eq('chantier_id', chantier.id);
          const total_frais = frais?.reduce((sum, f) => sum + Number(f.montant_total || 0), 0) || 0;

          // Total équipe (calculé à partir des jours travaillés et taux des membres)
          const { data: equipe } = await supabase
            .from('equipe_chantier')
            .select('jours_travailles, membres_equipe(taux_horaire)')
            .eq('chantier_id', chantier.id);
          
          const total_equipe = equipe?.reduce((sum, e) => {
            const jours = Number(e.jours_travailles || 0);
            const tauxHoraire = Number(e.membres_equipe?.taux_horaire || 0);
            // Estimation : 8h par jour
            const coutJournalier = tauxHoraire * 8;
            return sum + (jours * coutJournalier);
          }, 0) || 0;

          const couts_totaux = total_factures + total_frais + total_equipe;
          const budget = Number(chantier.budget_ht || 0);
          const marge = budget - couts_totaux;
          const rentabilite_pct = budget > 0 ? (marge / budget) * 100 : 0;

          let statut = 'success';
          if (rentabilite_pct < 0) statut = 'danger';
          else if (rentabilite_pct < 10) statut = 'alert';
          else if (rentabilite_pct < 20) statut = 'warning';

          return {
            id: chantier.id,
            nom_chantier: chantier.nom_chantier,
            client: chantier.client,
            budget_ht: budget,
            total_factures,
            total_frais,
            total_equipe,
            marge,
            rentabilite_pct,
            statut,
          };
        })
      );

      setChantiers(chantiersWithFinances);
    } catch (error) {
      console.error("Erreur chargement données financières:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (statut: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      success: "default",
      warning: "secondary",
      alert: "outline",
      danger: "destructive",
    };
    
    const labels: Record<string, string> = {
      success: "Excellent",
      warning: "Bon",
      alert: "Attention",
      danger: "Déficit",
    };

    return <Badge variant={variants[statut]}>{labels[statut]}</Badge>;
  };

  // Calculs globaux
  const totalBudget = chantiers.reduce((sum, c) => sum + c.budget_ht, 0);
  const totalCouts = chantiers.reduce((sum, c) => sum + c.total_factures + c.total_frais + c.total_equipe, 0);
  const margeGlobale = totalBudget - totalCouts;
  const rentabiliteGlobale = totalBudget > 0 ? (margeGlobale / totalBudget) * 100 : 0;

  if (loading) {
    return (
      <div className="space-y-8 animate-fade-up">
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-black text-gradient-primary flex items-center gap-3">
            <DollarSign className="h-9 w-9 text-primary" />
            Gestion financière
          </h1>
        </div>
        <Card className="card-premium">
          <CardContent className="pt-16 pb-16 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent mx-auto mb-4"></div>
            <p className="text-muted-foreground text-lg font-medium">Chargement des données financières...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black text-gradient-primary flex items-center gap-3">
            <DollarSign className="h-9 w-9 text-primary" />
            Gestion financière
          </h1>
          <p className="text-muted-foreground text-lg mt-2">
            Vue d'ensemble de la santé financière de tous vos chantiers
          </p>
        </div>
      </div>

      {/* KPIs Globaux */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="card-premium">
          <CardHeader>
            <CardDescription>Budget Total</CardDescription>
            <CardTitle className="text-3xl font-black text-primary">
              {totalBudget.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="card-premium">
          <CardHeader>
            <CardDescription>Coûts Totaux</CardDescription>
            <CardTitle className="text-3xl font-black text-orange-600">
              {totalCouts.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="card-premium">
          <CardHeader>
            <CardDescription>Marge Globale</CardDescription>
            <CardTitle className={`text-3xl font-black ${margeGlobale >= 0 ? 'text-green-600' : 'text-destructive'}`}>
              {margeGlobale.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="card-premium">
          <CardHeader>
            <CardDescription>Rentabilité Globale</CardDescription>
            <CardTitle className={`text-3xl font-black ${rentabiliteGlobale >= 0 ? 'text-green-600' : 'text-destructive'}`}>
              {rentabiliteGlobale.toFixed(1)} %
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Tableau des chantiers */}
      <Card className="card-premium">
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="h-14 bg-muted/50 p-1">
            <TabsTrigger value="all" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
              Tous les chantiers ({chantiers.length})
            </TabsTrigger>
            <TabsTrigger value="profitable" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
              Rentables ({chantiers.filter(c => c.rentabilite_pct >= 0).length})
            </TabsTrigger>
            <TabsTrigger value="risk" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
              À risque ({chantiers.filter(c => c.rentabilite_pct < 0).length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            <CardContent>
              {chantiers.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Chantier</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead className="text-right">Budget HT</TableHead>
                      <TableHead className="text-right">Factures</TableHead>
                      <TableHead className="text-right">Frais</TableHead>
                      <TableHead className="text-right">Équipe</TableHead>
                      <TableHead className="text-right">Marge</TableHead>
                      <TableHead className="text-right">Rentabilité</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {chantiers.map((chantier) => (
                      <TableRow key={chantier.id}>
                        <TableCell className="font-semibold">{chantier.nom_chantier}</TableCell>
                        <TableCell className="text-muted-foreground">{chantier.client}</TableCell>
                        <TableCell className="text-right font-mono">{chantier.budget_ht.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</TableCell>
                        <TableCell className="text-right font-mono text-orange-600">{chantier.total_factures.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</TableCell>
                        <TableCell className="text-right font-mono text-orange-600">{chantier.total_frais.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</TableCell>
                        <TableCell className="text-right font-mono text-orange-600">{chantier.total_equipe.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</TableCell>
                        <TableCell className={`text-right font-mono font-semibold ${chantier.marge >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                          {chantier.marge.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                        </TableCell>
                        <TableCell className={`text-right font-mono font-semibold ${chantier.rentabilite_pct >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                          {chantier.rentabilite_pct.toFixed(1)} %
                        </TableCell>
                        <TableCell>{getStatusBadge(chantier.statut)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => navigate(`/projects/${chantier.id}`)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-16">
                  <Building className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <p className="text-xl font-semibold text-muted-foreground mb-2">
                    Aucun chantier pour le moment
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Créez votre premier chantier pour commencer le suivi financier
                  </p>
                </div>
              )}
            </CardContent>
          </TabsContent>

          <TabsContent value="profitable" className="mt-6">
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Chantier</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead className="text-right">Budget HT</TableHead>
                    <TableHead className="text-right">Marge</TableHead>
                    <TableHead className="text-right">Rentabilité</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {chantiers.filter(c => c.rentabilite_pct >= 0).map((chantier) => (
                    <TableRow key={chantier.id}>
                      <TableCell className="font-semibold">{chantier.nom_chantier}</TableCell>
                      <TableCell className="text-muted-foreground">{chantier.client}</TableCell>
                      <TableCell className="text-right font-mono">{chantier.budget_ht.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</TableCell>
                      <TableCell className="text-right font-mono font-semibold text-green-600">
                        {chantier.marge.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold text-green-600">
                        {chantier.rentabilite_pct.toFixed(1)} %
                      </TableCell>
                      <TableCell>{getStatusBadge(chantier.statut)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/projects/${chantier.id}`)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </TabsContent>

          <TabsContent value="risk" className="mt-6">
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Chantier</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead className="text-right">Budget HT</TableHead>
                    <TableHead className="text-right">Marge</TableHead>
                    <TableHead className="text-right">Rentabilité</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {chantiers.filter(c => c.rentabilite_pct < 0).map((chantier) => (
                    <TableRow key={chantier.id}>
                      <TableCell className="font-semibold">{chantier.nom_chantier}</TableCell>
                      <TableCell className="text-muted-foreground">{chantier.client}</TableCell>
                      <TableCell className="text-right font-mono">{chantier.budget_ht.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</TableCell>
                      <TableCell className="text-right font-mono font-semibold text-destructive">
                        {chantier.marge.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold text-destructive">
                        {chantier.rentabilite_pct.toFixed(1)} %
                      </TableCell>
                      <TableCell>{getStatusBadge(chantier.statut)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/projects/${chantier.id}`)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default FinancialManagement;
