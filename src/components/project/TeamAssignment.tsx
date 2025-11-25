import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Users, Loader2, Edit } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface TeamAssignmentProps {
  chantierId: string;
  membres: any[];
  onUpdate: () => void;
  coutJournalier: number;
  validatedDelayDays?: number;
}

interface MembreSelection {
  id: string;
  jours_travailles: number;
}

const TeamAssignment = ({ chantierId, membres, onUpdate, coutJournalier, validatedDelayDays }: TeamAssignmentProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [availableMembers, setAvailableMembers] = useState<any[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<MembreSelection[]>([]);
  const [editingMember, setEditingMember] = useState<any>(null);
  const [editJours, setEditJours] = useState(0);
  const [entrepriseId, setEntrepriseId] = useState<string | null>(null);

  useEffect(() => {
    loadAvailableMembers();
  }, []);

  // Subscription Realtime pour équipe_chantier
  useEffect(() => {
    if (!chantierId) return;

    const channel = supabase
      .channel(`equipe_chantier:${chantierId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'equipe_chantier',
          filter: `chantier_id=eq.${chantierId}`,
        },
        () => {
          console.log('[TeamAssignment] Changement détecté, rechargement...');
          if (onUpdate) onUpdate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chantierId, onUpdate]);

  const loadAvailableMembers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: entreprise } = await supabase
        .from("entreprises")
        .select("id")
        .eq("proprietaire_user_id", user.id)
        .single();

      if (!entreprise) return;
      setEntrepriseId(entreprise.id);

      const { data } = await supabase
        .from("membres_equipe")
        .select("*")
        .eq("entreprise_id", entreprise.id)
        .in("statut", ['sur_chantier', 'disponible']);

      setAvailableMembers(data || []);
    } catch (error) {
      console.error("Erreur chargement membres:", error);
    }
  };

  const handleToggleMember = (membreId: string) => {
    setSelectedMembers(prev => {
      const exists = prev.find(m => m.id === membreId);
      if (exists) {
        return prev.filter(m => m.id !== membreId);
      } else {
        return [...prev, { id: membreId, jours_travailles: 1 }];
      }
    });
  };

  const handleJoursChange = (membreId: string, jours: number) => {
    setSelectedMembers(prev =>
      prev.map(m => m.id === membreId ? { ...m, jours_travailles: Math.max(1, jours) } : m)
    );
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Supprimer les anciennes affectations
      await supabase
        .from("equipe_chantier")
        .delete()
        .eq("chantier_id", chantierId);

      // Ajouter les nouvelles affectations avec jours
      const newAssignments = selectedMembers.map(m => ({
        chantier_id: chantierId,
        membre_id: m.id,
        jours_travailles: m.jours_travailles,
      }));

      if (newAssignments.length > 0) {
        const { error } = await supabase
          .from("equipe_chantier")
          .insert(newAssignments);

        if (error) throw error;
      }

      toast({
        title: "Succès",
        description: "L'équipe a été mise à jour",
      });

      setOpen(false);
      setSelectedMembers([]);
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditJours = async () => {
    try {
      const { error } = await supabase
        .from("equipe_chantier")
        .update({ jours_travailles: editJours })
        .eq("chantier_id", chantierId)
        .eq("membre_id", editingMember.id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Nombre de jours mis à jour",
      });

      setEditOpen(false);
      setEditingMember(null);
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRemoveMember = async (membreId: string) => {
    try {
      const { error } = await supabase
        .from("equipe_chantier")
        .delete()
        .eq("chantier_id", chantierId)
        .eq("membre_id", membreId);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Membre retiré de l'équipe",
      });
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const calculerCoutJournalierMembre = (membre: any) => {
    const coutHoraireReel = membre.taux_horaire * (1 + membre.charges_salariales / 100 + membre.charges_patronales / 100);
    return coutHoraireReel * 8;
  };

  // Calculs pour le récap équipe
  const coutJournalierTotal = membres.reduce((sum, m) => sum + calculerCoutJournalierMembre(m), 0);
  const joursTravauillesTotal = membres.reduce((sum, m) => sum + (m.jours_travailles || 0), 0);
  const coutTotalEquipe = membres.reduce((sum, m) => {
    return sum + (calculerCoutJournalierMembre(m) * (m.jours_travailles || 0));
  }, 0);

  return (
    <>
      {/* Récapitulatif financier équipe */}
      {membres.length > 0 && (
        <Card className="mb-4 bg-gradient-to-br from-blue-500/5 to-purple-500/10 border-blue-500/20">
          <CardHeader>
            <CardTitle className="text-lg">👥 Récapitulatif Équipe</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-6">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground font-medium">Coût total / jour</p>
                <p className="text-3xl font-black text-blue-600">{coutJournalierTotal.toFixed(2)} €/j</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground font-medium">Jours travaillés totaux</p>
                <p className="text-3xl font-black text-foreground">{joursTravauillesTotal} j</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground font-medium">Coût total équipe</p>
                <p className="text-3xl font-black text-purple-600">{coutTotalEquipe.toFixed(2)} €</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Équipe affectée</CardTitle>
            <CardDescription>
              Coût journalier total : {coutJournalier.toFixed(2)} €
            </CardDescription>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Affecter des membres
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Affecter des membres à l'équipe</DialogTitle>
                <DialogDescription>
                  Sélectionnez les membres à affecter à ce chantier
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {availableMembers.map((membre) => {
                  const selected = selectedMembers.find(m => m.id === membre.id);
                  return (
                    <div key={membre.id} className="space-y-2 p-3 border rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={membre.id}
                          checked={!!selected}
                          onCheckedChange={() => handleToggleMember(membre.id)}
                        />
                        <label
                          htmlFor={membre.id}
                          className="flex-1 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {membre.prenom} {membre.nom} - {membre.poste}
                          <span className="text-muted-foreground ml-2">
                            ({calculerCoutJournalierMembre(membre).toFixed(2)} €/j)
                          </span>
                        </label>
                      </div>
                      {selected && (
                        <div className="ml-6 flex items-center gap-2">
                          <Label htmlFor={`jours-${membre.id}`} className="text-xs">Jours :</Label>
                          <Input
                            id={`jours-${membre.id}`}
                            type="number"
                            min="1"
                            value={selected.jours_travailles}
                            onChange={(e) => handleJoursChange(membre.id, parseInt(e.target.value) || 1)}
                            className="w-20 h-8"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <DialogFooter>
                <Button onClick={handleSubmit} disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Valider
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        {membres.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Poste</TableHead>
                <TableHead className="text-right">Coût journalier</TableHead>
                <TableHead className="text-right">Jours planifiés</TableHead>
                {validatedDelayDays && validatedDelayDays > 0 && (
                  <TableHead className="text-right text-orange-600 font-bold">Retards</TableHead>
                )}
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {membres.map((membre) => (
                <TableRow key={membre.id}>
                  <TableCell className="font-medium">
                    {membre.prenom} {membre.nom}
                  </TableCell>
                  <TableCell>{membre.poste}</TableCell>
                  <TableCell className="text-right font-mono">
                    {calculerCoutJournalierMembre(membre).toFixed(2)} €
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {membre.jours_travailles || 0} j
                  </TableCell>
                  {validatedDelayDays && validatedDelayDays > 0 && (
                    <TableCell className="text-right font-mono text-orange-600 font-bold">
                      +{validatedDelayDays} j
                    </TableCell>
                  )}
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          setEditingMember(membre);
                          setEditJours(membre.jours_travailles || 0);
                          setEditOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleRemoveMember(membre.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-muted-foreground text-center py-8">
            <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
            Aucun membre affecté. Cliquez sur "Affecter des membres" pour commencer.
          </p>
        )}

        {/* Dialog d'édition des jours */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Modifier les jours travaillés</DialogTitle>
              <DialogDescription>
                {editingMember && `${editingMember.prenom} ${editingMember.nom}`}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-jours">Nombre de jours</Label>
                <Input
                  id="edit-jours"
                  type="number"
                  min="1"
                  value={editJours}
                  onChange={(e) => setEditJours(parseInt(e.target.value) || 1)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleEditJours}>
                Valider
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
    </>
  );
};

export default TeamAssignment;
