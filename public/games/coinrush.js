// ========== COIN RUSH MINI-GAME ==========

class CoinRushGame {
    constructor() {
        this.score = 0;
        this.timeLeft = 60;
        this.coinsCollected = 0;
        this.gameActive = false;
        this.gameOver = false;
        this.playerPosition = { x: 0, y: 0, z: 0 };
        this.coins = [];
        this.gameContainer = null;
    }

    start() {
        this.gameActive = true;
        this.gameOver = false;
        this.score = 0;
        this.timeLeft = 60;
        this.coinsCollected = 0;
        this.coins = [];
        
        this.createGameUI();
        this.spawnCoins();
        this.startTimer();
        this.startGameLoop();
        
        console.log('🎮 Coin Rush Started!');
    }

    createGameUI() {
        const existingContainer = document.getElementById('coin-rush-container');
        if (existingContainer) existingContainer.remove();

        this.gameContainer = document.createElement('div');
        this.gameContainer.id = 'coin-rush-container';
        this.gameContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(10, 14, 39, 0.95);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            backdrop-filter: blur(10px);
        `;

        const content = document.createElement('div');
        content.style.cssText = `
            text-align: center;
            color: #00ffff;
        `;

        content.innerHTML = `
            <h1 style="font-size: 48px; margin-bottom: 20px; color: #ffd700;">🪙 COIN RUSH 🪙</h1>
            <div style="font-size: 32px; margin-bottom: 20px;">
                Score: <span id="game-score" style="color: #00ff00;">0</span>
            </div>
            <div style="font-size: 24px; margin-bottom: 40px;">
                Time: <span id="game-timer" style="color: #ff0000;">60</span>s
            </div>
            <div id="game-board" style="
                width: 400px;
                height: 400px;
                background: rgba(30, 41, 59, 0.5);
                border: 2px solid #00ffff;
                border-radius: 12px;
                position: relative;
                margin: 20px auto;
                box-shadow: 0 0 20px rgba(0, 255, 255, 0.5);
            "></div>
            <div style="font-size: 14px; color: #cbd5e1; margin-top: 20px;">
                Click coins to collect them!
            </div>
            <button id="quit-game" style="
                margin-top: 20px;
                padding: 10px 20px;
                background: #ef4444;
                border: none;
                border-radius: 6px;
                color: white;
                cursor: pointer;
                font-size: 16px;
            ">Quit Game</button>
        `;

        this.gameContainer.appendChild(content);
        document.body.appendChild(this.gameContainer);

        document.getElementById('quit-game').addEventListener('click', () => this.end());
    }

    spawnCoins() {
        const board = document.getElementById('game-board');
        const coinCount = 15;

        for (let i = 0; i < coinCount; i++) {
            const coin = {
                id: i,
                x: Math.random() * 350,
                y: Math.random() * 350,
                element: null,
                collected: false
            };

            const coinEl = document.createElement('div');
            coinEl.className = 'game-coin';
            coinEl.style.cssText = `
                position: absolute;
                width: 30px;
                height: 30px;
                background: radial-gradient(circle at 30% 30%, #ffff00, #ffd700);
                border: 2px solid #ffa500;
                border-radius: 50%;
                left: ${coin.x}px;
                top: ${coin.y}px;
                cursor: pointer;
                font-size: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
                box-shadow: 0 0 10px rgba(255, 215, 0, 0.8);
                animation: coinFloat 3s ease-in-out infinite;
            `;
            coinEl.textContent = '🪙';

            coinEl.addEventListener('click', () => this.collectCoin(coin));
            coinEl.addEventListener('mouseover', () => {
                coinEl.style.transform = 'scale(1.3)';
                coinEl.style.boxShadow = '0 0 20px rgba(255, 215, 0, 1)';
            });
            coinEl.addEventListener('mouseout', () => {
                if (!coin.collected) {
                    coinEl.style.transform = 'scale(1)';
                    coinEl.style.boxShadow = '0 0 10px rgba(255, 215, 0, 0.8)';
                }
            });

            coin.element = coinEl;
            board.appendChild(coinEl);
            this.coins.push(coin);
        }

        // Add animation styles
        const style = document.createElement('style');
        style.textContent = `
            @keyframes coinFloat {
                0%, 100% { transform: translateY(0px); }
                50% { transform: translateY(-10px); }
            }
            @keyframes coinCollect {
                0% { transform: scale(1); opacity: 1; }
                100% { transform: scale(0); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }

    collectCoin(coin) {
        if (coin.collected) return;

        coin.collected = true;
        this.coinsCollected++;
        this.score += 100;

        coin.element.style.animation = 'coinCollect 0.5s ease-out';
        
        setTimeout(() => {
            coin.element.remove();
        }, 500);

        document.getElementById('game-score').textContent = this.score;

        // Spawn new coin
        if (this.coinsCollected < 30) {
            const newCoin = {
                id: this.coinsCollected,
                x: Math.random() * 350,
                y: Math.random() * 350,
                element: null,
                collected: false
            };

            const board = document.getElementById('game-board');
            const coinEl = document.createElement('div');
            coinEl.className = 'game-coin';
            coinEl.style.cssText = `
                position: absolute;
                width: 30px;
                height: 30px;
                background: radial-gradient(circle at 30% 30%, #ffff00, #ffd700);
                border: 2px solid #ffa500;
                border-radius: 50%;
                left: ${newCoin.x}px;
                top: ${newCoin.y}px;
                cursor: pointer;
                font-size: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
                box-shadow: 0 0 10px rgba(255, 215, 0, 0.8);
                animation: coinFloat 3s ease-in-out infinite;
            `;
            coinEl.textContent = '🪙';

            coinEl.addEventListener('click', () => this.collectCoin(newCoin));
            coinEl.addEventListener('mouseover', () => {
                coinEl.style.transform = 'scale(1.3)';
                coinEl.style.boxShadow = '0 0 20px rgba(255, 215, 0, 1)';
            });
            coinEl.addEventListener('mouseout', () => {
                if (!newCoin.collected) {
                    coinEl.style.transform = 'scale(1)';
                    coinEl.style.boxShadow = '0 0 10px rgba(255, 215, 0, 0.8)';
                }
            });

            newCoin.element = coinEl;
            board.appendChild(coinEl);
            this.coins.push(newCoin);
        }

        console.log(`💰 Coin collected! Score: ${this.score}`);
    }

    startTimer() {
        const timerInterval = setInterval(() => {
            if (!this.gameActive) {
                clearInterval(timerInterval);
                return;
            }

            this.timeLeft--;
            document.getElementById('game-timer').textContent = this.timeLeft;

            if (this.timeLeft <= 0) {
                clearInterval(timerInterval);
                this.end();
            }
        }, 1000);
    }

    startGameLoop() {
        // Game loop for animations and logic
        const gameLoop = setInterval(() => {
            if (!this.gameActive) {
                clearInterval(gameLoop);
            }
        }, 16);
    }

    end() {
        this.gameActive = false;
        this.gameOver = true;

        setTimeout(() => {
            this.showGameOver();
        }, 500);
    }

    showGameOver() {
        const container = document.getElementById('coin-rush-container');
        if (!container) return;

        container.innerHTML = `
            <div style="text-align: center; color: #00ffff;">
                <h1 style="font-size: 48px; margin-bottom: 20px; color: #ffd700;">GAME OVER!</h1>
                <div style="font-size: 36px; margin: 20px 0; color: #00ff00;">
                    Final Score: ${this.score}
                </div>
                <div style="font-size: 24px; margin: 20px 0;">
                    Coins Collected: ${this.coinsCollected}
                </div>
                <div style="font-size: 18px; margin: 40px 0; color: #cbd5e1;">
                    <button id="play-again" style="
                        padding: 12px 24px;
                        background: linear-gradient(135deg, #7c3aed, #0ea5e9);
                        border: none;
                        border-radius: 6px;
                        color: white;
                        cursor: pointer;
                        font-size: 16px;
                        margin: 0 10px;
                    ">Play Again</button>
                    <button id="close-game" style="
                        padding: 12px 24px;
                        background: #ef4444;
                        border: none;
                        border-radius: 6px;
                        color: white;
                        cursor: pointer;
                        font-size: 16px;
                        margin: 0 10px;
                    ">Close</button>
                </div>
            </div>
        `;

        document.getElementById('play-again').addEventListener('click', () => {
            this.start();
        });

        document.getElementById('close-game').addEventListener('click', () => {
            container.remove();
        });
    }
}

// Export
window.CoinRushGame = CoinRushGame;
