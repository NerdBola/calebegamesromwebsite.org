const API_URL = 'https://www.speedrun.com/api/v1/games?moderator=xyqd75n8&max=100';
const PROFILE_ID = 'xyqd75n8';
const grid = document.querySelector('#games-grid');
const count = document.querySelector('#game-count');
const searchInput = document.querySelector('#game-search');
const filterButtons = [...document.querySelectorAll('.filter-button')];
const status = document.querySelector('#games-status');

let allGames = [];
let activeFilter = 'all';

function createGameCard(game, index) {
  const card = document.createElement('a');
  card.className = 'game-card';
  card.href = game.weblink;
  card.target = '_blank';
  card.rel = 'noreferrer';
  card.style.animationDelay = `${Math.min(index % 12, 8) * 35}ms`;

  const cover = document.createElement('img');
  const coverUrl = game.assets?.['cover-medium']?.uri || game.assets?.['cover-small']?.uri;
  cover.className = 'game-cover';
  cover.alt = `Capa de ${game.names?.international || 'jogo'}`;
  cover.loading = 'lazy';
  cover.src = coverUrl || 'https://www.speedrun.com/images/blankcover.png';
  cover.addEventListener('error', () => {
    cover.src = 'https://www.speedrun.com/images/blankcover.png';
    cover.classList.add('is-empty');
  }, { once: true });

  const info = document.createElement('span');
  info.className = 'game-info';
  const name = document.createElement('span');
  name.className = 'game-name';
  name.textContent = game.names?.international?.trim() || 'Jogo sem título';
  const meta = document.createElement('span');
  meta.className = 'game-meta';
  const role = document.createElement('span');
  const roleName = game.moderators?.[PROFILE_ID] === 'super-moderator' ? 'Supermoderador' : 'Moderador';
  role.textContent = roleName;
  const tag = document.createElement('span');
  tag.className = `game-tag${game.romhack ? ' romhack' : ''}`;
  tag.textContent = game.romhack ? 'ROM HACK' : (game.released || 'SRC');

  meta.append(role, tag);
  info.append(name, meta);
  card.append(cover, info);
  return card;
}

function renderGames() {
  const query = searchInput.value.trim().toLocaleLowerCase('pt-BR');
  const visibleGames = allGames.filter((game) => {
    const matchesSearch = (game.names?.international || '').toLocaleLowerCase('pt-BR').includes(query);
    const matchesFilter = activeFilter === 'all' || game.romhack;
    return matchesSearch && matchesFilter;
  });

  grid.replaceChildren();
  if (visibleGames.length === 0) {
    const message = document.createElement('p');
    message.className = 'games-message';
    message.textContent = allGames.length ? 'Nenhum jogo encontrado com esse nome.' : 'Nenhum jogo para mostrar.';
    grid.append(message);
  } else {
    const fragment = document.createDocumentFragment();
    visibleGames.forEach((game, index) => fragment.append(createGameCard(game, index)));
    grid.append(fragment);
  }
  count.textContent = `${visibleGames.length} ${visibleGames.length === 1 ? 'jogo' : 'jogos'}${query || activeFilter !== 'all' ? ` de ${allGames.length}` : ''}`;
  grid.setAttribute('aria-busy', 'false');
}

async function loadGames() {
  try {
    let nextUrl = API_URL;
    let pageCount = 0;
    while (nextUrl && pageCount < 20) {
      const response = await fetch(nextUrl, { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(`A API respondeu com status ${response.status}.`);
      const payload = await response.json();
      allGames.push(...(payload.data || []));
      nextUrl = payload.pagination?.links?.find((link) => link.rel === 'next')?.uri || null;
      pageCount += 1;
    }
    allGames.sort((a, b) => (a.names?.international || '').localeCompare(b.names?.international || '', 'pt-BR'));
    renderGames();
    status.textContent = 'Lista atualizada ao vivo pela API oficial do Speedrun.com.';
  } catch (error) {
    grid.replaceChildren();
    const message = document.createElement('p');
    message.className = 'games-message error';
    message.textContent = 'Não foi possível carregar os jogos agora. A API do Speedrun.com pode estar temporariamente indisponível.';
    grid.append(message);
    grid.setAttribute('aria-busy', 'false');
    count.textContent = 'API indisponível';
    status.textContent = 'Tente novamente mais tarde ou consulte o perfil diretamente no Speedrun.com.';
    console.error('Falha ao carregar jogos moderados:', error);
  }
}

searchInput.addEventListener('input', renderGames);
filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    activeFilter = button.dataset.filter;
    filterButtons.forEach((item) => {
      const selected = item === button;
      item.classList.toggle('is-active', selected);
      item.setAttribute('aria-pressed', String(selected));
    });
    renderGames();
  });
});

loadGames();

const miniGameDialog = document.querySelector('#mical-dialog');
const miniGameCanvas = document.querySelector('#mini-game-canvas');
const miniGameContext = miniGameCanvas.getContext('2d');
const miniGameTitle = document.querySelector('#mini-game-title');
const miniGameInstructions = document.querySelector('#mini-game-instructions');
const miniGameStatus = document.querySelector('#mini-game-status');
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
  }
};

let activeMiniGame = null;
let miniGameState = null;
let miniGameFrame = 0;
let previousMiniGameFrame = 0;

function setMiniGameStatus(message) {
  miniGameStatus.textContent = message;
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
  } else {
    miniGameState = {
      playerY: 220, pauloY: 220, ballX: 400, ballY: 220,
      ballVX: 245, ballVY: 150, playerScore: 0, pauloScore: 0,
      done: false, won: false
    };
    setMiniGameStatus('Primeiro a marcar 5 pontos vence!');
  }
  drawMiniGame();
}

function launchMiniGame(name) {
  if (!miniGameDetails[name]) return;
  activeMiniGame = name;
  miniGameTitle.textContent = miniGameDetails[name].title;
  miniGameInstructions.textContent = miniGameDetails[name].instructions;
  document.querySelector('.direction-controls').hidden = name === 'fishing';
  if (!miniGameDialog.open) miniGameDialog.showModal();
  cancelAnimationFrame(miniGameFrame);
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
  }
}

function drawMiniGame() {
  if (!miniGameState) return;
  const ctx = miniGameContext;
  const state = miniGameState;
  ctx.clearRect(0, 0, 800, 440);
  if (activeMiniGame === 'race') drawResortRace(ctx, state);
  else if (activeMiniGame === 'fishing') drawResortFishing(ctx, state);
  else if (activeMiniGame === 'pac') drawPacMical(ctx, state);
  else if (activeMiniGame === 'duel') drawMicalDuel(ctx, state);
  if (state.done) {
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
