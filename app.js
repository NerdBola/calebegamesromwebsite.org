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
