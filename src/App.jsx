import React, { useState } from 'react'
import HUD from './components/HUD'
import GameScene from './components/GameScene'

export default function App(){
  const [score, setScore] = useState(0)
  return (
    <div className="app-root">
      <HUD score={score} />
      <GameScene score={score} setScore={setScore} />
    </div>
  )
}
