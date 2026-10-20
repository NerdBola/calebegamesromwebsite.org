const miniGameDialog = document.querySelector('#mical-dialog');
const miniGameCanvas = document.querySelector('#mini-game-canvas');
const miniGameContext = miniGameCanvas.getContext('2d');
const miniGameTitle = document.querySelector('#mini-game-title');
const miniGameInstructions = document.querySelector('#mini-game-instructions');
const miniGameStatus = document.querySelector('#mini-game-status');
const f1Setup = document.querySelector('#f1-setup');
const f1ConfigPanel = document.querySelector('#f1-config-panel');
const f1RaceSetup = document.querySelector('#f1-race-setup');
const f1TrackSelect = document.querySelector('#f1-track-select');
const f1CarSelect = document.querySelector('#f1-car-select');
const f1TeamSelect = document.querySelector('#f1-team-select');
const f1TeamField = document.querySelector('.f1-team-field');
const f1DefaultConfig = { color: '#e84b3c', engine: 6, grip: 6, aero: 6 };
const f1Tracks = [
  'Melbourne · Austrália', 'Xangai · China', 'Suzuka · Japão', 'Sakhir · Bahrein',
  'Jeddah · Arábia Saudita', 'Miami · Estados Unidos', 'Imola · Itália', 'Monte Carlo · Mônaco',
  'Montreal · Canadá', 'Barcelona · Espanha', 'Spielberg · Áustria', 'Silverstone · Reino Unido',
  'Spa-Francorchamps · Bélgica', 'Hungaroring · Hungria', 'Zandvoort · Países Baixos', 'Monza · Itália',
  'Baku · Azerbaijão', 'Marina Bay · Singapura', 'Austin · Estados Unidos', 'Cidade do México · México',
  'Interlagos · Brasil', 'Las Vegas · Estados Unidos', 'Lusail · Catar', 'Yas Marina · Abu Dhabi',
  'Portimão · Portugal', 'Nürburgring · Alemanha', 'Istanbul Park · Turquia', 'Sepang · Malásia',
  'Hockenheim · Alemanha', 'Kyalami · África do Sul', 'Buenos Aires · Argentina', 'Paul Ricard · França'
];
const f1Teams = [
  { name: 'Ferrari', color: '#e84b3c', engine: 8, grip: 7, aero: 8 },
  { name: 'McLaren', color: '#f28a35', engine: 8, grip: 8, aero: 7 },
  { name: 'Mercedes', color: '#42b7ac', engine: 8, grip: 8, aero: 8 },
  { name: 'Red Bull', color: '#4166a6', engine: 9, grip: 8, aero: 7 },
  { name: 'Aston Martin', color: '#39866f', engine: 7, grip: 8, aero: 8 },
  { name: 'Alpine', color: '#e785a6', engine: 7, grip: 7, aero: 8 },
  { name: 'Williams', color: '#4a83c1', engine: 8, grip: 7, aero: 7 },
  { name: 'Haas', color: '#e8e8e3', engine: 7, grip: 7, aero: 7 },
  { name: 'Racing Bulls', color: '#556fa9', engine: 7, grip: 8, aero: 7 },
  { name: 'Audi', color: '#ba3434', engine: 8, grip: 7, aero: 8 },
  { name: 'Cadillac', color: '#d3bd82', engine: 7, grip: 7, aero: 8 }
];
let f1CarConfig = loadF1CarConfig();
let f1RaceSelection = null;
const heldGameKeys = new Set();
const miniGameDetails = {
  race: {
    title: 'Corrida na prancha',
    instructions: 'Segure → ou espaço para ir até o outro lado da praia e voltar. Paulo está logo atrás!'
  },
  fishing: {
    title: 'Pescaria no resort',
    instructions: 'Quando a boia afundar, clique na água ou aperte espaço. Pesque 3 peixes!'
  },
  pac: {
    title: 'Pac-Mical',
    instructions: 'Use as setas ou WASD para pegar todas as bolinhas e escapar do Paulo.'
  },
  duel: {
    title: 'Mical vs Paulo',
    instructions: 'Use ↑/↓ ou W/S para mover a raquete. Faça 5 pontos antes do Paulo.'
  },
  f1config: {
    title: 'Formula 1 X · Config Car',
    instructions: 'Ajuste a cor e o acerto do carro. Suas escolhas ficam salvas neste navegador.'
  },
  f1gp: {
    title: 'Formula 1 X · Grand Prix',
    instructions: 'Escolha uma das 32 pistas e decida se vai correr com seu carro ou com uma equipe.'
  }
};

let activeMiniGame = null;
let miniGameState = null;
let miniGameFrame = 0;
let previousMiniGameFrame = 0;

function setMiniGameStatus(message) {
  miniGameStatus.textContent = message;
}

function loadF1CarConfig() {
  try {
    return { ...f1DefaultConfig, ...JSON.parse(localStorage.getItem('calebegamesrom-f1-car') || '{}') };
  } catch {
    return { ...f1DefaultConfig };
  }
}

function saveF1CarConfig() {
  try {
    localStorage.setItem('calebegamesrom-f1-car', JSON.stringify(f1CarConfig));
    document.querySelector('#f1-save-note').textContent = 'Configuração salva neste navegador.';
  } catch {
    document.querySelector('#f1-save-note').textContent = 'Configuração ativa até você fechar esta página.';
  }
  drawMiniGame();
}

function syncF1ConfigForm() {
  for (const key of ['engine', 'grip', 'aero']) {
    const input = document.querySelector(`#f1-${key}`);
    input.value = f1CarConfig[key];
    input.nextElementSibling.value = f1CarConfig[key];
  }
  document.querySelectorAll('[data-f1-color]').forEach((button) => {
    button.style.setProperty('--swatch', button.dataset.f1Color);
    button.setAttribute('aria-pressed', String(button.dataset.f1Color === f1CarConfig.color));
  });
}

function populateF1Selections() {
  f1Tracks.forEach((track, index) => {
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = `${String(index + 1).padStart(2, '0')} · ${track}`;
    f1TrackSelect.append(option);
  });
  f1Teams.forEach((team) => {
    const option = document.createElement('option');
    option.value = team.name;
    option.textContent = team.name;
    f1TeamSelect.append(option);
  });
}

function startGrandPrix() {
  const team = f1Teams.find((item) => item.name === f1TeamSelect.value) || f1Teams[0];
  const usingTeam = f1CarSelect.value === 'team';
  f1RaceSelection = {
    trackIndex: Number(f1TrackSelect.value) || 0,
    color: usingTeam ? team.color : f1CarConfig.color,
    engine: usingTeam ? team.engine : Number(f1CarConfig.engine),
    grip: usingTeam ? team.grip : Number(f1CarConfig.grip),
    aero: usingTeam ? team.aero : Number(f1CarConfig.aero),
    carName: usingTeam ? team.name : 'Meu carro'
  };
  activeMiniGame = 'f1race';
  f1Setup.hidden = true;
  document.querySelector('.direction-controls').hidden = false;
  document.querySelector('.dialog-restart').hidden = false;
  document.querySelector('.dialog-key-hint').textContent = '↑ ACELERA · ↓ FREIA · ← → DIREÇÃO · ESPAÇO TURBO';
  miniGameInstructions.textContent = `${f1Tracks[f1RaceSelection.trackIndex]} · ${f1RaceSelection.carName}`;
  resetMiniGame();
  previousMiniGameFrame = performance.now();
  miniGameFrame = requestAnimationFrame(runMiniGameFrame);
}

function resetMiniGame() {
  heldGameKeys.clear();
  if (activeMiniGame === 'race') {
    miniGameState = { distance: 0, pauloDistance: 0, done: false, won: false };
    setMiniGameStatus('Prontos? Segure → ou espaço para começar!');
  } else if (activeMiniGame === 'fishing') {
    miniGameState = { caught: 0, phase: 'waiting', timer: 1.5 + Math.random() * 2, done: false };
    setMiniGameStatus('Aguarde a boia afundar...');
  } else if (activeMiniGame === 'pac') {
    const rows = [
      '###############',
      '#.............#',
      '#.###.###.###.#',
      '#.............#',
      '#.###.#.#.###.#',
      '#.....#.#.....#',
      '###.#.#.#.#####',
      '#...#.....#...#',
      '#.#####.#####.#',
      '#.............#',
      '###############'
    ];
    const map = rows.map((row) => row.split(''));
    const dots = new Set();
    map.forEach((row, y) => row.forEach((cell, x) => {
      if (cell === '.' && !(x === 1 && y === 1)) dots.add(`${x},${y}`);
    }));
    miniGameState = {
      map, dots, player: { x: 1, y: 1 }, ghost: { x: 13, y: 9 },
      direction: null, moveTimer: 0, ghostTimer: 0, done: false
    };
    setMiniGameStatus(`Bolinhas restantes: ${dots.size}`);
  } else if (activeMiniGame === 'duel') {
    miniGameState = {
      playerY: 220, pauloY: 220, ballX: 400, ballY: 220,
      ballVX: 245, ballVY: 150, playerScore: 0, pauloScore: 0,
      done: false, won: false
    };
    setMiniGameStatus('Primeiro a marcar 5 pontos vence!');
  } else if (activeMiniGame === 'f1race') {
    miniGameState = {
      ...f1RaceSelection, progress: 0, rivalProgress: 0, speed: 0,
      lateral: 0, lap: 1, done: false, won: false
    };
    setMiniGameStatus(`GP ${f1Tracks[miniGameState.trackIndex]} · ${miniGameState.carName}`);
  }
  drawMiniGame();
}

function launchMiniGame(name) {
  if (!miniGameDetails[name]) return;
  activeMiniGame = name;
  miniGameTitle.textContent = miniGameDetails[name].title;
  miniGameInstructions.textContent = miniGameDetails[name].instructions;
  const isF1 = name === 'f1config' || name === 'f1gp';
  f1Setup.hidden = !isF1;
  f1ConfigPanel.hidden = name !== 'f1config';
  f1RaceSetup.hidden = name !== 'f1gp';
  document.querySelector('.direction-controls').hidden = name === 'fishing' || isF1;
  document.querySelector('.dialog-restart').hidden = isF1;
  document.querySelector('.dialog-key-hint').textContent = name === 'f1config' || name === 'f1gp' ? '' : 'TECLAS DE SETA · WASD · ESPAÇO';
  if (!miniGameDialog.open) miniGameDialog.showModal();
  cancelAnimationFrame(miniGameFrame);
  if (name === 'f1config') {
    activeMiniGame = name;
    miniGameState = {};
    syncF1ConfigForm();
    setMiniGameStatus('Ajuste o carro e ele estará pronto para o Grand Prix.');
    drawMiniGame();
    return;
  }
  if (name === 'f1gp') {
    activeMiniGame = name;
    miniGameState = null;
    setMiniGameStatus(`${f1Tracks.length} pistas disponíveis · escolha seu carro e largue!`);
    drawMiniGame();
    return;
  }
  resetMiniGame();
  previousMiniGameFrame = performance.now();
  miniGameFrame = requestAnimationFrame(runMiniGameFrame);
}

function runMiniGameFrame(time) {
  const delta = Math.min((time - previousMiniGameFrame) / 1000, 0.05);
  previousMiniGameFrame = time;
  updateMiniGame(delta);
  drawMiniGame();
  if (miniGameDialog.open) miniGameFrame = requestAnimationFrame(runMiniGameFrame);
}

function directionForKey(key) {
  const directions = {
    ArrowUp: [0, -1], w: [0, -1],
    ArrowDown: [0, 1], s: [0, 1],
    ArrowLeft: [-1, 0], a: [-1, 0],
    ArrowRight: [1, 0], d: [1, 0]
  };
  return directions[key] || directions[key.toLowerCase()];
}

function pressMiniGameKey(key) {
  heldGameKeys.add(key);
  if (activeMiniGame === 'pac') {
    const direction = directionForKey(key);
    if (direction) miniGameState.direction = direction;
  }
}

function movePacMical(dx, dy) {
  const nextX = miniGameState.player.x + dx;
  const nextY = miniGameState.player.y + dy;
  if (miniGameState.map[nextY]?.[nextX] === '#') return;
  miniGameState.player.x = nextX;
  miniGameState.player.y = nextY;
  miniGameState.dots.delete(`${nextX},${nextY}`);
  if (miniGameState.player.x === miniGameState.ghost.x && miniGameState.player.y === miniGameState.ghost.y) {
    miniGameState.done = true;
    setMiniGameStatus('Paulo te pegou! Reinicie para tentar de novo.');
  } else if (!miniGameState.dots.size) {
    miniGameState.done = true;
    miniGameState.won = true;
    setMiniGameStatus('Você pegou todas as bolinhas! Vitória!');
  } else if (miniGameState.dots.size % 10 === 0) {
    setMiniGameStatus(`Bolinhas restantes: ${miniGameState.dots.size}`);
  }
}

function movePacGhost() {
  const state = miniGameState;
  const options = [[0, -1], [1, 0], [0, 1], [-1, 0]]
    .filter(([dx, dy]) => state.map[state.ghost.y + dy]?.[state.ghost.x + dx] !== '#');
  options.sort((a, b) => {
    const distanceA = Math.abs(state.ghost.x + a[0] - state.player.x) + Math.abs(state.ghost.y + a[1] - state.player.y);
    const distanceB = Math.abs(state.ghost.x + b[0] - state.player.x) + Math.abs(state.ghost.y + b[1] - state.player.y);
    return distanceA - distanceB;
  });
  if (options.length) {
    miniGameState.ghost.x += options[0][0];
    miniGameState.ghost.y += options[0][1];
  }
  if (miniGameState.player.x === miniGameState.ghost.x && miniGameState.player.y === miniGameState.ghost.y) {
    miniGameState.done = true;
    setMiniGameStatus('Paulo te pegou! Reinicie para tentar de novo.');
  }
}

function updateMiniGame(delta) {
  const state = miniGameState;
  if (!state || state.done) return;
  if (activeMiniGame === 'race') {
    if (heldGameKeys.has('ArrowRight') || heldGameKeys.has('d') || heldGameKeys.has('D') || heldGameKeys.has('space')) {
      state.distance = Math.min(2, state.distance + delta * 0.29);
    }
    state.pauloDistance = Math.min(2, state.pauloDistance + delta * 0.235);
    if (state.distance >= 2) {
      state.done = true;
      state.won = true;
      setMiniGameStatus('Você venceu a corrida e voltou para a praia!');
    } else if (state.pauloDistance >= 2) {
      state.done = true;
      setMiniGameStatus('Paulo chegou primeiro! Reinicie para uma revanche.');
    }
  } else if (activeMiniGame === 'fishing') {
    state.timer -= delta;
    if (state.phase === 'waiting' && state.timer <= 0) {
      state.phase = 'bite';
      state.timer = 1.35;
      setMiniGameStatus('A boia afundou! Clique ou aperte espaço agora!');
    } else if (state.phase === 'bite' && state.timer <= 0) {
      state.phase = 'waiting';
      state.timer = 1.2 + Math.random() * 1.8;
      setMiniGameStatus('O peixe escapou. Espere a próxima mordida!');
    }
  } else if (activeMiniGame === 'pac') {
    state.moveTimer += delta;
    if (state.direction && state.moveTimer >= 0.13) {
      state.moveTimer = 0;
      movePacMical(...state.direction);
    }
    state.ghostTimer += delta;
    if (!state.done && state.ghostTimer >= 0.28) {
      state.ghostTimer = 0;
      movePacGhost();
    }
  } else if (activeMiniGame === 'duel') {
    if (heldGameKeys.has('ArrowUp') || heldGameKeys.has('w')) state.playerY -= 340 * delta;
    if (heldGameKeys.has('ArrowDown') || heldGameKeys.has('s')) state.playerY += 340 * delta;
    state.playerY = Math.max(58, Math.min(382, state.playerY));
    const aiTarget = state.ballY;
    state.pauloY += Math.sign(aiTarget - state.pauloY) * Math.min(Math.abs(aiTarget - state.pauloY), 235 * delta);
    state.ballX += state.ballVX * delta;
    state.ballY += state.ballVY * delta;
    if (state.ballY < 16 || state.ballY > 424) state.ballVY *= -1;
    if (state.ballVX < 0 && state.ballX < 72 && Math.abs(state.ballY - state.playerY) < 58) {
      state.ballVX = Math.abs(state.ballVX) * 1.04;
      state.ballVY += (state.ballY - state.playerY) * 2.1;
    } else if (state.ballVX > 0 && state.ballX > 728 && Math.abs(state.ballY - state.pauloY) < 58) {
      state.ballVX = -Math.abs(state.ballVX) * 1.04;
      state.ballVY += (state.ballY - state.pauloY) * 2.1;
    }
    state.ballVY = Math.max(-310, Math.min(310, state.ballVY));
    if (state.ballX < -12 || state.ballX > 812) {
      if (state.ballX > 812) state.playerScore += 1;
      else state.pauloScore += 1;
      if (state.playerScore >= 5 || state.pauloScore >= 5) {
        state.done = true;
        state.won = state.playerScore >= 5;
        setMiniGameStatus(state.won ? 'Vitória da Mical! Que partida!' : 'Paulo venceu. Bora para a revanche?');
      } else {
        setMiniGameStatus(`Mical ${state.playerScore} × ${state.pauloScore} Paulo`);
        state.ballX = 400;
        state.ballY = 220;
        state.ballVX = state.playerScore > state.pauloScore ? -245 : 245;
        state.ballVY = Math.random() > 0.5 ? 150 : -150;
      }
    }
  } else if (activeMiniGame === 'f1race') {
    const accelerating = heldGameKeys.has('ArrowUp') || heldGameKeys.has('w');
    const braking = heldGameKeys.has('ArrowDown') || heldGameKeys.has('s');
    const turbo = heldGameKeys.has('space');
    const steering = Number(heldGameKeys.has('ArrowRight') || heldGameKeys.has('d')) - Number(heldGameKeys.has('ArrowLeft') || heldGameKeys.has('a'));
    const maxSpeed = 105 + state.engine * 12 + state.aero * 2;
    state.speed += (accelerating ? 48 + state.engine * 8 : -32) * delta;
    if (braking) state.speed -= 95 * delta;
    state.speed = Math.max(0, Math.min(maxSpeed * (turbo ? 1.16 : 1), state.speed));
    state.lateral = Math.max(-1.35, Math.min(1.35, state.lateral + steering * (0.46 + state.grip * 0.055) * delta));
    if (!steering) state.lateral *= Math.max(0, 1 - delta * 0.18);
    if (Math.abs(state.lateral) > 1) state.speed *= Math.max(0.84, 1 - delta * (1.8 - state.grip * 0.08));
    state.progress += state.speed * (1 + state.aero * 0.003) / 2700 * delta;
    state.rivalProgress += (0.065 + (state.engine > 8 ? 0.002 : 0)) * delta;
    const currentLap = Math.min(3, Math.floor(state.progress) + 1);
    if (currentLap > state.lap) {
      state.lap = currentLap;
      setMiniGameStatus(currentLap === 3 ? 'Última volta! Pise fundo!' : `Volta ${currentLap} de 3 · ${Math.round(state.speed)} km/h`);
    }
    if (state.progress >= 3 || state.rivalProgress >= 3) {
      state.done = true;
      state.won = state.progress >= 3 && state.progress >= state.rivalProgress;
      setMiniGameStatus(state.won ? 'Bandeirada! Você venceu o Grand Prix!' : 'Paulo cruzou a linha primeiro. Tente outra vez!');
    }
  }
}

function drawMiniGame() {
  if (!miniGameState && activeMiniGame !== 'f1gp') return;
  const ctx = miniGameContext;
  const state = miniGameState;
  ctx.clearRect(0, 0, 800, 440);
  if (activeMiniGame === 'f1config') drawF1CarPreview(ctx);
  else if (activeMiniGame === 'f1gp') drawF1SetupPreview(ctx);
  else if (activeMiniGame === 'f1race') drawF1Race(ctx, state);
  else if (activeMiniGame === 'race') drawResortRace(ctx, state);
  else if (activeMiniGame === 'fishing') drawResortFishing(ctx, state);
  else if (activeMiniGame === 'pac') drawPacMical(ctx, state);
  else if (activeMiniGame === 'duel') drawMicalDuel(ctx, state);
  if (state?.done) {
    ctx.fillStyle = '#162521b8';
    ctx.fillRect(0, 0, 800, 440);
    ctx.fillStyle = '#fffdf5';
    ctx.textAlign = 'center';
    ctx.font = '700 36px "Space Grotesk", sans-serif';
    ctx.fillText(state.won ? 'VOCÊ VENCEU!' : 'FIM DE JOGO', 400, 214);
    ctx.font = '16px "DM Mono", monospace';
    ctx.fillText('Use ↻ Reiniciar para jogar outra vez', 400, 250);
  }
}

function drawFormulaCar(ctx, x, y, angle, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = '#17221e';
  ctx.fillRect(-16, -12, 10, 6);
  ctx.fillRect(8, -12, 10, 6);
  ctx.fillRect(-16, 6, 10, 6);
  ctx.fillRect(8, 6, 10, 6);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-24, -4); ctx.lineTo(-15, -5); ctx.lineTo(-10, -11);
  ctx.lineTo(7, -11); ctx.lineTo(14, -6); ctx.lineTo(23, -5);
  ctx.lineTo(26, -2); ctx.lineTo(23, 2); ctx.lineTo(14, 3);
  ctx.lineTo(7, 10); ctx.lineTo(-10, 10); ctx.lineTo(-15, 4); ctx.lineTo(-24, 3);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#d7ece2';
  ctx.beginPath(); ctx.ellipse(1, -0.5, 7, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fffdf5';
  ctx.fillRect(22, -1.5, 7, 3);
  ctx.fillRect(-22, -1.5, 5, 3);
  ctx.restore();
}

function drawF1CarPreview(ctx) {
  ctx.fillStyle = '#dce8d7'; ctx.fillRect(0, 0, 800, 440);
  ctx.fillStyle = '#4b5750'; ctx.fillRect(0, 290, 800, 150);
  ctx.fillStyle = '#f1d47e'; ctx.fillRect(0, 286, 800, 6);
  ctx.fillStyle = '#fffdf5'; ctx.font = '11px "DM Mono", monospace'; ctx.textAlign = 'left';
  ctx.fillText('BOX 01', 38, 47);
  ctx.fillStyle = '#34473d'; ctx.font = '700 24px "Space Grotesk", sans-serif';
  ctx.fillText('SEU CARRO', 38, 82);
  drawFormulaCar(ctx, 404, 211, -0.08, f1CarConfig.color);
  const stats = [
    ['MOTOR', f1CarConfig.engine], ['ADERÊNCIA', f1CarConfig.grip], ['AERO', f1CarConfig.aero]
  ];
  stats.forEach(([label, value], index) => {
    const x = 38 + index * 245;
    ctx.fillStyle = '#34473d'; ctx.font = '10px "DM Mono", monospace'; ctx.textAlign = 'left';
    ctx.fillText(label, x, 376);
    ctx.fillStyle = '#b6c5b6'; ctx.fillRect(x, 388, 205, 12);
    ctx.fillStyle = f1CarConfig.color; ctx.fillRect(x, 388, 205 * Number(value) / 10, 12);
    ctx.fillStyle = '#34473d'; ctx.fillText(`${value}/10`, x + 214, 398);
  });
  ctx.fillStyle = '#ffffff'; ctx.fillRect(635, 300, 12, 140);
  ctx.fillStyle = '#1d2926'; ctx.fillRect(647, 300, 12, 140);
  for (let y = 300; y < 440; y += 24) {
    ctx.fillStyle = ((y - 300) / 24) % 2 ? '#1d2926' : '#fffdf5';
    ctx.fillRect(635, y, 12, 12);
  }
}

function drawF1SetupPreview(ctx) {
  ctx.fillStyle = '#82ad76'; ctx.fillRect(0, 0, 800, 440);
  ctx.lineWidth = 112; ctx.strokeStyle = '#fffdf5'; ctx.beginPath(); ctx.ellipse(400, 238, 258, 153, -0.08, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 102; ctx.strokeStyle = '#4b5750'; ctx.beginPath(); ctx.ellipse(400, 238, 258, 153, -0.08, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([12, 16]); ctx.lineWidth = 2; ctx.strokeStyle = '#ffffff80';
  ctx.beginPath(); ctx.ellipse(400, 238, 258, 153, -0.08, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
  drawFormulaCar(ctx, 400, 85, 0, f1CarConfig.color);
  ctx.fillStyle = '#fffdf5'; ctx.font = '700 26px "Space Grotesk", sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('32 PISTAS · UM GRID · LARGADA!', 400, 232);
  ctx.font = '12px "DM Mono", monospace'; ctx.fillText('ESCOLHA SEU CIRCUITO E VÁ PARA A PISTA', 400, 258);
}

function drawF1Race(ctx, state) {
  ctx.fillStyle = '#82ad76'; ctx.fillRect(0, 0, 800, 440);
  ctx.fillStyle = '#739e69';
  for (let x = 24; x < 800; x += 66) {
    ctx.beginPath(); ctx.arc(x, 24 + (x % 3) * 8, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 29, 410 - (x % 2) * 10, 3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.lineWidth = 120; ctx.strokeStyle = '#fffdf5'; ctx.beginPath(); ctx.ellipse(400, 238, 258, 153, -0.08, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 108; ctx.strokeStyle = '#4b5750'; ctx.beginPath(); ctx.ellipse(400, 238, 258, 153, -0.08, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([12, 16]); ctx.lineWidth = 2; ctx.strokeStyle = '#ffffff85';
  ctx.beginPath(); ctx.ellipse(400, 238, 258, 153, -0.08, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
  for (let index = 0; index < 8; index += 1) {
    ctx.fillStyle = index % 2 ? '#1d2926' : '#fffdf5';
    ctx.fillRect(390 + index * 3, 80 + index * 12, 12, 12);
    ctx.fillStyle = index % 2 ? '#fffdf5' : '#1d2926';
    ctx.fillRect(402 + index * 3, 80 + index * 12, 12, 12);
  }
  const playerAngle = (state.progress % 1) * Math.PI * 2 - Math.PI / 2;
  const rivalAngle = (state.rivalProgress % 1) * Math.PI * 2 - Math.PI / 2;
  const playerRadius = 153 + state.lateral * 24;
  drawFormulaCar(ctx, 400 + Math.cos(playerAngle) * (258 + state.lateral * 18), 238 + Math.sin(playerAngle) * playerRadius, playerAngle + Math.PI / 2, state.color);
  drawFormulaCar(ctx, 400 + Math.cos(rivalAngle) * 258, 238 + Math.sin(rivalAngle) * 153, rivalAngle + Math.PI / 2, '#f3f1e8');
  ctx.fillStyle = '#1d2926'; ctx.fillRect(20, 17, 206, 49);
  ctx.fillStyle = '#fffdf5'; ctx.textAlign = 'left'; ctx.font = '11px "DM Mono", monospace';
  ctx.fillText(f1Tracks[state.trackIndex].toUpperCase(), 32, 36);
  ctx.font = '700 17px "Space Grotesk", sans-serif';
  ctx.fillText(`VOLTA ${state.lap}/3   ${Math.round(state.speed)} KM/H`, 32, 57);
  ctx.fillStyle = '#1d2926'; ctx.fillRect(672, 17, 108, 49);
  ctx.fillStyle = '#fffdf5'; ctx.textAlign = 'center'; ctx.font = '10px "DM Mono", monospace';
  ctx.fillText('P1  MICAL', 726, 37); ctx.fillText('P2  RIVAL', 726, 54);
}

function drawBeachBackground(ctx) {
  ctx.fillStyle = '#a9dfd5';
  ctx.fillRect(0, 0, 800, 190);
  ctx.fillStyle = '#54bfc0';
  ctx.fillRect(0, 190, 800, 112);
  ctx.fillStyle = '#f4d99a';
  ctx.fillRect(0, 302, 800, 138);
  ctx.fillStyle = '#ffd06a';
  ctx.beginPath();
  ctx.arc(694, 76, 36, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#e8ffffa8';
  ctx.lineWidth = 3;
  for (let row = 0; row < 3; row += 1) {
    ctx.beginPath();
    ctx.moveTo(0, 210 + row * 28);
    ctx.bezierCurveTo(160, 190 + row * 30, 300, 235 + row * 24, 470, 211 + row * 28);
    ctx.bezierCurveTo(610, 190 + row * 30, 700, 224 + row * 25, 800, 206 + row * 28);
    ctx.stroke();
  }
}

function drawSurfer(ctx, x, y, color, name) {
  ctx.fillStyle = '#ff765f';
  ctx.beginPath();
  ctx.ellipse(x, y + 15, 29, 7, -0.06, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y - 19, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(x - 7, y - 9, 14, 23);
  ctx.strokeStyle = '#1d2926';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x - 5, y + 3); ctx.lineTo(x - 13, y + 12);
  ctx.moveTo(x + 5, y + 3); ctx.lineTo(x + 13, y + 11);
  ctx.moveTo(x - 5, y - 4); ctx.lineTo(x - 14, y - 1);
  ctx.moveTo(x + 5, y - 4); ctx.lineTo(x + 14, y - 1);
  ctx.stroke();
  ctx.fillStyle = '#1d2926';
  ctx.font = '12px "DM Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(name, x, y + 39);
}

function drawResortRace(ctx, state) {
  drawBeachBackground(ctx);
  ctx.fillStyle = '#1d2926';
  ctx.font = '12px "DM Mono", monospace';
  ctx.textAlign = 'left';
  ctx.fillText('IDA', 28, 58);
  ctx.textAlign = 'right';
  ctx.fillText('VOLTA', 772, 58);
  ctx.fillStyle = '#fffdf5';
  ctx.fillRect(38, 72, 724, 8);
  ctx.fillStyle = '#ed6c53';
  ctx.fillRect(38, 72, 724 * Math.min(state.distance / 2, 1), 8);
  ctx.fillStyle = '#fffdf5';
  ctx.fillRect(38, 91, 724, 5);
  ctx.fillStyle = '#358a80';
  ctx.fillRect(38, 91, 724 * Math.min(state.pauloDistance / 2, 1), 5);
  [38, 762].forEach((x) => {
    ctx.strokeStyle = '#1d2926'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, 143); ctx.lineTo(x, 319); ctx.stroke();
    ctx.fillStyle = '#fffdf5'; ctx.fillRect(x, 143, 28, 20);
    ctx.fillStyle = '#ed6c53'; ctx.fillRect(x + 14, 143, 14, 10);
    ctx.fillStyle = '#ed6c53'; ctx.fillRect(x, 153, 14, 10);
  });
  const playerPosition = state.distance <= 1 ? state.distance : 2 - state.distance;
  const pauloPosition = state.pauloDistance <= 1 ? state.pauloDistance : 2 - state.pauloDistance;
  drawSurfer(ctx, 55 + playerPosition * 690, 239, '#f2c85d', 'MICAL');
  drawSurfer(ctx, 55 + pauloPosition * 690, 327, '#538cbd', 'PAULO');
}

function drawResortFishing(ctx, state) {
  drawBeachBackground(ctx);
  ctx.fillStyle = '#f3bd75';
  ctx.beginPath(); ctx.arc(118, 277, 24, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#348e84';
  ctx.fillRect(99, 302, 38, 62);
  ctx.strokeStyle = '#1d2926'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(129, 315); ctx.lineTo(180, 208); ctx.lineTo(318, 230); ctx.stroke();
  const bobberY = state.phase === 'bite' ? 244 : 226 + Math.sin(performance.now() / 300) * 5;
  ctx.strokeStyle = '#fffdf5'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(318, 230); ctx.lineTo(394, bobberY); ctx.stroke();
  ctx.fillStyle = state.phase === 'bite' ? '#ed6c53' : '#fffdf5';
  ctx.beginPath(); ctx.ellipse(394, bobberY, 8, 13, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fffdf5'; ctx.font = '700 20px "Space Grotesk", sans-serif'; ctx.textAlign = 'left';
  ctx.fillText(`PEIXES ${state.caught}/3`, 30, 44);
  if (state.phase === 'bite') {
    ctx.fillStyle = '#1d2926'; ctx.font = '700 16px "Space Grotesk", sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('PUXE AGORA!', 400, 171);
    ctx.strokeStyle = '#ffd06a'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(394, bobberY, 22, 0, Math.PI * 2); ctx.stroke();
  }
  for (let i = 0; i < state.caught; i += 1) {
    ctx.fillStyle = ['#ff765f', '#f2c85d', '#8bd5d2'][i];
    ctx.beginPath(); ctx.ellipse(620 + i * 48, 352, 17, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(603 + i * 48, 352); ctx.lineTo(591 + i * 48, 344); ctx.lineTo(591 + i * 48, 360); ctx.fill();
  }
}

function drawPacMical(ctx, state) {
  ctx.fillStyle = '#172b33'; ctx.fillRect(0, 0, 800, 440);
  const tile = 28;
  const offsetX = (800 - state.map[0].length * tile) / 2;
  const offsetY = (440 - state.map.length * tile) / 2;
  state.map.forEach((row, y) => row.forEach((cell, x) => {
    const px = offsetX + x * tile; const py = offsetY + y * tile;
    if (cell === '#') {
      ctx.fillStyle = '#438d87'; ctx.fillRect(px + 2, py + 2, tile - 4, tile - 4);
    } else if (state.dots.has(`${x},${y}`)) {
      ctx.fillStyle = '#f5d36d'; ctx.beginPath(); ctx.arc(px + tile / 2, py + tile / 2, 3, 0, Math.PI * 2); ctx.fill();
    }
  }));
  const px = offsetX + state.player.x * tile + tile / 2;
  const py = offsetY + state.player.y * tile + tile / 2;
  ctx.fillStyle = '#ffd447'; ctx.beginPath(); ctx.arc(px, py, 10, 0.2 * Math.PI, 1.8 * Math.PI); ctx.lineTo(px, py); ctx.fill();
  const gx = offsetX + state.ghost.x * tile + tile / 2;
  const gy = offsetY + state.ghost.y * tile + tile / 2;
  ctx.fillStyle = '#ff765f'; ctx.beginPath(); ctx.arc(gx, gy, 10, Math.PI, 0); ctx.lineTo(gx + 10, gy + 9); ctx.lineTo(gx + 4, gy + 5); ctx.lineTo(gx, gy + 9); ctx.lineTo(gx - 5, gy + 5); ctx.lineTo(gx - 10, gy + 9); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#fffdf5'; ctx.font = '11px "DM Mono", monospace'; ctx.textAlign = 'center';
  ctx.fillText(`PAC-MICAL  ·  ${state.dots.size} BOLINHAS`, 400, 29);
}

function drawMicalDuel(ctx, state) {
  ctx.fillStyle = '#d9f0e8'; ctx.fillRect(0, 0, 800, 440);
  ctx.fillStyle = '#358a80'; ctx.fillRect(22, 20, 756, 400);
  ctx.strokeStyle = '#ffffff99'; ctx.lineWidth = 3; ctx.setLineDash([9, 12]);
  ctx.beginPath(); ctx.moveTo(400, 28); ctx.lineTo(400, 412); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = '#fffdf5'; ctx.font = '700 40px "Space Grotesk", sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(`${state.playerScore}     ${state.pauloScore}`, 400, 68);
  ctx.font = '10px "DM Mono", monospace'; ctx.fillText('MICAL                         PAULO', 400, 87);
  ctx.fillStyle = '#ffd447'; ctx.fillRect(55, state.playerY - 38, 13, 76);
  ctx.fillStyle = '#ff765f'; ctx.fillRect(732, state.pauloY - 38, 13, 76);
  ctx.fillStyle = '#fffdf5'; ctx.beginPath(); ctx.arc(state.ballX, state.ballY, 10, 0, Math.PI * 2); ctx.fill();
}

function catchFish() {
  if (activeMiniGame !== 'fishing' || miniGameState.done) return;
  if (miniGameState.phase !== 'bite') {
    setMiniGameStatus('Ainda não! Espere a boia afundar.');
    return;
  }
  miniGameState.caught += 1;
  if (miniGameState.caught >= 3) {
    miniGameState.done = true;
    miniGameState.won = true;
    setMiniGameStatus('Pescaria completa! Você pegou 3 peixes!');
  } else {
    miniGameState.phase = 'waiting';
    miniGameState.timer = 1.3 + Math.random() * 1.8;
    setMiniGameStatus(`Boa! ${miniGameState.caught}/3 peixes. A boia vai mexer de novo...`);
  }
  drawMiniGame();
}

populateF1Selections();
syncF1ConfigForm();
document.querySelectorAll('[data-f1-color]').forEach((button) => {
  button.addEventListener('click', () => {
    f1CarConfig.color = button.dataset.f1Color;
    syncF1ConfigForm();
    saveF1CarConfig();
  });
});
for (const key of ['engine', 'grip', 'aero']) {
  const input = document.querySelector(`#f1-${key}`);
  input.addEventListener('input', () => {
    f1CarConfig[key] = Number(input.value);
    input.nextElementSibling.value = input.value;
    saveF1CarConfig();
  });
}
f1CarSelect.addEventListener('change', () => {
  f1TeamField.hidden = f1CarSelect.value !== 'team';
});
document.querySelector('#f1-start-race').addEventListener('click', startGrandPrix);

document.querySelectorAll('[data-launch-game]').forEach((button) => {
  button.addEventListener('click', () => launchMiniGame(button.dataset.launchGame));
});
document.querySelector('.dialog-close').addEventListener('click', () => miniGameDialog.close());
document.querySelector('.dialog-restart').addEventListener('click', resetMiniGame);
miniGameCanvas.addEventListener('click', catchFish);
miniGameDialog.addEventListener('close', () => {
  cancelAnimationFrame(miniGameFrame);
  heldGameKeys.clear();
});
miniGameDialog.addEventListener('click', (event) => {
  if (event.target === miniGameDialog) miniGameDialog.close();
});
document.querySelectorAll('[data-game-key]').forEach((button) => {
  button.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    pressMiniGameKey(button.dataset.gameKey);
  });
  const release = () => heldGameKeys.delete(button.dataset.gameKey);
  button.addEventListener('pointerup', release);
  button.addEventListener('pointercancel', release);
  button.addEventListener('lostpointercapture', release);
});
window.addEventListener('keydown', (event) => {
  if (!miniGameDialog.open) return;
  const key = event.code === 'Space' ? 'space' : event.key.length === 1 ? event.key.toLowerCase() : event.key;
  if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'space', 'w', 'a', 's', 'd'].includes(key)) return;
  event.preventDefault();
  if (!event.repeat) {
    pressMiniGameKey(key);
    if (key === 'space') catchFish();
  }
});
window.addEventListener('keyup', (event) => {
  const key = event.code === 'Space' ? 'space' : event.key.length === 1 ? event.key.toLowerCase() : event.key;
  heldGameKeys.delete(key);
});
