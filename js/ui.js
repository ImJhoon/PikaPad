function flattenEvolutionChain(chain) {
  let result = [];
  let current = chain;
  while (current) {
    let minLevel = "?";
    if (current.evolution_details && current.evolution_details.length > 0) {
      minLevel =
        current.evolution_details[0].min_level ||
        current.evolution_details[0].trigger.name ||
        "?";
      if (typeof minLevel === "number") {
        minLevel = `레벨 ${minLevel}`;
      } else {
        if (minLevel === "use-item") minLevel = "아이템 사용";
        else if (minLevel === "trade") minLevel = "통신 교환";
        else minLevel = minLevel.toUpperCase();
      }
    } else {
      minLevel = "기본";
    }

    result.push({
      name: current.species.name,
      level: minLevel,
      id: current.species.url.split("/").filter(Boolean).pop(),
    });

    if (current.evolves_to && current.evolves_to.length > 0) {
      current = current.evolves_to[0]; // Take first branch for simplicity
    } else {
      current = null;
    }
  }
  return result;
}

let typeWriterTimeout = null;

export function renderSinglePokemon(pokemon) {
  // 1. Update LCD Screen (Device)
  const screen = document.getElementById("lcd-screen");
  if (screen) {
    const spriteUrl =
      pokemon.sprites.front_default ||
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png";
    const paddedId = String(pokemon.id).padStart(3, "0");

    // Find Korean Name if available
    let displayName = pokemon.name.toUpperCase();
    if (pokemon.speciesData) {
      const koName = pokemon.speciesData.names.find(
        (n) => n.language.name === "ko",
      );
      if (koName) displayName = koName.name;
    }

    // We can just use the english types or try to map them, let's keep it simple for now
    const typesStr = pokemon.types
      .map((t) => t.type.name)
      .join(" / ")
      .toUpperCase();

    screen.innerHTML = `
            <img src="${spriteUrl}" alt="${pokemon.name}" class="lcd-sprite">
            <div class="lcd-info">
                <div class="lcd-id">NO. ${paddedId}</div>
                <div class="lcd-name">${displayName}</div>
                <div class="lcd-id">${typesStr}</div>
            </div>
        `;
  }

  // 2. Update Stats Panel (Dashboard Right Column)
  const statsContainer = document.getElementById("stats-container");
  if (statsContainer) {
    let statsHTML = "";
    pokemon.stats.forEach((stat) => {
      const statName = stat.stat.name.toUpperCase().replace("SPECIAL-", "SP. ");
      const statValue = stat.base_stat;
      const percentage = Math.min(100, (statValue / 255) * 100);

      let statColor = "var(--primary-red)";
      if (stat.stat.name === "hp") statColor = "#FF3333";
      else if (stat.stat.name === "attack") statColor = "#FF9933";
      else if (stat.stat.name === "defense") statColor = "#FFCC33";
      else if (stat.stat.name === "special-attack") statColor = "#3399FF";
      else if (stat.stat.name === "special-defense") statColor = "#33CC33";
      else if (stat.stat.name === "speed") statColor = "#FF33CC";

      statsHTML += `
                <div class="stat-row">
                    <div class="stat-labels"><span>${statName}</span><span>${statValue}</span></div>
                    <div class="stat-bar-bg"><div class="stat-bar-fill" style="width: ${percentage}%; background-color: ${statColor};"></div></div>
                </div>
            `;
    });
    statsContainer.innerHTML = statsHTML;
  }

  // 3. Update Dialogue Box (Dashboard Bottom)
  const dialogueText = document.getElementById("dialogue-text");
  if (dialogueText) {
    let flavorText = "데이터가 없습니다.";
    if (pokemon.speciesData) {
      const koEntry = pokemon.speciesData.flavor_text_entries.find(
        (entry) => entry.language.name === "ko",
      );
      if (koEntry) {
        // Replace special characters like \n, \f with spaces
        flavorText = koEntry.flavor_text.replace(/[\n\f\r]/g, " ");
      }
    }

    // Typewriter effect
    dialogueText.innerText = "";
    if (typeWriterTimeout) clearTimeout(typeWriterTimeout);

    let i = 0;
    function typeWriter() {
      if (i < flavorText.length) {
        dialogueText.innerHTML += flavorText.charAt(i);
        i++;
        typeWriterTimeout = setTimeout(typeWriter, 20);
      }
    }
    typeWriter();
  }

  // 4. Update Evolution Chain
  const evoContainer = document.getElementById("evo-container");
  if (evoContainer && pokemon.evolutionData) {
    const chainList = flattenEvolutionChain(pokemon.evolutionData.chain);
    let evoHTML = "";

    chainList.forEach((item, index) => {
      const isCurrent = item.name === pokemon.name;
      const spriteUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${item.id}.png`;

      // Check if it's the current active pokemon to highlight
      let spriteStyle = "";
      let textStyle = "";
      let textValue = item.level;

      if (isCurrent) {
        spriteStyle =
          "border: 4px solid var(--primary-red); background: #ccf157; box-shadow: 4px 4px 0px var(--deep-black);";
        textStyle = "color: var(--primary-red);";
        textValue = "현재 포켓몬";
      }

      evoHTML += `
                <div class="evo-item">
                    <div class="evo-sprite" style="${spriteStyle}">
                        <img src="${spriteUrl}" alt="${item.name}" style="width:100%; image-rendering:pixelated;">
                    </div>
                    <span class="evo-name" style="${textStyle}">${textValue}</span>
                </div>
            `;

      if (index < chainList.length - 1) {
        evoHTML += `<div class="evo-arrow">→</div>`;
      }
    });

    evoContainer.innerHTML = evoHTML;
  } else if (evoContainer) {
    evoContainer.innerHTML =
      '<div class="loading-text" style="color:var(--deep-black)">진화 정보 없음</div>';
  }
}

export function renderTeamGrid(teamData, removeCallback) {
  const grid = document.getElementById("team-grid");
  if (!grid) return;

  grid.innerHTML = "";

  // Always render 6 slots
  for (let i = 0; i < 6; i++) {
    if (i < teamData.length) {
      const member = teamData[i];
      const slot = document.createElement("div");
      slot.className = "team-slot";
      slot.innerHTML = `
                <img src="${member.sprite}" alt="${member.name}" style="width:100%; image-rendering:pixelated;">
                <div class="team-slot-name">${member.name}</div>
            `;
      slot.addEventListener("click", () => removeCallback(i));
      grid.appendChild(slot);
    } else {
      const slot = document.createElement("div");
      slot.className = "team-slot empty";
      grid.appendChild(slot);
    }
  }
}
