import { CELL_SIZE, BLOCK_TEXTURES, GAME_CONFIG } from '../consts';
import { LocalizationManager } from '../managers/LocalizationManager';
import { SoundManager } from '../managers/SoundManager';
import { YandexManager } from '../managers/YandexManager';

export class BootScene extends Phaser.Scene {
    constructor() {
        super('BootScene');
    }

    preload() {
        // Preload simple assets if any
        // Audio is loaded via SoundManager/DOM, but we could load sprites here

        // Load fonts or other external assets
        // For this refactor, we are mostly procedural
    }

    create() {
        // Generate textures
        this.createBlockTextures();
        this.createBackgroundTexture();
        this.createDockGlowTexture();
        this.createCellBgTexture();

        // Initialize Managers
        LocalizationManager.getInstance().init();
        SoundManager.getInstance().init();

        // Fake progress bar
        const splashBar = document.getElementById('splash-bar');
        const splashPercent = document.getElementById('splash-percent');
        let progress = 0;
        const progressInterval = setInterval(() => {
            progress += 5;
            if (progress > 90) progress = 90;
            if (splashBar) splashBar.style.width = `${progress}%`;
            if (splashPercent) splashPercent.textContent = `${progress}%`;
        }, 50);

        const startGame = () => {
            clearInterval(progressInterval);
            if (splashBar) splashBar.style.width = '100%';
            if (splashPercent) splashPercent.textContent = '100%';
            this.scene.start('GameScene');
        };

        // Check for Yandex Data with timeout
        let gameStarted = false;

        const safeStart = () => {
            if (gameStarted) return;
            gameStarted = true;
            startGame();
        }

        YandexManager.getInstance().loadGameData()
            .then(() => {
                console.log('Game Data Loaded');
                safeStart();
            })
            .catch((e) => {
                console.error('Game Data Load Failed', e);
                safeStart();
            });

        // Safety timeout (3 seconds)
        this.time.delayedCall(3000, () => {
            if (!gameStarted) {
                console.warn('Game Load Timeout - Forcing Start');
                safeStart();
            }
        });
    }

    private createBlockTextures() {
        const drawRoundedRect = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) => {
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

        const createTexture = (key: string, fill: string, stroke: string) => {
            if (this.textures.exists(key)) return;

            const canvas = this.textures.createCanvas(key, CELL_SIZE, CELL_SIZE);
            if (!canvas) return;

            const ctx = canvas.getContext();
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
            createTexture(texture.key, texture.fill, texture.stroke);
        });
    }

    private createBackgroundTexture() {
        if (this.textures.exists('background')) return;

        const bgCanvas = this.textures.createCanvas('background', GAME_CONFIG.width, GAME_CONFIG.height);
        if (!bgCanvas) return;

        const ctx = bgCanvas.getContext();
        const gradient = ctx.createLinearGradient(0, 0, 0, GAME_CONFIG.height);
        gradient.addColorStop(0, '#0F051D');
        gradient.addColorStop(1, '#1A0C2E');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, GAME_CONFIG.width, GAME_CONFIG.height);

        const glow = ctx.createRadialGradient(90, 100, 20, 90, 100, 260);
        glow.addColorStop(0, 'rgba(188, 19, 254, 0.22)');
        glow.addColorStop(1, 'rgba(188, 19, 254, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, GAME_CONFIG.width, GAME_CONFIG.height);
        bgCanvas.refresh();
    }

    private createDockGlowTexture() {
        if (this.textures.exists('dock_glow')) return;

        const dockGlowWidth = Math.min(GAME_CONFIG.width - 40, 410); // Safe approximate width
        const dockGlowHeight = Math.max(18, Math.round(CELL_SIZE * 0.5));

        const dockCanvas = this.textures.createCanvas('dock_glow', dockGlowWidth, dockGlowHeight);
        if (!dockCanvas) return;

        const ctx = dockCanvas.getContext();
        const grad = ctx.createLinearGradient(0, 0, dockGlowWidth, 0);
        grad.addColorStop(0, 'rgba(188, 19, 254, 0)');
        grad.addColorStop(0.5, 'rgba(188, 19, 254, 0.35)');
        grad.addColorStop(1, 'rgba(188, 19, 254, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, dockGlowWidth, dockGlowHeight);
        dockCanvas.refresh();
    }

    private createCellBgTexture() {
        if (this.textures.exists('cell_bg')) return;

        const cellCanvas = this.textures.createCanvas('cell_bg', CELL_SIZE, CELL_SIZE);
        if (!cellCanvas) return;

        const ctx = cellCanvas.getContext();
        const center = CELL_SIZE / 2;
        const grad = ctx.createRadialGradient(center, center, 2, center, center, center);
        grad.addColorStop(0, 'rgba(61, 28, 113, 0.15)');
        grad.addColorStop(0.7, 'rgba(15, 5, 29, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, CELL_SIZE, CELL_SIZE);
        cellCanvas.refresh();
    }
}
