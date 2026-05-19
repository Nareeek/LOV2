import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.js';
import './styles.css';
import { gameData } from '@lov2/game-data';
import type { BootstrapState } from '@lov2/shared';

// Visual verification mock mode.
// Usage: http://localhost:5173/?mock=combat
const params = new URLSearchParams(window.location.search);
const isMockCombat = params.get('mock') === 'combat';

const mockState: BootstrapState | undefined = isMockCombat ? {
  user: { id: 'u1', email: 'test@example.com', displayName: 'Tester', createdAt: new Date().toISOString() },
  character: {
    id: 'c1',
    userId: 'u1',
    name: 'Тестер',
    raceId: 'nocturne',
    gender: 'male',
    classId: 'swordsman',
    level: 5,
    experience: 500,
    rebirths: 0,
    health: 500,
    maxHealth: 500,
    unspentStatPoints: 0,
    stats: { сила: 15, ловкость: 10, интуиция: 10, удача: 10 },
    gold: 1000,
    gems: 10,
    petFood: 50,
    energy: 10,
    maxEnergy: 10,
    energyUpdatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  },
  races: gameData.races,
  items: gameData.items,
  quests: gameData.quests,
  locations: gameData.locations,
  enemies: gameData.enemies,
  scenes: gameData.scenes,
  inventory: [
      { id: 'p1', characterId: 'c1', itemId: 'kitten', quantity: 1, equippedSlot: 'pet' }
  ],
  petRoster: [
      { id: 'pr1', characterId: 'c1', petId: 'kitten', food: 100, experience: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
  ],
  questProgress: [],
  travels: [],
  combats: [
      {
          id: 'combat1',
          characterId: 'c1',
          enemyId: 'baron-of-ashes',
          status: 'pending',
          createdAt: new Date().toISOString()
      }
  ],
} : undefined;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App initialMockState={mockState} />
  </StrictMode>,
);
