// renderer.js - Exemplo de lógica para o Widget Desktop

console.log('FocusBuddy Widget Renderer Iniciado');

// Elementos DOM
const scoreEl = document.getElementById('score');
const statusTextEl = document.getElementById('status-text');
const activityEl = document.getElementById('current-activity');
const characterEl = document.getElementById('character');
const startBtn = document.getElementById('start');
const stopBtn = document.getElementById('stop');

// Estado Simulado
let isRunning = false;
let productivityScore = 0;

// Configuração de Personagens (Mesma lógica do Web App)
const getCharacterGif = (score) => {
    if (score >= 80) return 'https://i.imgur.com/xUWrIlU.gif'; // Happy
    if (score >= 60) return 'https://i.imgur.com/RsGov9s.gif'; // Focused
    if (score >= 40) return 'https://i.imgur.com/arjNC7C.gif'; // Neutral
    if (score >= 20) return 'https://i.imgur.com/xMLdal7.gif'; // Tired
    return 'https://i.imgur.com/15P9Nv9.gif'; // Sleep
};

// Funções de Controle
function updateUI(score, activity) {
    productivityScore = score;
    scoreEl.innerText = `${Math.round(score)}%`;
    activityEl.innerText = activity || 'Ocioso';
    characterEl.src = getCharacterGif(score);
    
    // Atualizar cor do score baseada no valor
    if (score >= 80) scoreEl.style.color = '#9CFF8A'; // Verde
    else if (score >= 50) scoreEl.style.color = '#FFD700'; // Amarelo
    else scoreEl.style.color = '#FF6B6B'; // Vermelho
}

function toggleTracking() {
    isRunning = !isRunning;
    const playIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-play"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
    const pauseIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pause"><rect width="4" height="16" x="6" y="4"/><rect width="4" height="16" x="14" y="4"/></svg>';

    if (isRunning) {
        startBtn.innerHTML = pauseIcon;
        statusTextEl.innerText = 'Rastreando';
        statusTextEl.style.color = '#9CFF8A';
        // Simulação de atualização
        activityEl.innerText = 'Visual Studio Code';
        updateUI(85, 'Visual Studio Code');
    } else {
        startBtn.innerHTML = playIcon;
        statusTextEl.innerText = 'Pausado';
        statusTextEl.style.color = '#AAAAAA';
        activityEl.innerText = 'Pausado';
    }
}

// Event Listeners
startBtn.addEventListener('click', toggleTracking);
stopBtn.addEventListener('click', () => {
    isRunning = false;
    toggleTracking(); // Reseta para estado inicial
});

// Inicialização
updateUI(0, 'Aguardando...');
