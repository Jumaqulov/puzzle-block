import { CELL_SIZE } from '../consts';
import { SoundManager } from '../managers/SoundManager';

export class GameJuice {
    private static colorMap: Record<string, string> = {
        'crystal_red': '#FF0055',
        'crystal_blue': '#00D4FF',
        'crystal_green': '#39FF14',
        'crystal_purple': '#BC13FE',
        'crystal_yellow': '#FFD700'
    };

    // Particle pool to avoid excessive DOM creation
    private static particlePool: HTMLDivElement[] = [];
    private static activeParticles: number = 0;
    private static readonly MAX_PARTICLES = 30; // Hard limit

    public static getColor(textureKey: string): string {
        return this.colorMap[textureKey] || '#FFFFFF';
    }

    private static getParticle(): HTMLDivElement | null {
        // Hard limit to prevent lag
        if (this.activeParticles >= this.MAX_PARTICLES) return null;

        let particle: HTMLDivElement;
        if (this.particlePool.length > 0) {
            particle = this.particlePool.pop()!;
        } else {
            particle = document.createElement('div');
            particle.className = 'crystal-particle';
        }
        this.activeParticles++;
        return particle;
    }

    private static releaseParticle(particle: HTMLDivElement): void {
        particle.remove();
        this.activeParticles--;
        if (this.particlePool.length < 20) {
            this.particlePool.push(particle);
        }
    }

    public static createExplosion(x: number, y: number, color: string, particleCount: number = 6): void {
        const container = document.getElementById('game-container');
        if (!container) return;

        const rect = container.getBoundingClientRect();
        const baseX = rect.left + x;
        const baseY = rect.top + y;

        // Limit actual particles created
        const count = Math.min(particleCount, this.MAX_PARTICLES - this.activeParticles, 6);

        for (let i = 0; i < count; i++) {
            const particle = this.getParticle();
            if (!particle) break;

            const angle = (Math.PI * 2 * i / count) + (Math.random() - 0.5) * 0.8;
            const distance = 30 + Math.random() * 40;
            const tx = Math.cos(angle) * distance;
            const ty = Math.sin(angle) * distance - 15;

            particle.style.cssText = `
                left: ${baseX}px;
                top: ${baseY}px;
                background: ${color};
                --tx: ${tx}px;
                --ty: ${ty}px;
                --rot: ${((Math.random() - 0.5) * 200)}deg;
                animation: particleExplode 0.45s ease-out forwards;
            `;

            document.body.appendChild(particle);

            const p = particle;
            setTimeout(() => this.releaseParticle(p), 500);
        }
    }

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

    public static shakeScreen(intensity: 'light' | 'medium' | 'heavy' = 'light'): void {
        const gameShell = document.querySelector('.game-shell') as HTMLElement;
        if (!gameShell) return;

        gameShell.classList.remove('shake-light', 'shake-medium', 'shake-heavy');
        void gameShell.offsetWidth;
        gameShell.classList.add(`shake-${intensity}`);

        const duration = intensity === 'heavy' ? 400 : intensity === 'medium' ? 350 : 300;
        setTimeout(() => gameShell.classList.remove(`shake-${intensity}`), duration);
    }

    public static pulseScore(): void {
        const scoreEl = document.getElementById('score-value');
        if (!scoreEl) return;

        scoreEl.classList.remove('pulse');
        void scoreEl.offsetWidth;
        scoreEl.classList.add('pulse');
        setTimeout(() => scoreEl.classList.remove('pulse'), 400);
    }

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

        // Reduced from 8 to 4 particles per block
        this.createExplosion(worldX, worldY, color, 4);
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

        setTimeout(() => shockwave.remove(), 600);
    }

    public static playHammerSound(): void {
        SoundManager.getInstance().play('hammer');
    }

    public static createStaggeredExplosions(cells: { x: number, y: number, color: string }[], startX: number, startY: number, delayBetween: number = 30): void {
        // Limit to avoid particle spam
        const limited = cells.slice(0, 6);
        limited.forEach((cell, index) => {
            setTimeout(() => {
                const worldX = startX + cell.x * CELL_SIZE + CELL_SIZE / 2;
                const worldY = startY + cell.y * CELL_SIZE + CELL_SIZE / 2;
                this.createExplosion(worldX, worldY, cell.color, 4);
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