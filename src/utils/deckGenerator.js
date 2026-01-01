import { GAME_RULES } from '../config/rules';

/**
 * Génère un deck valide (1 GK + 15 Joueurs, Budget <= 100M)
 * @param {Array} db - La base de données complète des joueurs
 */
export const generateOpponentDeck = (db) => {
  let deck = [];
  let budget = GAME_RULES.BUDGET_CAP; // 100
  let attempts = 0;

  // Sécurité pour éviter une boucle infinie
  while (attempts < 1000) {
    attempts++;
    
    // 1. Mélanger la DB
    const shuffled = [...db].sort(() => 0.5 - Math.random());
    
    // 2. Trouver un Gardien (GK)
    const gk = shuffled.find(p => p.pos === 'GK' || p.pos === 'Gardien');
    if (!gk) continue;

    // 3. Remplir le reste (15 joueurs) en évitant le GK déjà pris
    const fieldPlayers = shuffled.filter(p => p.id !== gk.id).slice(0, 15);
    
    const potentialDeck = [gk, ...fieldPlayers];
    const totalCost = potentialDeck.reduce((sum, p) => sum + p.cost, 0);

    // 4. Vérifier le budget
    if (totalCost <= budget) {
      return potentialDeck;
    }
  }

  // Fallback si l'algo ne trouve pas (renvoie les 16 premiers bon marché)
  console.warn("Deck aléatoire complexe échoué, utilisation du fallback.");
  return db.sort((a, b) => a.cost - b.cost).slice(0, 16);
};
