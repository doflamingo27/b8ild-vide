import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { ChantierMetrics } from '@/hooks/useChantierMetrics';
import { SimulationResult } from '@/hooks/useDelayPenaltySimulation';

interface PenaltyComparisonProps {
  metrics: ChantierMetrics | null;
  simulation: SimulationResult;
  delayDays: number;
}

const getRentabilityBadge = (pct: number) => {
  if (pct >= 30) return { label: '🟢 Rentabilité Optimale', variant: 'default' as const, color: 'text-green-600' };
  if (pct >= 20) return { label: '🟡 Rentabilité Standard', variant: 'secondary' as const, color: 'text-yellow-600' };
  if (pct >= 10) return { label: '🟠 Rentabilité Faible', variant: 'secondary' as const, color: 'text-orange-600' };
  if (pct >= 3) return { label: '🔴 Rentabilité Critique', variant: 'destructive' as const, color: 'text-red-600' };
  if (pct >= 0) return { label: '⚪ Rentabilité Nulle', variant: 'outline' as const, color: 'text-gray-600' };
  return { label: '⚫ En Déficit', variant: 'destructive' as const, color: 'text-black' };
};

export function PenaltyComparison({ metrics, simulation, delayDays }: PenaltyComparisonProps) {
  if (!metrics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Comparaison Sans/Avec Retard</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Aucune donnée disponible
          </p>
        </CardContent>
      </Card>
    );
  }
  
  const withoutDelay = {
    budget: metrics.budget_ht,
    costs: metrics.budget_ht - metrics.marge_finale,
    penalty: 0,
    laborCost: 0,
    margin: metrics.marge_finale,
    profitability: metrics.marge_finale_pct,
  };
  
  const withDelay = {
    budget: metrics.budget_ht,
    costs: metrics.budget_ht - simulation.finalMarginWithDelay,
    penalty: simulation.penaltyAmount,
    laborCost: simulation.additionalLaborCost,
    margin: simulation.finalMarginWithDelay,
    profitability: simulation.finalProfitabilityWithDelay,
  };
  
  const costIncreasePct = withoutDelay.costs > 0 
    ? ((withDelay.costs - withoutDelay.costs) / withoutDelay.costs) * 100 
    : 0;
  
  const marginDecreasePct = withoutDelay.margin > 0
    ? ((withDelay.margin - withoutDelay.margin) / withoutDelay.margin) * 100
    : 0;
  
  const withoutDelayBadge = getRentabilityBadge(withoutDelay.profitability);
  const withDelayBadge = getRentabilityBadge(withDelay.profitability);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>📊 Comparaison Sans/Avec Retard</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Sans Retard */}
          <div className="space-y-4 p-6 rounded-lg bg-muted/30 border-2 border-green-500/20">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">✅ Sans Retard</h3>
              <Badge variant={withoutDelayBadge.variant} className={withoutDelayBadge.color}>
                {withoutDelayBadge.label.split(' ')[1]}
              </Badge>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Budget HT</span>
                <span className="font-semibold">{withoutDelay.budget.toFixed(2)} €</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">Coûts totaux</span>
                <span className="font-semibold">{withoutDelay.costs.toFixed(2)} €</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pénalités</span>
                <span className="font-semibold">{withoutDelay.penalty.toFixed(2)} €</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">Coût équipe (retard)</span>
                <span className="font-semibold">-</span>
              </div>
              
              <div className="h-px bg-border my-2" />
              
              <div className="flex justify-between">
                <span className="font-medium">Marge finale</span>
                <span className="font-bold text-lg">{withoutDelay.margin.toFixed(2)} €</span>
              </div>
              
              <div className="flex justify-between">
                <span className="font-medium">Rentabilité finale</span>
                <span className={`font-bold text-lg ${withoutDelayBadge.color}`}>
                  {withoutDelayBadge.label.split(' ')[0]} {withoutDelay.profitability.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
          
          {/* Avec Retard */}
          <div className="space-y-4 p-6 rounded-lg bg-muted/30 border-2 border-orange-500/20">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">⚠️ Avec Retard ({delayDays}j)</h3>
              <Badge variant={withDelayBadge.variant} className={withDelayBadge.color}>
                {withDelayBadge.label.split(' ')[1]}
              </Badge>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Budget HT</span>
                <span className="font-semibold">{withDelay.budget.toFixed(2)} €</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Coûts totaux</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{withDelay.costs.toFixed(2)} €</span>
                  <Badge variant="destructive" className="text-xs">
                    <ArrowUp className="h-3 w-3 mr-1" />
                    +{costIncreasePct.toFixed(1)}%
                  </Badge>
                </div>
              </div>
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pénalités</span>
                <span className="font-semibold text-red-600">{withDelay.penalty.toFixed(2)} €</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">Coût équipe (retard)</span>
                <span className="font-semibold text-orange-600">{withDelay.laborCost.toFixed(2)} €</span>
              </div>
              
              <div className="h-px bg-border my-2" />
              
              <div className="flex justify-between items-center">
                <span className="font-medium">Marge finale</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-lg">{withDelay.margin.toFixed(2)} €</span>
                  <Badge variant="destructive" className="text-xs">
                    <ArrowDown className="h-3 w-3 mr-1" />
                    {marginDecreasePct.toFixed(1)}%
                  </Badge>
                </div>
              </div>
              
              <div className="flex justify-between">
                <span className="font-medium">Rentabilité finale</span>
                <span className={`font-bold text-lg ${withDelayBadge.color}`}>
                  {withDelayBadge.label.split(' ')[0]} {withDelay.profitability.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
