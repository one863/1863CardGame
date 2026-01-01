import React from 'react';
import { useGame } from '../../context/GameContext';

const ScoreBoard = () => {
  const { gameState } = useGame();
  
  // Sécurité anti-crash
  if (!gameState) return null;

  return (
    <div style={{ 
      position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
      background: 'rgba(0,0,0,0.8)', padding: '10px 20px', borderRadius: '0 0 10px 10px',
      display: 'flex', gap: '20px', zIndex: 100, fontWeight: 'bold'
    }}>
      <div style={{ color: '#f88' }}>ADV: {gameState.opponent.score}</div>
      <div style={{ color: '#fff' }}>{gameState.phase}</div>
      <div style={{ color: '#8f8' }}>VOUS: {gameState.player.score}</div>
    </div>
  );
};

export default ScoreBoard;