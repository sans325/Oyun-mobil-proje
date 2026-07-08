// ==================== OYUN AYARLARI ====================
const GameConfig = {
    WIDTH: 400,
    HEIGHT: 600,
    FPS: 60,
    GRAVITY: 0.4,
    MAX_DROP_SPEED: 12,
    JUMP_POWER: -9,
    PIPE_WIDTH: 60,
    GAP_SIZE: 120,
    PIPE_SPEED: 5,
    PIPE_SPAWN_RATE: 90,
    COLORS: {
        SKY_BLUE: '#87CEEB',
        DARK_BLUE: '#1E90FF',
        PIPE_DARK: '#228B22',
        PIPE_LIGHT: '#90EE90',
        BIRD_YELLOW: '#FFFF00',
        BIRD_ORANGE: '#FFA500',
        BLACK: '#000000',
        WHITE: '#FFFFFF',
        RED: '#FF0000',
        GOLD: '#FFD700'
    }
};

// ==================== OYUN DURUMLAR ====================
const GameState = {
    MENU: 'menu',
    PLAYING: 'playing',
    GAME_OVER: 'gameover',
    PAUSED: 'paused'
};

// ==================== KUŞU ÇIZME ====================
class BirdGraphics {
    static drawBird(ctx, x, y, wingPosition) {
        const size = 40;
        const centerX = x + size / 2;
        const centerY = y + size / 2;

        // Gövde (sarı)
        ctx.fillStyle = GameConfig.COLORS.BIRD_YELLOW;
        ctx.beginPath();
        ctx.arc(centerX, centerY, 15, 0, Math.PI * 2);
        ctx.fill();

        // Kanatlar (turuncu)
        const wingOffset = 8 * Math.abs(wingPosition);
        ctx.fillStyle = GameConfig.COLORS.BIRD_ORANGE;
        
        // Sol kanat
        ctx.beginPath();
        ctx.moveTo(centerX - 18, centerY - 5 + wingOffset);
        ctx.lineTo(centerX - 12, centerY + 8);
        ctx.lineTo(centerX - 8, centerY - 3 + wingOffset);
        ctx.closePath();
        ctx.fill();

        // Sağ kanat
        ctx.beginPath();
        ctx.moveTo(centerX + 18, centerY - 5 + wingOffset);
        ctx.lineTo(centerX + 12, centerY + 8);
        ctx.lineTo(centerX + 8, centerY - 3 + wingOffset);
        ctx.closePath();
        ctx.fill();

        // Gözler (siyah ve beyaz)
        ctx.fillStyle = GameConfig.COLORS.BLACK;
        ctx.beginPath();
        ctx.arc(centerX + 8, centerY - 4, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = GameConfig.COLORS.WHITE;
        ctx.beginPath();
        ctx.arc(centerX + 9, centerY - 5, 2, 0, Math.PI * 2);
        ctx.fill();

        // Gaga (kırmızı)
        ctx.fillStyle = GameConfig.COLORS.RED;
        ctx.beginPath();
        ctx.moveTo(centerX + 15, centerY);
        ctx.lineTo(centerX + 22, centerY - 2);
        ctx.lineTo(centerX + 15, centerY + 4);
        ctx.closePath();
        ctx.fill();
    }
}

// ==================== KUŞU SINIFI ====================
class Bird {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.velocity = 0;
        this.width = 40;
        this.height = 40;
        this.wingAnimation = 0;
        this.wingSpeed = 0.2;
    }

    update() {
        this.velocity += GameConfig.GRAVITY;
        this.velocity = Math.min(this.velocity, GameConfig.MAX_DROP_SPEED);
        this.y += this.velocity;

        // Kanat animasyonu
        this.wingAnimation += this.wingSpeed;
        if (this.wingAnimation > 1) {
            this.wingAnimation = -1;
        }
    }

    jump() {
        this.velocity = GameConfig.JUMP_POWER;
    }

    draw(ctx) {
        BirdGraphics.drawBird(ctx, this.x, this.y, this.wingAnimation);
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
    constructor(x, pipeHeight) {
        this.x = x;
        this.pipeHeight = pipeHeight;
        this.gapSize = GameConfig.GAP_SIZE;
        this.width = GameConfig.PIPE_WIDTH;
        this.speed = GameConfig.PIPE_SPEED;
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
        
        ctx.fillStyle = GameConfig.COLORS.PIPE_LIGHT;
        ctx.fillRect(this.x, this.pipeHeight - 12, this.width, 12);

        // Alt boru
        const bottomY = this.pipeHeight + this.gapSize;
        ctx.fillStyle = GameConfig.COLORS.PIPE_DARK;
        ctx.fillRect(this.x, bottomY, this.width, GameConfig.HEIGHT - bottomY);
        
        ctx.fillStyle = GameConfig.COLORS.PIPE_LIGHT;
        ctx.fillRect(this.x, bottomY, this.width, 12);
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

// ==================== PARÇACIK SİSTEMİ ====================
class Particle {
    constructor(x, y, vx, vy, color, life) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.life = life;
        this.maxLife = life;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.2;
        this.life--;
    }

    draw(ctx) {
        const alpha = this.life / this.maxLife;
        const size = Math.max(2, 4 * alpha);
        
        ctx.fillStyle = this.color;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(this.x, this.y, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }

    isAlive() {
        return this.life > 0;
    }
}

// ==================== ANA OYUN SINIFI ====================
class FlappyBirdGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.width = GameConfig.WIDTH;
        this.height = GameConfig.HEIGHT;

        this.reset();
        this.setupEventListeners();
        this.loadBestScore();
        
        // Oyun döngüsü
        setInterval(() => this.gameLoop(), 1000 / GameConfig.FPS);
    }

    reset() {
        this.state = GameState.MENU;
        this.bird = new Bird(50, this.height / 2);
        this.pipes = [];
        this.particles = [];
        this.score = 0;
        this.bestScore = localStorage.getItem('flappyBirdBestScore') || 0;
        this.pipeCounter = 0;
        this.frameCount = 0;
    }

    setupEventListeners() {
        // Klavye
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));

        // Mouse/Touch
        this.canvas.addEventListener('click', () => this.handleClick());
        this.canvas.addEventListener('touchstart', () => this.handleClick());
    }

    handleKeyPress(e) {
        if (e.key === ' ') {
            e.preventDefault();
            this.handleClick();
        }

        if (e.key.toLowerCase() === 'p') {
            if (this.state === GameState.PLAYING) {
                this.state = GameState.PAUSED;
                document.getElementById('pausedScreen').classList.remove('hidden');
            } else if (this.state === GameState.PAUSED) {
                this.state = GameState.PLAYING;
                document.getElementById('pausedScreen').classList.add('hidden');
            }
        }
    }

    handleClick() {
        if (this.state === GameState.MENU) {
            this.startGame();
        } else if (this.state === GameState.PLAYING) {
            this.bird.jump();
            this.createParticles(this.bird.x + 20, this.bird.y + 20, 
                               GameConfig.COLORS.BIRD_YELLOW, 3);
        } else if (this.state === GameState.GAME_OVER) {
            this.startGame();
        }
    }

    startGame() {
        this.reset();
        this.state = GameState.PLAYING;
        document.getElementById('menuScreen').classList.add('hidden');
        document.getElementById('gameoverScreen').classList.add('hidden');
    }

    spawnPipe() {
        const minHeight = 50;
        const maxHeight = this.height - GameConfig.GAP_SIZE - 50;
        const pipeHeight = Math.random() * (maxHeight - minHeight) + minHeight;
        this.pipes.push(new Pipe(this.width, pipeHeight));
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

        // Kuşu güncelle
        this.bird.update();

        // Boruları güncelle
        for (let i = this.pipes.length - 1; i >= 0; i--) {
            const pipe = this.pipes[i];
            pipe.update();

            // Çarpışma kontrolü
            if (pipe.checkCollision(this.bird)) {
                this.state = GameState.GAME_OVER;
                this.updateBestScore();
                this.createParticles(this.bird.x + 20, this.bird.y + 20, 
                                   GameConfig.COLORS.RED, 10);
                this.showGameOver();
            }

            // Puan kontrolü
            if (!pipe.passed && pipe.x + pipe.width < this.bird.x) {
                pipe.passed = true;
                this.score += pipe.scoreValue;
                this.createParticles(this.width / 2, 50, GameConfig.COLORS.GOLD, 5);
                document.getElementById('score').textContent = this.score;
            }

            // Eski boruları sil
            if (pipe.isOffScreen()) {
                this.pipes.splice(i, 1);
            }
        }

        // Yeni boru oluştur
        this.pipeCounter++;
        if (this.pipeCounter >= GameConfig.PIPE_SPAWN_RATE) {
            this.spawnPipe();
            this.pipeCounter = 0;
        }

        // Ekran sınırlarını kontrol et
        if (this.bird.y <= 0 || this.bird.y + this.bird.height >= this.height) {
            this.state = GameState.GAME_OVER;
            this.updateBestScore();
            this.showGameOver();
        }

        // Parçacıkları güncelle
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update();
            if (!this.particles[i].isAlive()) {
                this.particles.splice(i, 1);
            }
        }
    }

    draw() {
        // Arka plan (gökyüzü)
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
        gradient.addColorStop(0, '#87CEEB');
        gradient.addColorStop(0.7, '#87CEEB');
        gradient.addColorStop(1, '#90EE90');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.width, this.height);

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
        this.ctx.font = 'bold 48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        this.ctx.shadowBlur = 4;
        this.ctx.fillText(this.score, this.width / 2, 60);
        this.ctx.shadowColor = 'transparent';
    }

    updateBestScore() {
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            localStorage.setItem('flappyBirdBestScore', this.bestScore);
            document.getElementById('bestScore').textContent = 
                `En Yüksek: ${this.bestScore}`;
        }
    }

    loadBestScore() {
        document.getElementById('bestScore').textContent = 
            `En Yüksek: ${this.bestScore}`;
        
        const menuBest = document.getElementById('menuBest');
        if (this.bestScore > 0) {
            menuBest.textContent = `En Yüksek Skor: ${this.bestScore}`;
        }
    }

    showGameOver() {
        document.getElementById('finalScore').textContent = `Puan: ${this.score}`;
        document.getElementById('finalBest').textContent = `En Yüksek: ${this.bestScore}`;
        document.getElementById('gameoverScreen').classList.remove('hidden');
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
