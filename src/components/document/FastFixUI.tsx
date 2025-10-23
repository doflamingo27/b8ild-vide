import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, AlertCircle, Zap, HelpCircle } from "lucide-react";
import ExtractionDebugPanel from "./ExtractionDebugPanel";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface FastFixUIProps {
  documentUrl: string;
  partialData?: any;
  documentType: 'facture' | 'frais' | 'ao';
  onSave: (extractedData: any) => Promise<void>;
  onCancel: () => void;
  confidence?: number;
  debug?: any;
}

type ChipField = 'montantHT' | 'tvaPct' | 'montantTVA' | 'montantTTC' | 'netPayer' | 'date' | 'siret' | 'numFacture' | 'categorie' | 'titre' | 'organisme' | 'ville' | 'cp' | 'dateLimite' | 'montantEstime';

const CHIPS_FACTURE: { id: ChipField; label: string; shortcut: string }[] = [
  { id: 'montantHT', label: 'HT', shortcut: '1' },
  { id: 'tvaPct', label: 'TVA%', shortcut: '2' },
  { id: 'montantTVA', label: 'TVA€', shortcut: '3' },
  { id: 'montantTTC', label: 'TTC', shortcut: '4' },
  { id: 'netPayer', label: 'Net à payer', shortcut: '5' },
  { id: 'date', label: 'Date', shortcut: '6' },
  { id: 'siret', label: 'SIRET', shortcut: '7' },
  { id: 'numFacture', label: 'N° Facture', shortcut: '8' },
  { id: 'categorie', label: 'Catégorie', shortcut: '9' },
];

const CHIPS_AO: { id: ChipField; label: string; shortcut: string }[] = [
  { id: 'titre', label: 'Titre', shortcut: '1' },
  { id: 'organisme', label: 'Organisme', shortcut: '2' },
  { id: 'ville', label: 'Ville', shortcut: '3' },
  { id: 'cp', label: 'CP', shortcut: '4' },
  { id: 'dateLimite', label: 'Date limite', shortcut: '5' },
  { id: 'montantEstime', label: 'Budget', shortcut: '6' },
];

export const FastFixUI = ({ 
  documentUrl, 
  partialData, 
  documentType, 
  onSave, 
  onCancel,
  confidence = 0,
  debug
}: FastFixUIProps) => {
  const { toast } = useToast();
  const [selectedChip, setSelectedChip] = useState<ChipField | null>(null);
  const [formData, setFormData] = useState({
    fournisseur: partialData?.fournisseur_nom || partialData?.fournisseur || "",
    siret: partialData?.siret || "",
    date: partialData?.date_document_iso || "",
    montantHT: partialData?.montant_ht || partialData?.totaux?.ht || "",
    tvaPct: partialData?.tva_pct || partialData?.totaux?.tva_pct || "",
    montantTVA: partialData?.tva_montant || partialData?.totaux?.tva_montant || "",
    montantTTC: partialData?.montant_ttc || partialData?.totaux?.ttc || "",
    netPayer: "",
    numFacture: partialData?.numero_facture || "",
    categorie: "",
    titre: partialData?.titre || partialData?.ao?.titre || "",
    organisme: partialData?.organisme || partialData?.ao?.organisme || "",
    ville: partialData?.ville || partialData?.ao?.ville || "",
    cp: partialData?.code_postal || partialData?.ao?.cp || "",
    dateLimite: partialData?.date_limite_candidature || partialData?.ao?.date_limite_iso || "",
    montantEstime: partialData?.montant_estime || partialData?.ao?.montant_estime || "",
  });
  
  const [coherenceScore, setCoherenceScore] = useState(0);
  const [saving, setSaving] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  
  const chips = documentType === 'ao' ? CHIPS_AO : CHIPS_FACTURE;
  
  const calculateCoherence = () => {
    if (documentType === 'ao') {
      let score = 0;
      if (formData.titre) score += 0.25;
      if (formData.organisme) score += 0.25;
      if (formData.dateLimite) score += 0.25;
      if (formData.cp) score += 0.25;
      setCoherenceScore(score);
      return;
    }
    
    const ht = parseFloat(formData.montantHT);
    const tva = parseFloat(formData.tvaPct);
    const ttc = parseFloat(formData.montantTTC);
    
    if (isNaN(ht) || isNaN(ttc)) {
      setCoherenceScore(0);
      return;
    }
    
    let score = 0.4;
    
    if (!isNaN(tva)) {
      const expected = ht * (1 + tva / 100);
      const diff = Math.abs(ttc - expected);
      if (diff <= expected * 0.02) {
        score = 0.95;
      } else {
        score = 0.5;
      }
    } else if (ttc >= ht && ttc <= ht * 1.3) {
      score = 0.7;
    }
    
    if (formData.siret) score += 0.05;
    if (formData.date) score += 0.05;
    
    setCoherenceScore(Math.min(score, 1.0));
  };

  useEffect(() => {
    calculateCoherence();
  }, [formData]);
  
  // Auto-calculs
  useEffect(() => {
    const ht = parseFloat(formData.montantHT);
    const tva = parseFloat(formData.tvaPct);
    
    if (!isNaN(ht) && !isNaN(tva) && !formData.montantTTC) {
      const ttc = ht * (1 + tva / 100);
      setFormData(prev => ({ ...prev, montantTTC: ttc.toFixed(2) }));
    }
  }, [formData.montantHT, formData.tvaPct]);
  
  const handleChipClick = (chipId: ChipField) => {
    setSelectedChip(chipId);
    toast({
      title: `Mode: ${chips.find(c => c.id === chipId)?.label}`,
      description: "Cliquez maintenant sur une zone du document",
      duration: 2000
    });
  };
  
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  const handleSave = async () => {
    if (documentType !== 'ao' && coherenceScore < 0.6) {
      toast({
        title: "Vérification requise",
        description: "Les montants ne semblent pas cohérents. Veuillez vérifier.",
        variant: "destructive"
      });
      return;
    }
    
    setSaving(true);
    try {
      const extractedData = {
        type_document: documentType,
        fournisseur_nom: formData.fournisseur,
        fournisseur: formData.fournisseur,
        siret: formData.siret,
        date_document_iso: formData.date,
        numero_facture: formData.numFacture,
        montant_ht: parseFloat(formData.montantHT) || null,
        tva_pct: parseFloat(formData.tvaPct) || null,
        tva_montant: parseFloat(formData.montantTVA) || null,
        montant_ttc: parseFloat(formData.montantTTC) || null,
        totaux: {
          ht: parseFloat(formData.montantHT) || null,
          tva_pct: parseFloat(formData.tvaPct) || null,
          tva_montant: parseFloat(formData.montantTVA) || null,
          ttc: parseFloat(formData.montantTTC) || null
        },
        ao: documentType === 'ao' ? {
          titre: formData.titre,
          organisme: formData.organisme,
          ville: formData.ville,
          cp: formData.cp,
          date_limite_iso: formData.dateLimite,
          montant_estime: parseFloat(formData.montantEstime) || null
        } : null,
        titre: documentType === 'ao' ? formData.titre : undefined,
        organisme: documentType === 'ao' ? formData.organisme : undefined,
        ville: documentType === 'ao' ? formData.ville : undefined,
        code_postal: documentType === 'ao' ? formData.cp : undefined,
        date_limite_candidature: documentType === 'ao' ? formData.dateLimite : undefined,
        montant_estime: documentType === 'ao' ? parseFloat(formData.montantEstime) || null : undefined,
        meta: {
          confiance: coherenceScore,
          method: 'fast_fix'
        }
      };
      
      await onSave(extractedData);
      
      toast({
        title: "Document enregistré",
        description: "Les données ont été extraites avec succès."
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 h-full">
      {/* Aperçu document */}
      <div className="space-y-4">
        <Card className="p-4 h-full">
          <CardHeader className="px-0 pt-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Document</CardTitle>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowHelp(!showHelp)}
              >
                <HelpCircle className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <div className="border rounded-lg overflow-hidden bg-muted">
              <iframe
                src={documentUrl}
                className="w-full h-[550px]"
                title="Aperçu document"
              />
            </div>
            
            {showHelp && (
              <div className="mt-4 p-4 bg-primary/5 rounded-lg text-sm space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  Comment scanner/photographier correctement ?
                </h4>
                <ul className="space-y-1 text-muted-foreground ml-6 list-disc">
                  <li>Éclairage suffisant, éviter les reflets</li>
                  <li>Document bien à plat, cadrage droit</li>
                  <li>Photo nette (pas de flou de mouvement)</li>
                  <li>Privilégier le PDF original si disponible</li>
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Fast-Fix avec chips */}
      <div className="space-y-4">
        {/* Indicateur */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Fast-Fix (≤30s)
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant={
                  confidence >= 0.80 ? 'default' :
                  confidence >= 0.50 ? 'secondary' :
                  'destructive'
                } className="text-xs">
                  {(confidence * 100).toFixed(0)}%
                </Badge>
                {coherenceScore >= 0.75 && (
                  <Badge variant="outline" className="text-xs gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Cohérent
                  </Badge>
                )}
              </div>
            </div>
            <CardDescription className="text-xs">
              {confidence < 0.50 
                ? "Qualité faible. Utilisez les chips : cliquez 'HT', puis pointez la zone sur le document."
                : "On a prérempli ce qu'on a pu — vérifiez avec les chips"}
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Debug panel */}
        {debug && <ExtractionDebugPanel debug={debug} visible={confidence < 0.50} />}

        {/* Chips cliquables */}
        <Card className="p-4">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-sm">Sélection rapide</CardTitle>
            <CardDescription className="text-xs">
              Cliquez un chip, puis la zone du document
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <div className="flex flex-wrap gap-2">
              {chips.map(chip => (
                <TooltipProvider key={chip.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={selectedChip === chip.id ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleChipClick(chip.id)}
                        className="text-xs"
                      >
                        {chip.label}
                        <Badge variant="secondary" className="ml-1 text-[10px] px-1">
                          {chip.shortcut}
                        </Badge>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Raccourci: {chip.shortcut}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Formulaire */}
        <Card className="p-4">
          <CardHeader className="px-0 pt-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Données extraites</CardTitle>
              <Badge variant={coherenceScore >= 0.75 ? "default" : "secondary"} className="gap-1 text-xs">
                {coherenceScore >= 0.75 ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                {Math.round(coherenceScore * 100)}%
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent className="px-0 pb-0">
            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2">
              {documentType === 'ao' ? (
                <>
                  <div>
                    <Label htmlFor="titre" className="text-xs">Titre de l'AO *</Label>
                    <Input
                      id="titre"
                      value={formData.titre}
                      onChange={(e) => handleInputChange('titre', e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="organisme" className="text-xs">Organisme *</Label>
                    <Input
                      id="organisme"
                      value={formData.organisme}
                      onChange={(e) => handleInputChange('organisme', e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="ville" className="text-xs">Ville</Label>
                      <Input
                        id="ville"
                        value={formData.ville}
                        onChange={(e) => handleInputChange('ville', e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="cp" className="text-xs">CP</Label>
                      <Input
                        id="cp"
                        value={formData.cp}
                        onChange={(e) => handleInputChange('cp', e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="dateLimite" className="text-xs">Date limite *</Label>
                    <Input
                      id="dateLimite"
                      type="date"
                      value={formData.dateLimite}
                      onChange={(e) => handleInputChange('dateLimite', e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="montantEstime" className="text-xs">Budget (€)</Label>
                    <Input
                      id="montantEstime"
                      type="number"
                      step="0.01"
                      value={formData.montantEstime}
                      onChange={(e) => handleInputChange('montantEstime', e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="montantHT" className="text-xs">HT (€) *</Label>
                      <Input
                        id="montantHT"
                        type="number"
                        step="0.01"
                        value={formData.montantHT}
                        onChange={(e) => handleInputChange('montantHT', e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="tvaPct" className="text-xs">TVA %</Label>
                      <Input
                        id="tvaPct"
                        type="number"
                        step="0.01"
                        value={formData.tvaPct}
                        onChange={(e) => handleInputChange('tvaPct', e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="montantTVA" className="text-xs">TVA €</Label>
                      <Input
                        id="montantTVA"
                        type="number"
                        step="0.01"
                        value={formData.montantTVA}
                        onChange={(e) => handleInputChange('montantTVA', e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="montantTTC" className="text-xs">TTC (€) *</Label>
                      <Input
                        id="montantTTC"
                        type="number"
                        step="0.01"
                        value={formData.montantTTC}
                        onChange={(e) => handleInputChange('montantTTC', e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="siret" className="text-xs">SIRET</Label>
                      <Input
                        id="siret"
                        value={formData.siret}
                        onChange={(e) => handleInputChange('siret', e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="date" className="text-xs">Date</Label>
                      <Input
                        id="date"
                        type="date"
                        value={formData.date}
                        onChange={(e) => handleInputChange('date', e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
            
            <div className="flex gap-3 mt-4 pt-4 border-t">
              <Button variant="outline" onClick={onCancel} className="flex-1">
                Annuler
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={saving}
                className="flex-1"
              >
                {saving ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};