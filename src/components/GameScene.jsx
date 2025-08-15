import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'

/*
 GameScene.jsx
 - plain three.js inside React
 - MediaPipe Hands loaded from CDN (index.html)
 - Spawns target + distractors after 5s
 - Basket controlled by hand X position (camera)
*/

const PLAY_W = 900
const PLAY_H = 600
const PREP_DELAY_MS = 5000
const DISTRACTOR_COUNT = 2
const ALPHABET = Array.from({length:26}, (_,i)=>String.fromCharCode(65+i))
const STORAGE_KEY = 'ac3d_rounds_v1'

export default function GameScene({ score, setScore }){
  const mountRef = useRef(null)

  useEffect(()=>{
    let renderer, scene, camera
    let basket, basketMesh
    let floor
    let animationId
    let lastTime = 0

    let letters = [] // { mesh, char, isTarget, speed }
    let targetLetter = null
    let state = 'PREP'
    let stateStart = performance.now()

    let lastHandXNorm = 0.5
    let sensitivity = 0.9
    let basketWidth = 220
    let baseFallSpeed = 1.0

    // create renderer
    renderer = new THREE.WebGLRenderer({ antialias:true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(window.devicePixelRatio || 1)
    mountRef.current.appendChild(renderer.domElement)

    // scene + camera
    scene = new THREE.Scene()
    scene.background = new THREE.Color(0xf0fbff)
    camera = new THREE.PerspectiveCamera(50, window.innerWidth/window.innerHeight, 1, 5000)
    camera.position.set(0, 200, 700)

    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0); hemi.position.set(0,200,0); scene.add(hemi)
    const dir = new THREE.DirectionalLight(0xffffff, 0.6); dir.position.set(-100,200,100); scene.add(dir)

    // floor
    floor = new THREE.Mesh(new THREE.PlaneGeometry(PLAY_W, PLAY_H), new THREE.MeshBasicMaterial({ color: 0xffffff }))
    floor.rotation.x = -Math.PI/2
    floor.position.y = -PLAY_H/2
    floor.position.z = -40
    scene.add(floor)

    // basket
    const BASKET_HEIGHT = 28
    basket = new THREE.Group()
    basketMesh = new THREE.Mesh(new THREE.BoxGeometry(basketWidth, BASKET_HEIGHT, 80), new THREE.MeshStandardMaterial({ color:0xff9933, metalness:0.1, roughness:0.6 }))
    basket.add(basketMesh)
    basket.position.set(0, -PLAY_H/2 + 80, 0)
    scene.add(basket)

    // helper: create a letter plane (canvas texture)
    function makeLetterMesh(char, isTarget){
      const size = 256
      const c = document.createElement('canvas')
      c.width = c.height = size
      const ctx = c.getContext('2d')
      ctx.clearRect(0,0,size,size)
      // circle
      ctx.beginPath()
      ctx.fillStyle = isTarget ? 'rgba(200,255,220,0.95)' : 'rgba(255,255,200,0.95)'
      ctx.arc(size/2, size/2, size*0.42, 0, Math.PI*2)
      ctx.fill()
      ctx.fillStyle = isTarget ? '#083' : '#222'
      ctx.font = Math.floor(size*0.6) + 'px "Comic Sans MS", Arial'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(char, size/2, size/2 + 6)
      const tex = new THREE.CanvasTexture(c)
      tex.minFilter = THREE.LinearFilter
      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true })
      const geom = new THREE.PlaneGeometry(140, 140)
      const mesh = new THREE.Mesh(geom, mat)
      return mesh
    }

    // pick new target & speak
    function pickNewTarget(){
      targetLetter = ALPHABET[Math.floor(Math.random()*ALPHABET.length)]
      const targetEl = document.getElementById('targetLetter')
      if(targetEl) targetEl.textContent = targetLetter
      try { const u = new SpeechSynthesisUtterance('Catch the letter ' + targetLetter); u.rate = 0.95; window.speechSynthesis.cancel(); window.speechSynthesis.speak(u) } catch(e){}
      state = 'PREP'; stateStart = performance.now()
      // clear any letters visually
      for(const L of letters) scene.remove(L.mesh)
      letters = []
    }

    function spawnLetters(){
      const xs = []
      for(let i=0;i<DISTRACTOR_COUNT+1;i++){
        xs.push((Math.random()*(PLAY_W-160) - (PLAY_W-160)/2))
      }
      xs.sort(()=>Math.random()-0.5)
      // target
      const targetMesh = makeLetterMesh(targetLetter, true)
      targetMesh.position.set(xs[0], PLAY_H/2 + 120, 0)
      scene.add(targetMesh)
      letters.push({ mesh: targetMesh, char: targetLetter, isTarget:true, speed: baseFallSpeed * (0.9 + Math.random()*0.4) })
      // distractors
      for(let i=1;i<xs.length;i++){
        let ch
        do { ch = ALPHABET[Math.floor(Math.random()*ALPHABET.length)] } while(ch===targetLetter)
        const m = makeLetterMesh(ch, false)
        m.position.set(xs[i], PLAY_H/2 + 120 + Math.random()*80, 0)
        scene.add(m)
        letters.push({ mesh: m, char: ch, isTarget:false, speed: baseFallSpeed * (0.8 + Math.random()*0.5) })
      }
    }

    // sounds
    function playCorrect(){
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)()
        const o = ctx.createOscillator(); const g = ctx.createGain()
        o.frequency.value = 1200; o.connect(g); g.connect(ctx.destination)
        g.gain.setValueAtTime(0.0001, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime+0.01)
        o.start(); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime+0.12); o.stop(ctx.currentTime+0.14)
      } catch(e){}
    }
    function playWrong(){
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)()
        const o = ctx.createOscillator(); const g = ctx.createGain()
        o.frequency.value = 240; o.type = 'sawtooth'; o.connect(g); g.connect(ctx.destination)
        g.gain.setValueAtTime(0.0001, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.16, ctx.currentTime+0.01)
        o.start(); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime+0.28); o.stop(ctx.currentTime+0.3)
      } catch(e){}
    }

    // collision helper
    function rectOverlap(ax,ay,aw,ah,bx,by,bw,bh){ return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by }

    // MediaPipe Hands integration
    let hands = null, camera = null, videoEl = null
    async function initHands(){
      try{
        if(typeof Hands === 'undefined'){ console.warn('MediaPipe Hands not loaded'); const preview = document.getElementById('cameraPreview'); if(preview) preview.style.display='none'; return }
        // create/attach preview video if not present
        videoEl = document.getElementById('cameraPreview')
        if(!videoEl){
          videoEl = document.createElement('video'); videoEl.id = 'cameraPreview'; videoEl.autoplay = true; videoEl.playsInline = true; videoEl.muted = true
          document.body.appendChild(videoEl)
        }
        hands = new Hands({ locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}` })
        hands.setOptions({ maxNumHands:1, modelComplexity:1, minDetectionConfidence:0.6, minTrackingConfidence:0.5 })
        hands.onResults((results)=>{
          if(results.multiHandLandmarks && results.multiHandLandmarks.length>0){
            const lm = results.multiHandLandmarks[0]
            let xs = 0
            for(const p of lm) xs += p.x
            const avg = xs / lm.length
            lastHandXNorm = 1 - avg
            lastHandXNorm = Math.max(0, Math.min(1, lastHandXNorm))
            const stateEl = document.getElementById('handState'); if(stateEl) stateEl.textContent='ON'
            if(videoEl) videoEl.style.border = '2px solid #4CAF50'
          } else {
            const stateEl = document.getElementById('handState'); if(stateEl) stateEl.textContent='SEARCHING'
            if(videoEl) videoEl.style.border = '2px solid #ddd'
          }
        })
        camera = new Camera(videoEl, { onFrame: async ()=> { await hands.send({ image: videoEl }) }, width:640, height:480 })
        await camera.start()
      }catch(err){
        console.warn('initHands error', err)
        const stateEl = document.getElementById('handState'); if(stateEl) stateEl.textContent='CAM FAIL'
      }
    }

    // keyboard fallback
    const keys = {}
    window.addEventListener('keydown', (e)=>{ keys[e.key] = true; if(e.key === 's' || e.key === 'S'){ if(targetLetter){ try{ const u = new SpeechSynthesisUtterance('Catch the letter ' + targetLetter); u.rate=0.95; window.speechSynthesis.cancel(); window.speechSynthesis.speak(u) }catch(e){} } } })
    window.addEventListener('keyup', (e)=>{ keys[e.key] = false })

    let lastHandXNorm = 0.5

    // teacher analytics: localStorage
    function loadRounds(){ try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch(e){ return [] } }
    function saveRounds(arr){ localStorage.setItem(STORAGE_KEY, JSON.stringify(arr)); const rc = document.getElementById('roundCount'); if(rc) rc.textContent = String(arr.length) }
    function pushRound(rec){ const a = loadRounds(); a.push(rec); saveRounds(a) }

    // main loop
    function animate(t){
      animationId = requestAnimationFrame(animate)
      const dt = (t - lastTime) || 16
      lastTime = t

      // read UI values live
      const sensEl = document.getElementById('sens'); const bwEl = document.getElementById('bwidth'); const fsEl = document.getElementById('fallSpeed')
      if(sensEl) sensitivity = Number(sensEl.value)
      if(bwEl){
        const v = Number(bwEl.value)
        if(v !== basketWidth){
          basketWidth = v
          try{
            basket.remove(basketMesh)
            basketMesh.geometry.dispose()
            basketMesh = new THREE.Mesh(new THREE.BoxGeometry(basketWidth, 28, 80), new THREE.MeshStandardMaterial({ color:0xff9933, metalness:0.1, roughness:0.6 }))
            basket.add(basketMesh)
          }catch(e){}
        }
      }
      if(fsEl) baseFallSpeed = Number(fsEl.value)

      // state machine
      if(state === 'PREP'){
        if(performance.now() - stateStart >= PREP_DELAY_MS){
          spawnLetters()
          state = 'FALLING'
        }
      } else if(state === 'FALLING'){
        // move letters
        for(const L of letters){ L.mesh.position.y -= L.speed * dt * 0.06 }

        // move basket by hand x
        const targetBX = (lastHandXNorm - 0.5) * PLAY_W * sensitivity
        if(keys['ArrowLeft']) basket.position.x -= 8
        if(keys['ArrowRight']) basket.position.x += 8
        basket.position.x += (targetBX - basket.position.x) * 0.18
        basket.position.x = Math.max(-PLAY_W/2 + basketWidth/2, Math.min(PLAY_W/2 - basketWidth/2, basket.position.x))

        // collision
        for(const L of [...letters]){
          const lx = L.mesh.position.x, ly = L.mesh.position.y
          const letterW = 110, letterH = 110
          const ax = lx - letterW/2, ay = ly - letterH/2, aw = letterW, ah = letterH
          const bx = basket.position.x - basketWidth/2, by = basket.position.y, bw = basketWidth, bh = 28
          if(rectOverlap(ax,ay,aw,ah,bx,by,bw,bh)){
            const ts = new Date().toISOString()
            if(L.isTarget){
              setScore(s=>s+1)
              playCorrect()
              pushRound({ ts, target: L.char, result:'correct', score: (score+1) })
            } else {
              setScore(s=>s-1)
              playWrong()
              pushRound({ ts, target: targetLetter, result:'wrong_catch', score: (score-1), notes: `caught ${L.char}` })
            }
            pickNewTarget()
            return
          }
          // missed
          if(ly < -PLAY_H/2 - 140){
            if(L.isTarget){
              setScore(s=>s-1)
              pushRound({ ts: new Date().toISOString(), target: L.char, result:'missed', score: (score-1) })
              pickNewTarget(); return
            } else {
              scene.remove(L.mesh)
              letters = letters.filter(x=>x!==L)
            }
          }
        }
      }

      renderer.render(scene, camera)
    }

    // init
    pickNewTarget()
    initHands().catch((e)=>{ console.warn(e) })
    animationId = requestAnimationFrame(animate)

    // cleanup on unmount
    return () => {
      cancelAnimationFrame(animationId)
      try{ renderer.dispose() }catch(e){}
      try{ mountRef.current.removeChild(renderer.domElement) }catch(e){}
      try{ if(camera && camera.stop) camera.stop() }catch(e){}
      try{ if(hands && hands.close) hands.close() }catch(e){}
      window.removeEventListener('keydown', ()=>{})
      window.removeEventListener('keyup', ()=>{})
    }
  }, [setScore, score])

  return <div ref={mountRef} style={{ width:'100%', height:'100%' }} />
}
