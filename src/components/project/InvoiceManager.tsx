import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, FileText, Loader2, Edit, Info } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import ConfirmDialog from "@/components/ConfirmDialog";
import { labels, toasts } from "@/lib/content";
import AutoExtractUploader from "@/components/AutoExtractUploader";
import { useQuery } from "@tanstack/react-query";

interface InvoiceManagerProps {
  chantierId: string;
  factures: any[];
  onUpdate: () => void;
}

const InvoiceManager = ({ chantierId, factures, onUpdate }: InvoiceManagerProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    fournisseur: "",
    montant_ht: 0,
    categorie: "Matériaux",
    date_facture: new Date().toISOString().split('T')[0],
  });
  
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [selectedFacture, setSelectedFacture] = useState<any>(null);

  // Récupérer entrepriseId pour AutoExtractUploader
  const { data: entreprise } = useQuery({
    queryKey: ['entreprise'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");
      
      const { data } = await supabase
        .from('entreprises')
        .select('id')
        .eq('proprietaire_user_id', user.id)
        .single();
      
      return data;
    }
  });

  const categories = [
    "Matériaux",
    "Sous-traitance",
    "Location",
    "Autres",
  ];


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Récupérer entreprise_id et user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { data: entreprise } = await supabase
        .from('entreprises')
        .select('id')
        .eq('proprietaire_user_id', user.id)
        .single();

      if (!entreprise) throw new Error("Entreprise introuvable");

      let fichier_url = null;

      // Upload du fichier
      if (file) {
        try {
          const fileExt = file.name.split('.').pop();
          const fileName = `${entreprise.id}/factures/${Date.now()}.${fileExt}`;
          
          console.log('[InvoiceManager] Uploading file:', fileName);
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('factures')
            .upload(fileName, file);

          if (uploadError) {
            console.error('[InvoiceManager] Upload error:', uploadError);
            throw new Error(`Échec d'upload: ${uploadError.message}`);
          }
          
          const { data: { publicUrl } } = supabase.storage
            .from('factures')
            .getPublicUrl(fileName);
          
          fichier_url = publicUrl;
          console.log('[InvoiceManager] File uploaded:', publicUrl);
        } catch (uploadErr: any) {
          // Continuer sans fichier mais avertir l'utilisateur
          console.warn('[InvoiceManager] Could not upload file:', uploadErr);
          toast({
            title: "⚠️ Avertissement",
            description: "La facture sera enregistrée sans fichier attaché",
            variant: "default",
          });
        }
      }

      // Insertion DIRECTE dans la table (les triggers vont recalculer automatiquement)
      const { data: newFacture, error: insertError } = await supabase
        .from('factures_fournisseurs')
        .insert({
          chantier_id: chantierId,
          entreprise_id: entreprise.id,
          created_by: user.id,
          fournisseur: formData.fournisseur,
          montant_ht: formData.montant_ht,
          categorie: formData.categorie,
          date_facture: formData.date_facture,
          fichier_url,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      toast({
        title: "✅ Facture ajoutée",
        description: "Les métriques vont se mettre à jour automatiquement",
      });

      setOpen(false);
      setFormData({
        fournisseur: "",
        montant_ht: 0,
        categorie: "Matériaux",
        date_facture: new Date().toISOString().split('T')[0],
      });
      setFile(null);
      onUpdate(); // Recharger la liste

    } catch (error: any) {
      console.error('[InvoiceManager] Insert error:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'enregistrer la facture.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!deleteTarget) return;
    
    try {
      const { error } = await supabase
        .from("factures_fournisseurs")
        .delete()
        .eq("id", deleteTarget);

      if (error) throw error;

      toast({ title: toasts.deleted });
      setDeleteTarget(null);
      onUpdate();
    } catch (error: any) {
      toast({
        title: toasts.errorGeneric,
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (facture: any) => {
    setEditData({
      id: facture.id,
      fournisseur: facture.fournisseur || "",
      montant_ht: facture.montant_ht || 0,
      tva_pct: facture.tva_pct || 20,
      montant_ttc: facture.montant_ttc || 0,
      siret: facture.siret || "",
      categorie: facture.categorie || "Autres",
      date_facture: facture.date_facture || new Date().toISOString().split('T')[0],
    });
    setEditDialogOpen(true);
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editData) return;

    try {
      const { error } = await supabase
        .from('factures_fournisseurs')
        .update({
          fournisseur: editData.fournisseur,
          montant_ht: editData.montant_ht,
          tva_pct: editData.tva_pct,
          montant_ttc: editData.montant_ttc,
          siret: editData.siret,
          categorie: editData.categorie,
          date_facture: editData.date_facture,
          extraction_status: 'complete',
        })
        .eq('id', editData.id);

      if (error) throw error;

      toast({ title: "✅ Facture mise à jour" });
      setEditDialogOpen(false);
      setEditData(null);
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleViewDetails = (facture: any) => {
    setSelectedFacture(facture);
    setDetailsDialogOpen(true);
  };

  // Calcul des totaux pour le récapitulatif
  const totalHT = factures.reduce((sum, f) => sum + (Number(f.montant_ht) || 0), 0);
  const totalTVA = factures.reduce((sum, f) => sum + (Number(f.tva_montant) || 0), 0);
  const totalTTC = factures.reduce((sum, f) => sum + (Number(f.montant_ttc) || 0), 0);

  return (
    <>
      {/* Récapitulatif financier */}
      {factures.length > 0 && (
        <Card className="mb-4 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg">💰 Récapitulatif Financier</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-6">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground font-medium">Total HT</p>
                <p className="text-3xl font-black text-foreground">{totalHT.toFixed(2)} €</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground font-medium">Total TVA</p>
                <p className="text-3xl font-black text-amber-600">{totalTVA.toFixed(2)} €</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground font-medium">Total TTC</p>
                <p className="text-3xl font-black text-primary">{totalTTC.toFixed(2)} €</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Factures Fournisseurs</CardTitle>
              <CardDescription>
                {factures.length} facture{factures.length > 1 ? 's' : ''} enregistrée{factures.length > 1 ? 's' : ''}
              </CardDescription>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button aria-label={labels.actions.add} title={labels.actions.add}>
                  <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                  Ajouter une facture
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Ajouter une facture fournisseur</DialogTitle>
                  <DialogDescription>
                    Uploadez une facture pour extraction automatique (OCR.space)
                  </DialogDescription>
                </DialogHeader>
                
                {entreprise?.id && (
                  <div className="border rounded-lg p-4 bg-muted/30">
                    <p className="text-sm font-semibold mb-3">Option 1 : Upload automatique (recommandé)</p>
                    <AutoExtractUploader 
                      module="factures"
                      entrepriseId={entreprise.id}
                      chantierId={chantierId}
                      onSaved={(id) => {
                        toast({
                          title: "✅ Facture enregistrée",
                          description: "L'extraction OCR a réussi",
                        });
                        setOpen(false);
                        onUpdate();
                      }}
                    />
                  </div>
                )}
                
                <div className="text-center text-sm text-muted-foreground my-4">
                  — ou —
                </div>
                
                <form onSubmit={handleSubmit}>
                  <div className="space-y-4">
                    <p className="text-sm font-semibold">Option 2 : Saisie manuelle</p>

                      <div className="space-y-2">
                        <Label htmlFor="file">Fichier (optionnel)</Label>
                        <Input
                          id="file"
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => setFile(e.target.files?.[0] || null)}
                          disabled={loading}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="fournisseur">Fournisseur</Label>
                        <Input
                          id="fournisseur"
                          value={formData.fournisseur}
                          onChange={(e) => setFormData({ ...formData, fournisseur: e.target.value })}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="categorie">Catégorie</Label>
                        <Select
                          value={formData.categorie}
                          onValueChange={(value) => setFormData({ ...formData, categorie: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((cat) => (
                              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="montant_ht">Montant HT (€)</Label>
                          <Input
                            id="montant_ht"
                            type="number"
                            step="0.01"
                            value={formData.montant_ht}
                            onChange={(e) => setFormData({ ...formData, montant_ht: parseFloat(e.target.value) })}
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="date_facture">Date</Label>
                          <Input
                            id="date_facture"
                            type="date"
                            value={formData.date_facture}
                            onChange={(e) => setFormData({ ...formData, date_facture: e.target.value })}
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <DialogFooter>
                      <Button type="submit" disabled={loading} aria-label={labels.actions.add}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                        {labels.actions.add}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        <CardContent>
          {factures.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fournisseur</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">HT</TableHead>
                  <TableHead className="text-right">TVA</TableHead>
                  <TableHead className="text-right">TTC</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {factures.map((facture) => {
                  const montantHT = facture.montant_ht ? Number(facture.montant_ht) : 0;
                  const montantTTC = facture.montant_ttc ? Number(facture.montant_ttc) : 0;
                  const tvaPct = facture.tva_pct ? Number(facture.tva_pct) : 0;
                  const tvaMontant = facture.tva_montant ? Number(facture.tva_montant) : 0;
                  
                  return (
                    <TableRow key={facture.id}>
                      <TableCell className="font-medium">{facture.fournisseur}</TableCell>
                      <TableCell>{facture.categorie}</TableCell>
                      <TableCell>{new Date(facture.date_facture).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right font-mono">
                        {montantHT > 0 ? `${montantHT.toFixed(2)} €` : '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {tvaPct > 0 && (
                          <div>
                            <div>{tvaPct.toFixed(1)}%</div>
                            {tvaMontant > 0 && (
                              <div className="text-muted-foreground">{tvaMontant.toFixed(2)} €</div>
                            )}
                          </div>
                        )}
                        {tvaPct === 0 && '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        {montantTTC > 0 ? `${montantTTC.toFixed(2)} €` : '-'}
                      </TableCell>
                      <TableCell>
                        {facture.extraction_status === 'complete' && (
                          <Badge variant="default" className="bg-green-500">Complète</Badge>
                        )}
                        {facture.extraction_status === 'incomplete' && (
                          <Badge variant="secondary">Incomplète</Badge>
                        )}
                        {!facture.extraction_status && (
                          <Badge variant="outline">Manuelle</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleViewDetails(facture)}
                            aria-label="Voir détails"
                            title="Voir détails"
                          >
                            <Info className="h-4 w-4" aria-hidden="true" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleEdit(facture)}
                            aria-label="Modifier"
                            title="Modifier"
                          >
                            <Edit className="h-4 w-4" aria-hidden="true" />
                          </Button>
                          {facture.fichier_url && (
                            <Button variant="ghost" size="sm" asChild aria-label="Voir fichier" title="Voir fichier">
                              <a href={facture.fichier_url} target="_blank" rel="noopener noreferrer">
                                <FileText className="h-4 w-4" aria-hidden="true" />
                              </a>
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setDeleteTarget(facture.id)}
                            aria-label={labels.actions.delete}
                            title={labels.actions.delete}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              Aucune facture enregistrée. Cliquez sur "Ajouter" pour commencer.
            </p>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={handleDeleteConfirmed}
        variant="delete"
      />

      {/* Dialog d'édition */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Modifier la facture</DialogTitle>
            <DialogDescription>Corriger les données extraites automatiquement</DialogDescription>
          </DialogHeader>
          {editData && (
            <form onSubmit={handleUpdateSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-fournisseur">Fournisseur</Label>
                  <Input
                    id="edit-fournisseur"
                    value={editData.fournisseur}
                    onChange={(e) => setEditData({ ...editData, fournisseur: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-siret">SIRET</Label>
                  <Input
                    id="edit-siret"
                    value={editData.siret}
                    onChange={(e) => setEditData({ ...editData, siret: e.target.value })}
                    placeholder="123 456 789 00012"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-montant-ht">Montant HT (€)</Label>
                  <Input
                    id="edit-montant-ht"
                    type="number"
                    step="0.01"
                    value={editData.montant_ht}
                    onChange={(e) => setEditData({ ...editData, montant_ht: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-tva-pct">TVA (%)</Label>
                  <Input
                    id="edit-tva-pct"
                    type="number"
                    step="0.01"
                    value={editData.tva_pct}
                    onChange={(e) => setEditData({ ...editData, tva_pct: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-montant-ttc">Montant TTC (€)</Label>
                  <Input
                    id="edit-montant-ttc"
                    type="number"
                    step="0.01"
                    value={editData.montant_ttc}
                    onChange={(e) => setEditData({ ...editData, montant_ttc: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-categorie">Catégorie</Label>
                  <Select
                    value={editData.categorie}
                    onValueChange={(value) => setEditData({ ...editData, categorie: value })}
                  >
                    <SelectTrigger id="edit-categorie">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-date">Date</Label>
                  <Input
                    id="edit-date"
                    type="date"
                    value={editData.date_facture}
                    onChange={(e) => setEditData({ ...editData, date_facture: e.target.value })}
                    required
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit">Enregistrer</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de détails */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Détails de la facture</DialogTitle>
          </DialogHeader>
          {selectedFacture && (
            <div className="space-y-6">
              {/* Informations principales */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Fournisseur</Label>
                  <p className="font-medium text-lg">{selectedFacture.fournisseur || 'Non renseigné'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">SIRET</Label>
                  <p className="font-mono">{selectedFacture.siret || 'Non renseigné'}</p>
                </div>
              </div>

              {/* Montants */}
              <div className="border rounded-lg p-4 bg-muted/30">
                <Label className="text-sm font-semibold mb-3 block">Montants</Label>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Montant HT</p>
                    <p className="font-mono text-lg">
                      {selectedFacture.montant_ht ? `${Number(selectedFacture.montant_ht).toFixed(2)} €` : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      TVA {selectedFacture.tva_pct ? `(${Number(selectedFacture.tva_pct).toFixed(1)}%)` : ''}
                    </p>
                    <p className="font-mono text-lg">
                      {selectedFacture.tva_montant ? `${Number(selectedFacture.tva_montant).toFixed(2)} €` : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Montant TTC</p>
                    <p className="font-mono font-bold text-lg">
                      {selectedFacture.montant_ttc ? `${Number(selectedFacture.montant_ttc).toFixed(2)} €` : '-'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Métadonnées */}
              <div className="border-t pt-4">
                <Label className="text-sm font-semibold mb-3 block">Informations d'extraction</Label>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Confiance</p>
                    <p className="font-medium">
                      {selectedFacture.confiance 
                        ? `${(Number(selectedFacture.confiance) * 100).toFixed(0)}%` 
                        : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Pages</p>
                    <p className="font-medium">{selectedFacture.pages_count || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Statut</p>
                    {selectedFacture.extraction_status === 'complete' && (
                      <Badge variant="default" className="bg-green-500">Complète</Badge>
                    )}
                    {selectedFacture.extraction_status === 'incomplete' && (
                      <Badge variant="secondary">Incomplète</Badge>
                    )}
                    {!selectedFacture.extraction_status && (
                      <Badge variant="outline">Manuelle</Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* JSON brut */}
              {selectedFacture.extraction_json && (
                <Collapsible>
                  <CollapsibleTrigger className="text-sm text-muted-foreground hover:text-foreground underline">
                    Voir les données brutes (JSON)
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <pre className="bg-muted p-4 rounded-lg overflow-auto max-h-64 text-xs mt-2">
                      {JSON.stringify(selectedFacture.extraction_json, null, 2)}
                    </pre>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default InvoiceManager;
