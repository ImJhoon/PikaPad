const API_BASE = 'https://pokeapi.co/api/v2';

export async function fetchPokemonList(limit = 151, offset = 0) {
    try {
        const response = await fetch(`${API_BASE}/pokemon?limit=${limit}&offset=${offset}`);
        const data = await response.json();
        
        const promises = data.results.map(pokemon => fetchPokemonDetails(pokemon.name));
        const detailedData = await Promise.all(promises);
        
        return detailedData.filter(d => d !== null);
    } catch (error) {
        console.error("Error fetching pokemon list:", error);
        return [];
    }
}

export async function fetchPokemonDetails(query) {
    try {
        const response = await fetch(`${API_BASE}/pokemon/${query}`);
        if (!response.ok) {
            throw new Error(`Pokemon ${query} not found`);
        }
        const pokemon = await response.json();
        
        // Fetch species data for Korean text and flavor text
        const speciesRes = await fetch(pokemon.species.url);
        if (speciesRes.ok) {
            pokemon.speciesData = await speciesRes.json();
            
            // Fetch Evolution Chain
            if (pokemon.speciesData.evolution_chain && pokemon.speciesData.evolution_chain.url) {
                const evoRes = await fetch(pokemon.speciesData.evolution_chain.url);
                if (evoRes.ok) {
                    pokemon.evolutionData = await evoRes.json();
                }
            }
        }
        
        return pokemon;
    } catch (error) {
        console.error("Error fetching details:", error);
        return null;
    }
}
