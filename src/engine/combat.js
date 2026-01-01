/**
 * Logique de résolution des affrontements VAEP
 * Fichier : src/engine/combat.js
 */
import { KEYWORDS } from '../config/keywords';
import { GAME_RULES } from '../config/rules';

/**
 * Calcule la puissance finale d'une carte
 */
/**
 * Logique de calcul de puissance
 * Fichier : src/engine/combat.js
 */
export const calculateTotalPower = (card, opponentField, isAttacker) => {
  let power = card.vaep || 5; // Valeur par défaut si erreur
  
  // Bonus d'attaque : +1 par carte retournée adverse
  if (isAttacker && opponentField) {
    const flippedCards = opponentField.filter(c => c.isFlipped).length;
    power += flippedCards;
  }
  
  return power;
};

/**
 * Résout un duel et détermine s'il y a BUT
 * @returns {Object} { winner, margin, isGoal }
 */
export const resolveDuel = (attacker, defender, diceRoll = 0) => {
  const atkPower = calculatePower(attacker, true) + (diceRoll / 2);
  const defPower = calculatePower(defender, false);

  const margin = atkPower - defPower;

  // Utilisation de la règle MOMENTUM_THRESHOLD pour le score
  const goalThreshold = GAME_RULES.MOMENTUM_THRESHOLD; 

  return {
    winner: margin > 0 ? 'attacker' : (margin < 0 ? 'defender' : 'draw'),
    margin: margin,
    // Un but est marqué si la marge dépasse le seuil défini dans rules.js
    isGoal: margin >= goalThreshold 
  };
};
