import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, TrendingDown, Calendar, Users, 
  FileText, Receipt, DollarSign, Download, CheckCircle2, XCircle 
} from "lucide-react";
import { getRentabilityBadge } from "@/lib/rentabilityBadge";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useToast } from "@/hooks/use-toast";

interface ChantierBilanProps {
  chantierData: any;
  metrics: any;
  membres: any[];
  devis: any[];
  factures: any[];
  frais: any[];
  dateFinReelle: string;
}

const ChantierBilan = ({
  chantierData,
  metrics,
  membres,
  devis,
  factures,
  frais,
  dateFinReelle,
}: ChantierBilanProps) => {
  const { toast } = useToast();
  const rentabilityBadge = getRentabilityBadge(metrics?.marge_finale_pct || 0);
  const devisActif = devis.find(d => d.actif);

  // Calculs
  const budgetInitial = metrics?.budget_ht || 0;
  const coutTotal = (metrics?.cout_main_oeuvre_reel || 0) + (metrics?.couts_fixes_engages || 0);
  const margeRealisee = budgetInitial - coutTotal;
  const ecartBudget = budgetInitial - coutTotal;

  // Durée
  const dureeEstimee = chantierData.duree_estimee_jours || chantierData.duree_estimee || 0;
  const dateDebut = new Date(chantierData.date_debut_prevue || chantierData.date_debut_reelle);
  const dateFin = new Date(dateFinReelle);
  const dureeReelle = Math.ceil((dateFin.getTime() - dateDebut.getTime()) / (1000 * 60 * 60 * 24));
  const ecartJours = dureeReelle - dureeEstimee;

  // Export PDF du bilan
  const exportBilanPDF = () => {
    try {
      const doc = new jsPDF();
      let currentY = 20;

      // Header
      doc.setFillColor(234, 88, 12);
      doc.rect(0, 0, 210, 45, 'F');
      
      doc.setFontSize(32);
      doc.setTextColor(255, 255, 255);
      doc.setFont(undefined, 'bold');
      doc.text("B8ILD", 20, 25);
      
      doc.setFontSize(18);
      doc.text("Bilan de Clôture", 20, 37);
      
      doc.setFontSize(10);
      doc.text(new Date().toLocaleDateString('fr-FR'), 150, 37);
      
      currentY = 55;

      // Informations générales
      doc.setFillColor(245, 245, 245);
      doc.roundedRect(15, currentY, 180, 38, 3, 3, 'F');
      
      doc.setFontSize(14);
      doc.setTextColor(234, 88, 12);
      doc.setFont(undefined, 'bold');
      doc.text("Informations du chantier", 20, currentY + 8);
      
      doc.setFontSize(11);
      doc.setTextColor(60, 60, 60);
      doc.setFont(undefined, 'normal');
      doc.text(`Chantier: ${chantierData.nom_chantier}`, 20, currentY + 16);
      doc.text(`Client: ${chantierData.client}`, 20, currentY + 23);
      doc.text(`Adresse: ${chantierData.adresse || "Non renseignée"}`, 20, currentY + 30);
      doc.text(`Période: ${dateDebut.toLocaleDateString('fr-FR')} → ${dateFin.toLocaleDateString('fr-FR')}`, 20, currentY + 37);
      
      currentY += 48;

      // Badge de rentabilité
      doc.setFontSize(14);
      doc.setTextColor(234, 88, 12);
      doc.setFont(undefined, 'bold');
      doc.text("Rentabilité Finale", 20, currentY);
      
      currentY += 8;
      
      const badgeColor = rentabilityBadge.urgency === 'critical' || rentabilityBadge.urgency === 'high' 
        ? [244, 67, 54] : rentabilityBadge.urgency === 'medium' 
        ? [255, 152, 0] : [76, 175, 80];
      
      doc.setFillColor(badgeColor[0], badgeColor[1], badgeColor[2]);
      doc.roundedRect(15, currentY, 180, 20, 2, 2, 'F');
      
      doc.setFontSize(16);
      doc.setTextColor(255, 255, 255);
      doc.setFont(undefined, 'bold');
      doc.text(`${rentabilityBadge.emoji} ${rentabilityBadge.label}`, 20, currentY + 8);
      doc.text(`${(metrics?.marge_finale_pct || 0).toFixed(1)}%`, 150, currentY + 8);
      
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      doc.text(rentabilityBadge.message, 20, currentY + 16);
      
      currentY += 30;

      // Synthèse financière
      doc.setFontSize(14);
      doc.setTextColor(234, 88, 12);
      doc.setFont(undefined, 'bold');
      doc.text("Synthèse Financière", 20, currentY);
      
      currentY += 5;

      autoTable(doc, {
        startY: currentY,
        head: [['Indicateur', 'Montant']],
        body: [
          ['Budget initial (HT)', `${budgetInitial.toFixed(2)} €`],
          ['Coût main d\'œuvre', `${(metrics?.cout_main_oeuvre_reel || 0).toFixed(2)} €`],
          ['Coûts fixes (factures + frais)', `${(metrics?.couts_fixes_engages || 0).toFixed(2)} €`],
          ['Coût total', `${coutTotal.toFixed(2)} €`],
          ['Marge réalisée', `${margeRealisee.toFixed(2)} €`],
          ['Rentabilité', `${(metrics?.marge_finale_pct || 0).toFixed(1)} %`],
        ],
        theme: 'striped',
        headStyles: { fillColor: [234, 88, 12], fontSize: 11 },
        styles: { fontSize: 10 },
      });

      currentY = (doc as any).lastAutoTable.finalY + 10;

      // Planning
      doc.setFontSize(14);
      doc.setTextColor(234, 88, 12);
      doc.setFont(undefined, 'bold');
      doc.text("Planning", 20, currentY);
      
      currentY += 5;

      autoTable(doc, {
        startY: currentY,
        head: [['Indicateur', 'Valeur']],
        body: [
          ['Date début', dateDebut.toLocaleDateString('fr-FR')],
          ['Date fin', dateFin.toLocaleDateString('fr-FR')],
          ['Durée estimée', `${dureeEstimee} jours`],
          ['Durée réelle', `${dureeReelle} jours`],
          ['Écart', `${ecartJours > 0 ? '+' : ''}${ecartJours} jours`],
        ],
        theme: 'striped',
        headStyles: { fillColor: [234, 88, 12], fontSize: 11 },
        styles: { fontSize: 10 },
      });

      currentY = (doc as any).lastAutoTable.finalY + 10;

      // Documents
      if (currentY > 230) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(14);
      doc.setTextColor(234, 88, 12);
      doc.setFont(undefined, 'bold');
      doc.text("Documents et Données", 20, currentY);
      
      currentY += 5;

      autoTable(doc, {
        startY: currentY,
        head: [['Type', 'Nombre']],
        body: [
          ['Devis', `${devis.length} (Actif: ${devisActif?.version || 'N/A'})`],
          ['Factures fournisseurs', `${factures.length}`],
          ['Coûts annexes', `${frais.length}`],
          ['Membres d\'équipe', `${membres.length}`],
        ],
        theme: 'striped',
        headStyles: { fillColor: [234, 88, 12], fontSize: 11 },
        styles: { fontSize: 10 },
      });

      // Footer
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFillColor(245, 245, 245);
        doc.rect(0, 285, 210, 12, 'F');
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.text(`B8ild - Bilan de clôture généré le ${new Date().toLocaleDateString('fr-FR')}`, 20, 292);
        doc.text(`Page ${i} / ${pageCount}`, 180, 292);
      }

      const fileName = `bilan_${chantierData.nom_chantier.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);

      toast({
        title: "✅ Bilan téléchargé",
        description: "Le bilan PDF a été généré avec succès",
      });
    } catch (error) {
      console.error('Erreur export bilan PDF:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'exporter le bilan",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Rentabilité finale */}
      <Card className={`${rentabilityBadge.urgency === 'critical' || rentabilityBadge.urgency === 'high' ? 'border-4 border-red-500' : 'border-2'}`}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Rentabilité Finale
            </span>
            <Button onClick={exportBilanPDF} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Télécharger le bilan
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Badge className={`text-2xl font-bold px-6 py-3 ${rentabilityBadge.bgColor} ${rentabilityBadge.color}`}>
              {rentabilityBadge.emoji} {rentabilityBadge.label} - {(metrics?.marge_finale_pct || 0).toFixed(1)}%
            </Badge>
            <p className="text-sm text-muted-foreground">{rentabilityBadge.message}</p>
          </div>
        </CardContent>
      </Card>

      {/* Synthèse financière */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Synthèse Financière
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Budget initial</p>
              <p className="text-2xl font-bold">{budgetInitial.toLocaleString()} €</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Coût total</p>
              <p className="text-2xl font-bold">{coutTotal.toLocaleString()} €</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Marge réalisée</p>
              <p className={`text-2xl font-bold ${margeRealisee >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {margeRealisee.toLocaleString()} €
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Écart budget</p>
              <p className={`text-2xl font-bold ${ecartBudget >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {ecartBudget >= 0 ? '+' : ''}{ecartBudget.toLocaleString()} €
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Planning */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Planning
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Période</p>
              <p className="font-semibold">{dateDebut.toLocaleDateString('fr-FR')} → {dateFin.toLocaleDateString('fr-FR')}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Durée estimée</p>
              <p className="font-semibold">{dureeEstimee} jours</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Durée réelle</p>
              <p className="font-semibold">{dureeReelle} jours</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Écart</p>
              <div className="flex items-center gap-2">
                {ecartJours > 0 ? (
                  <XCircle className="h-4 w-4 text-red-500" />
                ) : ecartJours < 0 ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : null}
                <p className={`font-semibold ${ecartJours > 0 ? 'text-red-600' : ecartJours < 0 ? 'text-green-600' : ''}`}>
                  {ecartJours > 0 ? '+' : ''}{ecartJours} jours
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Équipe */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Équipe
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Membres affectés</p>
              <p className="text-2xl font-bold">{membres.length}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Coût total main-d'œuvre</p>
              <p className="text-2xl font-bold">{(metrics?.cout_main_oeuvre_reel || 0).toLocaleString()} €</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Devis</p>
              <p className="font-semibold">{devis.length} version(s)</p>
              {devisActif && (
                <Badge variant="outline" className="mt-1">Actif: {devisActif.version}</Badge>
              )}
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Factures fournisseurs</p>
              <p className="font-semibold">{factures.length}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Coûts annexes</p>
              <p className="font-semibold">{frais.length}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total coûts fixes</p>
              <p className="font-semibold">{(metrics?.couts_fixes_engages || 0).toLocaleString()} €</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance */}
      <Card className={rentabilityBadge.urgency === 'none' ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : rentabilityBadge.urgency === 'critical' ? 'border-red-500 bg-red-50 dark:bg-red-950/20' : ''}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {rentabilityBadge.urgency === 'none' ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <TrendingDown className="h-5 w-5 text-orange-600" />}
            Performance Globale
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Points forts:</span>
              <div className="flex gap-2">
                {margeRealisee > 0 && <Badge variant="outline" className="bg-green-100 text-green-700">Rentable</Badge>}
                {ecartJours <= 0 && <Badge variant="outline" className="bg-green-100 text-green-700">Délais respectés</Badge>}
                {membres.length > 0 && <Badge variant="outline" className="bg-blue-100 text-blue-700">Équipe mobilisée</Badge>}
              </div>
            </div>
            {rentabilityBadge.urgency !== 'none' && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Points d'amélioration:</span>
                <div className="flex gap-2">
                  {margeRealisee < 0 && <Badge variant="outline" className="bg-red-100 text-red-700">Déficit</Badge>}
                  {ecartJours > 0 && <Badge variant="outline" className="bg-orange-100 text-orange-700">Retard</Badge>}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChantierBilan;
