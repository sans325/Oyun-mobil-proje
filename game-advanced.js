// ==================== OYUN AYARLARI ====================
const GameConfig = {
    WIDTH: 400,
    HEIGHT: 600,
    FPS: 60,
    COLORS: {
        SKY_LIGHT: '#87CEEB',
        SKY_DARK: '#1E90FF',
        GROUND: '#2d5016',
        PIPE_DARK: '#228B22',
        PIPE_LIGHT: '#90EE90',
        BIRD_YELLOW: '#FFFF00',
        BIRD_ORANGE: '#FFA500',
        BLACK: '#000000',
        WHITE: '#FFFFFF',
        RED: '#FF0000',
        GOLD: '#FFD700'
    },
    DIFFICULTY: {
        easy: {
            gravity: 0.3,
            jumpPower: -8,
            pipeSpeed: 3,
            gapSize: 150,
            spawnRate: 120
        },
        normal: {
            gravity: 0.4,
            jumpPower: -9,
            pipeSpeed: 5,
            gapSize: 120,
            spawnRate: 90
        },
        hard: {
            gravity: 0.5,
            jumpPower: -9.5,
            pipeSpeed: 7,
            gapSize: 100,
            spawnRate: 70
        }
    }
};

const GameState = {
    MENU: 'menu',
    PLAYING: 'playing',
    GAME_OVER: 'gameover',
    PAUSED: 'paused'
};

// ==================== SES YÖNETIMI ====================
class SoundManager {
    constructor() {
        this.enabled = true;
        this.audioContext = null;
        this.isBrowser = typeof window !== 'undefined' && typeof AudioContext !== 'undefined';
    }

    init() {
        if (this.isBrowser && !this.audioContext) {
            try {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            } catch (e) {
                console.log('Ses desteği yok');
            }
        }
    }

    playSound(type) {
        if (!this.enabled || !this.audioContext || !this.isBrowser) return;

        try {
            const now = this.audioContext.currentTime;
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();

            osc.connect(gain);
            gain.connect(this.audioContext.destination);

            switch (type) {
                case 'jump':
                    osc.frequency.setValueAtTime(400, now);
                    osc.frequency.setValueAtTime(300, now + 0.1);
                    gain.gain.setValueAtTime(0.3, now);
                    gain.gain.setValueAtTime(0, now + 0.1);
                    osc.start(now);
                    osc.stop(now + 0.1);
                    break;
                case 'score':
                    osc.frequency.setValueAtTime(600, now);
                    gain.gain.setValueAtTime(0.2, now);
                    gain.gain.setValueAtTime(0, now + 0.15);
                    osc.start(now);
                    osc.stop(now + 0.15);
                    break;
                case 'crash':
                    osc.frequency.setValueAtTime(100, now);
                    osc.frequency.setValueAtTime(50, now + 0.2);
                    gain.gain.setValueAtTime(0.3, now);
                    gain.gain.setValueAtTime(0, now + 0.2);
                    osc.start(now);
                    osc.stop(now + 0.2);
                    break;
            }
        } catch (e) {
            console.log('Ses çalamadı:', e);
        }
    }

    toggleSound(enabled) {
        this.enabled = enabled;
    }
}

// ==================== PARÇACIK SİSTEMİ ====================
class Particle {
    constructor(x, y, vx, vy, color, life, size = 3) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.life = life;
        this.maxLife = life;
        this.size = size;
        this.gravity = 0.15;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.gravity;
        this.life--;
    }

    draw(ctx) {
        const alpha = this.life / this.maxLife;
        const currentSize = this.size * alpha;
        
        ctx.fillStyle = this.color;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(this.x, this.y, currentSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }

    isAlive() {
        return this.life > 0;
    }
}

// ==================== BULUT SISTEMI ====================
class Cloud {
    constructor(x, y, width = 80, speed = 0.5) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.speed = speed;
    }

    update() {
        this.x -= this.speed;
        if (this.x + this.width < 0) {
            this.x = GameConfig.WIDTH;
        }
    }

    draw(ctx) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 25, 0, Math.PI * 2);
        ctx.arc(this.x + 30, this.y, 35, 0, Math.PI * 2);
        ctx.arc(this.x + 60, this.y, 25, 0, Math.PI * 2);
        ctx.fill();
    }
}

// ==================== KUŞU ÇIZME ====================
class BirdGraphics {
    static drawBird(ctx, x, y, wingPosition, rotation = 0) {
        ctx.save();
        ctx.translate(x + 20, y + 20);
        ctx.rotate(rotation);

        const size = 40;
        const centerX = -20;
        const centerY = -20;

        // Gövde (sarı)
        ctx.fillStyle = GameConfig.COLORS.BIRD_YELLOW;
        ctx.beginPath();
        ctx.arc(centerX + 20, centerY + 20, 15, 0, Math.PI * 2);
        ctx.fill();

        // Kanat animasyonu
        const wingOffset = 8 * Math.abs(wingPosition);
        ctx.fillStyle = GameConfig.COLORS.BIRD_ORANGE;
        
        // Sol kanat
        ctx.beginPath();
        ctx.moveTo(centerX + 2, centerY + 15 + wingOffset);
        ctx.lineTo(centerX + 8, centerY + 28);
        ctx.lineTo(centerX + 12, centerY + 17 + wingOffset);
        ctx.closePath();
        ctx.fill();

        // Sağ kanat
        ctx.beginPath();
        ctx.moveTo(centerX + 38, centerY + 15 + wingOffset);
        ctx.lineTo(centerX + 32, centerY + 28);
        ctx.lineTo(centerX + 28, centerY + 17 + wingOffset);
        ctx.closePath();
        ctx.fill();

        // Gözler
        ctx.fillStyle = GameConfig.COLORS.BLACK;
        ctx.beginPath();
        ctx.arc(centerX + 28, centerY + 16, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = GameConfig.COLORS.WHITE;
        ctx.beginPath();
        ctx.arc(centerX + 29, centerY + 15, 2, 0, Math.PI * 2);
        ctx.fill();

        // Gaga
        ctx.fillStyle = GameConfig.COLORS.RED;
        ctx.beginPath();
        ctx.moveTo(centerX + 35, centerY + 20);
        ctx.lineTo(centerX + 42, centerY + 18);
        ctx.lineTo(centerX + 35, centerY + 24);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }
}

// ==================== KUŞU SINIFI ====================
class Bird {
    constructor(x, y, config) {
        this.x = x;
        this.y = y;
        this.velocity = 0;
        this.width = 40;
        this.height = 40;
        this.wingAnimation = 0;
        this.wingSpeed = 0.15;
        this.rotation = 0;
        this.maxRotation = 0.5;
        this.config = config;
    }

    update() {
        this.velocity += this.config.gravity;
        this.velocity = Math.min(this.velocity, 12);
        this.y += this.velocity;

        // Kuş açısı
        if (this.velocity < -5) {
            this.rotation = Math.max(this.rotation - 0.08, -this.maxRotation);
        } else {
            this.rotation = Math.min(this.rotation + 0.1, this.maxRotation);
        }

        // Kanat animasyonu
        this.wingAnimation += this.wingSpeed;
        if (this.wingAnimation > 1) {
            this.wingAnimation = -1;
        }
    }

    jump() {
        this.velocity = this.config.jumpPower;
    }

    draw(ctx) {
        BirdGraphics.drawBird(ctx, this.x, this.y, this.wingAnimation, this.rotation);
    }

    getCollisionBox() {
        return {
            x: this.x + 8,
            y: this.y + 8,
            width: 24,
            height: 24
        };
    }
}

// ==================== BORU SINIFI ====================
class Pipe {
    constructor(x, pipeHeight, config) {
        this.x = x;
        this.pipeHeight = pipeHeight;
        this.gapSize = config.gapSize;
        this.width = 60;
        this.speed = config.pipeSpeed;
        this.passed = false;
        this.scoreValue = 1;
    }

    update() {
        this.x -= this.speed;
    }

    draw(ctx) {
        // Üst boru
        ctx.fillStyle = GameConfig.COLORS.PIPE_DARK;
        ctx.fillRect(this.x, 0, this.width, this.pipeHeight);
        
        // Üst boru kenarı
        ctx.fillStyle = GameConfig.COLORS.PIPE_LIGHT;
        ctx.fillRect(this.x, this.pipeHeight - 12, this.width, 12);
        
        // Üst boru gölge
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(this.x, this.pipeHeight - 15, 3, 15);

        // Alt boru
        const bottomY = this.pipeHeight + this.gapSize;
        ctx.fillStyle = GameConfig.COLORS.PIPE_DARK;
        ctx.fillRect(this.x, bottomY, this.width, GameConfig.HEIGHT - bottomY);
        
        // Alt boru kenarı
        ctx.fillStyle = GameConfig.COLORS.PIPE_LIGHT;
        ctx.fillRect(this.x, bottomY, this.width, 12);
        
        // Alt boru gölge
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(this.x, bottomY, 3, 15);
    }

    checkCollision(bird) {
        const birdBox = bird.getCollisionBox();

        if (birdBox.x + birdBox.width > this.x && birdBox.x < this.x + this.width) {
            if (birdBox.y < this.pipeHeight || 
                birdBox.y + birdBox.height > this.pipeHeight + this.gapSize) {
                return true;
            }
        }

        return false;
    }

    isOffScreen() {
        return this.x + this.width < 0;
    }
}

// ==================== ANA OYUN SINIFI ====================
class FlappyBirdGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.width = GameConfig.WIDTH;
        this.height = GameConfig.HEIGHT;

        this.soundManager = new SoundManager();
        this.soundManager.init();

        this.difficulty = 'normal';
        this.currentConfig = GameConfig.DIFFICULTY.normal;
        
        this.reset();
        this.setupEventListeners();
        this.loadStats();
        this.createClouds();
        
        setInterval(() => this.gameLoop(), 1000 / GameConfig.FPS);
    }

    reset() {
        this.state = GameState.MENU;
        this.bird = new Bird(50, this.height / 2, this.currentConfig);
        this.pipes = [];
        this.particles = [];
        this.clouds = [];
        this.score = 0;
        this.pipeCounter = 0;
        this.gameStartTime = null;
    }

    createClouds() {
        this.clouds = [];
        for (let i = 0; i < 4; i++) {
            const x = (i * 120) % this.width;
            const y = 50 + Math.random() * 80;
            const speed = 0.5 + Math.random() * 0.5;
            this.clouds.push(new Cloud(x, y, 80, speed));
        }
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
        this.canvas.addEventListener('click', () => this.handleClick());
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.handleClick();
        });

        // Ayarlar
        document.getElementById('difficulty').addEventListener('change', (e) => {
            this.difficulty = e.target.value;
            this.currentConfig = GameConfig.DIFFICULTY[this.difficulty];
        });

        document.getElementById('soundToggle').addEventListener('click', () => {
            const toggle = document.getElementById('soundToggle');
            const enabled = !toggle.classList.contains('active');
            toggle.classList.toggle('active');
            this.soundManager.toggleSound(enabled);
        });

        document.getElementById('themeToggle').addEventListener('click', () => {
            document.body.classList.toggle('light-theme');
            document.getElementById('themeToggle').classList.toggle('active');
        });

        document.getElementById('resetBtn').addEventListener('click', () => {
            this.startGame();
        });

        document.getElementById('clearBtn').addEventListener('click', () => {
            if (confirm('Tüm kayıtlar silinecek. Emin misiniz?')) {
                localStorage.clear();
                this.loadStats();
                this.updateUI();
            }
        });
    }

    handleKeyPress(e) {
        if (e.key === ' ') {
            e.preventDefault();
            this.handleClick();
        }

        if (e.key.toLowerCase() === 'p') {
            if (this.state === GameState.PLAYING) {
                this.state = GameState.PAUSED;
                document.getElementById('pausedScreen').classList.add('active');
            } else if (this.state === GameState.PAUSED) {
                this.state = GameState.PLAYING;
                document.getElementById('pausedScreen').classList.remove('active');
            }
        }
    }

    handleClick() {
        if (this.state === GameState.MENU) {
            this.startGame();
        } else if (this.state === GameState.PLAYING) {
            this.bird.jump();
            this.soundManager.playSound('jump');
            this.createParticles(this.bird.x + 20, this.bird.y + 20, 
                               GameConfig.COLORS.BIRD_YELLOW, 3);
        } else if (this.state === GameState.GAME_OVER) {
            this.startGame();
        }
    }

    startGame() {
        this.reset();
        this.state = GameState.PLAYING;
        this.gameStartTime = Date.now();
        document.getElementById('menuScreen').classList.remove('active');
        document.getElementById('gameoverScreen').classList.remove('active');
        this.bird = new Bird(50, this.height / 2, this.currentConfig);
    }

    spawnPipe() {
        const minHeight = 50;
        const maxHeight = this.height - this.currentConfig.gapSize - 50;
        const pipeHeight = Math.random() * (maxHeight - minHeight) + minHeight;
        this.pipes.push(new Pipe(this.width, pipeHeight, this.currentConfig));
    }

    createParticles(x, y, color, count = 5) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 3 + 2;
            const vx = speed * Math.cos(angle);
            const vy = speed * Math.sin(angle) - 3;
            const life = Math.random() * 15 + 15;
            
            this.particles.push(new Particle(x, y, vx, vy, color, life));
        }
    }

    update() {
        if (this.state !== GameState.PLAYING) return;

        // Bulutları güncelle
        for (const cloud of this.clouds) {
            cloud.update();
        }

        this.bird.update();

        for (let i = this.pipes.length - 1; i >= 0; i--) {
            const pipe = this.pipes[i];
            pipe.update();

            if (pipe.checkCollision(this.bird)) {
                this.state = GameState.GAME_OVER;
                this.soundManager.playSound('crash');
                this.createParticles(this.bird.x + 20, this.bird.y + 20, 
                                   GameConfig.COLORS.RED, 10);
                this.showGameOver();
            }

            if (!pipe.passed && pipe.x + pipe.width < this.bird.x) {
                pipe.passed = true;
                this.score += pipe.scoreValue;
                this.soundManager.playSound('score');
                this.createParticles(this.width / 2, 50, GameConfig.COLORS.GOLD, 5);
                document.getElementById('currentScore').textContent = this.score;
            }

            if (pipe.isOffScreen()) {
                this.pipes.splice(i, 1);
            }
        }

        this.pipeCounter++;
        if (this.pipeCounter >= this.currentConfig.spawnRate) {
            this.spawnPipe();
            this.pipeCounter = 0;
        }

        if (this.bird.y <= 0 || this.bird.y + this.bird.height >= this.height) {
            this.state = GameState.GAME_OVER;
            this.soundManager.playSound('crash');
            this.showGameOver();
        }

        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update();
            if (!this.particles[i].isAlive()) {
                this.particles.splice(i, 1);
            }
        }
    }

    draw() {
        // Arka plan - gradient
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
        gradient.addColorStop(0, GameConfig.COLORS.SKY_LIGHT);
        gradient.addColorStop(0.7, GameConfig.COLORS.SKY_LIGHT);
        gradient.addColorStop(1, GameConfig.COLORS.GROUND);
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Bulutları çiz
        for (const cloud of this.clouds) {
            cloud.draw(this.ctx);
        }

        // Boruları çiz
        for (const pipe of this.pipes) {
            pipe.draw(this.ctx);
        }

        // Kuşu çiz
        this.bird.draw(this.ctx);

        // Parçacıkları çiz
        for (const particle of this.particles) {
            particle.draw(this.ctx);
        }

        // Puanı çiz
        this.ctx.fillStyle = GameConfig.COLORS.WHITE;
        this.ctx.font = 'bold 50px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
        this.ctx.shadowBlur = 8;
        this.ctx.shadowOffsetX = 2;
        this.ctx.shadowOffsetY = 2;
        this.ctx.fillText(this.score, this.width / 2, 70);
        
        // Zorluk göstergesi
        this.ctx.font = 'bold 14px Arial';
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`Zorluk: ${this.getDifficultyLabel()}`, 10, this.height - 10);
        
        this.ctx.shadowColor = 'transparent';
    }

    getDifficultyLabel() {
        switch (this.difficulty) {
            case 'easy': return '🟢 Kolay';
            case 'normal': return '🟡 Normal';
            case 'hard': return '🔴 Zor';
            default: return 'Normal';
        }
    }

    calculateStars() {
        if (this.score >= 50) return 5;
        if (this.score >= 40) return 4;
        if (this.score >= 30) return 3;
        if (this.score >= 20) return 2;
        if (this.score >= 10) return 1;
        return 0;
    }

    loadStats() {
        const bestScore = localStorage.getItem('flappyBirdBestScore') || 0;
        const gamesPlayed = localStorage.getItem('flappyBirdGamesPlayed') || 0;
        const totalScore = localStorage.getItem('flappyBirdTotalScore') || 0;

        document.getElementById('bestScore').textContent = bestScore;
        document.getElementById('gamesPlayed').textContent = gamesPlayed;
        document.getElementById('totalScore').textContent = totalScore;

        this.updateTopScores();
    }

    updateStats() {
        const bestScore = Math.max(parseInt(localStorage.getItem('flappyBirdBestScore') || 0), this.score);
        const gamesPlayed = (parseInt(localStorage.getItem('flappyBirdGamesPlayed') || 0)) + 1;
        const totalScore = (parseInt(localStorage.getItem('flappyBirdTotalScore') || 0)) + this.score;

        localStorage.setItem('flappyBirdBestScore', bestScore);
        localStorage.setItem('flappyBirdGamesPlayed', gamesPlayed);
        localStorage.setItem('flappyBirdTotalScore', totalScore);

        this.saveTopScore(this.score);
        this.loadStats();
    }

    saveTopScore(score) {
        const topScores = JSON.parse(localStorage.getItem('flappyBirdTopScores') || '[]');
        topScores.push({
            score: score,
            difficulty: this.difficulty,
            date: new Date().toLocaleDateString('tr-TR')
        });
        topScores.sort((a, b) => b.score - a.score);
        topScores.splice(5);
        localStorage.setItem('flappyBirdTopScores', JSON.stringify(topScores));
    }

    updateTopScores() {
        const topScores = JSON.parse(localStorage.getItem('flappyBirdTopScores') || '[]');
        const list = document.getElementById('topScoresList');
        list.innerHTML = '';

        topScores.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'score-item';
            div.innerHTML = `
                <span class="score-rank">#${index + 1}</span>
                <span>${item.score} - ${item.difficulty}</span>
                <span class="score-value">${item.date}</span>
            `;
            list.appendChild(div);
        });
    }

    showGameOver() {
        this.updateStats();
        const stars = this.calculateStars();
        
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('finalBest').textContent = 
            `En Yüksek: ${localStorage.getItem('flappyBirdBestScore')}`;
        
        const starsDisplay = document.getElementById('starsDisplay');
        starsDisplay.innerHTML = '';
        for (let i = 0; i < 5; i++) {
            const star = document.createElement('span');
            star.className = 'star' + (i < stars ? ' filled' : '');
            star.textContent = '⭐';
            starsDisplay.appendChild(star);
        }
        
        document.getElementById('gameoverScreen').classList.add('active');
    }

    updateUI() {
        this.loadStats();
    }

    gameLoop() {
        this.update();
        this.draw();
    }
}

// ==================== OYUNU BAŞLAT ====================
window.addEventListener('load', () => {
    new FlappyBirdGame();
});
