import { fetchPokemonList, fetchPokemonDetails } from './api.js';
import { renderSinglePokemon, renderTeamGrid } from './ui.js';

let pokemonData = [];
let currentIndex = 0;
let myTeam = JSON.parse(localStorage.getItem('pokeFlowTeam')) || [];

function saveTeam() {
    localStorage.setItem('pokeFlowTeam', JSON.stringify(myTeam));
}

// Web Audio API for 8-bit sounds
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playBeep(frequency = 440, duration = 0.1, type = 'square') {
    if(audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);
    
    // Quick attack and fade out to prevent clicking
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + duration);
}

async function init() {
    try {
        const screen = document.getElementById('lcd-screen');
        const mainLens = document.querySelector('.main-lens');
        
        // Boot Animation Sequence
        if (screen) {
            screen.innerHTML = `
                <div style="color:var(--deep-black); text-align:center; padding-top:40px; font-size:1.2rem; font-family:var(--font-primary);">
                    포켓-OS V1.0<br><br>
                    <span style="animation: blink-brutal 0.8s infinite;">시스템 부팅 중...</span>
                </div>
            `;
        }
        
        // Blinking lens effect
        let lensBlinkInterval = null;
        if (mainLens) {
            lensBlinkInterval = setInterval(() => {
                const currentBg = mainLens.style.backgroundColor;
                mainLens.style.backgroundColor = currentBg === 'red' ? '#1e90ff' : 'red';
            }, 300);
        }

        // Delay for aesthetic boot sequence
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        if (screen) {
            screen.innerHTML = `
                <div style="color:var(--deep-black); text-align:center; padding-top:40px; font-size:1.2rem; font-family:var(--font-primary);">
                    서버 데이터 수신 중...<br><br>
                    <span style="animation: blink-brutal 0.5s infinite;">████████░░</span>
                </div>
            `;
        }

        // Fetch original 151 Pokemon
        const fetchPromise = fetchPokemonList(151, 0);
        
        // Wait another 1.5 seconds minimum for boot effect
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        pokemonData = await fetchPromise;

        // Cleanup boot effects
        if (lensBlinkInterval) clearInterval(lensBlinkInterval);
        if (mainLens) mainLens.style.backgroundColor = ''; // Restore default CSS

        // White Flash Effect
        if (screen) {
            screen.classList.add('flash-screen');
            setTimeout(() => screen.classList.remove('flash-screen'), 150);
        }
        
        // Render first
        if (pokemonData.length > 0) {
            renderSinglePokemon(pokemonData[currentIndex]);
            playBeep(880, 0.2); // Boot success sound
        }

        setupControls();
        setupSearch();
    } catch (error) {
        console.error("Failed to boot Pokedex:", error);
        const screen = document.getElementById('lcd-screen');
        if(screen) screen.innerHTML = '<div style="color:red; text-align:center; padding-top:40px; font-family:var(--font-primary);">SYSTEM ERROR</div>';
        playBeep(150, 0.5, 'sawtooth'); // Error sound
    }
}

function setupControls() {
    const btnNext = document.getElementById('btn-next');
    const btnPrev = document.getElementById('btn-prev');

    if(btnNext) {
        btnNext.addEventListener('click', () => {
            if(currentIndex < pokemonData.length - 1) {
                currentIndex++;
                renderSinglePokemon(pokemonData[currentIndex]);
                playBeep(600, 0.05); // High beep for next
            } else {
                playBeep(200, 0.1); // Error/blocked beep
            }
        });
    }

    if(btnPrev) {
        btnPrev.addEventListener('click', () => {
            if(currentIndex > 0) {
                currentIndex--;
                renderSinglePokemon(pokemonData[currentIndex]);
                playBeep(400, 0.05); // Lower beep for prev
            } else {
                playBeep(200, 0.1); // Error/blocked beep
            }
        });
    }

    // Add sound to dummy buttons just for tactile feedback
    const btnPokedex = document.getElementById('btn-pokedex');
    const btnTeam = document.getElementById('btn-team');
    const teamModal = document.getElementById('team-modal');
    const btnCloseTeam = document.getElementById('btn-close-team');

    // A Button (Pokedex) -> Add to Team
    if(btnPokedex) {
        btnPokedex.addEventListener('click', () => {
            const currentObj = pokemonData[currentIndex];
            if (!currentObj) return;
            
            // Check if already in team
            if (myTeam.some(p => p.id === currentObj.id)) {
                playBeep(200, 0.2, 'sawtooth'); // Error already in team
                return;
            }
            if (myTeam.length >= 6) {
                playBeep(200, 0.2, 'sawtooth'); // Error full
                return;
            }
            
            // Add
            const spriteUrl = currentObj.sprites.front_default || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${currentObj.id}.png`;
            let displayName = currentObj.name.toUpperCase();
            if (currentObj.speciesData) {
                const koName = currentObj.speciesData.names.find(n => n.language.name === 'ko');
                if (koName) displayName = koName.name;
            }
            
            myTeam.push({ id: currentObj.id, name: displayName, sprite: spriteUrl });
            saveTeam();
            playBeep(880, 0.1); // Success
            setTimeout(() => playBeep(1200, 0.15), 150); // Double beep
            
            // update UI if open
            renderTeamGrid(myTeam, removeTeamMember);
        });
    }

    // B Button (Team) -> Toggle Modal
    if(btnTeam && teamModal) {
        btnTeam.addEventListener('click', () => {
            playBeep(500, 0.1);
            teamModal.classList.remove('hidden');
            renderTeamGrid(myTeam, removeTeamMember);
        });
    }

    // Close Modal Button
    if(btnCloseTeam && teamModal) {
        btnCloseTeam.addEventListener('click', () => {
            playBeep(300, 0.1);
            teamModal.classList.add('hidden');
        });
    }
}

function removeTeamMember(index) {
    myTeam.splice(index, 1);
    saveTeam();
    playBeep(300, 0.1, 'sawtooth');
    renderTeamGrid(myTeam, removeTeamMember);
}

function setupSearch() {
    const searchInput = document.getElementById('pokemon-search');
    if(!searchInput) return;

    searchInput.addEventListener('keypress', async (e) => {
        if (e.key === 'Enter') {
            const query = e.target.value.toLowerCase().trim();
            if (!query) return;

            playBeep(700, 0.1); // Search initiated beep
            searchInput.blur(); // Remove focus
            searchInput.value = ''; // Clear input

            // Find locally first
            let index = pokemonData.findIndex(p => {
                if (p.name === query || p.id == query) return true;
                if (p.speciesData && p.speciesData.names) {
                    const koName = p.speciesData.names.find(n => n.language.name === 'ko');
                    if (koName && koName.name === query) return true;
                }
                return false;
            });
            
            if (index !== -1) {
                // Found locally
                currentIndex = index;
                renderSinglePokemon(pokemonData[currentIndex]);
                playBeep(880, 0.15); // Success beep
            } else {
                // Fetch from API
                const screen = document.getElementById('lcd-screen');
                screen.innerHTML = '<div style="color:var(--deep-black); text-align:center; padding-top:40px; font-size:1.2rem; font-family:var(--font-primary);">데이터 검색 중...</div>';
                
                const newPokemon = await fetchPokemonDetails(query);
                if(newPokemon) {
                    pokemonData.push(newPokemon);
                    currentIndex = pokemonData.length - 1;
                    renderSinglePokemon(pokemonData[currentIndex]);
                    playBeep(1200, 0.15); // Success high beep
                } else {
                    // Not found
                    screen.innerHTML = '<div style="color:red; text-align:center; padding-top:40px; font-size:1.2rem; font-family:var(--font-primary);">검색 실패</div>';
                    playBeep(150, 0.4, 'sawtooth'); // Error buzzer
                    
                    // Revert to previous after 2 seconds
                    setTimeout(() => {
                        renderSinglePokemon(pokemonData[currentIndex]);
                    }, 2000);
                }
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', init);
