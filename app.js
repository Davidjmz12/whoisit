(function () {
    const genSelect = document.getElementById('gen-select');
    const gamePage = document.getElementById('game');
    const genTitle = document.getElementById('gen-title');
    const activeCount = document.getElementById('active-count');
    const typeFilters = document.getElementById('type-filters');
    const pokemonGrid = document.getElementById('pokemon-grid');
    const modalOverlay = document.getElementById('modal-overlay');
    const modalContent = document.getElementById('modal-content');
    const modalClose = document.getElementById('modal-close');
    const backBtn = document.getElementById('back-btn');

    // State
    let currentGen = null;
    let pokemonStates = {}; // id -> boolean (true = active)

    const GEN_NAMES = { 1: 'Generation I — Kanto', 2: 'Generation II — Johto' };

    // ===== Navigation =====
    document.querySelectorAll('.gen-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentGen = parseInt(btn.dataset.gen, 10);
            startGame(currentGen);
        });
    });

    backBtn.addEventListener('click', () => {
        gamePage.style.display = 'none';
        genSelect.style.display = 'flex';
    });

    // ===== Game Start =====
    function startGame(gen) {
        genSelect.style.display = 'none';
        gamePage.style.display = 'flex';
        genTitle.textContent = GEN_NAMES[gen] || `Generation ${gen}`;

        const genPokemon = POKEMON.filter(p => p.gen === gen).sort((a, b) => a.id - b.id);
        pokemonStates = {};
        genPokemon.forEach(p => { pokemonStates[p.id] = true; });

        renderTypeFilters(genPokemon);
        renderGrid(genPokemon);
        updateActiveCount(genPokemon);
    }

    // ===== Type Filter Bar =====
    function renderTypeFilters(genPokemon) {
        typeFilters.innerHTML = '';

        const label = document.createElement('span');
        label.className = 'filter-label';
        label.textContent = 'Deactivate by type:';
        typeFilters.appendChild(label);

        // Find types that actually exist in this gen
        const typesInGen = new Set();
        genPokemon.forEach(p => p.types.forEach(t => typesInGen.add(t)));

        const sorted = ALL_TYPES.filter(t => typesInGen.has(t));
        sorted.forEach(type => {
            const btn = document.createElement('button');
            btn.className = 'type-filter-btn';
            btn.textContent = type;
            btn.style.background = TYPE_COLORS[type];
            btn.addEventListener('click', () => {
                deactivateByType(type, genPokemon);
            });
            typeFilters.appendChild(btn);
        });
    }

    function deactivateByType(type, genPokemon) {
        genPokemon.forEach(p => {
            if (p.types.includes(type)) {
                pokemonStates[p.id] = false;
                const card = document.querySelector(`.poke-card[data-id="${p.id}"]`);
                if (card) card.classList.add('deactivated');
            }
        });
        updateActiveCount(genPokemon);
    }

    // ===== Pokemon Grid =====
    function renderGrid(genPokemon) {
        pokemonGrid.innerHTML = '';

        genPokemon.forEach(p => {
            const card = document.createElement('div');
            card.className = 'poke-card';
            card.dataset.id = p.id;

            // Pokedex number
            const idSpan = document.createElement('span');
            idSpan.className = 'poke-id';
            idSpan.textContent = `#${String(p.id).padStart(3, '0')}`;
            card.appendChild(idSpan);

            // Info button
            const infoBtn = document.createElement('button');
            infoBtn.className = 'poke-info-btn';
            infoBtn.textContent = 'i';
            infoBtn.title = 'View weaknesses & resistances';
            infoBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                showInfoModal(p);
            });
            card.appendChild(infoBtn);

            // Image
            const img = document.createElement('img');
            img.className = 'poke-img';
            img.src = `assets/pokemons/${getImageFilename(p.name)}.png`;
            img.alt = p.name;
            img.loading = 'lazy';
            card.appendChild(img);

            // Name
            const name = document.createElement('div');
            name.className = 'poke-name';
            name.textContent = p.name;
            card.appendChild(name);

            // Types
            const typesDiv = document.createElement('div');
            typesDiv.className = 'poke-types';
            p.types.forEach(t => {
                const badge = document.createElement('span');
                badge.className = 'type-badge';
                badge.textContent = t;
                badge.style.background = TYPE_COLORS[t];
                typesDiv.appendChild(badge);
            });
            card.appendChild(typesDiv);

            // Click to toggle
            card.addEventListener('click', () => {
                pokemonStates[p.id] = !pokemonStates[p.id];
                card.classList.toggle('deactivated', !pokemonStates[p.id]);
                updateActiveCount(genPokemon);
            });

            pokemonGrid.appendChild(card);
        });
    }

    // ===== Active Count =====
    function updateActiveCount(genPokemon) {
        const active = genPokemon.filter(p => pokemonStates[p.id]).length;
        activeCount.textContent = `${active} / ${genPokemon.length} remaining`;
    }

    // ===== Info Modal =====
    function showInfoModal(pokemon) {
        const matchups = calcMatchups(pokemon.types);

        const weaknesses = [];
        const resistances = [];
        const immunities = [];

        for (const type of ALL_TYPES) {
            const m = matchups[type];
            if (m === 0) immunities.push({ type, mult: '0×' });
            else if (m >= 4) weaknesses.push({ type, mult: '4×' });
            else if (m >= 2) weaknesses.push({ type, mult: '2×' });
            else if (m <= 0.25) resistances.push({ type, mult: '¼×' });
            else if (m <= 0.5) resistances.push({ type, mult: '½×' });
        }

        const imgFile = getImageFilename(pokemon.name);

        modalContent.innerHTML = `
      <div class="modal-header">
        <img src="assets/pokemons/${imgFile}.png" alt="${pokemon.name}">
        <div>
          <div class="modal-title">#${String(pokemon.id).padStart(3, '0')} ${pokemon.name}</div>
          <div class="modal-types">
            ${pokemon.types.map(t => `<span class="type-badge" style="background:${TYPE_COLORS[t]}">${t}</span>`).join('')}
          </div>
        </div>
      </div>
      <div class="matchup-section">
        <h4>Weaknesses</h4>
        <div class="matchup-list">
          ${weaknesses.length
                ? weaknesses.map(w => `<span class="matchup-badge" style="background:${TYPE_COLORS[w.type]}">${w.type}<span class="mult">${w.mult}</span></span>`).join('')
                : '<span class="no-matchups">None</span>'}
        </div>
      </div>
      <div class="matchup-section">
        <h4>Resistances</h4>
        <div class="matchup-list">
          ${resistances.length
                ? resistances.map(r => `<span class="matchup-badge" style="background:${TYPE_COLORS[r.type]}">${r.type}<span class="mult">${r.mult}</span></span>`).join('')
                : '<span class="no-matchups">None</span>'}
        </div>
      </div>
      <div class="matchup-section">
        <h4>Immunities</h4>
        <div class="matchup-list">
          ${immunities.length
                ? immunities.map(i => `<span class="matchup-badge" style="background:${TYPE_COLORS[i.type]}">${i.type}<span class="mult">${i.mult}</span></span>`).join('')
                : '<span class="no-matchups">None</span>'}
        </div>
      </div>
    `;

        modalOverlay.classList.add('open');
    }

    // Close modal
    modalClose.addEventListener('click', () => {
        modalOverlay.classList.remove('open');
    });

    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            modalOverlay.classList.remove('open');
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            modalOverlay.classList.remove('open');
        }
    });
})();
