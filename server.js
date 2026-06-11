const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Game State
const players = new Map();
const npcs = new Map();
const chatMessages = [];
const worldState = {
  onlinePlayers: 0,
  totalPlayers: 0,
  activeGames: 0
};

// NPCs (Aurora and others)
const initializeNPCs = () => {
  npcs.set('aurora', {
    id: 'aurora',
    name: 'AURORA',
    position: { x: 0, y: 0, z: -50 },
    color: '#00ff00',
    type: 'ai-npc',
    status: 'Online',
    responses: [
      "Hello! I'm Aurora. How can I help you today?",
      "That's interesting! Tell me more.",
      "I'm here to assist you in your EchoVerse journey.",
      "What would you like to explore?",
      "Feel free to ask me anything about this world!"
    ]
  });

  npcs.set('zenith', {
    id: 'zenith',
    name: 'Zenith',
    position: { x: 50, y: 0, z: 0 },
    color: '#00ffff',
    type: 'npc',
    status: 'Online'
  });

  npcs.set('astra', {
    id: 'astra',
    name: 'Astra',
    position: { x: -50, y: 0, z: 0 },
    color: '#ff00ff',
    type: 'npc',
    status: 'Online'
  });
};

initializeNPCs();

// Socket.IO Events
io.on('connection', (socket) => {
  console.log(`[${new Date().toISOString()}] Player connected: ${socket.id}`);

  // Player Joins
  socket.on('playerJoin', (playerData) => {
    const playerId = playerData.id || socket.id;
    const spawnX = (Math.random() - 0.5) * 200;
    const spawnZ = (Math.random() - 0.5) * 200;

    const newPlayer = {
      id: playerId,
      socketId: socket.id,
      name: playerData.name || `Player${Math.floor(Math.random() * 10000)}`,
      color: playerData.color || '#' + Math.floor(Math.random()*16777215).toString(16),
      position: { x: spawnX, y: 0, z: spawnZ },
      rotation: 0,
      joinedAt: Date.now(),
      lastHeartbeat: Date.now()
    };

    players.set(socket.id, newPlayer);
    worldState.onlinePlayers = players.size;
    worldState.totalPlayers = Math.max(worldState.totalPlayers, players.size);

    socket.emit('joinSuccess', {
      playerId: socket.id,
      position: newPlayer.position,
      players: Array.from(players.values()),
      npcs: Array.from(npcs.values())
    });

    io.emit('playerJoined', newPlayer);
    io.emit('worldStateUpdate', worldState);

    console.log(`[JOIN] ${newPlayer.name} spawned at (${spawnX.toFixed(2)}, ${spawnZ.toFixed(2)})`);
  });

  // Player Movement
  socket.on('playerMove', (moveData) => {
    if (players.has(socket.id)) {
      const player = players.get(socket.id);
      player.position = moveData.position;
      player.rotation = moveData.rotation;
      player.lastHeartbeat = Date.now();

      io.emit('playerMoved', {
        playerId: socket.id,
        position: player.position,
        rotation: player.rotation
      });
    }
  });

  // Heartbeat (keep-alive)
  socket.on('heartbeat', () => {
    if (players.has(socket.id)) {
      players.get(socket.id).lastHeartbeat = Date.now();
    }
  });

  // Chat Message
  socket.on('chatMessage', (data) => {
    const player = players.get(socket.id);
    if (!player) return;

    const message = {
      id: uuidv4(),
      playerId: socket.id,
      playerName: player.name,
      playerColor: player.color,
      content: data.message,
      timestamp: Date.now()
    };

    chatMessages.push(message);
    if (chatMessages.length > 100) chatMessages.shift();

    io.emit('newChatMessage', message);
  });

  // Talk to Aurora AI
  socket.on('talkToAI', (data) => {
    const player = players.get(socket.id);
    if (!player) return;

    const aurora = npcs.get('aurora');
    const response = aurora.responses[Math.floor(Math.random() * aurora.responses.length)];

    socket.emit('aiResponse', {
      npcName: 'AURORA',
      message: response,
      emotion: ['friendly', 'curious', 'helpful'][Math.floor(Math.random() * 3)]
    });

    const message = {
      id: uuidv4(),
      playerId: 'aurora',
      playerName: 'AURORA',
      playerColor: '#00ff00',
      content: response,
      timestamp: Date.now()
    };

    io.emit('newChatMessage', message);
  });

  // Get World State
  socket.on('getWorldState', () => {
    socket.emit('worldStateData', {
      players: Array.from(players.values()),
      npcs: Array.from(npcs.values()),
      stats: worldState
    });
  });

  // Disconnect
  socket.on('disconnect', () => {
    if (players.has(socket.id)) {
      const player = players.get(socket.id);
      players.delete(socket.id);
      worldState.onlinePlayers = players.size;

      io.emit('playerLeft', { playerId: socket.id, playerName: player.name });
      io.emit('worldStateUpdate', worldState);

      console.log(`[DISCONNECT] ${player.name} left the world`);
    }
  });

  // Error handling
  socket.on('error', (error) => {
    console.error(`[ERROR] ${socket.id}:`, error);
  });
});

// REST API Routes
app.get('/api/world', (req, res) => {
  res.json({
    players: Array.from(players.values()),
    npcs: Array.from(npcs.values()),
    stats: worldState
  });
});

app.post('/api/join', (req, res) => {
  const { name, color } = req.body;
  const playerId = uuidv4();
  const spawnX = (Math.random() - 0.5) * 200;
  const spawnZ = (Math.random() - 0.5) * 200;

  const newPlayer = {
    id: playerId,
    name: name || `Player${Math.floor(Math.random() * 10000)}`,
    color: color || '#' + Math.floor(Math.random()*16777215).toString(16),
    position: { x: spawnX, y: 0, z: spawnZ }
  };

  res.json(newPlayer);
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    onlinePlayers: worldState.onlinePlayers,
    totalPlayers: worldState.totalPlayers,
    timestamp: new Date().toISOString()
  });
});

// Cleanup inactive players every 30 seconds
setInterval(() => {
  const now = Date.now();
  let removed = 0;

  for (const [socketId, player] of players.entries()) {
    if (now - player.lastHeartbeat > 30000) {
      players.delete(socketId);
      removed++;
      io.emit('playerLeft', { playerId: socketId, playerName: player.name });
    }
  }

  if (removed > 0) {
    worldState.onlinePlayers = players.size;
    io.emit('worldStateUpdate', worldState);
    console.log(`[CLEANUP] Removed ${removed} inactive players`);
  }
}, 30000);

// Start Server
server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║        🎮 ECHOVERSE SERVER ONLINE      ║
╚════════════════════════════════════════╝

🌍 World: ${PORT}
📡 WebSocket: ws://localhost:${PORT}
🎯 Visit: http://localhost:${PORT}

✨ Features:
  ✅ Real-time multiplayer
  ✅ AI NPCs with Aurora
  ✅ Live chat system
  ✅ Player synchronization
  ✅ CORS enabled

Ready for players to join! 🚀
`);
});
