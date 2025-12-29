const CELL_SIZE = 50;

// ============================================
// STARFIELD CANVAS SYSTEM - Deep Space Effect
// ============================================
const Starfield = {
    canvas: null,
    ctx: null,
    stars: [],
    dustParticles: [],
    shootingStars: [],
    width: 0,
    height: 0,
    animationId: null,
    lastTime: 0,

    // Configuration
    config: {
        starCount: 150,
        dustCount: 50,
        maxShootingStars: 2,
        shootingStarChance: 0.001,
        colors: {
            white: 'rgba(255, 255, 255,',
            blue: 'rgba(180, 200, 255,',
            purple: 'rgba(200, 180, 255,',
            cyan: 'rgba(150, 220, 255,'
        }
    },

    init() {
        this.canvas = document.getElementById('starfield-canvas');
        if (!this.canvas) return;

        // Check for reduced motion preference
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            this.canvas.style.display = 'none';
            return;
        }

        // Reduce particles on mobile for better performance
        const isMobile = window.innerWidth < 768;
        if (isMobile) {
            this.config.starCount = 80;
            this.config.dustCount = 25;
            this.config.shootingStarChance = 0.0005;
        }

        this.ctx = this.canvas.getContext('2d');
        this.resize();
        this.createStars();
        this.createDust();
        this.animate();

        window.addEventListener('resize', () => this.resize());
    },

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        // Recreate stars on resize
        if (this.stars.length > 0) {
            this.createStars();
            this.createDust();
        }
    },

    createStars() {
        this.stars = [];
        const colors = Object.values(this.config.colors);

        for (let i = 0; i < this.config.starCount; i++) {
            const colorBase = colors[Math.floor(Math.random() * colors.length)];
            this.stars.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                radius: Math.random() * 1.5 + 0.5,
                colorBase: colorBase,
                alpha: Math.random() * 0.5 + 0.3,
                twinkleSpeed: Math.random() * 0.02 + 0.005,
                twinklePhase: Math.random() * Math.PI * 2,
                // Some stars don't twinkle
                static: Math.random() > 0.7
            });
        }
    },

    createDust() {
        this.dustParticles = [];

        for (let i = 0; i < this.config.dustCount; i++) {
            this.dustParticles.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                radius: Math.random() * 0.8 + 0.3,
                alpha: Math.random() * 0.2 + 0.05,
                speedX: (Math.random() - 0.5) * 0.15,
                speedY: Math.random() * 0.1 + 0.02,
                drift: Math.random() * Math.PI * 2
            });
        }
    },

    createShootingStar() {
        if (this.shootingStars.length >= this.config.maxShootingStars) return;

        const startX = Math.random() * this.width;
        const startY = Math.random() * this.height * 0.3;
        const angle = Math.PI / 4 + (Math.random() - 0.5) * 0.3;

        this.shootingStars.push({
            x: startX,
            y: startY,
            length: Math.random() * 80 + 40,
            speed: Math.random() * 8 + 6,
            angle: angle,
            alpha: 1,
            decay: Math.random() * 0.015 + 0.01
        });
    },

    update(deltaTime) {
        const time = performance.now() * 0.001;

        // Update twinkling stars
        this.stars.forEach(star => {
            if (!star.static) {
                star.twinklePhase += star.twinkleSpeed * deltaTime * 60;
                star.currentAlpha = star.alpha + Math.sin(star.twinklePhase) * 0.3;
                star.currentAlpha = Math.max(0.1, Math.min(1, star.currentAlpha));
            } else {
                star.currentAlpha = star.alpha;
            }
        });

        // Update dust particles
        this.dustParticles.forEach(dust => {
            dust.x += dust.speedX + Math.sin(time + dust.drift) * 0.05;
            dust.y += dust.speedY;

            // Wrap around
            if (dust.y > this.height) {
                dust.y = -5;
                dust.x = Math.random() * this.width;
            }
            if (dust.x < 0) dust.x = this.width;
            if (dust.x > this.width) dust.x = 0;
        });

        // Update shooting stars
        this.shootingStars = this.shootingStars.filter(star => {
            star.x += Math.cos(star.angle) * star.speed;
            star.y += Math.sin(star.angle) * star.speed;
            star.alpha -= star.decay;
            return star.alpha > 0 && star.x < this.width && star.y < this.height;
        });

        // Chance to spawn new shooting star
        if (Math.random() < this.config.shootingStarChance) {
            this.createShootingStar();
        }
    },

    draw() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.width, this.height);

        // Draw stars
        this.stars.forEach(star => {
            this.ctx.beginPath();
            this.ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = star.colorBase + star.currentAlpha + ')';
            this.ctx.fill();

            // Add glow for brighter stars
            if (star.radius > 1 && star.currentAlpha > 0.5) {
                this.ctx.beginPath();
                this.ctx.arc(star.x, star.y, star.radius * 2, 0, Math.PI * 2);
                this.ctx.fillStyle = star.colorBase + (star.currentAlpha * 0.2) + ')';
                this.ctx.fill();
            }
        });

        // Draw dust particles
        this.ctx.globalAlpha = 0.6;
        this.dustParticles.forEach(dust => {
            this.ctx.beginPath();
            this.ctx.arc(dust.x, dust.y, dust.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(200, 180, 255, ${dust.alpha})`;
            this.ctx.fill();
        });
        this.ctx.globalAlpha = 1;

        // Draw shooting stars
        this.shootingStars.forEach(star => {
            const gradient = this.ctx.createLinearGradient(
                star.x, star.y,
                star.x - Math.cos(star.angle) * star.length,
                star.y - Math.sin(star.angle) * star.length
            );
            gradient.addColorStop(0, `rgba(255, 255, 255, ${star.alpha})`);
            gradient.addColorStop(0.3, `rgba(180, 200, 255, ${star.alpha * 0.6})`);
            gradient.addColorStop(1, 'rgba(180, 200, 255, 0)');

            this.ctx.beginPath();
            this.ctx.moveTo(star.x, star.y);
            this.ctx.lineTo(
                star.x - Math.cos(star.angle) * star.length,
                star.y - Math.sin(star.angle) * star.length
            );
            this.ctx.strokeStyle = gradient;
            this.ctx.lineWidth = 2;
            this.ctx.lineCap = 'round';
            this.ctx.stroke();

            // Bright head
            this.ctx.beginPath();
            this.ctx.arc(star.x, star.y, 2, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
            this.ctx.fill();
        });
    },

    animate(currentTime = 0) {
        const deltaTime = Math.min((currentTime - this.lastTime) / 16.67, 2);
        this.lastTime = currentTime;

        this.update(deltaTime);
        this.draw();

        this.animationId = requestAnimationFrame((t) => this.animate(t));
    },

    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
    }
};

// Initialize starfield on page load
window.addEventListener('load', () => {
    Starfield.init();
});

const SoundManager = {
    context: null,
    enabled: true,
    initialized: false,
    files: {},
    init() {
        if (this.initialized) {
            return;
        }
        this.initialized = true;

        this.files.drag = new Audio('sounds/click.wav');
        this.files.place = new Audio('sounds/ding.wav');
        this.files.clear = new Audio('sounds/boom.wav');
        Object.values(this.files).forEach((audio) => {
            audio.preload = 'auto';
            audio.volume = 0.7;
        });

        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext && !this.context) {
            this.context = new AudioContext();
        }
    },
    resume() {
        this.init();
        if (this.context && this.context.state === 'suspended') {
            this.context.resume();
        }
    },
    playTone(freq, duration, type = 'sine', gain = 0.08) {
        if (!this.enabled) {
            return;
        }
        this.init();
        if (!this.context) {
            return;
        }
        const ctx = this.context;
        const oscillator = ctx.createOscillator();
        const volume = ctx.createGain();
        oscillator.type = type;
        oscillator.frequency.value = freq;
        volume.gain.value = gain;
        oscillator.connect(volume);
        volume.connect(ctx.destination);
        oscillator.start();
        volume.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
        oscillator.stop(ctx.currentTime + duration);
    },
    playChord(freqs, duration, type = 'sine', gain = 0.05) {
        freqs.forEach((freq) => this.playTone(freq, duration, type, gain));
    },
    playFile(name) {
        const audio = this.files[name];
        if (!audio) {
            return false;
        }
        const instance = audio.cloneNode(true);
        instance.volume = audio.volume;
        instance.play().catch(() => { });
        return true;
    },
    play(name) {
        if (!this.enabled) {
            return;
        }
        this.init();
        if (this.playFile(name)) {
            return;
        }
        switch (name) {
            case 'drag':
                this.playTone(240, 0.06, 'triangle', 0.06);
                break;
            case 'place':
                this.playChord([420, 620], 0.12, 'sine', 0.07);
                break;
            case 'clear':
                this.playChord([760, 980], 0.16, 'sine', 0.08);
                break;
            case 'gameover':
                this.playChord([180, 240], 0.4, 'sine', 0.06);
                break;
            case 'shuffle':
                this.playTone(300, 0.08, 'triangle', 0.06);
                break;
            case 'hammer':
                // Deep impact sound
                this.playTone(80, 0.15, 'sawtooth', 0.12);
                setTimeout(() => this.playChord([200, 400, 600], 0.2, 'sine', 0.08), 50);
                break;
            default:
                break;
        }
    }
};

// ============================================
// GAME JUICE EFFECTS - AAA Quality Visual Feedback
// ============================================
const GameJuice = {
    // Texture key -> color mapping
    colorMap: {
        'crystal_red': '#FF0055',
        'crystal_blue': '#00D4FF',
        'crystal_green': '#39FF14',
        'crystal_purple': '#BC13FE',
        'crystal_yellow': '#FFD700'
    },

    // 1. Crystal Particle Explosion
    createExplosion(x, y, color, particleCount = 10) {
        const container = document.getElementById('game-container');
        if (!container) return;

        const rect = container.getBoundingClientRect();
        const baseX = rect.left + x;
        const baseY = rect.top + y;

        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'crystal-particle';

            // Random direction and distance
            const angle = (Math.PI * 2 * i / particleCount) + (Math.random() - 0.5) * 0.8;
            const distance = 40 + Math.random() * 60;
            const tx = Math.cos(angle) * distance;
            const ty = Math.sin(angle) * distance - 20; // Slight upward bias
            const rotation = (Math.random() - 0.5) * 360;

            particle.style.cssText = `
                left: ${baseX}px;
                top: ${baseY}px;
                background: ${color};
                box-shadow: 0 0 8px ${color}, 0 0 15px ${color}80;
                --tx: ${tx}px;
                --ty: ${ty}px;
                --rot: ${rotation}deg;
                animation: particleExplode ${0.5 + Math.random() * 0.2}s ease-out forwards;
            `;

            document.body.appendChild(particle);

            // Cleanup
            setTimeout(() => particle.remove(), 800);
        }
    },

    // 2. Floating Pop-up Text
    showFloatingText(text, x, y, type = 'normal') {
        const container = document.getElementById('game-container');
        if (!container) return;

        const rect = container.getBoundingClientRect();
        const floatingText = document.createElement('div');
        floatingText.className = 'floating-text';

        if (type === 'combo') {
            floatingText.classList.add('floating-text--combo');
        } else if (type === 'excellent') {
            floatingText.classList.add('floating-text--excellent');
        }

        floatingText.textContent = text;
        floatingText.style.left = `${rect.left + x}px`;
        floatingText.style.top = `${rect.top + y}px`;

        document.body.appendChild(floatingText);

        // Cleanup
        setTimeout(() => floatingText.remove(), 1100);
    },

    // 3. Screen Shake
    shakeScreen(intensity = 'light') {
        const gameShell = document.querySelector('.game-shell');
        if (!gameShell) return;

        // Remove existing shake classes
        gameShell.classList.remove('shake-light', 'shake-medium', 'shake-heavy');

        // Force reflow to restart animation
        void gameShell.offsetWidth;

        // Add shake class based on intensity
        gameShell.classList.add(`shake-${intensity}`);

        // Remove class after animation
        const duration = intensity === 'heavy' ? 400 : intensity === 'medium' ? 350 : 300;
        setTimeout(() => {
            gameShell.classList.remove(`shake-${intensity}`);
        }, duration);
    },

    // 4. Score Pulse Effect
    pulseScore() {
        const scoreEl = document.getElementById('score-value');
        if (!scoreEl) return;

        scoreEl.classList.remove('pulse');
        void scoreEl.offsetWidth;
        scoreEl.classList.add('pulse');

        setTimeout(() => scoreEl.classList.remove('pulse'), 400);
    },

    // 5. Line Flash Effect (DOM overlay)
    flashLineDOM(x, y, width, height, isHorizontal = true) {
        const container = document.getElementById('game-container');
        if (!container) return;

        const rect = container.getBoundingClientRect();
        const flash = document.createElement('div');
        flash.className = 'line-flash';

        flash.style.cssText = `
            left: ${rect.left + x - width / 2}px;
            top: ${rect.top + y - height / 2}px;
            width: ${width}px;
            height: ${height}px;
            transform-origin: ${isHorizontal ? 'left center' : 'center top'};
        `;

        document.body.appendChild(flash);
        setTimeout(() => flash.remove(), 450);
    },

    // Helper: Get color from texture key
    getColor(textureKey) {
        return this.colorMap[textureKey] || '#FFFFFF';
    },

    // Combined effect for clearing blocks
    onBlockClear(sprite, gridX, gridY, startX, startY, cellSize) {
        if (!sprite || !sprite.texture) return;

        const color = this.getColor(sprite.texture.key);
        const worldX = startX + gridX * cellSize + cellSize / 2;
        const worldY = startY + gridY * cellSize + cellSize / 2;

        this.createExplosion(worldX, worldY, color, 8);
    },

    // Combined effect for line clear
    onLineClear(linesCleared, comboStreak, centerX, centerY) {
        const intensity = comboStreak >= 4 ? 'heavy' : comboStreak >= 2 ? 'medium' : 'light';
        this.shakeScreen(intensity);
        this.pulseScore();

        // Show score feedback
        const points = linesCleared * 10 * Math.max(linesCleared, comboStreak);
        const type = comboStreak >= 4 ? 'excellent' : comboStreak >= 2 ? 'combo' : 'normal';

        setTimeout(() => {
            this.showFloatingText(`+${points}`, centerX, centerY, type);
        }, 100);
    },

    // ============================================
    // HAMMER 3x3 POWER-UP EFFECTS
    // ============================================

    // Create shockwave effect at impact point
    createShockwave(x, y) {
        const container = document.getElementById('game-container');
        if (!container) return;

        const rect = container.getBoundingClientRect();

        // Main shockwave ring
        const shockwave = document.createElement('div');
        shockwave.className = 'hammer-shockwave';
        shockwave.style.left = `${rect.left + x}px`;
        shockwave.style.top = `${rect.top + y}px`;
        document.body.appendChild(shockwave);

        // Background flash
        const flash = document.createElement('div');
        flash.className = 'hammer-flash';
        flash.style.cssText = `
            left: ${rect.left + x - 150}px;
            top: ${rect.top + y - 150}px;
            width: 300px;
            height: 300px;
        `;
        document.body.appendChild(flash);

        // Cleanup
        setTimeout(() => {
            shockwave.remove();
            flash.remove();
        }, 600);
    },

    // Hammer impact sound
    playHammerSound() {
        if (typeof SoundManager !== 'undefined') {
            SoundManager.play('hammer');
        }
    },

    // Create staggered explosions for dramatic effect
    createStaggeredExplosions(cells, startX, startY, cellSize, delayBetween = 30) {
        cells.forEach((cell, index) => {
            setTimeout(() => {
                const worldX = startX + cell.x * cellSize + cellSize / 2;
                const worldY = startY + cell.y * cellSize + cellSize / 2;
                this.createExplosion(worldX, worldY, cell.color, 10);
            }, index * delayBetween);
        });
    },

    // Show hammer destruction score
    showHammerScore(blocksDestroyed, x, y) {
        const points = blocksDestroyed * 5; // 5 points per block
        if (points > 0) {
            setTimeout(() => {
                this.showFloatingText(`+${points}`, x, y, blocksDestroyed >= 5 ? 'combo' : 'normal');
            }, 200);
        }
        return points;
    }
};

const initSplash = () => {
    const splash = document.getElementById('splash');
    const bar = document.getElementById('splash-bar');
    const percent = document.getElementById('splash-percent');
    if (!splash || !bar || !percent) {
        return;
    }

    let progress = 0;
    const tick = () => {
        progress = Math.min(100, progress + 8 + Math.random() * 12);
        bar.style.width = `${progress}%`;
        percent.textContent = `${Math.round(progress)}%`;
        if (progress < 100) {
            requestAnimationFrame(tick);
            return;
        }
        setTimeout(() => {
            splash.classList.add('is-hidden');
            splash.classList.remove('is-visible');
            splash.setAttribute('aria-hidden', 'true');
        }, 300);
    };

    requestAnimationFrame(tick);
};

window.addEventListener('load', initSplash);

// Custom Hammer Cursor Tracking
const initHammerCursor = () => {
    const cursor = document.getElementById('hammer-cursor');
    if (!cursor) return;

    document.addEventListener('mousemove', (e) => {
        cursor.style.left = e.clientX + 'px';
        cursor.style.top = e.clientY + 'px';
    });
};

window.addEventListener('load', initHammerCursor);

const BLOCK_TEXTURES = [
    { key: 'crystal_red', fill: '#FF0055', stroke: '#c00040' },
    { key: 'crystal_blue', fill: '#00D4FF', stroke: '#008db0' },
    { key: 'crystal_green', fill: '#39FF14', stroke: '#26b50e' },
    { key: 'crystal_purple', fill: '#BC13FE', stroke: '#7f0bb0' },
    { key: 'crystal_yellow', fill: '#FFD700', stroke: '#c9a500' }
];

const config = {
    type: Phaser.AUTO,
    width: 450,
    height: 700,
    backgroundColor: '#0F051D',
    parent: 'game-container',
    pixelArt: false,
    scene: { preload: preload, create: create }
};

const game = new Phaser.Game(config);

function preload() {
    const drawRoundedRect = (ctx, x, y, width, height, radius) => {
        const r = Math.min(radius, width / 2, height / 2);
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + width - r, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + r);
        ctx.lineTo(x + width, y + height - r);
        ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
        ctx.lineTo(x + r, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    };

    const createBlockTexture = (key, fill, stroke) => {
        if (this.textures.exists(key)) {
            return;
        }
        const canvas = this.textures.createCanvas(key, CELL_SIZE, CELL_SIZE);
        if (!canvas) {
            return;
        }
        const ctx = canvas.getContext();
        if (!ctx) {
            return;
        }
        const size = CELL_SIZE;
        const pad = 3;
        const rectSize = size - pad * 2;
        const radius = 4;

        ctx.clearRect(0, 0, size, size);

        ctx.save();
        ctx.shadowColor = fill;
        ctx.shadowBlur = 10;
        ctx.fillStyle = fill;
        drawRoundedRect(ctx, pad, pad, rectSize, rectSize, radius);
        ctx.fill();
        ctx.restore();

        const glass = ctx.createLinearGradient(pad, pad, pad + rectSize, pad + rectSize);
        glass.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
        glass.addColorStop(0.6, 'rgba(255, 255, 255, 0.12)');
        glass.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.filter = 'blur(0.6px)';
        ctx.fillStyle = glass;
        drawRoundedRect(ctx, pad, pad, rectSize, rectSize, radius);
        ctx.fill();
        ctx.filter = 'none';

        const inner = ctx.createRadialGradient(25, 25, 6, 25, 25, 24);
        inner.addColorStop(0, 'rgba(0, 0, 0, 0)');
        inner.addColorStop(1, 'rgba(0, 0, 0, 0.55)');
        ctx.fillStyle = inner;
        drawRoundedRect(ctx, pad, pad, rectSize, rectSize, radius);
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        drawRoundedRect(ctx, pad, pad, rectSize, rectSize, radius);
        ctx.stroke();

        ctx.strokeStyle = stroke;
        ctx.lineWidth = 1;
        drawRoundedRect(ctx, pad + 1, pad + 1, rectSize - 2, rectSize - 2, radius - 1);
        ctx.stroke();

        const highlight = ctx.createLinearGradient(pad, pad, pad + rectSize * 0.6, pad + rectSize * 0.6);
        highlight.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
        highlight.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = highlight;
        drawRoundedRect(ctx, pad + 2, pad + 2, rectSize * 0.38, rectSize * 0.38, 2);
        ctx.fill();
        canvas.refresh();
    };

    BLOCK_TEXTURES.forEach((texture) => {
        createBlockTexture(texture.key, texture.fill, texture.stroke);
    });

    if (!this.textures.exists('cell_bg')) {
        const cellCanvas = this.textures.createCanvas('cell_bg', CELL_SIZE, CELL_SIZE);
        if (cellCanvas) {
            const ctx = cellCanvas.getContext();
            if (ctx) {
                const center = CELL_SIZE / 2;
                const grad = ctx.createRadialGradient(center, center, 2, center, center, center);
                grad.addColorStop(0, 'rgba(61, 28, 113, 0.15)');
                grad.addColorStop(0.7, 'rgba(15, 5, 29, 0)');
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, CELL_SIZE, CELL_SIZE);
                cellCanvas.refresh();
            }
        }
    }

    if (this.textures.exists('background')) {
        return;
    }

    const bgCanvas = this.textures.createCanvas('background', config.width, config.height);
    if (!bgCanvas) {
        return;
    }
    const bctx = bgCanvas.getContext();
    if (!bctx) {
        return;
    }
    const gradient = bctx.createLinearGradient(0, 0, 0, config.height);
    gradient.addColorStop(0, '#0F051D');
    gradient.addColorStop(1, '#1A0C2E');
    bctx.fillStyle = gradient;
    bctx.fillRect(0, 0, config.width, config.height);

    const glow = bctx.createRadialGradient(90, 100, 20, 90, 100, 260);
    glow.addColorStop(0, 'rgba(188, 19, 254, 0.22)');
    glow.addColorStop(1, 'rgba(188, 19, 254, 0)');
    bctx.fillStyle = glow;
    bctx.fillRect(0, 0, config.width, config.height);
    bgCanvas.refresh();
}

function create() {
    this.add.image(0, 0, 'background').setOrigin(0, 0);

    const gridSize = 8;
    const cellSize = CELL_SIZE;
    const gridWidth = gridSize * cellSize;
    const gridHeight = gridSize * cellSize;

    const blockTextureKeys = BLOCK_TEXTURES.map((texture) => texture.key);
    const shapeDefs = [
        { name: 'single', blocks: [[0, 0]] },
        { name: 'domino_h', blocks: [[0, 0], [1, 0]] },
        { name: 'domino_v', blocks: [[0, 0], [0, 1]] },
        { name: 'bar3_h', blocks: [[0, 0], [1, 0], [2, 0]] },
        { name: 'bar3_v', blocks: [[0, 0], [0, 1], [0, 2]] },
        { name: 'square2', blocks: [[0, 0], [1, 0], [0, 1], [1, 1]] },
        { name: 'el_small', blocks: [[0, 0], [0, 1], [1, 1]] },
        { name: 'el_large', blocks: [[0, 0], [0, 1], [0, 2], [1, 2]] },
        { name: 'el_large_rev', blocks: [[1, 0], [1, 1], [1, 2], [0, 2]] },
        { name: 'rect3x2', blocks: [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]] },
        { name: 'rect2x3', blocks: [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2], [1, 2]] },
        { name: 'tee', blocks: [[0, 0], [1, 0], [2, 0], [1, 1]] },
        { name: 'ess', blocks: [[1, 0], [2, 0], [0, 1], [1, 1]] },
        { name: 'zee', blocks: [[0, 0], [1, 0], [1, 1], [2, 1]] },
        { name: 'plus', blocks: [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]] }
    ];

    shapeDefs.forEach((def) => {
        const xs = def.blocks.map((block) => block[0]);
        const ys = def.blocks.map((block) => block[1]);
        def.minX = Math.min(...xs);
        def.maxX = Math.max(...xs);
        def.minY = Math.min(...ys);
        def.maxY = Math.max(...ys);
        def.width = (def.maxX - def.minX + 1) * cellSize;
        def.height = (def.maxY - def.minY + 1) * cellSize;
    });

    const dockGap = 28;
    const dockPaddingX = 16;
    const dockPaddingBottom = 16;
    const slotGap = 16;
    const previewScale = 0.8;
    const maxShapeHeight = Math.max(...shapeDefs.map((def) => def.height));
    const idealStartY = Math.round((config.height - gridHeight) / 2);
    const maxStartY = config.height - gridHeight - dockGap - maxShapeHeight - dockPaddingBottom;
    const startY = Math.max(40, Math.min(idealStartY, maxStartY));
    const startX = Math.round((config.width - gridWidth) / 2);
    const dockTopY = startY + gridHeight + dockGap;
    const shapeRowY = Math.round(dockTopY + maxShapeHeight / 2);

    const grid = Array.from({ length: gridSize }, () => Array(gridSize).fill(null));
    const depth = {
        board: 1,
        gridFill: 2,
        gridGlow: 3,
        grid: 4,
        placed: 6,
        dockBase: 8,
        dock: 10,
        dragging: 20
    };

    const dockGlowWidth = Math.min(gridWidth + 40, config.width - 40);
    const dockGlowHeight = Math.max(18, Math.round(cellSize * 0.5));
    if (!this.textures.exists('dock_glow')) {
        const dockCanvas = this.textures.createCanvas('dock_glow', dockGlowWidth, dockGlowHeight);
        if (dockCanvas) {
            const ctx = dockCanvas.getContext();
            if (ctx) {
                const grad = ctx.createLinearGradient(0, 0, dockGlowWidth, 0);
                grad.addColorStop(0, 'rgba(188, 19, 254, 0)');
                grad.addColorStop(0.5, 'rgba(188, 19, 254, 0.35)');
                grad.addColorStop(1, 'rgba(188, 19, 254, 0)');
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, dockGlowWidth, dockGlowHeight);
                dockCanvas.refresh();
            }
        }
    }

    const dockBase = this.add.image(
        config.width / 2,
        shapeRowY + maxShapeHeight / 2 + dockGlowHeight / 2 + 6,
        'dock_glow'
    );
    dockBase.setDepth(depth.dockBase);
    dockBase.setAlpha(0.9);

    const boardGraphics = this.add.graphics();
    boardGraphics.fillStyle(0x1e0b36, 1);
    boardGraphics.fillRoundedRect(startX - 8, startY - 8, gridWidth + 16, gridHeight + 16, 14);
    boardGraphics.lineStyle(2, 0x3d1c71, 1);
    boardGraphics.strokeRoundedRect(startX - 8, startY - 8, gridWidth + 16, gridHeight + 16, 14);
    boardGraphics.setDepth(depth.board);

    for (let x = 0; x < gridSize; x++) {
        for (let y = 0; y < gridSize; y++) {
            const cell = this.add.image(
                startX + x * cellSize + cellSize / 2,
                startY + y * cellSize + cellSize / 2,
                'cell_bg'
            );
            cell.setDepth(depth.gridFill);
        }
    }

    const gridGlowGraphics = this.add.graphics({ lineStyle: { width: 3, color: 0xbc13fe, alpha: 0.18 } });
    gridGlowGraphics.setDepth(depth.gridGlow);
    const gridGraphics = this.add.graphics({ lineStyle: { width: 1, color: 0x3d1c71, alpha: 0.75 } });
    gridGraphics.setDepth(depth.grid);

    for (let x = 0; x < gridSize; x++) {
        for (let y = 0; y < gridSize; y++) {
            gridGlowGraphics.strokeRect(startX + x * cellSize, startY + y * cellSize, cellSize, cellSize);
            gridGraphics.strokeRect(startX + x * cellSize, startY + y * cellSize, cellSize, cellSize);
        }
    }

    let score = 0;
    let highScore = 0;
    let isGameOver = false;
    const domModal = document.getElementById('gameover');
    const domRestart = domModal ? domModal.querySelector('.btn') : null;
    const domShare = document.getElementById('share-score');
    const domHighValue = document.getElementById('high-score-value');
    const domHighLabel = document.getElementById('high-score-label');
    const domScoreValue = document.getElementById('score-value');
    const domHammer = document.getElementById('power-hammer');
    const domShuffle = document.getElementById('power-shuffle');
    let deleteMode = false;
    let comboStreak = 0;
    let recordCelebrated = false;
    const domHand = document.getElementById('hand-tutorial');

    if (domHighLabel) {
        domHighLabel.classList.remove('record-glow');
    }

    const setDeleteMode = (enabled) => {
        deleteMode = enabled;
        document.body.classList.toggle('delete-mode', deleteMode);
        if (domHammer) {
            domHammer.classList.toggle('powerup--active', deleteMode);
        }
    };
    setDeleteMode(false);

    const showDomGameOver = () => {
        if (domModal) {
            domModal.classList.add('is-visible');
        }
    };

    const hideDomGameOver = () => {
        if (domModal) {
            domModal.classList.remove('is-visible');
        }
    };

    const shareScore = () => {
        const text = `Crystal Puzzle - Ochko: ${score}`;
        if (navigator.share) {
            navigator.share({ title: 'Crystal Puzzle', text }).catch(() => { });
            return;
        }
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).catch(() => { });
        }
    };

    try {
        const stored = localStorage.getItem('ancient_treasures_high_score');
        highScore = stored ? Number(stored) : 0;
        if (Number.isNaN(highScore)) {
            highScore = 0;
        }
    } catch (err) {
        highScore = 0;
    }

    if (domScoreValue) {
        domScoreValue.textContent = String(score);
    }
    if (domHighValue) {
        domHighValue.textContent = String(highScore);
    }

    if (domHand) {
        const tutorialKey = 'crystal_puzzle_tutorial_seen';
        if (!localStorage.getItem(tutorialKey)) {
            domHand.classList.add('is-visible');
            const dismiss = () => {
                domHand.classList.remove('is-visible');
                localStorage.setItem(tutorialKey, '1');
            };
            document.addEventListener('pointerdown', dismiss, { once: true });
            setTimeout(dismiss, 6000);
        }
    }

    const availableDockWidth = config.width - dockPaddingX * 2;
    const activeShapes = [];

    const pickShapeSet = () => {
        const maxAttempts = 60;
        let selected = null;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const candidate = [
                Phaser.Utils.Array.GetRandom(shapeDefs),
                Phaser.Utils.Array.GetRandom(shapeDefs),
                Phaser.Utils.Array.GetRandom(shapeDefs)
            ];
            const totalWidth = candidate.reduce((sum, def) => sum + def.width, 0) + slotGap * 2;
            if (totalWidth <= availableDockWidth) {
                selected = candidate;
                break;
            }
        }

        return selected || [
            Phaser.Utils.Array.GetRandom(shapeDefs),
            Phaser.Utils.Array.GetRandom(shapeDefs),
            Phaser.Utils.Array.GetRandom(shapeDefs)
        ];
    };

    const layoutShapeSlots = (defs) => {
        const totalWidth = defs.reduce((sum, def) => sum + def.width, 0) + slotGap * (defs.length - 1);
        const extra = Math.max(0, availableDockWidth - totalWidth);
        let cursorX = dockPaddingX + extra / 2;

        return defs.map((def) => {
            cursorX += def.width / 2;
            const position = { x: Math.round(cursorX), y: shapeRowY };
            cursorX += def.width / 2 + slotGap;
            return position;
        });
    };

    const createShape = (def, position) => {
        const textureKey = Phaser.Utils.Array.GetRandom(blockTextureKeys);
        const shapeWidth = def.width;
        const shapeHeight = def.height;
        const offsetX = -shapeWidth / 2 + cellSize / 2;
        const offsetY = -shapeHeight / 2 + cellSize / 2;

        const container = this.add.container(position.x, position.y);
        container.setData('homeX', position.x);
        container.setData('homeY', position.y);
        container.setData('shapeBlocks', def.blocks);
        container.setData('textureKey', textureKey);
        container.setDepth(depth.dock);
        container.setScale(previewScale);

        def.blocks.forEach(([bx, by]) => {
            const block = this.add.image(
                (bx - def.minX) * cellSize + offsetX,
                (by - def.minY) * cellSize + offsetY,
                textureKey
            );
            block.setOrigin(0.5, 0.5);
            block.setData('offsetX', block.x);
            block.setData('offsetY', block.y);
            container.add(block);
        });

        container.setSize(shapeWidth, shapeHeight);
        container.setInteractive(
            new Phaser.Geom.Rectangle(-shapeWidth / 2, -shapeHeight / 2, shapeWidth, shapeHeight),
            Phaser.Geom.Rectangle.Contains
        );
        this.input.setDraggable(container);
        activeShapes.push(container);
    };

    const spawnAllShapes = () => {
        const defs = pickShapeSet();
        const positions = layoutShapeSlots(defs);
        defs.forEach((def, index) => createShape(def, positions[index]));
    };

    spawnAllShapes();

    const tryPlaceShape = (container) => {
        if (!container || !container.list) {
            return null;
        }

        const blocks = container.list.filter((block) => block && typeof block.x === 'number' && typeof block.y === 'number');
        if (blocks.length === 0) {
            return null;
        }
        const placements = [];

        for (const block of blocks) {
            const worldX = container.x + block.x;
            const worldY = container.y + block.y;
            const gridX = Math.round((worldX - startX - cellSize / 2) / cellSize);
            const gridY = Math.round((worldY - startY - cellSize / 2) / cellSize);

            if (gridX < 0 || gridX >= gridSize || gridY < 0 || gridY >= gridSize) {
                return null;
            }
            if (grid[gridY][gridX]) {
                return null;
            }

            placements.push({ gridX, gridY, offsetX: block.x, offsetY: block.y });
        }

        return placements;
    };

    const snapAndPlace = (container, placements, textureKey) => {
        const first = placements[0];
        const targetX = startX + first.gridX * cellSize + cellSize / 2 - first.offsetX;
        const targetY = startY + first.gridY * cellSize + cellSize / 2 - first.offsetY;

        container.setPosition(targetX, targetY);
        container.setAlpha(1);

        placements.forEach((placement) => {
            const px = startX + placement.gridX * cellSize + cellSize / 2;
            const py = startY + placement.gridY * cellSize + cellSize / 2;
            const sprite = this.add.image(px, py, textureKey);
            sprite.setDepth(depth.placed);
            grid[placement.gridY][placement.gridX] = sprite;
        });
    };

    const updateHighScore = () => {
        if (score <= highScore) {
            return;
        }
        highScore = score;
        if (domHighValue) {
            domHighValue.textContent = String(highScore);
        }
        if (domHighLabel && !recordCelebrated) {
            recordCelebrated = true;
            domHighLabel.classList.remove('record-glow');
            void domHighLabel.offsetWidth;
            domHighLabel.classList.add('record-glow');
        }
        try {
            localStorage.setItem('ancient_treasures_high_score', String(highScore));
        } catch (err) {
            // localStorage bloklansa ham o'yin ishlayveradi
        }
    };

    const animateBlockRemoval = (sprite) => {
        if (!sprite || !sprite.active) {
            return;
        }

        const textureKey = sprite.texture ? sprite.texture.key : null;
        const baseDepth = typeof sprite.depth === 'number' ? sprite.depth : depth.placed;
        const shardCount = 6;

        if (textureKey) {
            for (let i = 0; i < shardCount; i++) {
                const shard = this.add.image(sprite.x, sprite.y, textureKey);
                const cropSize = Math.round(CELL_SIZE * 0.5);
                const cropX = Phaser.Math.Between(0, CELL_SIZE - cropSize);
                const cropY = Phaser.Math.Between(0, CELL_SIZE - cropSize);
                shard.setCrop(cropX, cropY, cropSize, cropSize);
                shard.setScale(Phaser.Math.FloatBetween(0.25, 0.4));
                shard.setDepth(baseDepth + 1);

                this.tweens.add({
                    targets: shard,
                    x: sprite.x + Phaser.Math.Between(-30, 30),
                    y: sprite.y + Phaser.Math.Between(30, 90),
                    angle: Phaser.Math.Between(-90, 90),
                    alpha: 0,
                    duration: 420 + Phaser.Math.Between(0, 140),
                    ease: 'Quad.In',
                    onComplete: () => shard.destroy()
                });
            }
        }

        this.tweens.add({
            targets: sprite,
            scale: 0,
            alpha: 0,
            duration: 300,
            ease: 'Quad.Out',
            onComplete: () => sprite.destroy()
        });
    };

    const flashLine = (x, y, width, height) => {
        const flash = this.add.rectangle(x, y, width, height, 0xbc13fe, 0.45);
        flash.setBlendMode(Phaser.BlendModes.ADD);
        flash.setDepth(depth.gridGlow + 1);
        this.tweens.add({
            targets: flash,
            alpha: 0,
            duration: 260,
            ease: 'Quad.Out',
            onComplete: () => flash.destroy()
        });
    };

    const animateLineClear = (rows, cols, sprites) => {
        // Flash effects for rows
        rows.forEach((row) => {
            const y = startY + row * cellSize + cellSize / 2;
            flashLine(startX + gridWidth / 2, y, gridWidth, cellSize);
            // DOM flash overlay
            GameJuice.flashLineDOM(startX + gridWidth / 2, y, gridWidth, cellSize, true);
        });

        // Flash effects for columns
        cols.forEach((col) => {
            const x = startX + col * cellSize + cellSize / 2;
            flashLine(x, startY + gridHeight / 2, cellSize, gridHeight);
            // DOM flash overlay
            GameJuice.flashLineDOM(x, startY + gridHeight / 2, cellSize, gridHeight, false);
        });

        // Animate each sprite with particle explosion
        sprites.forEach((sprite) => {
            if (sprite && sprite.texture) {
                const color = GameJuice.getColor(sprite.texture.key);
                GameJuice.createExplosion(sprite.x, sprite.y, color, 8);
            }
            animateBlockRemoval(sprite);
        });
    };

    // DOM orqali combo text - tiniq va katta
    const comboDiv = document.createElement('div');
    comboDiv.id = 'combo-text';
    comboDiv.style.cssText = `
        position: absolute;
        top: 25px;
        left: 50%;
        transform: translateX(-50%) scale(0.9);
        font-family: 'Orbitron', 'Exo 2', sans-serif;
        font-size: 42px;
        font-weight: 700;
        color: #FFD700;
        text-shadow: 0 0 10px rgba(255, 215, 0, 0.8), 2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000;
        pointer-events: none;
        opacity: 0;
        z-index: 100;
        white-space: nowrap;
        letter-spacing: 2px;
    `;
    document.getElementById('game-container').appendChild(comboDiv);

    let comboTimeout = null;

    const showComboMessage = (message) => {
        comboDiv.textContent = message;
        comboDiv.style.opacity = '0';
        comboDiv.style.transform = 'translateX(-50%) scale(0.9)';

        // Animatsiya
        requestAnimationFrame(() => {
            comboDiv.style.transition = 'opacity 0.18s ease-out, transform 0.18s ease-out';
            comboDiv.style.opacity = '1';
            comboDiv.style.transform = 'translateX(-50%) scale(1)';
        });

        if (comboTimeout) clearTimeout(comboTimeout);
        comboTimeout = setTimeout(() => {
            comboDiv.style.transition = 'opacity 0.22s ease-in';
            comboDiv.style.opacity = '0';
        }, 800);
    };

    const checkAndClearLines = () => {
        const rowsToClear = [];
        const colsToClear = [];

        for (let y = 0; y < gridSize; y++) {
            if (grid[y].every(Boolean)) {
                rowsToClear.push(y);
            }
        }

        for (let x = 0; x < gridSize; x++) {
            let full = true;
            for (let y = 0; y < gridSize; y++) {
                if (!grid[y][x]) {
                    full = false;
                    break;
                }
            }
            if (full) {
                colsToClear.push(x);
            }
        }

        if (rowsToClear.length === 0 && colsToClear.length === 0) {
            comboStreak = 0;
            return 0;
        }

        const sprites = new Set();
        rowsToClear.forEach((y) => {
            for (let x = 0; x < gridSize; x++) {
                if (grid[y][x]) {
                    sprites.add(grid[y][x]);
                    grid[y][x] = null;
                }
            }
        });

        colsToClear.forEach((x) => {
            for (let y = 0; y < gridSize; y++) {
                if (grid[y][x]) {
                    sprites.add(grid[y][x]);
                    grid[y][x] = null;
                }
            }
        });

        animateLineClear(rowsToClear, colsToClear, sprites);

        const cleared = rowsToClear.length + colsToClear.length;
        comboStreak += 1;
        const multiplier = Math.max(cleared, comboStreak);
        const earnedPoints = cleared * 10 * multiplier;
        score += earnedPoints;
        if (domScoreValue) {
            domScoreValue.textContent = String(score);
        }
        updateHighScore();
        SoundManager.play('clear');

        // === GAME JUICE EFFECTS ===
        // Screen shake based on combo
        const shakeIntensity = comboStreak >= 4 ? 'heavy' : comboStreak >= 2 ? 'medium' : 'light';
        GameJuice.shakeScreen(shakeIntensity);

        // Score pulse animation
        GameJuice.pulseScore();

        // Floating score text at center of cleared area
        const centerX = startX + gridWidth / 2;
        const centerY = startY + gridHeight / 2;
        const textType = comboStreak >= 4 ? 'excellent' : comboStreak >= 2 ? 'combo' : 'normal';
        setTimeout(() => {
            GameJuice.showFloatingText(`+${earnedPoints}`, centerX, centerY - 50, textType);
        }, 150);

        // Show combo message
        if (multiplier >= 2) {
            const label = multiplier >= 4 ? `EXCELLENT! x${multiplier}` : `COMBO x${multiplier}`;
            showComboMessage(label);
        }
        return cleared;
    };

    const canPlaceBlocksAnywhere = (blocks) => {
        for (let baseX = 0; baseX < gridSize; baseX++) {
            for (let baseY = 0; baseY < gridSize; baseY++) {
                let fits = true;
                for (const [bx, by] of blocks) {
                    const gx = baseX + bx;
                    const gy = baseY + by;
                    if (gx < 0 || gx >= gridSize || gy < 0 || gy >= gridSize || grid[gy][gx]) {
                        fits = false;
                        break;
                    }
                }
                if (fits) {
                    return true;
                }
            }
        }
        return false;
    };

    const checkGameOver = () => {
        if (isGameOver) {
            return;
        }
        const stillActive = activeShapes.filter((shape) => shape && shape.active);
        if (stillActive.length === 0) {
            return;
        }
        const canAnyFit = stillActive.some((shape) => {
            const blocks = shape.getData('shapeBlocks') || [];
            return canPlaceBlocksAnywhere(blocks);
        });
        if (canAnyFit) {
            return;
        }
        isGameOver = true;
        setDeleteMode(false);
        stillActive.forEach((shape) => shape.disableInteractive());
        SoundManager.play('gameover');
        showGameOver();
    };

    const overlay = this.add.rectangle(config.width / 2, config.height / 2, config.width, config.height, 0x000000, 0.55)
        .setVisible(false)
        .setAlpha(0)
        .setDepth(90);

    const panel = this.add.rectangle(config.width / 2, config.height / 2, 280, 150, 0x1e0b36, 0.95)
        .setStrokeStyle(2, 0xbc13fe, 0.8)
        .setVisible(false)
        .setAlpha(0)
        .setScale(0.9)
        .setDepth(100);

    const gameOverText = this.add.text(config.width / 2, config.height / 2 - 30, "O'yin tugadi", {
        fontFamily: 'Orbitron, Exo 2, sans-serif',
        fontSize: '32px',
        color: '#ffffff'
    }).setOrigin(0.5, 0.5).setVisible(false).setAlpha(0).setScale(0.9).setDepth(110);
    gameOverText.setShadow(0, 0, '#BC13FE', 12, true, true);

    const restartButton = this.add.text(config.width / 2, config.height / 2 + 20, 'Qayta boshlash', {
        fontFamily: 'Orbitron, Exo 2, sans-serif',
        fontSize: '20px',
        color: '#ffffff',
        backgroundColor: '#BC13FE',
        padding: { x: 12, y: 6 }
    }).setOrigin(0.5, 0.5).setVisible(false).setAlpha(0).setScale(0.9)
        .setInteractive({ useHandCursor: true })
        .setDepth(110);
    restartButton.setShadow(0, 0, '#00D4FF', 10, true, true);

    const showGameOver = () => {
        if (domModal) {
            showDomGameOver();
            return;
        }

        overlay.setVisible(true);
        panel.setVisible(true);
        gameOverText.setVisible(true);
        restartButton.setVisible(true);

        overlay.setAlpha(0);
        panel.setAlpha(0).setScale(0.9);
        gameOverText.setAlpha(0).setScale(0.9);
        restartButton.setAlpha(0).setScale(0.9);

        this.tweens.add({
            targets: overlay,
            alpha: 0.45,
            duration: 200,
            ease: 'Quad.Out'
        });

        this.tweens.add({
            targets: [panel, gameOverText],
            alpha: 1,
            scale: 1,
            duration: 260,
            ease: 'Back.Out'
        });

        this.tweens.add({
            targets: restartButton,
            alpha: 1,
            scale: 1,
            duration: 260,
            ease: 'Back.Out',
            delay: 80
        });
    };

    restartButton.on('pointerdown', () => {
        hideDomGameOver();
        this.scene.restart();
    });

    if (domRestart) {
        domRestart.onclick = () => {
            hideDomGameOver();
            this.scene.restart();
        };
    }

    if (domShare) {
        domShare.onclick = () => {
            shareScore();
        };
    }

    if (domHammer) {
        domHammer.onclick = () => {
            if (isGameOver) {
                return;
            }
            setDeleteMode(!deleteMode);
        };
    }

    if (domShuffle) {
        domShuffle.onclick = () => {
            if (isGameOver) {
                return;
            }
            activeShapes.forEach((shape) => shape.destroy());
            activeShapes.length = 0;
            spawnAllShapes();
            SoundManager.play('shuffle');
        };
    }

    this.input.on('dragstart', (pointer, gameObject) => {
        if (isGameOver || deleteMode) {
            return;
        }
        SoundManager.resume();
        SoundManager.play('drag');
        gameObject.setDepth(depth.dragging);
        gameObject.setScale(1);
        gameObject.x = pointer.x;
        gameObject.y = pointer.y;
    });

    this.input.on('drag', (pointer, gameObject, dragX, dragY) => {
        if (isGameOver || deleteMode) {
            return;
        }
        gameObject.x = dragX;
        gameObject.y = dragY;
        gameObject.setAlpha(0.7);
    });

    // ============================================
    // 3x3 HAMMER POWER-UP IMPLEMENTATION
    // ============================================
    const applyHammerEffect = (centerGridX, centerGridY) => {
        const destroyedCells = [];
        let totalDestroyed = 0;

        // Calculate world position for shockwave center
        const centerWorldX = startX + centerGridX * cellSize + cellSize / 2;
        const centerWorldY = startY + centerGridY * cellSize + cellSize / 2;

        // Create shockwave effect at impact point
        GameJuice.createShockwave(centerWorldX, centerWorldY);
        GameJuice.playHammerSound();

        // Screen shake - heavy impact!
        GameJuice.shakeScreen('heavy');

        // Iterate through 3x3 area
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const targetX = centerGridX + dx;
                const targetY = centerGridY + dy;

                // Bounds checking - skip if out of grid
                if (targetX < 0 || targetX >= gridSize || targetY < 0 || targetY >= gridSize) {
                    continue;
                }

                const sprite = grid[targetY][targetX];
                if (sprite) {
                    // Get color for explosion effect
                    const color = sprite.texture ? GameJuice.getColor(sprite.texture.key) : '#FFFFFF';

                    destroyedCells.push({
                        x: targetX,
                        y: targetY,
                        color: color,
                        sprite: sprite
                    });

                    // Remove from grid
                    grid[targetY][targetX] = null;
                    totalDestroyed++;
                }
            }
        }

        // Create staggered explosions for dramatic effect
        if (destroyedCells.length > 0) {
            GameJuice.createStaggeredExplosions(destroyedCells, startX, startY, cellSize, 40);

            // Animate block removal with delay for each
            destroyedCells.forEach((cell, index) => {
                setTimeout(() => {
                    if (cell.sprite && cell.sprite.active) {
                        this.tweens.add({
                            targets: cell.sprite,
                            scale: 0,
                            alpha: 0,
                            angle: Phaser.Math.Between(-45, 45),
                            duration: 250,
                            ease: 'Back.In',
                            onComplete: () => cell.sprite.destroy()
                        });
                    }
                }, index * 40);
            });
        }

        // Calculate and add score (5 points per destroyed block)
        const hammerScore = totalDestroyed * 5;
        if (hammerScore > 0) {
            score += hammerScore;
            if (domScoreValue) {
                domScoreValue.textContent = String(score);
            }
            updateHighScore();
            GameJuice.pulseScore();

            // Show floating score
            GameJuice.showFloatingText(`+${hammerScore}`, centerWorldX, centerWorldY - 30,
                totalDestroyed >= 5 ? 'combo' : 'normal');
        }

        // Check for line clears after destruction (with delay for visual effect)
        setTimeout(() => {
            const linesCleared = checkAndClearLines();
            if (linesCleared > 0) {
                // Bonus message for creating lines with hammer
                setTimeout(() => {
                    showComboMessage('HAMMER CLEAR!');
                }, 200);
            }
            checkGameOver();
        }, destroyedCells.length * 40 + 300);

        return totalDestroyed;
    };

    this.input.on('pointerdown', (pointer) => {
        SoundManager.resume();
        if (!deleteMode || isGameOver) {
            return;
        }

        const gridX = Math.floor((pointer.x - startX) / cellSize);
        const gridY = Math.floor((pointer.y - startY) / cellSize);

        // Check if click is within grid bounds
        if (gridX < 0 || gridX >= gridSize || gridY < 0 || gridY >= gridSize) {
            return;
        }

        // Check if there's at least one block in the 3x3 area
        let hasBlocks = false;
        for (let dy = -1; dy <= 1 && !hasBlocks; dy++) {
            for (let dx = -1; dx <= 1 && !hasBlocks; dx++) {
                const tx = gridX + dx;
                const ty = gridY + dy;
                if (tx >= 0 && tx < gridSize && ty >= 0 && ty < gridSize && grid[ty][tx]) {
                    hasBlocks = true;
                }
            }
        }

        if (!hasBlocks) {
            // No blocks in 3x3 area - don't consume hammer
            return;
        }

        // Apply 3x3 hammer destruction
        applyHammerEffect(gridX, gridY);

        // Reset combo streak (hammer doesn't contribute to combo)
        comboStreak = 0;

        // Consume hammer - deactivate after use
        setDeleteMode(false);
    });

    this.input.on('dragend', (pointer, gameObject) => {
        if (isGameOver || deleteMode) {
            return;
        }
        const placements = tryPlaceShape(gameObject);

        if (!placements) {
            this.tweens.add({
                targets: gameObject,
                x: gameObject.getData('homeX'),
                y: gameObject.getData('homeY'),
                duration: 220,
                ease: 'Sine.easeInOut',
                onComplete: () => {
                    gameObject.setAlpha(1);
                    gameObject.setDepth(depth.dock);
                    gameObject.setScale(previewScale);
                }
            });
            return;
        }

        const textureKey = gameObject.getData('textureKey') || blockTextureKeys[0];
        snapAndPlace(gameObject, placements, textureKey);
        SoundManager.play('place');
        checkAndClearLines();

        const index = activeShapes.indexOf(gameObject);
        if (index !== -1) {
            activeShapes.splice(index, 1);
        }
        gameObject.destroy();

        if (activeShapes.length === 0) {
            spawnAllShapes();
        }

        checkGameOver();
    });
}