/*
 * Copyright (C) 2026 One863
 * * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

// src/App.jsx

import React, { useState } from 'react';
import './index.css';

// Architecture, Context et Règles
import { GameProvider, useGame } from './context/GameContext';
import { GAME_RULES } from './config/rules';
import useAI from './hooks/useAI';
import ScoreBoard from './components/UI/ScoreBoard';
import Modal from './components/UI/Modal';
import PLAYERS_DB from './data/players_db.json';
import { generateOpponentDeck } from './utils/deckGenerator'; // Pour l'équipe adverse

/** --- COMPOSANT : JOURNAL DE MATCH --- */
const MatchLog = ({ messages }) => (
  <div className="match-log">
    <h3>Journal du Match</h3>
    <div className="log-container">
      {messages && messages.map((msg, i) => (
        <div key={i} className="log-entry">{msg}</div>
      ))}
    </div>
  </div>
);

/** --- COMPOSANT : CARTE SÉCURISÉ & GESTION DES ÉTATS VISUELS --- */
const Card = ({ data, isMomentum, isHidden, onClick, isSelected, isAttacking }) => {
  // 1. CARTE TOTALEMENT CACHÉE (Main adverse ou Pioche)
  // Elle affiche le DOS de la carte
  if (isHidden) {
    return <div className="card hidden"></div>;
  }

  // Sécurité si les données manquent (pour ne pas crasher)
  if (!data) return <div className="card empty"></div>;

  // 2. CARTE "MOMENTUM" (Sur le terrain, perdante en duel)
  // Elle est visible mais grisée/abimée. Elle N'EST PAS cachée.
  if (isMomentum) {
    return (
      <div className="card momentum-flipped" onClick={onClick}>
         {/* On garde les infos visibles pour savoir qui c'est */}
         <div className="card-header" style={{ opacity: 0.7 }}>
           <span>{data.pos}</span>
           <span>{data.name}</span>
         </div>
         {/* Un indicateur visuel de "DANGER / RETOURNÉE" */}
         <div style={{ 
            position: 'absolute', top: '50%', left: '50%', 
            transform: 'translate(-50%, -50%)', fontSize: '3rem' 
         }}>
           ⚠️
         </div>
      </div>
    );
  }

  // 3. CARTE NORMALE (Active)
return (
    <div 
      className={`card ${isSelected ? 'target' : ''} ${isAttacking ? 'attacking' : ''}`} 
      onClick={onClick}
    >
      <div className="card-cost">{data.cost}M</div>
      <div className="card-header">
        <span>{data.pos}</span>
        <span>{data.name}</span>
      </div>
      <div className="card-image">🏃</div>
      <div className="card-stats">
        <div className="stat-vaep">{data.vaep}</div>
        <small>{data.effects ? data.effects[0] : ''}</small>
      </div>
    </div>
  );
};

/** --- ÉCRAN : MERCATO (DeckBuilder) --- */
const DeckBuilder = ({ onLaunchGame }) => {
  const { initMatch } = useGame();
  const [team, setTeam] = useState([]);
  
  // Calcul du coût actuel
  const currentCost = team.reduce((sum, p) => sum + p.cost, 0);

  // --- FONCTION : SÉLECTION AUTOMATIQUE ---
  const autoFillTeam = () => {
    let newTeam = [];
    let attempts = 0;

    while (newTeam.length < GAME_RULES.DECK_SIZE && attempts < 500) {
      const shuffled = [...PLAYERS_DB].sort(() => 0.5 - Math.random());
      newTeam = [];
      let currentBudget = 0;

      const gk = shuffled.find(p => p.pos === 'GK' || p.pos === 'Gardien');
      if (gk && (currentBudget + gk.cost <= GAME_RULES.BUDGET_CAP)) {
        newTeam.push(gk);
        currentBudget += gk.cost;
      }

      for (let p of shuffled) {
        if (newTeam.find(x => x.id === p.id)) continue;
        
        if (newTeam.length < GAME_RULES.DECK_SIZE && (currentBudget + p.cost <= GAME_RULES.BUDGET_CAP)) {
          newTeam.push(p);
          currentBudget += p.cost;
        }
      }
      
      attempts++;
      if (newTeam.length === GAME_RULES.DECK_SIZE) break;
    }

    if (newTeam.length === GAME_RULES.DECK_SIZE) {
      setTeam(newTeam);
    } else {
      alert("Impossible de générer une équipe valide avec ce budget (Joueurs trop chers ou base de données insuffisante).");
    }
  };

  // Sélection manuelle
  const togglePlayer = (p) => {
    const isSelected = team.find(x => x.id === p.id);
    if (isSelected) {
      setTeam(team.filter(x => x.id !== p.id));
    } else if (team.length < GAME_RULES.DECK_SIZE && (currentCost + p.cost) <= GAME_RULES.BUDGET_CAP) {
      setTeam([...team, p]);
    }
  };

  // Lancement du match
  const startMatch = () => {
    if (team.length === GAME_RULES.DECK_SIZE) {
      // Générer l'équipe adverse de manière autonome
      const opponentDeck = generateOpponentDeck(PLAYERS_DB); 
      if (opponentDeck.length === GAME_RULES.DECK_SIZE) {
        initMatch(team, opponentDeck); 
        onLaunchGame();
      } else {
        alert("Impossible de générer une équipe adverse. Veuillez vérifier la base de données.");
      }
    } else {
      alert(`Il manque ${GAME_RULES.DECK_SIZE - team.length} joueurs !`);
    }
  };

  return (
    <div className="screen">
      <h1>MERCATO 1863</h1>
      
      {/* Barre d'info */}
      <div style={{ marginBottom: '20px', padding: '10px', background: '#333', borderRadius: '8px' }}>
        Budget: <strong style={{ color: currentCost > GAME_RULES.BUDGET_CAP ? '#ff4444' : '#00ff88' }}>{currentCost} M€</strong> / {GAME_RULES.BUDGET_CAP}
        <span style={{ margin: '0 10px' }}>|</span>
        Joueurs: <strong>{team.length}</strong> / {GAME_RULES.DECK_SIZE}
      </div>

      {/* Boutons d'action */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
        <button 
          onClick={autoFillTeam} 
          style={{ background: '#2196F3', color: 'white' }}
        >
          🎲 AUTO-COMPLETE
        </button>
        
        <button 
          onClick={() => setTeam([])} 
          style={{ background: '#ff4444', color: 'white' }}
          disabled={team.length === 0}
        >
          🗑️ RESET
        </button>

        <button 
          onClick={startMatch} 
          disabled={team.length !== GAME_RULES.DECK_SIZE}
          style={{ background: team.length === GAME_RULES.DECK_SIZE ? '#00ff88' : '#555' }}
        >
          ⚽ JOUER
        </button>
      </div>

      {/* Grille des joueurs */}
      <div className="market-grid" style={{ 
          display: 'flex', flexWrap: 'wrap', gap: '10px', 
          justifyContent: 'center', overflowY: 'auto', maxHeight: '55vh',
          padding: '10px', border: '1px solid #444' 
      }}>
        {PLAYERS_DB.map(p => (
          <Card 
            key={p.id} 
            data={p} 
            onClick={() => togglePlayer(p)} 
            isSelected={team.some(x => x.id === p.id)} 
          />
        ))}
      </div>
    </div>
  );
};

/** --- ÉCRAN : PLATEAU DE JEU --- */
const GameBoard = ({ onQuit }) => {
  const { gameState, handlePlayCard, handleAttack, handleBlock } = useGame();
  const [selectedAttacker, setSelectedAttacker] = useState(null);

  // Active l'IA
  useAI();

  // Sécurité anti-crash
  if (!gameState || !gameState.player) return null;

  // --- GESTION DES CLICS ---

  // Clic sur MES cartes
  const onPlayerCardClick = (idx, zone) => {
    // Si ce n'est pas mon tour, je ne peux rien faire
    if (gameState.turn !== 'player') return;

    // 1. Jouer une carte depuis la main
    if (zone === 'hand' && gameState.phase === 'MAIN') {
      handlePlayCard(idx);
      setSelectedAttacker(null); // On désélectionne si on joue une carte
    } 
    // 2. Sélectionner un attaquant sur le terrain
    else if (zone === 'field' && gameState.phase === 'MAIN') {
      const card = gameState.player.field[idx];
      // On ne peut pas attaquer avec une carte retournée (Momentum)
      if (!card && card.isFlipped === undefined) { // Nouvelle sécurité pour card
          console.error("Erreur: Carte joueur introuvable ou mal définie.", card);
          return;
      }
      if (!card.isFlipped) {
        setSelectedAttacker(selectedAttacker === idx ? null : idx);
      }
    }
  };

  // Clic sur les cartes ADVERSES (Pour Bloquer uniquement, si humain)
  const onOpponentCardClick = (idx) => {
    // Si l'adversaire (humain) devait choisir un bloqueur ici
    // Pour l'IA, c'est géré par useAI, donc cette fonction est surtout pour le multijoueur.
    console.log("Cliqué sur carte adverse à l'index", idx);
  };

  // Validation de l'attaque
  const confirmAttack = () => {
    if (selectedAttacker !== null && gameState.turn === 'player' && gameState.phase === 'MAIN') {
      handleAttack(selectedAttacker);
      setSelectedAttacker(null); // Réinitialiser après avoir lancé l'attaque
    }
  };

  return (
    <div className="game-board">
      <ScoreBoard />
      <Modal />
      <MatchLog messages={gameState.log} />

      {/* --- ZONE ADVERSAIRE --- */}
      <div className="field-half opponent">
        <div className="field-zone">
         {gameState.opponent.field.map((c, i) => {
            // LOGIQUE D'AFFICHAGE DE L'ATTAQUANT ADVERSE
            const isAttacking = 
              gameState.turn === 'opponent' &&       // C'est le tour de l'adversaire
              gameState.phase === 'ATTACK_DECLARED' && // Il a déclaré une attaque
              gameState.attackerIdx === i;           // C'est CETTE carte (index i)

            return (
              <Card 
                key={`opp-f-${i}`} 
                data={c} 
                isMomentum={c.isFlipped} 
                isAttacking={isAttacking} // <--- ON AJOUTE CECI
                onClick={() => onOpponentCardClick(i)} 
              />
            );
          })}
        </div>
        <div className="hand-zone">
          {gameState.opponent.hand.map((_, i) => (
            <Card key={`opp-h-${i}`} isHidden={true} /> // Les cartes en main adverse sont cachées
          ))}
        </div>
      </div>

      {/* --- INFOS & BOUTONS CENTRAUX --- */}
      {/* Ce bouton apparaît uniquement si j'ai sélectionné un attaquant valide et c'est mon tour */}
      {selectedAttacker !== null && gameState.turn === 'player' && gameState.phase === 'MAIN' && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          zIndex: 200
        }}>
          <button 
            onClick={confirmAttack}
            style={{ 
              background: '#ff4444', color: 'white', padding: '15px 30px', 
              fontSize: '1.5rem', boxShadow: '0 0 20px #ff0000', border: '2px solid white'
            }}
          >
            ⚔️ ATTAQUER !
          </button>
          <div style={{textAlign:'center', color:'white', background:'rgba(0,0,0,0.5)', marginTop:'5px', padding:'5px', borderRadius:'5px'}}>
            (Clic sur le bouton pour valider)
          </div>
        </div>
      )}

      {/* Message d'attente de blocage (si l'IA nous attaque) */}
      {gameState.turn === 'opponent' && gameState.phase === 'ATTACK_DECLARED' && (
         <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          zIndex: 200, background:'rgba(0,0,0,0.8)', padding:'20px', borderRadius:'10px', color:'white'
         }}>
           L'Adversaire attaque ! (L'IA choisit un bloqueur...)
         </div>
      )}

      {/* --- ZONE JOUEUR --- */}
      <div className="field-half player">
        <div className="field-zone">
          {gameState.player.field.map((c, i) => (
            <Card 
              key={`ply-f-${i}`} 
              data={c} 
              isMomentum={c.isFlipped} // Utilise isMomentum
              isSelected={selectedAttacker === i} 
              onClick={() => onPlayerCardClick(i, 'field')} 
            />
          ))}
        </div>
        <div className="hand-zone">
          {gameState.player.hand.map((c, i) => (
            <Card key={`ply-h-${i}`} data={c} onClick={() => onPlayerCardClick(i, 'hand')} />
          ))}
        </div>
      </div>
      
      <button className="quit-btn" onClick={onQuit} style={{ position: 'absolute', top: 10, right: 10, zIndex: 999 }}>
        Abandonner
      </button>
    </div>
  );
};

/** --- COMPOSANT RACINE DE L'APPLICATION --- */
export default function App() {
  const [view, setView] = useState('menu');

  return (
    <GameProvider>
      <div className="app-container">
        {view === 'menu' && (
          <div className="screen">
            <h1>⚽ 1863 TACTICAL ⚽</h1>
            <p style={{marginBottom: '20px'}}>Le football par le Momentum</p>
            <button onClick={() => setView('builder')}>NOUVELLE PARTIE</button>
          </div>
        )}
        {view === 'builder' && <DeckBuilder onLaunchGame={() => setView('game')} />}
        {view === 'game' && <GameBoard onQuit={() => setView('menu')} />}
      </div>
    </GameProvider>
  );
}
