import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ChantierMetrics } from '@/hooks/useChantierMetrics';
import { useDelayPenaltySimulation, TieredPenalty } from '@/hooks/useDelayPenaltySimulation';
import { PenaltyChart } from './PenaltyChart';
import { PenaltyComparison } from './PenaltyComparison';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AlertTriangle, Save, FileText } from 'lucide-react';

interface DelayPenaltySimulatorProps {
  chantierId: string;
  metrics: ChantierMetrics | null;
  onSavePenalty?: (delayDays: number) => void;
}

export default function DelayPenaltySimulator({ chantierId, metrics, onSavePenalty }: DelayPenaltySimulatorProps) {
  const { user } = useAuth();
  const [delayDays, setDelayDays] = useState(1);
  const [penaltyType, setPenaltyType] = useState<'percentage' | 'fixed' | 'tiered'>('percentage');
  const [penaltyValue, setPenaltyValue] = useState(0.5);
  const [saving, setSaving] = useState(false);
  
  // Taux par paliers par défaut (CCAG)
  const tieredRates: TieredPenalty[] = [
    { minDays: 1, maxDays: 5, amountPerDay: 200 },
    { minDays: 6, maxDays: 15, amountPerDay: 500 },
    { minDays: 16, maxDays: 100, amountPerDay: 1000 },
  ];
  
  const simulation = useDelayPenaltySimulation({
    metrics,
    delayDays,
    penaltyType,
    penaltyValue,
    tieredRates: penaltyType === 'tiered' ? tieredRates : undefined,
  });
  
  const handleSavePenalty = async () => {
    if (!user || !metrics) {
      toast.error('Erreur : utilisateur ou métriques non disponibles');
      return;
    }
    
    try {
      setSaving(true);
      
      // Récupérer l'entreprise_id
      const { data: entreprise } = await supabase
        .from('entreprises')
        .select('id')
        .eq('proprietaire_user_id', user.id)
        .single();
      
      if (!entreprise) {
        toast.error('Entreprise non trouvée');
        return;
      }
      
      // Enregistrer dans frais_chantier
      const { error } = await supabase
        .from('frais_chantier')
        .insert({
          chantier_id: chantierId,
          type_frais: 'Pénalité de retard ⏳',
          montant_total: simulation.penaltyAmount,
          date_frais: new Date().toISOString().split('T')[0],
          description: `Pénalité pour ${delayDays} jours de retard (${penaltyType === 'percentage' ? `${penaltyValue}%/jour` : penaltyType === 'fixed' ? `${penaltyValue}€/jour` : 'paliers'})`,
          entreprise_id: entreprise.id,
        });
      
      if (error) throw error;
      
      toast.success('Pénalité enregistrée avec succès');
      if (onSavePenalty) onSavePenalty(delayDays);
    } catch (error: any) {
      console.error('Erreur enregistrement pénalité:', error);
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };
  
  if (!metrics) {
    return (
      <Card>
        <CardContent className="pt-16 pb-16 text-center">
          <AlertTriangle className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <p className="text-xl font-semibold text-muted-foreground">
            Aucune métrique disponible
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>📋 Configuration de la Simulation</CardTitle>
          <CardDescription>
            Simulez l'impact financier d'un retard sur votre projet
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Type de pénalité */}
            <div className="space-y-2">
              <Label>Type de pénalité</Label>
              <Select value={penaltyType} onValueChange={(v: any) => setPenaltyType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Pourcentage du montant HT (/jour)</SelectItem>
                  <SelectItem value="fixed">Montant fixe par jour de retard</SelectItem>
                  <SelectItem value="tiered">Paliers progressifs (CCAG)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Valeur de la pénalité */}
            {penaltyType !== 'tiered' && (
              <div className="space-y-2">
                <Label>
                  {penaltyType === 'percentage' ? 'Taux (% par jour)' : 'Montant (€ par jour)'}
                </Label>
                <Input
                  type="number"
                  step={penaltyType === 'percentage' ? '0.1' : '10'}
                  value={penaltyValue}
                  onChange={(e) => setPenaltyValue(parseFloat(e.target.value) || 0)}
                  placeholder={penaltyType === 'percentage' ? '0.5' : '500'}
                />
              </div>
            )}
            
            {penaltyType === 'tiered' && (
              <div className="space-y-2">
                <Label>Paliers CCAG par défaut</Label>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>• J1-5 : 200€/jour</p>
                  <p>• J6-15 : 500€/jour</p>
                  <p>• J16+ : 1000€/jour</p>
                </div>
              </div>
            )}
          </div>
          
          {/* Slider de retard */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label>Retard simulé (jours ouvrés)</Label>
              <span className="text-2xl font-black text-primary">{delayDays} jours</span>
            </div>
            <Slider
              value={[delayDays]}
              onValueChange={(v) => setDelayDays(v[0])}
              min={0}
              max={30}
              step={1}
              className="py-4"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0 jours</span>
              <span>15 jours</span>
              <span>30 jours</span>
            </div>
          </div>
          
          {/* Dates */}
          {simulation.contractEndDate && simulation.newEndDate && (
            <div className="grid md:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Date de fin contractuelle</p>
                <p className="font-semibold">
                  {format(simulation.contractEndDate, 'dd MMMM yyyy', { locale: fr })}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Nouvelle date de fin estimée</p>
                <p className="font-semibold text-orange-600">
                  {format(simulation.newEndDate, 'dd MMMM yyyy', { locale: fr })}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Comparaison */}
      <PenaltyComparison 
        metrics={metrics} 
        simulation={simulation} 
        delayDays={delayDays}
      />
      
      {/* Graphique */}
      <PenaltyChart 
        metrics={metrics}
        penaltyType={penaltyType}
        penaltyValue={penaltyValue}
        tieredRates={penaltyType === 'tiered' ? tieredRates : undefined}
      />
      
      {/* Alertes & Recommandations */}
      <Card>
        <CardHeader>
          <CardTitle>🚨 Alertes & Recommandations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {simulation.recommendations.map((rec, idx) => (
            <Alert key={idx} variant={rec.includes('🚨') || rec.includes('⚠️') ? 'destructive' : 'default'}>
              <AlertDescription>{rec}</AlertDescription>
            </Alert>
          ))}
          
          {simulation.criticalDelayDays < 100 && (
            <Alert>
              <AlertDescription>
                <strong>Point critique :</strong> Au-delà de {simulation.criticalDelayDays} jours de retard, 
                le projet devient déficitaire.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
      
      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>⚡ Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button
            onClick={handleSavePenalty}
            disabled={saving || simulation.penaltyAmount === 0}
            variant="destructive"
          >
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Enregistrement...' : 'Enregistrer pénalité réelle'}
          </Button>
          
          <Button variant="outline" disabled>
            <FileText className="mr-2 h-4 w-4" />
            Générer rapport PDF
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
