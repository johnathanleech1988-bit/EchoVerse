const mongoose = require('mongoose');

// ========== DATABASE CONNECTION ==========
async function connectDB() {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/echoverse';
        
        await mongoose.connect(mongoUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log('✅ MongoDB Connected Successfully');
    } catch (error) {
        console.error('❌ MongoDB Connection Failed:', error);
        process.exit(1);
    }
}

// ========== PLAYER SCHEMA ==========
const playerSchema = new mongoose.Schema({
    playerId: { type: String, required: true, unique: true },
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    playerName: { type: String, required: true },
    color: { type: String, default: '#2fe3ff' },
    avatar: { type: String, default: '' },
    level: { type: Number, default: 1 },
    experience: { type: Number, default: 0 },
    wallet: {
        echoTokens: { type: Number, default: 100 },
        usdValue: { type: Number, default: 0 }
    },
    stats: {
        gamesPlayed: { type: Number, default: 0 },
        gamesWon: { type: Number, default: 0 },
        totalScore: { type: Number, default: 0 },
        coinRushBestScore: { type: Number, default: 0 }
    },
    inventory: [{
        itemId: String,
        itemName: String,
        quantity: Number,
        rarity: String
    }],
    achievements: [{
        achievementId: String,
        unlockedAt: Date
    }],
    friends: [String],
    blockedPlayers: [String],
    lastLogin: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const Player = mongoose.model('Player', playerSchema);

// ========== GAME SCORE SCHEMA ==========
const gameScoreSchema = new mongoose.Schema({
    playerId: { type: String, required: true },
    playerName: { type: String, required: true },
    gameType: { type: String, required: true }, // 'coinrush', 'arcade', etc.
    score: { type: Number, required: true },
    coinsCollected: { type: Number, default: 0 },
    timeSpent: { type: Number, default: 0 }, // seconds
    rewardEarned: { type: Number, default: 0 }, // ECHO tokens
    timestamp: { type: Date, default: Date.now }
});

const GameScore = mongoose.model('GameScore', gameScoreSchema);

// ========== LEADERBOARD SCHEMA ==========
const leaderboardSchema = new mongoose.Schema({
    playerId: { type: String, required: true },
    playerName: { type: String, required: true },
    gameType: { type: String, required: true },
    rank: { type: Number, required: true },
    bestScore: { type: Number, required: true },
    lastUpdated: { type: Date, default: Date.now }
});

const Leaderboard = mongoose.model('Leaderboard', leaderboardSchema);

// ========== TRANSACTION SCHEMA ==========
const transactionSchema = new mongoose.Schema({
    transactionId: { type: String, required: true, unique: true },
    fromPlayerId: { type: String, required: true },
    toPlayerId: { type: String, required: true },
    amount: { type: Number, required: true },
    type: { type: String, required: true }, // 'transfer', 'reward', 'purchase'
    status: { type: String, default: 'completed' }, // 'pending', 'completed', 'failed'
    timestamp: { type: Date, default: Date.now }
});

const Transaction = mongoose.model('Transaction', transactionSchema);

// ========== DATABASE FUNCTIONS ==========

async function createOrUpdatePlayer(playerData) {
    try {
        const player = await Player.findOneAndUpdate(
            { playerId: playerData.playerId },
            playerData,
            { new: true, upsert: true }
        );
        return player;
    } catch (error) {
        console.error('Error creating/updating player:', error);
        throw error;
    }
}

async function getPlayer(playerId) {
    try {
        return await Player.findOne({ playerId });
    } catch (error) {
        console.error('Error getting player:', error);
        throw error;
    }
}

async function saveGameScore(scoreData) {
    try {
        const gameScore = new GameScore(scoreData);
        await gameScore.save();

        // Update player stats
        await Player.findOneAndUpdate(
            { playerId: scoreData.playerId },
            {
                $inc: {
                    'stats.gamesPlayed': 1,
                    'stats.totalScore': scoreData.score,
                    'wallet.echoTokens': scoreData.rewardEarned
                },
                $set: {
                    'stats.coinRushBestScore': scoreData.score
                }
            }
        );

        return gameScore;
    } catch (error) {
        console.error('Error saving game score:', error);
        throw error;
    }
}

async function getLeaderboard(gameType, limit = 10) {
    try {
        return await GameScore.find({ gameType })
            .sort({ score: -1 })
            .limit(limit)
            .lean();
    } catch (error) {
        console.error('Error getting leaderboard:', error);
        throw error;
    }
}

async function addFriend(playerId, friendId) {
    try {
        await Player.findOneAndUpdate(
            { playerId },
            { $addToSet: { friends: friendId } }
        );
        return true;
    } catch (error) {
        console.error('Error adding friend:', error);
        throw error;
    }
}

async function getPlayerStats(playerId) {
    try {
        const player = await Player.findOne({ playerId });
        return {
            playerId: player.playerId,
            playerName: player.playerName,
            level: player.level,
            experience: player.experience,
            stats: player.stats,
            wallet: player.wallet
        };
    } catch (error) {
        console.error('Error getting player stats:', error);
        throw error;
    }
}

async function updateWallet(playerId, amount, type = 'reward') {
    try {
        return await Player.findOneAndUpdate(
            { playerId },
            {
                $inc: { 'wallet.echoTokens': amount },
                updatedAt: new Date()
            },
            { new: true }
        );
    } catch (error) {
        console.error('Error updating wallet:', error);
        throw error;
    }
}

async function recordTransaction(transactionData) {
    try {
        const transaction = new Transaction(transactionData);
        await transaction.save();
        return transaction;
    } catch (error) {
        console.error('Error recording transaction:', error);
        throw error;
    }
}

async function getPlayerTransactions(playerId, limit = 20) {
    try {
        return await Transaction.find({
            $or: [
                { fromPlayerId: playerId },
                { toPlayerId: playerId }
            ]
        })
            .sort({ timestamp: -1 })
            .limit(limit)
            .lean();
    } catch (error) {
        console.error('Error getting transactions:', error);
        throw error;
    }
}

// Export
module.exports = {
    connectDB,
    Player,
    GameScore,
    Leaderboard,
    Transaction,
    createOrUpdatePlayer,
    getPlayer,
    saveGameScore,
    getLeaderboard,
    addFriend,
    getPlayerStats,
    updateWallet,
    recordTransaction,
    getPlayerTransactions
};
