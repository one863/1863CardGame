import { calculateTotalPower } from "./combat";
import { GAME_RULES } from "../config/rules";

/**
 * --- UTILITAIRE : JOURNAL DE MATCH ---
 * Ajoute un message en haut de la pile du log (max 10 messages)
 */
const addToLog = (state, message) => {
  const newLog = [message, ...(state.log || [])];
  return {
    ...state,
    log: newLog.slice(0, 10)
  };
};

/**
 * --- MISE EN PLACE / DÉBUT DE TOUR ---
 * Complète la main d'un joueur à 4 cartes
 */
export const refillHand = (state, isPlayer) => {
  const newState = { ...state };
  const side = isPlayer ? newState.player : newState.opponent;

  if (!side || !side.hand) return newState;

  while (side.hand.length < GAME_RULES.HAND_SIZE && side.deck.length > 0) {
    const card = side.deck.pop();
    if (card) {
      side.hand.push({ ...card, isFlipped: false });
    }
  }
  return newState;
};

/**
 * --- OPTION 1 : JOUER ---
 * Place une carte de la main sur le terrain
 */
export const playCard = (state, cardIndex, isPlayer) => {
  let newState = { ...state };
  const side = isPlayer ? newState.player : newState.opponent;
  
  if (side.hand.length > 0 && side.hand[cardIndex]) {
    const card = side.hand.splice(cardIndex, 1)[0];
    side.field.push({ ...card, isFlipped: false });
    
    newState = addToLog(newState, `${isPlayer ? '🔵' : '🔴'} ${card.name} entre sur le terrain.`);
  }
  return newState;
};

/**
 * --- OPTION 2 : ATTAQUER ---
 * Résout un duel et gère les conséquences sur le terrain
 */
export const resolveAttack = (state, attackerIdx, defenderIdx, isPlayerAttacking) => {
  let newState = { ...state };
  const attackerSide = isPlayerAttacking ? newState.player : newState.opponent;
  const defenderSide = isPlayerAttacking ? newState.opponent : newState.player;

  const attacker = attackerSide.field[attackerIdx];
  const defender = defenderSide.field[defenderIdx];

  // Calcul des puissances (VAEP + Bonus de cartes retournées adverses)
  const attScore = calculateTotalPower(attacker, defenderSide.field, true);
  const defScore = calculateTotalPower(defender, attackerSide.field, false);

  let logMsg = "";
  let attackerStillOnField = true;

  // --- RÉSOLUTION DU DUEL ---
  if (attScore > defScore) {
    // Si ATT > DEF : Le défenseur est retourné
    defender.isFlipped = true;
    logMsg = `🔥 ${attacker.name} (${attScore}) prend le dessus sur ${defender.name}.`;
  } 
  else if (attScore < defScore) {
    // Si ATT < DEF : L'attaquant est défaussé
    attackerSide.field.splice(attackerIdx, 1);
    attackerStillOnField = false;
    // Le défenseur (vainqueur) défausse une de SES propres cartes retournées
    const flippedIdx = defenderSide.field.findIndex(c => c.isFlipped);
    if (flippedIdx !== -1) defenderSide.field.splice(flippedIdx, 1);
    
    logMsg = `🛡️ ${defender.name} (${defScore}) repousse l'offensive de ${attacker.name}.`;
  } 
  else {
    // Si ATT = DEF : Les deux sont défaussés
    attackerSide.field.splice(attackerIdx, 1);
    defenderSide.field.splice(defenderIdx, 1);
    attackerStillOnField = false;
    logMsg = `⚔️ Choc frontal ! ${attacker.name} et ${defender.name} se neutralisent.`;
  }

  newState = addToLog(newState, logMsg);
  
  // Vérification si un BUT est marqué après l'action
  return checkGoal(newState, isPlayerAttacking, attackerIdx, attackerStillOnField);
};

/**
 * --- VÉRIFICATION DU BUT ---
 * Gère le score par Momentum (3 cartes retournées)
 */
const checkGoal = (state, isPlayerAttacking, scorerIdx, attackerStillOnField) => {
  const defenderSide = isPlayerAttacking ? state.opponent : state.player;
  const attackerSide = isPlayerAttacking ? state.player : state.opponent;

  // Règle du Momentum : 3 cartes face cachée = BUT
  const flippedCount = defenderSide.field.filter(c => c.isFlipped).length;

  if (flippedCount >= GAME_RULES.MOMENTUM_THRESHOLD) {
    // Mise à jour du score
    if (isPlayerAttacking) state.score.player += 1;
    else state.score.opponent += 1;

    // Déclenchement de la Modal de but
    state.ui.isModalOpen = true;
    state.ui.modalType = "GOAL";

    // Après un but : La carte ayant provoqué le but va en défausse
    if (attackerStillOnField && attackerSide.field[scorerIdx]) {
      attackerSide.field.splice(scorerIdx, 1);
    }

    // Le défenseur défausse TOUTES ses cartes retournées
    defenderSide.field = defenderSide.field.filter(c => !c.isFlipped);
    
    state = addToLog(state, `⚽ BUT !! La pression était trop forte ! (${state.score.player}-${state.score.opponent})`);
  }

  return state;
};

/**
 * --- FIN DE TOUR ---
 * Alterne le tour et complète la main pour le joueur suivant
 */
// src/engine/actions.js
export const endTurnAction = (state) => {
  const newState = { ...state };
  newState.turn += 1; // Joueur (1) -> IA (2) -> Joueur (3)
  
  // On détermine qui doit piocher pour le nouveau tour
  const nextIsPlayer = newState.turn % 2 !== 0; 
  return refillHand(newState, nextIsPlayer);
};
