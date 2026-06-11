// ========== SOCKET.IO CONNECTION ==========
const socket = io();

// Player data
let playerData = {
    id: generateUUID(),
    name: `Player${Math.floor(Math.random() * 10000)}`,
    color: getRandomColor(),
    position: { x: 0, y: 0, z: 0 },
    rotation: 0
};

let allPlayers = new Map();
let npcs = new Map();

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', () => {
    initializePlayer();
    setupEventListeners();
    startHeartbeat();
    animateLoadingBar();
});

function initializePlayer() {
    console.log(`🎮 Initializing player: ${playerData.name}`);
    socket.emit('playerJoin', {
        id: playerData.id,
        name: playerData.name,
        color: playerData.color
    });
}

// ========== SOCKET.IO EVENTS ==========
socket.on('joinSuccess', (data) => {
    console.log('✅ Successfully joined the world!', data);
    playerData.position = data.position;
    
    // Update UI
    document.querySelector('.world-placeholder').style.display = 'none';
    
    // Store NPCs
    if (data.npcs) {
        data.npcs.forEach(npc => {
            npcs.set(npc.id, npc);
        });
    }
    
    // Show player count
    updatePlayerCount(data.players.length);
});

socket.on('playerJoined', (newPlayer) => {
    console.log(`👤 New player joined: ${newPlayer.name}`);
    allPlayers.set(newPlayer.id, newPlayer);
    updatePlayerCount(allPlayers.size);
    addChatMessage(newPlayer.name, `joined the world`, 'system');
});

socket.on('playerMoved', (data) => {
    if (data.playerId !== playerData.id) {
        allPlayers.set(data.playerId, {
            ...allPlayers.get(data.playerId),
            position: data.position,
            rotation: data.rotation
        });
    }
});

socket.on('playerLeft', (data) => {
    console.log(`👋 Player left: ${data.playerName}`);
    allPlayers.delete(data.playerId);
    updatePlayerCount(allPlayers.size);
    addChatMessage(data.playerName, `left the world`, 'system');
});

socket.on('worldStateUpdate', (state) => {
    console.log('🌍 World state updated:', state);
    document.getElementById('playerCount').textContent = `${state.onlinePlayers} Online`;
    document.getElementById('statOnline').textContent = state.onlinePlayers;
});

socket.on('newChatMessage', (message) => {
    addChatMessage(message.playerName, message.content, message.playerId === playerData.id ? 'player' : 'npc');
});

socket.on('aiResponse', (data) => {
    addChatMessage(data.npcName, data.message, 'npc');
});

socket.on('worldStateData', (data) => {
    console.log('World state data:', data);
});

socket.on('disconnect', () => {
    console.log('❌ Disconnected from server');
    addChatMessage('System', 'Disconnected from server', 'system');
});

socket.on('error', (error) => {
    console.error('🔴 Socket error:', error);
});

// ========== EVENT LISTENERS ==========
function setupEventListeners() {
    // Chat
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtn');
    
    sendBtn.addEventListener('click', sendChatMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendChatMessage();
    });

    // Question buttons for Aurora
    document.querySelectorAll('.question-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const message = btn.textContent;
            chatInput.value = message;
            sendChatMessage();
        });
    });

    // Hotbar items
    document.querySelectorAll('.hotbar-item').forEach(item => {
        item.addEventListener('click', () => {
            console.log(`🎮 Using item: ${item.dataset.slot}`);
        });
    });

    // Play button
    document.querySelectorAll('.play-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            console.log('🎮 Starting mini-game...');
            addChatMessage('System', 'Mini-game coming soon!', 'system');
        });
    });

    // World movement (simulate)
    document.getElementById('world-canvas').addEventListener('mousemove', (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 200 - 100;
        const z = ((e.clientY - rect.top) / rect.height) * 200 - 100;
        
        playerData.position = { x, y: 0, z };
        socket.emit('playerMove', {
            position: playerData.position,
            rotation: playerData.rotation
        });
    });

    // Navigation buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
}

// ========== CHAT FUNCTIONS ==========
function sendChatMessage() {
    const chatInput = document.getElementById('chatInput');
    const message = chatInput.value.trim();
    
    if (!message) return;

    // Check if talking to Aurora
    if (message.toLowerCase().includes('aurora') || message.includes('?')) {
        socket.emit('talkToAI', {
            message: message,
            playerName: playerData.name
        });
    } else {
        socket.emit('chatMessage', {
            message: message,
            playerName: playerData.name
        });
    }

    // Add to local chat
    addChatMessage(playerData.name, message, 'player');
    chatInput.value = '';
}

function addChatMessage(name, message, type = 'npc') {
    const chatMessages = document.getElementById('chatMessages');
    const messageEl = document.createElement('div');
    messageEl.className = `chat-message ${type === 'player' ? 'player' : 'npc'}`;
    
    if (type === 'system') {
        messageEl.textContent = `[${name}] ${message}`;
        messageEl.style.opacity = '0.7';
    } else {
        messageEl.innerHTML = `<strong>${name}:</strong> ${escapeHtml(message)}`;
    }
    
    chatMessages.appendChild(messageEl);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Keep only last 100 messages
    while (chatMessages.children.length > 100) {
        chatMessages.removeChild(chatMessages.firstChild);
    }
}

// ========== HELPER FUNCTIONS ==========
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function getRandomColor() {
    const colors = ['#2fe3ff', '#ff00ff', '#00ff00', '#ff0080', '#00ffaa', '#ffff00'];
    return colors[Math.floor(Math.random() * colors.length)];
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function updatePlayerCount(count) {
    document.getElementById('playerCount').textContent = `${count} Online`;
    document.getElementById('statOnline').textContent = count;
}

function startHeartbeat() {
    setInterval(() => {
        socket.emit('heartbeat');
    }, 5000); // Every 5 seconds
}

function animateLoadingBar() {
    const progress = document.querySelector('.loading-progress');
    if (progress) {
        let width = 0;
        const interval = setInterval(() => {
            width += Math.random() * 20;
            if (width > 90) {
                clearInterval(interval);
                return;
            }
            progress.style.width = width + '%';
        }, 300);

        // Complete after 3 seconds
        setTimeout(() => {
            progress.style.width = '100%';
        }, 3000);
    }
}

// ========== KEYBOARD CONTROLS ==========
document.addEventListener('keydown', (e) => {
    const speed = 2;
    
    switch(e.key.toLowerCase()) {
        case 'w':
            playerData.position.z -= speed;
            break;
        case 'a':
            playerData.position.x -= speed;
            break;
        case 's':
            playerData.position.z += speed;
            break;
        case 'd':
            playerData.position.x += speed;
            break;
    }

    socket.emit('playerMove', {
        position: playerData.position,
        rotation: playerData.rotation
    });
});

// ========== SIMPLE 3D RENDERER (PLACEHOLDER) ==========
function updateWorldView() {
    // This is where Three.js or Babylon.js would render the 3D world
    // For now, we'll keep the placeholder with info about connected players
    
    console.log('Current players in world:', Array.from(allPlayers.values()));
}

// Update world view periodically
setInterval(updateWorldView, 1000);

console.log(`
╔═══════════════════════════════════╗
║   🎮 EchoVerse Client Ready 🎮    ║
╚═══════════════════════════════════╝

Connected as: ${playerData.name}
Player ID: ${playerData.id}
Color: ${playerData.color}

Controls:
  W/A/S/D - Move
  Chat - Talk to NPCs
  Hotbar 1-6 - Use items
`);
