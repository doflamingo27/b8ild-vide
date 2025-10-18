import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ExportManagerProps {
  chantierId: string;
  chantierData: any;
  membres: any[];
  devis?: any;
  factures: any[];
  frais: any[];
  calculations: any;
}

const ExportManager = ({
  chantierId,
  chantierData,
  membres,
  devis,
  factures,
  frais,
  calculations,
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
        ["Budget devis HT", devis?.montant_ht || 0],
        ["Budget devis TTC", devis?.montant_ttc || 0],
        ["Coût journalier équipe", calculations.cout_journalier_equipe.toFixed(2)],
        ["Budget disponible", calculations.budget_disponible.toFixed(2)],
        ["Rentabilité (%)", calculations.rentabilite_pct.toFixed(2)],
        ["Jour critique", calculations.jour_critique.toFixed(2)],
        ["Jours restants avant déficit", calculations.jours_restants_avant_deficit],
        [""],
        ["Équipe"],
        ["Nom", "Poste", "Coût journalier"],
        ...membres.map(m => [
          `${m.prenom} ${m.nom}`,
          m.poste,
          (calculations.calculerCoutJournalierMembre(m)).toFixed(2)
        ]),
        [""],
        ["Factures fournisseurs"],
        ["Fournisseur", "Catégorie", "Montant HT", "Date"],
        ...factures.map(f => [
          f.fournisseur || "Non renseigné",
          f.categorie,
          f.montant_ht,
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

  const exportToPDF = () => {
    toast({
      title: "Export PDF",
      description: "Fonctionnalité en cours de développement",
    });
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
