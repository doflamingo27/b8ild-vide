import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChantierMetrics } from '@/hooks/useChantierMetrics';
import { TieredPenalty } from '@/hooks/useDelayPenaltySimulation';

interface PenaltyChartProps {
  metrics: ChantierMetrics | null;
  penaltyType: 'percentage' | 'fixed' | 'tiered';
  penaltyValue: number;
  tieredRates?: TieredPenalty[];
}

const calculateMarginForDelay = (
  days: number,
  metrics: ChantierMetrics,
  penaltyType: string,
  penaltyValue: number,
  tieredRates?: TieredPenalty[]
): number => {
  let penalty = 0;
  
  switch (penaltyType) {
    case 'percentage':
      penalty = (metrics.budget_ht * penaltyValue / 100) * days;
      break;
    case 'fixed':
      penalty = penaltyValue * days;
      break;
    case 'tiered':
      if (tieredRates) {
        for (const tier of tieredRates) {
          if (days <= 0) break;
          const applicableDays = Math.min(
            Math.max(0, days - tier.minDays + 1),
            tier.maxDays - tier.minDays + 1
          );
          if (applicableDays > 0) {
            penalty += applicableDays * tier.amountPerDay;
          }
        }
      }
      break;
  }
  
  const additionalLabor = metrics.cout_journalier_equipe * days;
  return metrics.marge_finale - penalty - additionalLabor;
};

export function PenaltyChart({ metrics, penaltyType, penaltyValue, tieredRates }: PenaltyChartProps) {
  if (!metrics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Impact du Retard sur la Marge</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Aucune donnée disponible
          </p>
        </CardContent>
      </Card>
    );
  }
  
  // Générer les données pour 0 à 30 jours
  const data = [];
  for (let days = 0; days <= 30; days++) {
    const margin = calculateMarginForDelay(days, metrics, penaltyType, penaltyValue, tieredRates);
    data.push({
      days,
      margin: Math.round(margin),
    });
  }
  
  // Trouver le point critique (premier jour où la marge devient négative)
  const criticalPoint = data.find(d => d.margin <= 0);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>📈 Impact du Retard sur la Marge Finale</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="days" 
              label={{ value: 'Jours de retard', position: 'insideBottom', offset: -5 }}
              className="text-sm"
            />
            <YAxis 
              label={{ value: 'Marge (€)', angle: -90, position: 'insideLeft' }}
              className="text-sm"
            />
            <Tooltip 
              formatter={(value: number) => [`${value.toFixed(0)} €`, 'Marge finale']}
              labelFormatter={(label) => `${label} jours de retard`}
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))', 
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
            />
            <ReferenceLine y={0} stroke="hsl(var(--destructive))" strokeDasharray="3 3" />
            {criticalPoint && (
              <ReferenceLine 
                x={criticalPoint.days} 
                stroke="hsl(var(--warning))" 
                strokeDasharray="5 5"
                label={{ value: 'Point critique', position: 'top' }}
              />
            )}
            <Line 
              type="monotone" 
              dataKey="margin" 
              stroke="hsl(var(--primary))" 
              strokeWidth={3}
              dot={{ fill: 'hsl(var(--primary))', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
        
        <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
          <div className="space-y-1">
            <p className="text-muted-foreground">🟢 Zone rentable</p>
            <p className="font-medium">Marge {'>'} 10% budget</p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground">🟡 Zone critique</p>
            <p className="font-medium">Marge 0-10% budget</p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground">🔴 Déficit</p>
            <p className="font-medium">Marge {'<'} 0</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
