import React, { createContext, useContext, useState, useEffect } from 'react';
import { GAME_RULES } from '../config/rules';

const GameContext = createContext();

export const useGame = () => useContext(GameContext);

export const GameProvider = ({ children }) => {
  // État du jeu
  const [gameState, setGameState] = useState({
    turn: 'player', // 'player' ou 'opponent'
    phase: 'MAIN',  // 'MAIN', 'ATTACK_DECLARED', 'GAME_OVER'
    log: [],        // Journal du match
    attackerIdx: null, // Qui attaque ?
    player: { hand: [], field: [], score: 0, deck: [] },
    opponent: { hand: [], field: [], score: 0, deck: [] }
  });

  // Journaliser une action
  const addLog = (msg) => {
    setGameState(prev => ({ ...prev, log: [msg, ...prev.log] }));
  };

  // Initialisation
  const initMatch = (playerDeck, opponentDeck) => {
    // Mélange et pioche initiale de 4 cartes
    const pDeck = [...playerDeck].sort(() => Math.random() - 0.5);
    const oDeck = [...opponentDeck].sort(() => Math.random() - 0.5);

    setGameState({
      turn: 'player', // Avantage domicile
      phase: 'MAIN',
      log: ["Le match commence !"],
      attackerIdx: null,
      player: { 
        hand: pDeck.slice(0, 4), 
        field: [], 
        score: 0, 
        deck: pDeck.slice(4) 
      },
      opponent: { 
        hand: oDeck.slice(0, 4), 
        field: [], 
        score: 0, 
        deck: oDeck.slice(4) 
      }
    });
  };

  // --- ACTION 1 : JOUER UNE CARTE (Mise en jeu) ---
  const handlePlayCard = (cardIdx) => {
    const actor = gameState.turn; // 'player' ou 'opponent'
    
    setGameState(prev => {
      const activeSide = prev[actor];
      const card = activeSide.hand[cardIdx];
      
      // Nouvelle main et terrain
      const newHand = activeSide.hand.filter((_, i) => i !== cardIdx);
      const newField = [...activeSide.field, { ...card, isFlipped: false }]; // isFlipped = Momentum

      return {
        ...prev,
        phase: 'END_TURN', // On passe le tour juste après (règle simplifiée pour l'instant)
        log: [`${actor === 'player' ? 'Vous jouez' : "L'adversaire joue"} ${card.name}.`, ...prev.log],
        [actor]: { ...activeSide, hand: newHand, field: newField }
      };
    });
    
    // Passer le tour après un délai visuel
    setTimeout(endTurn, 1000);
  };

  // --- ACTION 2 : DÉCLARER UNE ATTAQUE (Phase 1) ---
  const handleAttack = (attackerIdx) => {
    const defender = gameState.turn === 'player' ? 'opponent' : 'player';
    const defendersCount = gameState[defender].field.filter(c => !c.isFlipped).length;

    // Cas 1 : Pas de défenseurs -> BUT IMMÉDIAT (Percée)
    if (defendersCount === 0) {
      resolveGoal(gameState.turn, "Défense ouverte !");
      return;
    }

    // Cas 2 : Défenseurs présents -> Phase de Blocage
    setGameState(prev => ({
      ...prev,
      phase: 'ATTACK_DECLARED',
      attackerIdx: attackerIdx,
      log: ["Attaque lancée ! En attente d'un bloqueur...", ...prev.log]
    }));
  };

// --- ACTION 3 : BLOQUER (Phase 2 & Résolution) ---
  const handleBlock = (blockerIdx) => {
    // Sécurité anti-crash : Vérifier que la phase est bonne
    if (gameState.phase !== 'ATTACK_DECLARED') {
      console.warn("Tentative de blocage hors phase d'attaque.");
      return;
    }

    const attSideKey = gameState.turn; // ex: 'player' (celui qui a lancé l'attaque)
    const defSideKey = attSideKey === 'player' ? 'opponent' : 'player';

    // RECUPERATION SÉCURISÉE DES CARTES
    const attCard = gameState[attSideKey].field[gameState.attackerIdx];
    const defCard = gameState[defSideKey].field[blockerIdx];

    // --- PATCH CRASH : Si l'une des cartes est introuvable, on annule tout ---
    if (!attCard || !defCard) {
      console.error("ERREUR CRITIQUE : Carte introuvable lors du duel.");
      console.log("Attaquant Index:", gameState.attackerIdx, "Carte:", attCard);
      console.log("Défenseur Index:", blockerIdx, "Carte:", defCard);
      
      // On réinitialise la phase pour ne pas rester bloqué
      setGameState(prev => ({ ...prev, phase: 'MAIN', attackerIdx: null }));
      return;
    }
    // -----------------------------------------------------------------------

    // --- CALCUL DES FORCES (VAEP + Bonus Momentum adverse) ---
    const attBonus = gameState[defSideKey].field.filter(c => c.isFlipped).length;
    const attPower = attCard.vaep + attBonus; // C'est ici que ça plantait avant

    const defBonus = gameState[attSideKey].field.filter(c => c.isFlipped).length;
    const defPower = defCard.vaep + defBonus;

    let resultLog = `Duel : ${attCard.name} (${attPower}) vs ${defCard.name} (${defPower}).`;

    // --- RÉSOLUTION ---
    let newAttField = [...gameState[attSideKey].field];
    let newDefField = [...gameState[defSideKey].field];

    if (attPower > defPower) {
      // VICTOIRE ATTAQUE
      resultLog += " DÉSÉQUILIBRE ! Le défenseur est débordé.";
      if (newDefField[blockerIdx]) newDefField[blockerIdx].isFlipped = true; 
    } else if (attPower < defPower) {
      // VICTOIRE DÉFENSE
      resultLog += " INTERCEPTION ! L'attaquant est stoppé.";
      newAttField.splice(gameState.attackerIdx, 1); 
      
      // Le défenseur retire une de ses cartes retournées (si possible)
      const flippedIdx = newDefField.findIndex(c => c.isFlipped);
      if (flippedIdx !== -1) newDefField[flippedIdx].isFlipped = false;

    } else {
      // ÉGALITÉ : CHOC
      resultLog += " CHOC ! Les deux joueurs se neutralisent.";
      // Attention aux indices quand on supprime ! On supprime d'abord le défenseur car son index est connu
      newDefField.splice(blockerIdx, 1);
      newAttField.splice(gameState.attackerIdx, 1);
    }

    setGameState(prev => ({
      ...prev,
      log: [resultLog, ...prev.log],
      [attSideKey]: { ...prev[attSideKey], field: newAttField },
      [defSideKey]: { ...prev[defSideKey], field: newDefField }
    }));

    // Vérifier BUT (Momentum) après résolution
    checkMomentumGoal(defSideKey, newDefField, attSideKey);
  };

  // --- GESTION DES BUTS ---
  const checkMomentumGoal = (victimKey, victimField, scorerKey) => {
    const flippedCount = victimField.filter(c => c.isFlipped).length;
    
    if (flippedCount >= 3) {
      resolveGoal(scorerKey, "Momentum critique ! La défense craque.");
    } else {
      setTimeout(endTurn, 1500);
    }
  };

  const resolveGoal = (scorerKey, reason) => {
    setGameState(prev => {
      // Celui qui prend le but reset son terrain (défausse les cartes retournées ?)
      // Pour l'instant on garde simple : Reset des retournées
      const victimKey = scorerKey === 'player' ? 'opponent' : 'player';
      const cleanField = prev[victimKey].field.map(c => ({ ...c, isFlipped: false }));

      return {
        ...prev,
        phase: 'MAIN', // Reset phase
        log: [`BUT !!! ${reason}`, ...prev.log],
        [scorerKey]: { ...prev[scorerKey], score: prev[scorerKey].score + 1 },
        [victimKey]: { ...prev[victimKey], field: cleanField }
      };
    });
    setTimeout(endTurn, 2000);
  };

  // --- FIN DE TOUR ---
  const endTurn = () => {
    setGameState(prev => {
      const nextTurn = prev.turn === 'player' ? 'opponent' : 'player';
      
      // Pioche automatique (compléter à 4)
      const currentHandSize = prev[nextTurn].hand.length;
      const drawCount = 4 - currentHandSize;
      let newDeck = [...prev[nextTurn].deck];
      let newHand = [...prev[nextTurn].hand];

      if (drawCount > 0 && newDeck.length > 0) {
        const drawn = newDeck.splice(0, drawCount);
        newHand = [...newHand, ...drawn];
      }

      return {
        ...prev,
        turn: nextTurn,
        phase: 'MAIN',
        attackerIdx: null,
        log: [`Tour de : ${nextTurn === 'player' ? 'Vous' : "L'Adversaire"}`, ...prev.log],
        [nextTurn]: { ...prev[nextTurn], hand: newHand, deck: newDeck }
      };
    });
  };

  return (
    <GameContext.Provider value={{ gameState, initMatch, handlePlayCard, handleAttack, handleBlock }}>
      {children}
    </GameContext.Provider>
  );
};