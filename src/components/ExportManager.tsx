import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ExportManagerProps {
  chantierId: string;
  chantierData: any;
  membres: any[];
  devis?: any;
  allDevis?: any[];
  factures: any[];
  frais: any[];
  calculations: any;
  metrics?: any;
}

const ExportManager = ({
  chantierId,
  chantierData,
  membres,
  devis,
  allDevis = [],
  factures,
  frais,
  calculations,
  metrics,
}: ExportManagerProps) => {
  const { toast } = useToast();

  const exportToCSV = () => {
    try {
      const csvData = [
        ["B8ild - Rapport de Chantier"],
        [""],
        ["Informations générales"],
        ["Nom du chantier", chantierData.nom_chantier],
        ["Client", chantierData.client],
        ["Adresse", chantierData.adresse || "Non renseignée"],
        [""],
        ["Finances"],
        ["Budget devis HT", (devis?.montant_ht || 0).toFixed(2)],
        ["Budget devis TTC", (devis?.montant_ttc || 0).toFixed(2)],
        ["Coût journalier équipe", (calculations.cout_journalier_equipe || 0).toFixed(2)],
        ["Budget disponible", (calculations.budget_disponible || 0).toFixed(2)],
        ["Rentabilité (%)", (calculations.rentabilite_pct || 0).toFixed(2)],
        ["Jour critique", isFinite(calculations.jour_critique) ? calculations.jour_critique.toFixed(2) : 'N/A'],
        ["Jours restants avant déficit", calculations.jours_restants_avant_deficit || 0],
        [""],
        ["Équipe"],
        ["Nom", "Poste", "Coût journalier"],
        ...membres.map(m => {
          const cout = calculations.calculerCoutJournalierMembre(m) || 0;
          return [
            `${m.prenom} ${m.nom}`,
            m.poste,
            cout.toFixed(2)
          ];
        }),
        [""],
        ["Factures fournisseurs"],
        ["Fournisseur", "Catégorie", "Montant HT", "Date"],
        ...factures.map(f => [
          f.fournisseur || "Non renseigné",
          f.categorie,
          (f.montant_ht || 0).toFixed(2),
          f.date_facture || "Non renseignée"
        ]),
      ];

      const csvContent = csvData.map(row => row.join(";")).join("\n");
      const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `chantier_${chantierData.nom_chantier}_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();

      toast({
        title: "Export CSV réussi",
        description: "Le fichier a été téléchargé",
      });
    } catch (error) {
      console.error('Erreur export CSV:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'exporter en CSV",
        variant: "destructive",
      });
    }
  };

  const exportToExcel = () => {
    // Pour Excel, on utilise le même format CSV qui sera interprété par Excel
    exportToCSV();
    toast({
      title: "Export Excel",
      description: "Fichier CSV compatible Excel téléchargé",
    });
  };

  const exportToPDF = async () => {
    try {
      console.log('[PDF Export] Début de l\'export PDF enrichi');
      
      const doc = new jsPDF();
      let currentY = 20;
      
      // Import rentabilityBadge
      const { getRentabilityBadge } = await import("@/lib/rentabilityBadge");
      const margeFinalePct = metrics?.marge_finale_pct || calculations?.rentabilite_pct || 0;
      const rentabilityBadge = getRentabilityBadge(margeFinalePct);
      
      // ========== HEADER DESIGN ==========
      // Bandeau orange en haut
      doc.setFillColor(234, 88, 12);
      doc.rect(0, 0, 210, 45, 'F');
      
      // Logo et titre
      doc.setFontSize(32);
      doc.setTextColor(255, 255, 255);
      doc.setFont(undefined, 'bold');
      doc.text("B8ILD", 20, 25);
      
      doc.setFontSize(16);
      doc.setFont(undefined, 'normal');
      doc.text("Rapport de Chantier", 20, 37);
      
      // Date en haut à droite
      doc.setFontSize(10);
      doc.text(new Date().toLocaleDateString('fr-FR'), 150, 37);
      
      currentY = 55;
      
      // ========== INFORMATIONS GÉNÉRALES ==========
      doc.setFillColor(245, 245, 245);
      doc.roundedRect(15, currentY, 180, 32, 3, 3, 'F');
      
      doc.setFontSize(14);
      doc.setTextColor(234, 88, 12);
      doc.setFont(undefined, 'bold');
      doc.text("Informations du chantier", 20, currentY + 8);
      
      doc.setFontSize(11);
      doc.setTextColor(60, 60, 60);
      doc.setFont(undefined, 'normal');
      doc.text(`Chantier: ${chantierData.nom_chantier || 'N/A'}`, 20, currentY + 16);
      doc.text(`Client: ${chantierData.client || 'N/A'}`, 20, currentY + 23);
      doc.text(`Adresse: ${chantierData.adresse || "Non renseignée"}`, 20, currentY + 30);
      
      currentY += 42;
      
      // ========== SYNTHÈSE DE RENTABILITÉ ==========
      doc.setFontSize(14);
      doc.setTextColor(234, 88, 12);
      doc.setFont(undefined, 'bold');
      doc.text("Synthèse de Rentabilité", 20, currentY);
      
      currentY += 8;
      
      // Badge rentabilité visuel
      const badgeColors: Record<string, [number, number, number]> = {
        'critical': [244, 67, 54],
        'high': [255, 87, 34],
        'medium': [255, 152, 0],
        'low': [255, 193, 7],
        'none': [76, 175, 80]
      };
      const badgeColor = badgeColors[rentabilityBadge.urgency] || [76, 175, 80];
      
      doc.setFillColor(badgeColor[0], badgeColor[1], badgeColor[2]);
      doc.roundedRect(15, currentY, 180, 18, 2, 2, 'F');
      
      doc.setFontSize(14);
      doc.setTextColor(255, 255, 255);
      doc.setFont(undefined, 'bold');
      doc.text(`${rentabilityBadge.emoji} ${rentabilityBadge.label}`, 20, currentY + 8);
      doc.text(`${margeFinalePct.toFixed(1)}%`, 150, currentY + 8);
      
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      doc.text(rentabilityBadge.message, 20, currentY + 15);
      
      currentY += 28;
      
      // ========== FINANCES - KPIs Cards ==========
      const budgetHT = Number(devis?.montant_ht || 0);
      const budgetTTC = Number(devis?.montant_ttc || 0);
      const coutJournalier = Number(calculations?.cout_journalier_equipe || 0);
      const budgetDispo = Number(calculations?.budget_disponible || 0);
      const rentabilite = Number(calculations?.rentabilite_pct || 0);
      const jourCrit = calculations?.jour_critique;
      
      doc.setFontSize(14);
      doc.setTextColor(234, 88, 12);
      doc.setFont(undefined, 'bold');
      doc.text("Indicateurs Financiers", 20, currentY);
      
      currentY += 8;
      
      // KPI Cards en grille 2x4 (8 KPIs)
      const margeActuelle = metrics?.marge_a_date || 0;
      const margeFinale = metrics?.marge_finale || 0;
      const joursEcoules = metrics?.jours_ecoules || 0;
      const joursRestants = metrics?.jours_restants_rentables || 0;
      
      const kpis = [
        { label: 'Budget Devis HT', value: `${budgetHT.toFixed(2)} €`, color: [66, 135, 245] },
        { label: 'Budget Devis TTC', value: `${budgetTTC.toFixed(2)} €`, color: [66, 135, 245] },
        { label: 'Coût/Jour Équipe', value: `${coutJournalier.toFixed(2)} €`, color: [156, 39, 176] },
        { label: 'Budget Disponible', value: `${budgetDispo.toFixed(2)} €`, color: [76, 175, 80] },
        { 
          label: 'Marge Actuelle', 
          value: `${margeActuelle.toFixed(2)} €`, 
          color: margeActuelle >= 0 ? [76, 175, 80] : [244, 67, 54] 
        },
        { 
          label: 'Marge Finale Proj.', 
          value: `${margeFinale.toFixed(2)} €`, 
          color: margeFinale >= 0 ? [76, 175, 80] : [244, 67, 54] 
        },
        { 
          label: 'Jours Écoulés', 
          value: `${joursEcoules} j`,
          color: [100, 100, 100]
        },
        { 
          label: 'Jours Rentables Restants', 
          value: joursRestants !== null ? `${joursRestants} j` : 'N/A',
          color: joursRestants > 7 ? [76, 175, 80] : joursRestants > 3 ? [255, 152, 0] : [244, 67, 54]
        }
      ];
      
      kpis.forEach((kpi, idx) => {
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        const x = 15 + (col * 92);
        const y = currentY + (row * 24);
        
        // Card background
        doc.setFillColor(kpi.color[0], kpi.color[1], kpi.color[2]);
        doc.setDrawColor(kpi.color[0], kpi.color[1], kpi.color[2]);
        doc.roundedRect(x, y, 88, 20, 2, 2, 'FD');
        
        // Label
        doc.setFontSize(8);
        doc.setTextColor(255, 255, 255);
        doc.setFont(undefined, 'normal');
        doc.text(kpi.label, x + 4, y + 6);
        
        // Value
        doc.setFontSize(13);
        doc.setFont(undefined, 'bold');
        doc.text(kpi.value, x + 4, y + 15);
      });
      
      currentY += 104;
      
      // ========== TOUS LES DEVIS ==========
      if (currentY > 200) {
        doc.addPage();
        currentY = 20;
      }
      
      doc.setFontSize(14);
      doc.setTextColor(234, 88, 12);
      doc.setFont(undefined, 'bold');
      doc.text("Devis", 20, currentY);
      
      currentY += 5;
      
      const devisData = (allDevis || []).map(d => [
        d.version || 'N/A',
        d.statut || 'brouillon',
        `${(d.montant_ht || 0).toFixed(2)} €`,
        `${(d.montant_ttc || 0).toFixed(2)} €`,
        d.date_envoi || 'Non envoyé',
        d.actif ? '✓ ACTIF' : ''
      ]);
      
      if (devisData.length > 0) {
        autoTable(doc, {
          head: [['Version', 'Statut', 'HT', 'TTC', 'Date envoi', 'Actif']],
          body: devisData,
          startY: currentY,
          theme: 'striped',
          headStyles: { 
            fillColor: [234, 88, 12],
            fontSize: 10,
            fontStyle: 'bold',
            textColor: 255
          },
          styles: { fontSize: 9 },
        });
        currentY = (doc as any).lastAutoTable.finalY + 10;
      }
      
      // ========== ÉQUIPE ==========
      doc.setFontSize(14);
      doc.setTextColor(234, 88, 12);
      doc.setFont(undefined, 'bold');
      doc.text("Composition de l'équipe", 20, currentY);
      
      currentY += 5;
      
      const equipeData = (membres || []).map(m => {
        try {
          const cout = calculations?.calculerCoutJournalierMembre ? 
            calculations.calculerCoutJournalierMembre(m) || 0 : 0;
          return [
            `${m?.prenom || ''} ${m?.nom || ''}`.trim() || 'N/A',
            m?.poste || 'Non renseigné',
            `${Number(cout).toFixed(2)} €`
          ];
        } catch (err) {
          return [
            `${m?.prenom || ''} ${m?.nom || ''}`.trim() || 'N/A',
            m?.poste || 'Non renseigné',
            '0.00 €'
          ];
        }
      });
      
      if (equipeData.length > 0) {
        autoTable(doc, {
          head: [['Nom', 'Poste', 'Coût journalier']],
          body: equipeData,
          startY: currentY,
          theme: 'striped',
          headStyles: { 
            fillColor: [234, 88, 12],
            fontSize: 11,
            fontStyle: 'bold',
            textColor: 255
          },
          styles: { 
            fontSize: 10,
            cellPadding: 5
          },
          alternateRowStyles: {
            fillColor: [250, 250, 250]
          },
          columnStyles: {
            2: { halign: 'right', fontStyle: 'bold' }
          }
        });
        currentY = (doc as any).lastAutoTable.finalY + 10;
      }
      
      // ========== COÛTS ANNEXES ==========
      if (currentY > 200) {
        doc.addPage();
        currentY = 20;
      }
      
      doc.setFontSize(14);
      doc.setTextColor(234, 88, 12);
      doc.setFont(undefined, 'bold');
      doc.text("Coûts Annexes", 20, currentY);
      
      currentY += 5;
      
      const fraisData = (frais || []).map(f => [
        f.type_frais || 'Autre',
        f.description || '',
        `${(f.montant_total || 0).toFixed(2)} €`,
        f.date_frais || 'Non renseignée'
      ]);
      
      if (fraisData.length > 0) {
        autoTable(doc, {
          head: [['Type', 'Description', 'Montant', 'Date']],
          body: fraisData,
          startY: currentY,
          theme: 'striped',
          headStyles: { 
            fillColor: [234, 88, 12],
            fontSize: 10,
            fontStyle: 'bold',
            textColor: 255
          },
          styles: { fontSize: 9 },
          columnStyles: {
            2: { halign: 'right', fontStyle: 'bold' }
          }
        });
        currentY = (doc as any).lastAutoTable.finalY + 10;
      }
      
      // ========== FACTURES ==========
      if (currentY > 200) {
        doc.addPage();
        currentY = 20;
      }
      
      doc.setFontSize(14);
      doc.setTextColor(234, 88, 12);
      doc.setFont(undefined, 'bold');
      doc.text("Factures Fournisseurs", 20, currentY);
      
      currentY += 5;
      
      const facturesData = (factures || []).map(f => {
        const montantHT = Number(f?.montant_ht || 0);
        return [
          f?.fournisseur || "Non renseigné",
          f?.categorie || "Autres",
          `${montantHT.toFixed(2)} €`,
          f?.date_facture || "Non renseignée"
        ];
      });
      
      if (facturesData.length > 0) {
        autoTable(doc, {
          head: [['Fournisseur', 'Catégorie', 'Montant HT', 'Date']],
          body: facturesData,
          startY: currentY,
          theme: 'striped',
          headStyles: { 
            fillColor: [234, 88, 12],
            fontSize: 11,
            fontStyle: 'bold',
            textColor: 255
          },
          styles: { 
            fontSize: 10,
            cellPadding: 5
          },
          alternateRowStyles: {
            fillColor: [250, 250, 250]
          },
          columnStyles: {
            2: { halign: 'right', fontStyle: 'bold' }
          }
        });
        currentY = (doc as any).lastAutoTable.finalY + 10;
      }
      
      // ========== COMPARAISON PRÉVISIONNEL/RÉEL ==========
      if (currentY > 220) {
        doc.addPage();
        currentY = 20;
      }
      
      doc.setFontSize(14);
      doc.setTextColor(234, 88, 12);
      doc.setFont(undefined, 'bold');
      doc.text("Comparaison Prévisionnel / Réel", 20, currentY);
      
      currentY += 5;
      
      const coutTotal = (metrics?.cout_main_oeuvre_reel || 0) + (metrics?.couts_fixes_engages || 0);
      const ecartBudget = budgetHT - coutTotal;
      const avancement = metrics?.duree_estimee_jours ? (metrics.jours_ecoules / metrics.duree_estimee_jours * 100) : 0;
      
      autoTable(doc, {
        head: [['Indicateur', 'Prévu', 'Réel', 'Écart']],
        body: [
          [
            'Budget',
            `${budgetHT.toFixed(2)} €`,
            `${coutTotal.toFixed(2)} €`,
            `${ecartBudget >= 0 ? '+' : ''}${ecartBudget.toFixed(2)} €`
          ],
          [
            'Durée',
            `${metrics?.duree_estimee_jours || 0} j`,
            `${metrics?.jours_ecoules || 0} j`,
            `${avancement.toFixed(1)}%`
          ]
        ],
        startY: currentY,
        theme: 'striped',
        headStyles: { 
          fillColor: [234, 88, 12],
          fontSize: 10,
          fontStyle: 'bold',
          textColor: 255
        },
        styles: { fontSize: 10 },
      });
      
      currentY = (doc as any).lastAutoTable.finalY + 15;
      
      // ========== CONCLUSION ==========
      if (currentY > 240) {
        doc.addPage();
        currentY = 20;
      }
      
      doc.setFontSize(14);
      doc.setTextColor(234, 88, 12);
      doc.setFont(undefined, 'bold');
      doc.text("Conclusion & Recommandations", 20, currentY);
      
      currentY += 8;
      
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      doc.setFont(undefined, 'normal');
      
      // Statut global
      doc.setFont(undefined, 'bold');
      doc.text(`Statut: ${rentabilityBadge.label}`, 20, currentY);
      doc.setFont(undefined, 'normal');
      doc.text(rentabilityBadge.message, 20, currentY + 6);
      
      currentY += 15;
      
      // Recommandations automatiques
      doc.setFont(undefined, 'bold');
      doc.text("Recommandations:", 20, currentY);
      doc.setFont(undefined, 'normal');
      
      currentY += 6;
      
      const recommendations: string[] = [];
      
      if (margeFinalePct < 10) {
        recommendations.push("• Revoir la structure des coûts et optimiser les dépenses");
      }
      if (joursRestants !== null && joursRestants < 5) {
        recommendations.push("• Accélérer le rythme pour éviter le dépassement de budget");
      }
      if (margeFinale < 0) {
        recommendations.push("• Négocier un avenant client ou réduire drastiquement les coûts");
      }
      if (margeFinalePct >= 20) {
        recommendations.push("• Maintenir le cap, chantier rentable");
      }
      
      recommendations.forEach(rec => {
        if (currentY > 270) {
          doc.addPage();
          currentY = 20;
        }
        doc.text(rec, 20, currentY);
        currentY += 6;
      });
      
      // ========== FOOTER ==========
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFillColor(245, 245, 245);
        doc.rect(0, 285, 210, 12, 'F');
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.setFont(undefined, 'normal');
        doc.text(`B8ild - Rapport généré le ${new Date().toLocaleDateString('fr-FR')}`, 20, 292);
        doc.text(`Page ${i} / ${pageCount}`, 180, 292);
      }
      
      const cleanName = (chantierData.nom_chantier || 'chantier')
        .replace(/[^a-z0-9]/gi, '_')
        .toLowerCase();
      const fileName = `rapport_${cleanName}_${new Date().toISOString().split('T')[0]}.pdf`;
      
      doc.save(fileName);
      console.log('[PDF Export] PDF téléchargé:', fileName);
      
      toast({
        title: "Export PDF réussi",
        description: "Le rapport a été téléchargé avec succès",
      });
    } catch (error) {
      console.error('[PDF Export] Erreur complète:', error);
      toast({
        title: "Erreur d'export",
        description: error instanceof Error ? error.message : "Impossible d'exporter en PDF",
        variant: "destructive",
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Exporter
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={exportToPDF}>
          <FileText className="mr-2 h-4 w-4" />
          PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToCSV}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToExcel}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ExportManager;
