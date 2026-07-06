/* =====================================================
   TRIAD — game.js
   A full 3D Tic-Tac-Toe puzzle built with Three.js.

   Sections in this file:
   1. Scene / camera / renderer / lights setup
   2. The 3x3 board + piece factories
   3. Custom mouse-drag orbit controls (no external deps)
   4. Raycasting: hover + click on cells
   5. Game rules: turns, win detection, AI opponent
   6. HUD: timer, move counter, score, mode switch
   7. Confetti effect + localStorage persistence
   8. Animation loop + responsive resize
   ===================================================== */

(() => {
  'use strict';

  /* ---------------------------------------------------
     0. Constants & state
  --------------------------------------------------- */
  const CELL_SIZE = 1.15;
  const CELL_GAP = 0.14;
  const BOARD_SPAN = CELL_SIZE + CELL_GAP;

  const COLOR_CYAN = 0x00d9ff;
  const COLOR_VIOLET = 0x7c5cff;
  const COLOR_AMBER = 0xffb340;

  const state = {
    board: Array(9).fill(null),      // 'X' | 'O' | null
    current: 'X',                    // whose turn it is
    active: true,                    // is the game still playable
    mode: 'ai',                      // 'ai' | 'twoPlayer'
    difficulty: 'hard',              // 'easy' | 'hard'
    moves: 0,
    startTime: null,
    timerId: null,
    scores: { player: 0, opponent: 0, draws: 0 },
    playerName: 'Player One',
  };

  let scene, camera, renderer, canvasEl, container;
  let cellMeshes = [];         // clickable tile meshes, index = board index
  let pieceGroup;              // holds all placed X/O pieces
  let winLineGroup;            // glowing line drawn across the winning row
  let hoveredIndex = -1;
  let raycaster, mouse;

  // Manual orbit-control state (no external Three.js addon needed)
  const orbit = {
    radius: 7.2,
    minRadius: 4.5,
    maxRadius: 11,
    theta: Math.PI / 4,      // horizontal angle
    phi: 1.0,                // vertical angle (from top)
    targetTheta: Math.PI / 4,
    targetPhi: 1.0,
    dragging: false,
    lastX: 0,
    lastY: 0,
  };

  /* ---------------------------------------------------
     1. Init — runs once DOM is ready
  --------------------------------------------------- */
  function init() {
    canvasEl = document.getElementById('game-canvas');
    if (!canvasEl) return; // safety: only run on the play page

    container = canvasEl.parentElement;

    setupScene();
    buildBoard();
    setupControls();
    bindHudButtons();
    restoreScores();
    updateHud();
    startClock();

    window.addEventListener('resize', onResize);
    new ResizeObserver(onResize).observe(container);

    requestAnimationFrame(tick);
  }

  /* ---------------------------------------------------
     2. Scene / camera / renderer / lights
  --------------------------------------------------- */
  function setupScene() {
    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    updateCameraPosition();

    renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    onResize();

    // Lights: soft ambient fill + a directional key light + a rim accent light
    scene.add(new THREE.AmbientLight(0x8899cc, 0.55));

    const key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(4, 8, 5);
    scene.add(key);

    const rim = new THREE.PointLight(COLOR_VIOLET, 6, 20);
    rim.position.set(-5, 3, -4);
    scene.add(rim);

    const rim2 = new THREE.PointLight(COLOR_CYAN, 4, 20);
    rim2.position.set(5, 2, 4);
    scene.add(rim2);

    // Base platform beneath the board for depth
    const baseGeo = new THREE.CylinderGeometry(4.4, 4.7, 0.4, 48);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x0d1226,
      metalness: 0.6,
      roughness: 0.35,
    });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = -0.6;
    scene.add(base);

    // Subtle grid ring for a "puzzle facility" look
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(3.9, 0.015, 8, 96),
      new THREE.MeshBasicMaterial({ color: COLOR_CYAN, transparent: true, opacity: 0.35 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -0.38;
    scene.add(ring);

    pieceGroup = new THREE.Group();
    scene.add(pieceGroup);

    winLineGroup = new THREE.Group();
    scene.add(winLineGroup);

    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();
  }

  function updateCameraPosition() {
    const x = orbit.radius * Math.sin(orbit.phi) * Math.sin(orbit.theta);
    const y = orbit.radius * Math.cos(orbit.phi);
    const z = orbit.radius * Math.sin(orbit.phi) * Math.cos(orbit.theta);
    camera.position.set(x, y, z);
    camera.lookAt(0, 0, 0);
  }

  /* ---------------------------------------------------
     3. Board construction
  --------------------------------------------------- */
  function buildBoard() {
    cellMeshes = [];
    const tileGeo = new THREE.BoxGeometry(CELL_SIZE, 0.22, CELL_SIZE);

    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const index = row * 3 + col;

        const mat = new THREE.MeshStandardMaterial({
          color: 0x161d33,
          metalness: 0.3,
          roughness: 0.5,
          emissive: 0x000000,
        });

        const tile = new THREE.Mesh(tileGeo, mat);
        tile.position.set(
          (col - 1) * BOARD_SPAN,
          0,
          (row - 1) * BOARD_SPAN
        );
        tile.userData.index = index;
        tile.userData.baseColor = 0x161d33;
        scene.add(tile);
        cellMeshes.push(tile);
      }
    }
  }

  /**
   * Builds a 3D "X" piece: two thin crossed boxes.
   */
  function makeXPiece() {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({
      color: COLOR_CYAN,
      emissive: COLOR_CYAN,
      emissiveIntensity: 0.35,
      metalness: 0.4,
      roughness: 0.25,
    });
    const barGeo = new THREE.BoxGeometry(0.85, 0.16, 0.16);

    const bar1 = new THREE.Mesh(barGeo, mat);
    bar1.rotation.y = Math.PI / 4;
    const bar2 = new THREE.Mesh(barGeo, mat);
    bar2.rotation.y = -Math.PI / 4;

    group.add(bar1, bar2);
    return group;
  }

  /**
   * Builds a 3D "O" piece: a torus standing upright.
   */
  function makeOPiece() {
    const mat = new THREE.MeshStandardMaterial({
      color: COLOR_VIOLET,
      emissive: COLOR_VIOLET,
      emissiveIntensity: 0.35,
      metalness: 0.4,
      roughness: 0.25,
    });
    const geo = new THREE.TorusGeometry(0.34, 0.11, 16, 32);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = Math.PI / 2;
    return mesh;
  }

  /* ---------------------------------------------------
     4. Controls: manual drag-orbit + zoom + raycasting
  --------------------------------------------------- */
  function setupControls() {
    canvasEl.addEventListener('mousedown', (e) => {
      orbit.dragging = true;
      orbit.lastX = e.clientX;
      orbit.lastY = e.clientY;
    });
    window.addEventListener('mouseup', () => (orbit.dragging = false));
    window.addEventListener('mousemove', (e) => {
      if (orbit.dragging) {
        const dx = e.clientX - orbit.lastX;
        const dy = e.clientY - orbit.lastY;
        orbit.targetTheta -= dx * 0.005;
        orbit.targetPhi = clamp(orbit.targetPhi - dy * 0.005, 0.5, 1.4);
        orbit.lastX = e.clientX;
        orbit.lastY = e.clientY;
      }
      updatePointer(e.clientX, e.clientY);
    });

    canvasEl.addEventListener('wheel', (e) => {
      e.preventDefault();
      orbit.radius = clamp(orbit.radius + e.deltaY * 0.004, orbit.minRadius, orbit.maxRadius);
    }, { passive: false });

    canvasEl.addEventListener('click', onCellClick);

    // Touch support: single-finger drag to orbit, tap to place
    let touchStart = null;
    canvasEl.addEventListener('touchstart', (e) => {
      const t = e.touches[0];
      touchStart = { x: t.clientX, y: t.clientY, time: Date.now() };
      orbit.lastX = t.clientX;
      orbit.lastY = t.clientY;
    }, { passive: true });

    canvasEl.addEventListener('touchmove', (e) => {
      const t = e.touches[0];
      const dx = t.clientX - orbit.lastX;
      const dy = t.clientY - orbit.lastY;
      orbit.targetTheta -= dx * 0.005;
      orbit.targetPhi = clamp(orbit.targetPhi - dy * 0.005, 0.5, 1.4);
      orbit.lastX = t.clientX;
      orbit.lastY = t.clientY;
    }, { passive: true });

    canvasEl.addEventListener('touchend', (e) => {
      if (!touchStart) return;
      const dt = Date.now() - touchStart.time;
      const t = e.changedTouches[0];
      const moved = Math.hypot(t.clientX - touchStart.x, t.clientY - touchStart.y);
      if (dt < 300 && moved < 10) {
        updatePointer(t.clientX, t.clientY);
        handlePlacement();
      }
      touchStart = null;
    });
  }

  function updatePointer(clientX, clientY) {
    const rect = canvasEl.getBoundingClientRect();
    mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  }

  function onCellClick() {
    handlePlacement();
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  /* ---------------------------------------------------
     5. Game rules
  --------------------------------------------------- */
  const WIN_LINES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
  ];

  function handlePlacement() {
    if (!state.active) return;
    if (state.mode === 'ai' && state.current === 'O') return; // AI's turn, ignore human clicks

    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(cellMeshes);
    if (!hits.length) return;

    const index = hits[0].object.userData.index;
    placeAt(index, state.current);
  }

  function placeAt(index, symbol) {
    if (state.board[index] !== null || !state.active) return;

    state.board[index] = symbol;
    state.moves += 1;
    spawnPiece(index, symbol);
    playTone(symbol === 'X' ? 520 : 400);
    updateHud();

    const winner = checkWinner();
    if (winner) {
      endGame(winner);
      return;
    }
    if (state.board.every((c) => c !== null)) {
      endGame('draw');
      return;
    }

    state.current = state.current === 'X' ? 'O' : 'X';
    updateHud();

    if (state.mode === 'ai' && state.current === 'O') {
      setTimeout(aiMove, 480); // small delay so the AI feels like it's "thinking"
    }
  }

  function spawnPiece(index, symbol) {
    const tile = cellMeshes[index];
    const piece = symbol === 'X' ? makeXPiece() : makeOPiece();
    piece.position.copy(tile.position);
    piece.position.y = 1.6;
    piece.scale.setScalar(0.4);
    pieceGroup.add(piece);

    // Simple drop-in + settle animation, no external tweening library needed
    const targetY = 0.28;
    const startTime = performance.now();
    const duration = 420;

    function animateDrop() {
      const elapsed = performance.now() - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      piece.position.y = 1.6 + (targetY - 1.6) * eased;
      piece.scale.setScalar(0.4 + 0.6 * eased);
      piece.rotation.y = (1 - eased) * Math.PI;
      if (t < 1) requestAnimationFrame(animateDrop);
    }
    animateDrop();

    tile.material.emissive.setHex(symbol === 'X' ? COLOR_CYAN : COLOR_VIOLET);
    tile.material.emissiveIntensity = 0.25;
  }

  function checkWinner() {
    for (const line of WIN_LINES) {
      const [a, b, c] = line;
      if (state.board[a] && state.board[a] === state.board[b] && state.board[a] === state.board[c]) {
        return { symbol: state.board[a], line };
      }
    }
    return null;
  }

  function endGame(result) {
    state.active = false;
    stopClock();

    if (result === 'draw') {
      state.scores.draws += 1;
      showWinOverlay('It\'s a Draw', 'Nobody claimed the board this round.');
    } else {
      drawWinLine(result.line);
      const humanWon = result.symbol === 'X';
      if (state.mode === 'ai') {
        if (humanWon) state.scores.player += 1; else state.scores.opponent += 1;
      } else {
        // Two-player: X is "player", O is "opponent" slot for scorekeeping
        if (humanWon) state.scores.player += 1; else state.scores.opponent += 1;
      }
      const winnerLabel = state.mode === 'ai'
        ? (humanWon ? state.playerName : 'TRIAD AI')
        : (humanWon ? `${state.playerName} (X)` : 'Player Two (O)');
      showWinOverlay(`${winnerLabel} Wins!`, `Solved in ${state.moves} moves — ${formatTime(elapsedSeconds())}.`);
      if (humanWon) {
        launchConfetti();
        saveToLeaderboard();
      }
    }

    persistScores();
    updateHud();
  }

  function drawWinLine(line) {
    const points = line.map((i) => cellMeshes[i].position.clone().setY(0.5));
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({ color: COLOR_AMBER, linewidth: 4 });
    const line3d = new THREE.Line(geo, mat);
    winLineGroup.add(line3d);

    // Pulse the winning tiles
    line.forEach((i) => {
      cellMeshes[i].material.emissive.setHex(COLOR_AMBER);
      cellMeshes[i].material.emissiveIntensity = 0.6;
    });
  }

  /* ---------- AI opponent ---------- */
  function aiMove() {
    if (!state.active) return;
    const index = state.difficulty === 'hard' ? bestMove() : randomMove();
    if (index !== -1) placeAt(index, 'O');
  }

  function randomMove() {
    const open = state.board.map((v, i) => (v === null ? i : -1)).filter((i) => i !== -1);
    if (!open.length) return -1;
    return open[Math.floor(Math.random() * open.length)];
  }

  /**
   * Unbeatable AI using minimax with alpha-beta style short-circuit.
   * Small search space (max 9! ) so plain recursion is instant.
   */
  function bestMove() {
    let best = { score: -Infinity, index: -1 };
    for (let i = 0; i < 9; i++) {
      if (state.board[i] !== null) continue;
      state.board[i] = 'O';
      const score = minimax(state.board, 0, false);
      state.board[i] = null;
      if (score > best.score) best = { score, index: i };
    }
    return best.index;
  }

  function minimax(board, depth, isMaximizing) {
    const winner = evaluateBoard(board);
    if (winner === 'O') return 10 - depth;
    if (winner === 'X') return depth - 10;
    if (board.every((c) => c !== null)) return 0;

    if (isMaximizing) {
      let best = -Infinity;
      for (let i = 0; i < 9; i++) {
        if (board[i] !== null) continue;
        board[i] = 'O';
        best = Math.max(best, minimax(board, depth + 1, false));
        board[i] = null;
      }
      return best;
    } else {
      let best = Infinity;
      for (let i = 0; i < 9; i++) {
        if (board[i] !== null) continue;
        board[i] = 'X';
        best = Math.min(best, minimax(board, depth + 1, true));
        board[i] = null;
      }
      return best;
    }
  }

  function evaluateBoard(board) {
    for (const [a, b, c] of WIN_LINES) {
      if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
    }
    return null;
  }

  /* ---------------------------------------------------
     6. HUD: timer, moves, score, mode switch, buttons
  --------------------------------------------------- */
  function bindHudButtons() {
    const restartBtn = document.getElementById('btn-restart');
    const resetBtn = document.getElementById('btn-reset');
    const shuffleBtn = document.getElementById('btn-shuffle');
    const winClose = document.getElementById('win-close');
    const nameInput = document.getElementById('player-name');

    if (restartBtn) restartBtn.addEventListener('click', () => newRound(false));
    if (resetBtn) resetBtn.addEventListener('click', () => {
      state.scores = { player: 0, opponent: 0, draws: 0 };
      persistScores();
      newRound(true);
    });
    if (shuffleBtn) shuffleBtn.addEventListener('click', shuffleStart);
    if (winClose) winClose.addEventListener('click', () => hideWinOverlay());

    document.querySelectorAll('.mode-btn[data-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.mode-btn[data-mode]').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        state.mode = btn.dataset.mode;
        newRound(false);
      });
    });

    document.querySelectorAll('.mode-btn[data-difficulty]').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.mode-btn[data-difficulty]').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        state.difficulty = btn.dataset.difficulty;
      });
    });

    if (nameInput) {
      const saved = localStorage.getItem('triad_player_name');
      if (saved) { nameInput.value = saved; state.playerName = saved; }
      nameInput.addEventListener('input', () => {
        state.playerName = nameInput.value.trim() || 'Player One';
        localStorage.setItem('triad_player_name', state.playerName);
      });
    }
  }

  /**
   * Randomizes which symbol starts the next round and gives the
   * camera a fun spin — this is the game's "Shuffle" feature.
   */
  function shuffleStart() {
    orbit.targetTheta += (Math.random() - 0.5) * Math.PI;
    const startingSymbol = Math.random() > 0.5 ? 'X' : 'O';
    newRound(false, startingSymbol);
  }

  function newRound(fullReset, startingSymbol) {
    state.board = Array(9).fill(null);
    state.current = startingSymbol || 'X';
    state.active = true;
    state.moves = 0;

    pieceGroup.clear();
    winLineGroup.clear();
    cellMeshes.forEach((tile) => {
      tile.material.emissive.setHex(0x000000);
      tile.material.emissiveIntensity = 0;
    });

    hideWinOverlay();
    startClock();
    updateHud();

    if (fullReset) {
      // full reset also re-centers the camera
      orbit.targetTheta = Math.PI / 4;
      orbit.targetPhi = 1.0;
      orbit.radius = 7.2;
    }

    if (state.mode === 'ai' && state.current === 'O') {
      setTimeout(aiMove, 480);
    }
  }

  function updateHud() {
    setText('score-you', state.scores.player);
    setText('score-ai', state.scores.opponent);
    setText('score-draw', state.scores.draws);
    setText('move-count', state.moves);

    const dot = document.querySelector('.turn-dot');
    if (dot) {
      dot.classList.toggle('o', state.current === 'O');
    }
    const opponentLabel = document.getElementById('opponent-label');
    if (opponentLabel) {
      opponentLabel.textContent = state.mode === 'ai' ? 'TRIAD AI' : 'Player Two';
    }
    const turnText = document.getElementById('turn-text');
    if (turnText) {
      if (!state.active) {
        turnText.textContent = 'Round over';
      } else if (state.mode === 'ai') {
        turnText.textContent = state.current === 'X' ? 'Your move' : 'AI is thinking…';
      } else {
        turnText.textContent = state.current === 'X' ? "Player One's move (X)" : "Player Two's move (O)";
      }
    }
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  /* ---------- Timer ---------- */
  function startClock() {
    stopClock();
    state.startTime = Date.now();
    state.timerId = setInterval(() => {
      setText('timer', formatTime(elapsedSeconds()));
    }, 1000);
    setText('timer', '00:00');
  }
  function stopClock() {
    if (state.timerId) clearInterval(state.timerId);
    state.timerId = null;
  }
  function elapsedSeconds() {
    return state.startTime ? Math.floor((Date.now() - state.startTime) / 1000) : 0;
  }
  function formatTime(totalSeconds) {
    const m = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const s = String(totalSeconds % 60).padStart(2, '0');
    return `${m}:${s}`;
  }

  /* ---------- Win overlay ---------- */
  function showWinOverlay(title, subtitle) {
    const overlay = document.getElementById('win-overlay');
    if (!overlay) return;
    document.getElementById('win-title').textContent = title;
    document.getElementById('win-subtitle').textContent = subtitle;
    overlay.classList.add('show');
  }
  function hideWinOverlay() {
    const overlay = document.getElementById('win-overlay');
    if (overlay) overlay.classList.remove('show');
  }

  /* ---------------------------------------------------
     7. Persistence: scores + leaderboard + tiny sound
  --------------------------------------------------- */
  function persistScores() {
    localStorage.setItem('triad_scores', JSON.stringify(state.scores));
  }
  function restoreScores() {
    try {
      const saved = JSON.parse(localStorage.getItem('triad_scores'));
      if (saved) state.scores = saved;
    } catch (e) { /* ignore malformed data */ }
  }

  function saveToLeaderboard() {
    try {
      const entries = JSON.parse(localStorage.getItem('triad_leaderboard')) || [];
      entries.push({
        name: state.playerName,
        score: Math.max(100 - state.moves * 5 + Math.max(0, 90 - elapsedSeconds()), 10),
        moves: state.moves,
        time: formatTime(elapsedSeconds()),
        date: new Date().toISOString().slice(0, 10),
      });
      localStorage.setItem('triad_leaderboard', JSON.stringify(entries));
    } catch (e) { /* ignore storage errors (e.g. quota, private mode) */ }
  }

  /**
   * Tiny synthesized click/win tone using the Web Audio API so the
   * game has audio feedback without requiring any audio asset files.
   */
  let audioCtx;
  function playTone(freq) {
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.25);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.25);
    } catch (e) { /* audio is a nice-to-have, never block the game on it */ }
  }

  /* ---------- Confetti (lightweight canvas effect) ---------- */
  function launchConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#00d9ff', '#7c5cff', '#ffb340', '#4ee6a6'];
    const pieces = Array.from({ length: 140 }, () => ({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * canvas.height * 0.3,
      size: 5 + Math.random() * 6,
      color: colors[Math.floor(Math.random() * colors.length)],
      speedY: 2 + Math.random() * 3,
      speedX: (Math.random() - 0.5) * 2,
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 10,
    }));

    let frame = 0;
    const maxFrames = 180;

    function drawConfetti() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pieces.forEach((p) => {
        p.x += p.speedX;
        p.y += p.speedY;
        p.rotation += p.rotSpeed;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      });
      frame++;
      if (frame < maxFrames) {
        requestAnimationFrame(drawConfetti);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    drawConfetti();
  }

  /* ---------------------------------------------------
     8. Animation loop + responsive resize + hover feedback
  --------------------------------------------------- */
  function tick() {
    // Smoothly ease the camera toward its target orbit angles
    orbit.theta += (orbit.targetTheta - orbit.theta) * 0.08;
    orbit.phi += (orbit.targetPhi - orbit.phi) * 0.08;
    updateCameraPosition();

    updateHoverState();

   

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }

  function updateHoverState() {
    raycaster.setFromCamera(mouse, camera);
    const hits = state.active ? raycaster.intersectObjects(cellMeshes) : [];
    const newHover = hits.length ? hits[0].object.userData.index : -1;

    if (newHover !== hoveredIndex) {
      if (hoveredIndex !== -1 && state.board[hoveredIndex] === null) {
        cellMeshes[hoveredIndex].material.color.setHex(0x161d33);
      }
      if (newHover !== -1 && state.board[newHover] === null) {
        const canHoverPlace = !(state.mode === 'ai' && state.current === 'O');
        cellMeshes[newHover].material.color.setHex(canHoverPlace ? 0x223154 : 0x161d33);
      }
      hoveredIndex = newHover;
      canvasEl.style.cursor = (newHover !== -1 && state.board[newHover] === null) ? 'pointer' : 'default';
    }
  }

  function onResize() {
    if (!container || !renderer) return;
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
