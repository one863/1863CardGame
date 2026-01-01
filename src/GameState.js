// Si rules.js est dans src/config/ :
import { GAME_RULES } from '../config/rules';

export const createInitialState = (playerDeck, opponentDeck) => {
  return {
    score: { player: 0, opponent: 0 },
    turn: 1,
    momentum: GAME_RULES.MOMENTUM_THRESHOLD,
    maxMomentum: GAME_RULES.MOMENTUM_THRESHOLD,
    player: {
      deck: [...playerDeck],
      hand: [],
      field: [],
      discard: []
    },
    opponent: {
      deck: [...opponentDeck],
      hand: [],
      field: [],
      discard: []
    },
    ui: { isModalOpen: false, modalType: null }
  };
};