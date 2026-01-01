/**
 * Définition des effets spéciaux (Keywords)
 * Fichier : src/config/keywords.js
 */

export const KEYWORDS = {
  // --- DEFENSE ---
  MUR: {
    description: "+2 VAEP en phase défensive.",
    apply: (power, isAttacker) => (!isAttacker ? power + 2 : power)
  },
  ARRET: {
    description: "Bonus massif pour les Gardiens lors d'un duel de dernier recours.",
    apply: (power, isAttacker) => (!isAttacker ? power + 3 : power)
  },
  SOLIDE: {
    description: "Ne peut pas être épuisé (#exhausted) après un duel perdu.",
    apply: (power) => power // Effet passif géré dans actions.js
  },

  // --- ATTAQUE ---
  DRIBBLEUR: {
    description: "Ignore le premier défenseur lors d'une attaque.",
    apply: (power, isAttacker) => (isAttacker ? power + 1 : power)
  },
  FINITION: {
    description: "Abaisse le seuil de BUT à une marge de +3 au lieu de +5.",
    apply: (power) => power // Effet de résolution géré dans combat.js
  },
  VITESSE: {
    description: "Peut attaquer immédiatement après avoir été jouée (ignore le délai).",
    apply: (power) => power
  }
};
