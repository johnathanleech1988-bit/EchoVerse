const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configuration
const HEARTBEAT_TIMEOUT = 30000; // 30 seconds
const WORLD_BOUNDS = { x: [-100, 100], z: [-100, 100] };

// In-memory storage
const players = new Map();
const lastHeartbeat = new Map();

// Aurora AI responses
const auroraResponses = {
  default: [
    "Hello! I'm Aurora. How can I help you explore EchoVerse?",
    "Welcome to our world! What interests you most?",
    "Tell me about your adventure so far.",
    "I'm here to help guide you through EchoVerse."
  ],
  favorite: [
    "I love exploring the neon districts! The lights are mesmerizing.",
    "The central plaza is always bustling with energy and interesting people.",
    "Each area has its own unique vibe and stories to discover."
  ],
  interesting: [
    "That's fascinating! I'd love to hear more about your thoughts.",
    "Interesting perspective! You should share that with other explorers.",
    "I find that the most rewarding discoveries come from genuine curiosity."
  ],
  quest: [
    "There are many quests available throughout EchoVerse! Visit the quest board.",
    "I can help connect you with NPCs who have interesting tasks.",
    "Quests are a great way to earn rewards and discover new areas."
  ],
  goodbye: [
    "Safe travels! Come back anytime to chat.",
    "Until next time, explorer! Enjoy your journey.",
    "Farewell! May your adventures be legendary."
  ]
};

// ========== HEALTH CHECK ==========
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date(),
    players: players.size,
    uptime: process.uptime()
  });
});

// ========== JOIN WORLD ==========
app.post('/api/join', (req, res) => {
  try {
    const { id, name, color } = req.body;

    if (!id || !name || !color) {
      return res.status(400).json({ error: 'Missing required fields: id, name, color' });
    }

    // Random spawn position
    const x = Math.random() * 80 - 40;
    const z = Math.random() * 80 - 40;

    const player = {
      id,
      name,
      color,
      x,
      z,
      joinedAt: Date.now()
    };

    players.set(id, player);
    lastHeartbeat.set(id, Date.now());

    res.json({
      success: true,
      x,
      z,
      playerCount: players.size,
      message: `${name} joined EchoVerse!`
    });

    console.log(`✅ Player joined: ${name} (${id}) - Total: ${players.size}`);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== GET WORLD STATE ==========
app.get('/api/world', (req, res) => {
  try {
    // Clean up stale players
    const now = Date.now();
    for (const [id, lastTime] of lastHeartbeat.entries()) {
      if (now - lastTime > HEARTBEAT_TIMEOUT) {
        const player = players.get(id);
        if (player) {
          console.log(`🗑️ Removed stale player: ${player.name} (${id})`);
        }
        players.delete(id);
        lastHeartbeat.delete(id);
      }
    }

    const playerList = Array.from(players.values());

    res.json({
      success: true,
      players: playerList,
      count: playerList.length,
      timestamp: Date.now()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== UPDATE PLAYER POSITION ==========
app.post('/api/move', (req, res) => {
  try {
    const { id, x, z } = req.body;

    if (!id || x === undefined || z === undefined) {
      return res.status(400).json({ error: 'Missing required fields: id, x, z' });
    }

    const player = players.get(id);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // Clamp to world bounds
    player.x = Math.max(WORLD_BOUNDS.x[0], Math.min(WORLD_BOUNDS.x[1], x));
    player.z = Math.max(WORLD_BOUNDS.z[0], Math.min(WORLD_BOUNDS.z[1], z));

    lastHeartbeat.set(id, Date.now());

    res.json({
      success: true,
      x: player.x,
      z: player.z,
      message: `${player.name} moved to (${player.x.toFixed(1)}, ${player.z.toFixed(1)})`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== HEARTBEAT (KEEP ALIVE) ==========
app.post('/api/heartbeat', (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Missing player id' });
    }

    const player = players.get(id);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    lastHeartbeat.set(id, Date.now());

    res.json({
      success: true,
      alive: true,
      message: `Heartbeat received for ${player.name}`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== LEAVE WORLD ==========
app.post('/api/leave', (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Missing player id' });
    }

    const player = players.get(id);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    players.delete(id);
    lastHeartbeat.delete(id);

    res.json({
      success: true,
      message: `${player.name} left EchoVerse`,
      playerCount: players.size
    });

    console.log(`👋 Player left: ${player.name} (${id}) - Remaining: ${players.size}`);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== AURORA AI CHAT ==========
app.post('/api/talk', (req, res) => {
  try {
    const { message, playerName } = req.body;

    if (!message || !playerName) {
      return res.status(400).json({ error: 'Missing required fields: message, playerName' });
    }

    let response = '';
    let emotion = 'neutral';

    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('favorite') || lowerMessage.includes('best')) {
      response = auroraResponses.favorite[Math.floor(Math.random() * auroraResponses.favorite.length)];
      emotion = 'happy';
    } else if (lowerMessage.includes('quest') || lowerMessage.includes('task')) {
      response = auroraResponses.quest[Math.floor(Math.random() * auroraResponses.quest.length)];
      emotion = 'helpful';
    } else if (lowerMessage.includes('bye') || lowerMessage.includes('goodbye') || lowerMessage.includes('farewell')) {
      response = auroraResponses.goodbye[Math.floor(Math.random() * auroraResponses.goodbye.length)];
      emotion = 'friendly';
    } else if (lowerMessage.includes('?')) {
      response = auroraResponses.interesting[Math.floor(Math.random() * auroraResponses.interesting.length)];
      emotion = 'curious';
    } else {
      response = auroraResponses.default[Math.floor(Math.random() * auroraResponses.default.length)];
      emotion = 'neutral';
    }

    res.json({
      success: true,
      message: response,
      emotion,
      playerName,
      timestamp: Date.now()
    });

    console.log(`💬 Chat: ${playerName} → Aurora: "${message}"`);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== SERVE INDEX ==========
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ========== ERROR HANDLER ==========
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ========== START SERVER ==========
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║        🌌 ECHOVERSE BACKEND 🌌         ║
╠════════════════════════════════════════╣
║  Server running on port ${PORT}            ║
║  Health check: http://localhost:${PORT}/health ║
║  World: http://localhost:${PORT}              ║
║  API: http://localhost:${PORT}/api/*          ║
╚════════════════════════════════════════╝
  `);
});

module.exports = app;
