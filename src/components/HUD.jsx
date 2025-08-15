import React from 'react'

export default function HUD({ score }){
  return (
    <div id="ui">
      <div><strong>Alphabet Catch 3D</strong></div>
      <div style={{marginTop:6}}>Hand Tracking: <span id="handState">INIT</span></div>
      <div style={{marginTop:6}}>Score: <span id="scoreDisplay">{score}</span></div>
      <div style={{marginTop:6}}>Target: <strong id="targetLetter">?</strong></div>

      <label>Basket Sensitivity
        <input id="sens" type="range" min="0.2" max="2" step="0.05" defaultValue="0.9" />
      </label>

      <label>Basket Width
        <input id="bwidth" type="range" min="80" max="380" step="10" defaultValue="220" />
      </label>

      <label>Letter Fall Speed
        <input id="fallSpeed" type="range" min="0.3" max="3.0" step="0.05" defaultValue="1.0" />
      </label>

      <div style={{marginTop:8}}>
        <button id="repeatBtn">Repeat Target (S)</button>
      </div>
      <div style={{fontSize:12, marginTop:8}}>Tip: allow webcam → move your hand left/right to steer the basket. Arrow keys work as fallback.</div>
    </div>
  )
}
