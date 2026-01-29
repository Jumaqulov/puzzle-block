import { CELL_SIZE } from '../consts';
import { SoundManager } from '../managers/SoundManager';

export class GameJuice {
    // Texture key -> color mapping
    private static colorMap: Record<string, string> = {
        'crystal_red': '#FF0055',
        'crystal_blue': '#00D4FF',
        'crystal_green': '#39FF14',
        'crystal_purple': '#BC13FE',
        'crystal_yellow': '#FFD700'
    };

    /**
     * Get color hex from texture key
     */
    public static getColor(textureKey: string): string {
        return this.colorMap[textureKey] || '#FFFFFF';
    }

    /**
     * Create particle explosion at coordinates
     */
    public static createExplosion(x: number, y: number, color: string, particleCount: number = 10): void {
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
    }

    /**
     * Show floating text for scores or feedback
     */
    public static showFloatingText(text: string, x: number, y: number, type: 'normal' | 'combo' | 'excellent' = 'normal'): void {
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

        setTimeout(() => floatingText.remove(), 1100);
    }

    /**
     * Shake the screen with varying intensity
     */
    public static shakeScreen(intensity: 'light' | 'medium' | 'heavy' = 'light'): void {
        const gameShell = document.querySelector('.game-shell') as HTMLElement;
        if (!gameShell) return;

        // Remove existing shake classes
        gameShell.classList.remove('shake-light', 'shake-medium', 'shake-heavy');

        // Force reflow
        void gameShell.offsetWidth;

        // Add shake class
        gameShell.classList.add(`shake-${intensity}`);

        const duration = intensity === 'heavy' ? 400 : intensity === 'medium' ? 350 : 300;
        setTimeout(() => {
            gameShell.classList.remove(`shake-${intensity}`);
        }, duration);
    }

    /**
     * Pulse score effect
     */
    public static pulseScore(): void {
        const scoreEl = document.getElementById('score-value');
        if (!scoreEl) return;

        scoreEl.classList.remove('pulse');
        void scoreEl.offsetWidth;
        scoreEl.classList.add('pulse');

        setTimeout(() => scoreEl.classList.remove('pulse'), 400);
    }

    /**
     * Flash line effect using DOM overlay
     */
    public static flashLineDOM(x: number, y: number, width: number, height: number, isHorizontal: boolean = true): void {
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
    }

    public static onBlockClear(sprite: Phaser.GameObjects.Image, gridX: number, gridY: number, startX: number, startY: number): void {
        if (!sprite || !sprite.texture) return;

        const color = this.getColor(sprite.texture.key);
        const worldX = startX + gridX * CELL_SIZE + CELL_SIZE / 2;
        const worldY = startY + gridY * CELL_SIZE + CELL_SIZE / 2;

        this.createExplosion(worldX, worldY, color, 8);
    }

    public static onLineClear(linesCleared: number, comboStreak: number, centerX: number, centerY: number): void {
        const intensity = comboStreak >= 4 ? 'heavy' : comboStreak >= 2 ? 'medium' : 'light';
        this.shakeScreen(intensity);
        this.pulseScore();

        const points = linesCleared * 10 * Math.max(linesCleared, comboStreak);
        const type = comboStreak >= 4 ? 'excellent' : comboStreak >= 2 ? 'combo' : 'normal';

        setTimeout(() => {
            this.showFloatingText(`+${points}`, centerX, centerY, type);
        }, 100);
    }

    // --- Hammer Effects ---

    public static createShockwave(x: number, y: number): void {
        const container = document.getElementById('game-container');
        if (!container) return;

        const rect = container.getBoundingClientRect();

        const shockwave = document.createElement('div');
        shockwave.className = 'hammer-shockwave';
        shockwave.style.left = `${rect.left + x}px`;
        shockwave.style.top = `${rect.top + y}px`;
        document.body.appendChild(shockwave);

        const flash = document.createElement('div');
        flash.className = 'hammer-flash';
        flash.style.cssText = `
            left: ${rect.left + x - 150}px;
            top: ${rect.top + y - 150}px;
            width: 300px;
            height: 300px;
        `;
        document.body.appendChild(flash);

        setTimeout(() => {
            shockwave.remove();
            flash.remove();
        }, 600);
    }

    public static playHammerSound(): void {
        SoundManager.getInstance().play('hammer');
    }

    public static createStaggeredExplosions(cells: { x: number, y: number, color: string }[], startX: number, startY: number, delayBetween: number = 30): void {
        cells.forEach((cell, index) => {
            setTimeout(() => {
                const worldX = startX + cell.x * CELL_SIZE + CELL_SIZE / 2;
                const worldY = startY + cell.y * CELL_SIZE + CELL_SIZE / 2;
                this.createExplosion(worldX, worldY, cell.color, 10);
            }, index * delayBetween);
        });
    }

    public static showHammerScore(blocksDestroyed: number, x: number, y: number): number {
        const points = blocksDestroyed * 5;
        if (points > 0) {
            setTimeout(() => {
                this.showFloatingText(`+${points}`, x, y, blocksDestroyed >= 5 ? 'combo' : 'normal');
            }, 200);
        }
        return points;
    }
}
