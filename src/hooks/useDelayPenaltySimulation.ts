import { useMemo } from 'react';
import { addDays } from 'date-fns';
import { ChantierMetrics } from './useChantierMetrics';

export interface TieredPenalty {
  minDays: number;
  maxDays: number;
  amountPerDay: number;
}

export interface SimulationParams {
  metrics: ChantierMetrics | null;
  delayDays: number;
  penaltyType: 'percentage' | 'fixed' | 'tiered';
  penaltyValue: number;
  tieredRates?: TieredPenalty[];
}

export interface SimulationResult {
  penaltyAmount: number;
  additionalLaborCost: number;
  totalAdditionalCost: number;
  finalMarginWithDelay: number;
  finalProfitabilityWithDelay: number;
  profitabilityChange: number;
  criticalDelayDays: number;
  recommendations: string[];
  newEndDate: Date | null;
  contractEndDate: Date | null;
}

const calculateTieredPenalty = (days: number, rates: TieredPenalty[]): number => {
  let total = 0;
  
  for (const tier of rates) {
    if (days <= 0) break;
    
    const applicableDays = Math.min(
      Math.max(0, days - tier.minDays + 1),
      tier.maxDays - tier.minDays + 1
    );
    
    if (applicableDays > 0) {
      total += applicableDays * tier.amountPerDay;
    }
  }
  
  return total;
};

const findCriticalDay = (
  baseMargin: number,
  budgetHt: number,
  dailyTeamCost: number,
  penaltyType: 'percentage' | 'fixed' | 'tiered',
  penaltyValue: number,
  tieredRates?: TieredPenalty[]
): number => {
  // Chercher le jour où la marge devient négative
  for (let d = 1; d <= 100; d++) {
    let penalty = 0;
    
    switch (penaltyType) {
      case 'percentage':
        penalty = (budgetHt * penaltyValue / 100) * d;
        break;
      case 'fixed':
        penalty = penaltyValue * d;
        break;
      case 'tiered':
        penalty = tieredRates ? calculateTieredPenalty(d, tieredRates) : 0;
        break;
    }
    
    const additionalLabor = dailyTeamCost * d;
    const margin = baseMargin - penalty - additionalLabor;
    
    if (margin <= 0) {
      return d - 1;
    }
  }
  
  return 100; // Plus de 100 jours
};

const generateRecommendations = (
  profitabilityWithDelay: number,
  criticalDays: number,
  delayDays: number,
  penaltyAmount: number
): string[] => {
  const recommendations: string[] = [];
  
  if (profitabilityWithDelay < 0) {
    recommendations.push('🚨 URGENT : Le projet est en déficit. Actions correctives immédiates requises.');
    recommendations.push('Envisager une renégociation du contrat ou accélération drastique.');
  } else if (profitabilityWithDelay < 5) {
    recommendations.push('⚠️ ALERTE : Rentabilité très faible. Risque de déficit imminent.');
    recommendations.push('Mettre en place un plan d\'accélération pour rattraper le retard.');
  } else if (profitabilityWithDelay < 10) {
    recommendations.push('⚠️ ATTENTION : Rentabilité en zone critique.');
    recommendations.push('Surveiller de près l\'avancement et prévoir des mesures préventives.');
  }
  
  if (delayDays >= criticalDays - 2 && criticalDays < 100) {
    recommendations.push(`⏰ Point critique à ${criticalDays} jours de retard. Vous êtes très proche !`);
  } else if (criticalDays < 100) {
    recommendations.push(`📊 Point critique estimé à ${criticalDays} jours de retard.`);
  }
  
  if (penaltyAmount > 1000) {
    recommendations.push(`💰 Pénalités importantes (${penaltyAmount.toFixed(0)}€). Prévoir une provision budgétaire.`);
  }
  
  if (recommendations.length === 0) {
    recommendations.push('✅ Le projet reste rentable malgré le retard simulé.');
    recommendations.push('💡 Continuer à surveiller l\'avancement pour éviter les dépassements.');
  }
  
  return recommendations;
};

export function useDelayPenaltySimulation(params: SimulationParams): SimulationResult {
  return useMemo(() => {
    const { metrics, delayDays, penaltyType, penaltyValue, tieredRates } = params;
    
    // Valeurs par défaut si pas de métriques
    if (!metrics) {
      return {
        penaltyAmount: 0,
        additionalLaborCost: 0,
        totalAdditionalCost: 0,
        finalMarginWithDelay: 0,
        finalProfitabilityWithDelay: 0,
        profitabilityChange: 0,
        criticalDelayDays: 0,
        recommendations: ['Aucune métrique disponible pour simuler'],
        newEndDate: null,
        contractEndDate: null,
      };
    }
    
    // 1. Calcul de la pénalité selon le type
    let penaltyAmount = 0;
    switch (penaltyType) {
      case 'percentage':
        penaltyAmount = (metrics.budget_ht * penaltyValue / 100) * delayDays;
        break;
      case 'fixed':
        penaltyAmount = penaltyValue * delayDays;
        break;
      case 'tiered':
        penaltyAmount = tieredRates ? calculateTieredPenalty(delayDays, tieredRates) : 0;
        break;
    }
    
    // 2. Coût additionnel de main d'œuvre
    const additionalLaborCost = metrics.cout_journalier_equipe * delayDays;
    
    // 3. Coût total additionnel
    const totalAdditionalCost = penaltyAmount + additionalLaborCost;
    
    // 4. Impact sur la marge finale
    const finalMarginWithDelay = metrics.marge_finale - totalAdditionalCost;
    const finalProfitabilityWithDelay = metrics.budget_ht > 0
      ? (finalMarginWithDelay / metrics.budget_ht) * 100
      : 0;
    
    // 5. Changement de rentabilité
    const profitabilityChange = finalProfitabilityWithDelay - metrics.marge_finale_pct;
    
    // 6. Calcul du point critique
    const criticalDelayDays = findCriticalDay(
      metrics.marge_finale,
      metrics.budget_ht,
      metrics.cout_journalier_equipe,
      penaltyType,
      penaltyValue,
      tieredRates
    );
    
    // 7. Dates
    const contractEndDate = metrics.date_debut && metrics.duree_estimee_jours
      ? addDays(new Date(metrics.date_debut), metrics.duree_estimee_jours)
      : null;
    
    const newEndDate = contractEndDate
      ? addDays(contractEndDate, delayDays)
      : null;
    
    // 8. Recommandations
    const recommendations = generateRecommendations(
      finalProfitabilityWithDelay,
      criticalDelayDays,
      delayDays,
      penaltyAmount
    );
    
    return {
      penaltyAmount,
      additionalLaborCost,
      totalAdditionalCost,
      finalMarginWithDelay,
      finalProfitabilityWithDelay,
      profitabilityChange,
      criticalDelayDays,
      recommendations,
      newEndDate,
      contractEndDate,
    };
  }, [params.metrics, params.delayDays, params.penaltyType, params.penaltyValue, params.tieredRates]);
}
