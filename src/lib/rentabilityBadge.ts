/**
 * Système de badges de rentabilité basé sur la marge brute
 * Inspiré des standards BTP pour PME/TPE (marge moyenne ~28%)
 */

export interface RentabilityBadge {
  label: string;
  emoji: string;
  color: string;
  bgColor: string;
  urgency: 'none' | 'low' | 'medium' | 'high' | 'critical';
  message: string;
}

/**
 * Retourne le badge de rentabilité selon le pourcentage de marge brute
 */
export const getRentabilityBadge = (profitabilityPct: number): RentabilityBadge => {
  // 🟢 Rentabilité Optimale (≥ 30%)
  if (profitabilityPct >= 30) {
    return {
      label: 'Rentabilité Optimale',
      emoji: '🟢',
      color: 'text-green-700 dark:text-green-300',
      bgColor: 'bg-green-100 dark:bg-green-900/30 border-green-500',
      urgency: 'none',
      message: 'Marge excellente ! Chantier très rentable. Continuez ainsi.'
    };
  }

  // 🟡 Rentabilité Standard (20-29.99%)
  if (profitabilityPct >= 20) {
    return {
      label: 'Rentabilité Standard',
      emoji: '🟡',
      color: 'text-yellow-700 dark:text-yellow-300',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-500',
      urgency: 'low',
      message: 'Marge correcte dans la norme BTP. Restez vigilant sur les coûts.'
    };
  }

  // 🟠 Rentabilité Faible (10-19.99%)
  if (profitabilityPct >= 10) {
    return {
      label: 'Rentabilité Faible',
      emoji: '🟠',
      color: 'text-orange-700 dark:text-orange-300',
      bgColor: 'bg-orange-100 dark:bg-orange-900/30 border-orange-500',
      urgency: 'medium',
      message: 'Marge faible. Attention : un imprévu peut basculer en déficit.'
    };
  }

  // 🔴 Rentabilité Critique (3-9.99%)
  if (profitabilityPct >= 3) {
    return {
      label: 'Rentabilité Critique',
      emoji: '🔴',
      color: 'text-red-700 dark:text-red-300',
      bgColor: 'bg-red-100 dark:bg-red-900/30 border-red-500',
      urgency: 'high',
      message: '⚠️ ALERTE : Marge très faible. Risque de déficit imminent !'
    };
  }

  // ⚪ Rentabilité Nulle (0-2.99%)
  if (profitabilityPct >= 0) {
    return {
      label: 'Rentabilité Nulle',
      emoji: '⚪',
      color: 'text-gray-700 dark:text-gray-300',
      bgColor: 'bg-gray-100 dark:bg-gray-900/30 border-gray-500',
      urgency: 'high',
      message: '⚠️ Point mort atteint. Aucun profit. Chantier non rentable.'
    };
  }

  // ⚫ En Déficit (< 0%)
  return {
    label: 'En Déficit',
    emoji: '⚫',
    color: 'text-black dark:text-white',
    bgColor: 'bg-black/10 dark:bg-white/10 border-black dark:border-white',
    urgency: 'critical',
    message: '🚨 DÉFICIT : Le chantier perd de l\'argent !'
  };
};
