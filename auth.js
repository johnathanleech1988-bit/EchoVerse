const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { Player, createOrUpdatePlayer, getPlayer } = require('./database');

const router = express.Router();

// ========== JWT CONFIGURATION ==========
const JWT_SECRET = process.env.JWT_SECRET || 'echoverse-secret-key-change-in-production';
const JWT_EXPIRE = '7d';

// ========== MIDDLEWARE ==========
function verifyToken(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.player = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
}

// ========== AUTHENTICATION ROUTES ==========

// Register new player
router.post('/register', async (req, res) => {
    try {
        const { username, email, password, playerName, color } = req.body;

        // Validation
        if (!username || !email || !password || !playerName) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Check if user exists
        const existingPlayer = await Player.findOne({
            $or: [{ username }, { email }]
        });

        if (existingPlayer) {
            return res.status(400).json({ error: 'Username or email already exists' });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Create player
        const playerId = uuidv4();
        const newPlayer = await createOrUpdatePlayer({
            playerId,
            username,
            email,
            passwordHash,
            playerName,
            color: color || '#2fe3ff',
            lastLogin: new Date()
        });

        // Generate token
        const token = jwt.sign(
            {
                playerId: newPlayer.playerId,
                username: newPlayer.username,
                playerName: newPlayer.playerName
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRE }
        );

        console.log(`✅ New player registered: ${username}`);

        res.json({
            success: true,
            message: 'Player registered successfully',
            token,
            player: {
                playerId: newPlayer.playerId,
                username: newPlayer.username,
                playerName: newPlayer.playerName,
                color: newPlayer.color
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Login player
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password required' });
        }

        // Find player
        const player = await Player.findOne({ username });

        if (!player) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        // Verify password
        const passwordMatch = await bcrypt.compare(password, player.passwordHash);

        if (!passwordMatch) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        // Update last login
        player.lastLogin = new Date();
        await player.save();

        // Generate token
        const token = jwt.sign(
            {
                playerId: player.playerId,
                username: player.username,
                playerName: player.playerName
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRE }
        );

        console.log(`✅ Player logged in: ${username}`);

        res.json({
            success: true,
            message: 'Login successful',
            token,
            player: {
                playerId: player.playerId,
                username: player.username,
                playerName: player.playerName,
                color: player.color,
                level: player.level,
                experience: player.experience,
                wallet: player.wallet,
                stats: player.stats
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Get current player profile
router.get('/profile', verifyToken, async (req, res) => {
    try {
        const player = await getPlayer(req.player.playerId);

        if (!player) {
            return res.status(404).json({ error: 'Player not found' });
        }

        res.json({
            success: true,
            player: {
                playerId: player.playerId,
                username: player.username,
                playerName: player.playerName,
                email: player.email,
                color: player.color,
                avatar: player.avatar,
                level: player.level,
                experience: player.experience,
                wallet: player.wallet,
                stats: player.stats,
                inventory: player.inventory,
                friends: player.friends,
                lastLogin: player.lastLogin
            }
        });
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

// Update player profile
router.put('/profile', verifyToken, async (req, res) => {
    try {
        const { playerName, color, avatar } = req.body;
        const updates = {};

        if (playerName) updates.playerName = playerName;
        if (color) updates.color = color;
        if (avatar) updates.avatar = avatar;

        updates.updatedAt = new Date();

        const player = await Player.findOneAndUpdate(
            { playerId: req.player.playerId },
            updates,
            { new: true }
        );

        console.log(`✅ Player profile updated: ${req.player.username}`);

        res.json({
            success: true,
            message: 'Profile updated successfully',
            player: {
                playerId: player.playerId,
                playerName: player.playerName,
                color: player.color,
                avatar: player.avatar
            }
        });
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// Change password
router.post('/change-password', verifyToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current and new password required' });
        }

        const player = await getPlayer(req.player.playerId);

        // Verify current password
        const passwordMatch = await bcrypt.compare(currentPassword, player.passwordHash);

        if (!passwordMatch) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        // Hash new password
        const newPasswordHash = await bcrypt.hash(newPassword, 10);

        await Player.findOneAndUpdate(
            { playerId: req.player.playerId },
            { passwordHash: newPasswordHash }
        );

        console.log(`✅ Password changed for: ${req.player.username}`);

        res.json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        console.error('Password change error:', error);
        res.status(500).json({ error: 'Failed to change password' });
    }
});

// Logout (client-side token deletion)
router.post('/logout', verifyToken, (req, res) => {
    console.log(`👋 Player logged out: ${req.player.username}`);
    res.json({ success: true, message: 'Logged out successfully' });
});

// Verify token
router.get('/verify', verifyToken, (req, res) => {
    res.json({
        success: true,
        player: {
            playerId: req.player.playerId,
            username: req.player.username,
            playerName: req.player.playerName
        }
    });
});

// Get public player profile
router.get('/public/:username', async (req, res) => {
    try {
        const player = await Player.findOne({ username: req.params.username });

        if (!player) {
            return res.status(404).json({ error: 'Player not found' });
        }

        res.json({
            success: true,
            player: {
                username: player.username,
                playerName: player.playerName,
                color: player.color,
                avatar: player.avatar,
                level: player.level,
                stats: player.stats
            }
        });
    } catch (error) {
        console.error('Public profile error:', error);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

module.exports = router;
module.exports.verifyToken = verifyToken;
