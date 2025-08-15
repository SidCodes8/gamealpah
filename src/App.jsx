import React from 'react';
import GameScene from './components/GameScene';
import HUD from './components/HUD';

export default function App() {
  return (
    <div className="app-container">
      <HUD />
      <GameScene />
    </div>
  );
}
