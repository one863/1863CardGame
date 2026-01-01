// src/hooks/useAI.js
import { useEffect } from 'react';
import { useGame } from '../context/GameContext';

const useAI = () => {
  const { gameState, handlePlayCard, handleBlock, handleAttack } = useGame();

  useEffect(() => {
    if (!gameState) return;

    let aiTimer;

    // --- CAS 1 : C'EST AU TOUR DE L'IA DE JOUER ---
    if (gameState.turn === 'opponent' && gameState.phase === 'MAIN') {
      aiTimer = setTimeout(() => {
        const aiHand = gameState.opponent.hand;
        const aiField = gameState.opponent.field;
        const playerField = gameState.player.field;

        // Stratégie simple : Attaquer si possible, sinon jouer une carte
        const canAttack = aiField.some(c => !c.isFlipped);
        const shouldAttack = aiField.length > playerField.length && canAttack;

        if (shouldAttack) {
             const attackerIndex = aiField.findIndex(c => !c.isFlipped);
             if (attackerIndex !== -1) {
                 handleAttack(attackerIndex);
                 return;
             }
        }

        // Sinon jouer une carte
        if (aiHand.length > 0) {
          const cardIndex = Math.floor(Math.random() * aiHand.length);
          handlePlayCard(cardIndex);
        } else {
            // Sécurité si main vide : on force la fin du tour pour ne pas bloquer
            // (Idéalement on devrait avoir une fonction passTurn, mais handlePlayCard 
            // gère la fin de tour, donc l'IA doit jouer tant qu'elle a des cartes)
        }

      }, 1500); // Réflexion 1.5s
    }

    // --- CAS 2 : L'IA DOIT DÉFENDRE (BLOQUER) ---
    if (gameState.turn === 'player' && gameState.phase === 'ATTACK_DECLARED') {
      aiTimer = setTimeout(() => {
        const availableBlockers = gameState.opponent.field
            .map((card, index) => ({ card, index }))
            .filter(item => !item.card.isFlipped);

        if (availableBlockers.length > 0) {
          // Bloque avec le meilleur joueur
          availableBlockers.sort((a, b) => b.card.vaep - a.card.vaep);
          handleBlock(availableBlockers[0].index);
        }
      }, 1000);
    }

    return () => clearTimeout(aiTimer);
  }, [gameState, handlePlayCard, handleBlock, handleAttack]);
};

export default useAI;
