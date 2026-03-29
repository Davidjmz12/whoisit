(function () {
    const genSelect = document.getElementById('gen-select');
    const gamePage = document.getElementById('game');
    const genTitle = document.getElementById('gen-title');
    const activeCount = document.getElementById('active-count');
    const typeFiltersEl = document.getElementById('type-filters');
    const evoFiltersEl = document.getElementById('evo-filters');
    const weakFiltersEl = document.getElementById('weak-filters');
    const resistFiltersEl = document.getElementById('resist-filters');
    const typingFiltersEl = document.getElementById('typing-filters');
    const pokemonGrid = document.getElementById('pokemon-grid');
    const modalOverlay = document.getElementById('modal-overlay');
    const modalContent = document.getElementById('modal-content');
    const modalClose = document.getElementById('modal-close');
    const backBtn = document.getElementById('back-btn');
    const deactivateBtn = document.getElementById('deactivate-filtered');
    const activateBtn = document.getElementById('activate-filtered');
    const clearFiltersBtn = document.getElementById('clear-filters');
    const filterMatchCount = document.getElementById('filter-match-count');
    const resetBtn = document.getElementById('reset-btn');
    const toggleFiltersBtn = document.getElementById('toggle-filters');
    const filtersContent = document.getElementById('filters-content');
    const showActiveOnlyBtn = document.getElementById('show-active-only');
    const deactivateOthersBtn = document.getElementById('deactivate-others');

    // State
    let currentGen = null;
    let genPokemon = [];
    let pokemonStates = {};
    let selectedTypes = new Set();
    let selectedEvos = new Set();
    let selectedWeaknesses = new Set();
    let selectedResistances = new Set();
    let selectedTypingCounts = new Set();
    let filtersOpen = true;
    let showActiveOnly = false;

    // Cache matchups per pokemon id
    let matchupCache = {};

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

        genPokemon = POKEMON.filter(p => p.gen === gen).sort((a, b) => a.id - b.id);
        pokemonStates = {};
        matchupCache = {};
        genPokemon.forEach(p => {
            pokemonStates[p.id] = true;
            matchupCache[p.id] = calcMatchups(p.types);
        });
        selectedTypes.clear();
        selectedEvos.clear();
        selectedWeaknesses.clear();
        selectedResistances.clear();
        selectedTypingCounts.clear();

        // Reset UI state
        filtersOpen = true;
        showActiveOnly = false;
        filtersContent.classList.remove('collapsed');
        pokemonGrid.classList.remove('hide-deactivated');
        showActiveOnlyBtn.classList.remove('active');
        toggleFiltersBtn.textContent = '▲ Hide';

        renderTypeFilters();
        renderEvoFilters();
        renderTypingFilters();
        renderWeakFilters();
        renderResistFilters();
        renderGrid();
        applyFilters();
        updateActiveCount();
    }

    // ===== Type Filter Buttons =====
    function renderTypeFilters() {
        typeFiltersEl.innerHTML = '';
        const typesInGen = new Set();
        genPokemon.forEach(p => p.types.forEach(t => typesInGen.add(t)));

        ALL_TYPES.filter(t => typesInGen.has(t)).forEach(type => {
            const btn = document.createElement('button');
            btn.className = 'type-filter-btn';
            btn.textContent = type;
            btn.style.background = TYPE_COLORS[type];
            btn.addEventListener('click', () => {
                toggleSetAndBtn(selectedTypes, type, btn);
                applyFilters();
            });
            typeFiltersEl.appendChild(btn);
        });
    }

    // ===== Evolution Filter Buttons =====
    function renderEvoFilters() {
        evoFiltersEl.innerHTML = '';
        const evosInGen = new Set();
        genPokemon.forEach(p => evosInGen.add(p.evolutions));

        [...evosInGen].sort((a, b) => a - b).forEach(evo => {
            const btn = document.createElement('button');
            btn.className = 'evo-filter-btn';
            btn.textContent = evo === 1 ? 'No evo' : `${evo} stages`;
            btn.addEventListener('click', () => {
                toggleSetAndBtn(selectedEvos, evo, btn);
                applyFilters();
            });
            evoFiltersEl.appendChild(btn);
        });
    }

    // ===== Number-of-types Filter Buttons =====
    function renderTypingFilters() {
        typingFiltersEl.innerHTML = '';
        [1, 2].forEach(count => {
            const btn = document.createElement('button');
            btn.className = 'evo-filter-btn';
            btn.textContent = count === 1 ? 'Single type' : 'Dual type';
            btn.addEventListener('click', () => {
                toggleSetAndBtn(selectedTypingCounts, count, btn);
                applyFilters();
            });
            typingFiltersEl.appendChild(btn);
        });
    }

    // ===== Weakness Filter Buttons =====
    function renderWeakFilters() {
        weakFiltersEl.innerHTML = '';
        ALL_TYPES.forEach(type => {
            const btn = document.createElement('button');
            btn.className = 'type-filter-btn';
            btn.textContent = type;
            btn.style.background = TYPE_COLORS[type];
            btn.addEventListener('click', () => {
                toggleSetAndBtn(selectedWeaknesses, type, btn);
                applyFilters();
            });
            weakFiltersEl.appendChild(btn);
        });
    }

    // ===== Resistance Filter Buttons =====
    function renderResistFilters() {
        resistFiltersEl.innerHTML = '';
        ALL_TYPES.forEach(type => {
            const btn = document.createElement('button');
            btn.className = 'type-filter-btn';
            btn.textContent = type;
            btn.style.background = TYPE_COLORS[type];
            btn.addEventListener('click', () => {
                toggleSetAndBtn(selectedResistances, type, btn);
                applyFilters();
            });
            resistFiltersEl.appendChild(btn);
        });
    }

    // ===== Helper: toggle set + button =====
    function toggleSetAndBtn(set, value, btn) {
        if (set.has(value)) {
            set.delete(value);
            btn.classList.remove('active');
        } else {
            set.add(value);
            btn.classList.add('active');
        }
    }

    // ===== Check if pokemon matches weakness/resistance filters =====
    function matchesWeakness(pokemonId) {
        if (selectedWeaknesses.size === 0) return true;
        const m = matchupCache[pokemonId];
        for (const type of selectedWeaknesses) {
            if (m[type] < 2) return false; // must be weak to ALL selected
        }
        return true;
    }

    function matchesResistance(pokemonId) {
        if (selectedResistances.size === 0) return true;
        const m = matchupCache[pokemonId];
        for (const type of selectedResistances) {
            if (m[type] >= 1) return false; // must resist (or be immune to) ALL selected
        }
        return true;
    }

    // ===== Apply Filters (show/hide + highlight) =====
    function hasAnyFilter() {
        return selectedTypes.size > 0 || selectedEvos.size > 0 || selectedTypingCounts.size > 0 || selectedWeaknesses.size > 0 || selectedResistances.size > 0;
    }

    function getFilteredIds() {
        if (!hasAnyFilter()) return null;

        return genPokemon.filter(p => {
            const typeMatch = selectedTypes.size === 0 || p.types.some(t => selectedTypes.has(t));
            const evoMatch = selectedEvos.size === 0 || selectedEvos.has(p.evolutions);
            const typingCountMatch = selectedTypingCounts.size === 0 || selectedTypingCounts.has(p.types.length);
            const weakMatch = matchesWeakness(p.id);
            const resistMatch = matchesResistance(p.id);
            return typeMatch && evoMatch && typingCountMatch && weakMatch && resistMatch;
        }).map(p => p.id);
    }

    function applyFilters() {
        const filteredIds = getFilteredIds();
        const hasFilter = filteredIds !== null;

        genPokemon.forEach(p => {
            const card = document.querySelector(`.poke-card[data-id="${p.id}"]`);
            if (!card) return;

            if (!hasFilter) {
                card.classList.remove('filter-hidden', 'filter-highlight');
            } else {
                const matches = filteredIds.includes(p.id);
                card.classList.toggle('filter-hidden', !matches);
                card.classList.toggle('filter-highlight', matches);
            }
        });

        deactivateBtn.disabled = !hasFilter;
        activateBtn.disabled = !hasFilter;
        deactivateOthersBtn.disabled = !hasFilter;
        clearFiltersBtn.disabled = !hasFilter;

        if (hasFilter) {
            filterMatchCount.textContent = `${filteredIds.length} match${filteredIds.length !== 1 ? 'es' : ''}`;
        } else {
            filterMatchCount.textContent = '';
        }
    }

    // ===== Bulk actions on filtered =====
    deactivateBtn.addEventListener('click', () => {
        const filteredIds = getFilteredIds();
        if (!filteredIds) return;
        filteredIds.forEach(id => {
            pokemonStates[id] = false;
            const card = document.querySelector(`.poke-card[data-id="${id}"]`);
            if (card) card.classList.add('deactivated');
        });
        updateActiveCount();
    });

    activateBtn.addEventListener('click', () => {
        const filteredIds = getFilteredIds();
        if (!filteredIds) return;
        filteredIds.forEach(id => {
            pokemonStates[id] = true;
            const card = document.querySelector(`.poke-card[data-id="${id}"]`);
            if (card) card.classList.remove('deactivated');
        });
        updateActiveCount();
    });

    clearFiltersBtn.addEventListener('click', () => {
        selectedTypes.clear();
        selectedEvos.clear();
        selectedTypingCounts.clear();
        selectedWeaknesses.clear();
        selectedResistances.clear();
        document.querySelectorAll('#filters-bar .active').forEach(b => b.classList.remove('active'));
        applyFilters();
    });

    // ===== Toggle filters panel =====
    toggleFiltersBtn.addEventListener('click', () => {
        filtersOpen = !filtersOpen;
        filtersContent.classList.toggle('collapsed', !filtersOpen);
        toggleFiltersBtn.textContent = filtersOpen ? '▲ Hide' : '▼ Filters';
    });

    // ===== Only show active =====
    showActiveOnlyBtn.addEventListener('click', () => {
        showActiveOnly = !showActiveOnly;
        showActiveOnlyBtn.classList.toggle('active', showActiveOnly);
        pokemonGrid.classList.toggle('hide-deactivated', showActiveOnly);
    });

    // ===== Deactivate others (pokemon NOT matching current filter) =====
    deactivateOthersBtn.addEventListener('click', () => {
        const filteredIds = getFilteredIds();
        if (!filteredIds) return;
        genPokemon.forEach(p => {
            if (!filteredIds.includes(p.id)) {
                pokemonStates[p.id] = false;
                const card = document.querySelector(`.poke-card[data-id="${p.id}"]`);
                if (card) card.classList.add('deactivated');
            }
        });
        updateActiveCount();
    });

    // ===== Reset: activate all pokemon =====
    resetBtn.addEventListener('click', () => {
        genPokemon.forEach(p => {
            pokemonStates[p.id] = true;
            const card = document.querySelector(`.poke-card[data-id="${p.id}"]`);
            if (card) card.classList.remove('deactivated');
        });
        updateActiveCount();
    });

    // ===== Pokemon Grid =====
    function renderGrid() {
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
                updateActiveCount();
            });

            pokemonGrid.appendChild(card);
        });
    }

    // ===== Active Count =====
    function updateActiveCount() {
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
        const evoLabel = pokemon.evolutions === 1 ? 'No evolution' : `${pokemon.evolutions}-stage line`;

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
      <div class="modal-evo-info">
        Evolution stages: <span class="evo-count">${evoLabel}</span>
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
