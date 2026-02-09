import { CELL_SIZE, SHAPE_DEFS, BLOCK_TEXTURES, GAME_CONFIG } from '../consts';
import { GameJuice } from '../utils/GameJuice';
import { SoundManager } from '../managers/SoundManager';
import { YandexManager } from '../managers/YandexManager';
import { LocalizationManager } from '../managers/LocalizationManager';
import { EventBus, GameEvents } from '../utils/EventBus';

export class GameScene extends Phaser.Scene {
    private grid: (Phaser.GameObjects.Sprite | null)[][] = [];
    private activeShapes: Phaser.GameObjects.Container[] = [];
    private score: number = 0;
    private highScore: number = 0;
    private isGameOver: boolean = false;
    private deleteMode: boolean = false;
    private comboStreak: number = 0;
    private ghostSprites: Phaser.GameObjects.Sprite[] = [];

    // Object Pooling
    private blockPool: Phaser.GameObjects.Group | null = null;

    // DOM Elements references
    private domScoreValue: HTMLElement | null = null;
    private domHighValue: HTMLElement | null = null;
    private domHighLabel: HTMLElement | null = null;
    private domModal: HTMLElement | null = null;
    private domHammer: HTMLElement | null = null;

    // Dragging state
    private draggedContainer: Phaser.GameObjects.Container | null = null;
    private hammerTimeout: ReturnType<typeof setTimeout> | null = null;

    private startX: number = 0;
    private startY: number = 0;
    private dockTopY: number = 0;
    private shapeRowY: number = 0;
    private availableDockWidth: number = 0;

    constructor() {
        super('GameScene');
    }

    create() {
        // Hide Splash Screen
        const splash = document.getElementById('splash');
        if (splash) {
            splash.classList.remove('is-visible');
            splash.classList.add('is-hidden');
        }

        // Background
        this.add.image(0, 0, 'background').setOrigin(0, 0);

        // Initialize DOM refs
        this.initDOM();

        // Object Pooling Init
        this.blockPool = this.add.group({
            classType: Phaser.GameObjects.Sprite,
            maxSize: 128, // Reasonable limit for 8x8 grid + dock
            runChildUpdate: false
        });

        // Pre-calculate shape bounds if not already done
        this.calculateShapeBounds();

        // Calculate layout
        const gridWidth = GAME_CONFIG.gridSize * CELL_SIZE;
        const gridHeight = GAME_CONFIG.gridSize * CELL_SIZE;

        const maxShapeHeight = Math.max(...SHAPE_DEFS.map((def) => ((def.maxY || 0) - (def.minY || 0) + 1) * CELL_SIZE));
        const dockGap = 50;
        const dockPaddingBottom = 20;

        const idealStartY = Math.round((GAME_CONFIG.height - gridHeight) / 2);
        const maxStartY = GAME_CONFIG.height - gridHeight - dockGap - maxShapeHeight - dockPaddingBottom;

        this.startY = Math.max(40, Math.min(idealStartY, maxStartY));
        this.startX = Math.round((GAME_CONFIG.width - gridWidth) / 2);
        this.dockTopY = this.startY + gridHeight + dockGap;
        this.shapeRowY = Math.round(this.dockTopY + maxShapeHeight / 2);
        this.availableDockWidth = GAME_CONFIG.width - GAME_CONFIG.dockPaddingX * 2;

        // Initialize Grid Array
        this.grid = Array.from({ length: GAME_CONFIG.gridSize }, () => Array(GAME_CONFIG.gridSize).fill(null));

        // Draw Board
        this.drawBoard(gridWidth, gridHeight);

        // Input Handlers
        this.setupInput();

        // Powerups & Events
        this.setupEvents();

        // Load High Score
        this.loadHighScore();

        // Spawn Shapes
        this.spawnAllShapes();

        // Tutorial
        this.checkTutorial();
    }

    private calculateShapeBounds() {
        SHAPE_DEFS.forEach(def => {
            if (def.width !== undefined) return;
            const xs = def.blocks.map(b => b[0]);
            const ys = def.blocks.map(b => b[1]);
            def.minX = Math.min(...xs);
            def.maxX = Math.max(...xs);
            def.minY = Math.min(...ys);
            def.maxY = Math.max(...ys);
            def.width = (def.maxX - def.minX + 1) * CELL_SIZE;
            def.height = (def.maxY - def.minY + 1) * CELL_SIZE;
        });
    }

    private initDOM() {
        this.domScoreValue = document.getElementById('score-value');
        this.domHighValue = document.getElementById('high-score-value');
        this.domHighLabel = document.getElementById('high-score-label');
        this.domModal = document.getElementById('gameover');
        this.domHammer = document.getElementById('power-hammer');

        if (this.domHighLabel) this.domHighLabel.classList.remove('record-glow');
        this.updateScoreUI();

        const restartBtn = document.getElementById('restart-btn');
        if (restartBtn) {
            const newBtn = restartBtn.cloneNode(true);
            if (restartBtn.parentNode) restartBtn.parentNode.replaceChild(newBtn, restartBtn);
            newBtn.addEventListener('click', () => this.restartGame());
        }

        const shareBtn = document.getElementById('share-score');
        if (shareBtn) {
            const newBtn = shareBtn.cloneNode(true);
            if (shareBtn.parentNode) shareBtn.parentNode.replaceChild(newBtn, shareBtn);
            (newBtn as HTMLElement).onclick = () => this.shareScore();
        }

        this.initSettings();
    }

    private drawBoard(gridWidth: number, gridHeight: number) {
        const boardGraphics = this.add.graphics();
        boardGraphics.fillStyle(GAME_CONFIG.colors.boardMain, 1);
        boardGraphics.fillRoundedRect(this.startX - 8, this.startY - 8, gridWidth + 16, gridHeight + 16, 14);
        boardGraphics.lineStyle(2, GAME_CONFIG.colors.boardStroke, 1);
        boardGraphics.strokeRoundedRect(this.startX - 8, this.startY - 8, gridWidth + 16, gridHeight + 16, 14);
        boardGraphics.setDepth(GAME_CONFIG.depth.board);

        const gridGlowGraphics = this.add.graphics({ lineStyle: { width: 3, color: GAME_CONFIG.colors.gridGlow, alpha: 0.18 } });
        gridGlowGraphics.setDepth(GAME_CONFIG.depth.gridGlow);
        const gridGraphics = this.add.graphics({ lineStyle: { width: 1, color: GAME_CONFIG.colors.boardStroke, alpha: 0.75 } });
        gridGraphics.setDepth(GAME_CONFIG.depth.grid);

        for (let x = 0; x < GAME_CONFIG.gridSize; x++) {
            for (let y = 0; y < GAME_CONFIG.gridSize; y++) {
                const cell = this.add.image(
                    this.startX + x * CELL_SIZE + CELL_SIZE / 2,
                    this.startY + y * CELL_SIZE + CELL_SIZE / 2,
                    'cell_bg'
                );
                cell.setDepth(GAME_CONFIG.depth.gridFill);
                cell.setInteractive();
                // Removed redundant click handler as it was empty

                gridGlowGraphics.strokeRect(this.startX + x * CELL_SIZE, this.startY + y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
                gridGraphics.strokeRect(this.startX + x * CELL_SIZE, this.startY + y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
            }
        }
    }

    private setupInput() {
        // Global Hammer Handler (Reliability Fix)
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (!this.deleteMode) return;

            // Calculate grid coordinates mathematically
            const xRel = pointer.x - this.startX;
            const yRel = pointer.y - this.startY;

            const gx = Math.floor(xRel / CELL_SIZE);
            const gy = Math.floor(yRel / CELL_SIZE);

            // Valid grid check
            if (gx >= 0 && gx < GAME_CONFIG.gridSize && gy >= 0 && gy < GAME_CONFIG.gridSize) {
                // 3x3 Area Clear on ANY valid grid click
                this.handleHammerClick(gx, gy);
            } else {
                // Clicked outside grid — cancel hammer mode
                this.setDeleteMode(false);
                this.updateShapeVisuals();
            }
        });

        this.input.on('gameobjectdown', (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject) => {
            if (this.isGameOver) return;

            // If hammer is active, block all dragging
            if (this.deleteMode) return;

            const container = gameObject.getData('parentContainer') as Phaser.GameObjects.Container;
            if (!container || !this.activeShapes.includes(container)) return;

            SoundManager.getInstance().resume();
            SoundManager.getInstance().play('drag');

            this.draggedContainer = container;
            this.draggedContainer.setDepth(GAME_CONFIG.depth.dragging); // depth: 100

            // 🐛 Bug 1 Fix: Visual feedback (pop/tint/alpha)
            this.tweens.add({
                targets: this.draggedContainer,
                scaleX: 1.1,
                scaleY: 1.1,
                alpha: 0.8,
                duration: 100,
                ease: 'Back.easeOut'
            });

            // 🐛 Bug 1 Fix: Visual feedback (pop/tint/alpha)
            // Removed tint as per user request

            // 🐛 Bug 1 Fix: Initial hammer cursor position if active (fallback)
            if (this.deleteMode) {
                const hammer = document.getElementById('hammer-cursor');
                if (hammer) {
                    hammer.style.left = `${_pointer.x}px`;
                    hammer.style.top = `${_pointer.y}px`;
                }
            }

            // Initial position with offset to keep visible above finger
            const initialYOffset = -20;
            this.draggedContainer.setPosition(_pointer.x, _pointer.y + initialYOffset);
        });

        this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            // 🐛 Bug 1 Fix: Custom Hammer Cursor Follow
            if (this.deleteMode) {
                this.updateHammerPosition(pointer.x, pointer.y, true);
            }

            if (!this.draggedContainer) return;

            // 🐛 Bug 2 Fix: Refined offset positioning so shape is always visible above finger
            const dragYOffset = -20;
            this.draggedContainer.setPosition(pointer.x, pointer.y + dragYOffset);

            const placements = this.tryPlaceShape(this.draggedContainer);
            this.updateGhost(placements, this.draggedContainer.getData('textureKey'));

            if (placements) {
                this.draggedContainer.setAlpha(1.0);
                this.draggedContainer.list.forEach((child) => {
                    if (child instanceof Phaser.GameObjects.Sprite) child.clearTint();
                });
            } else {
                this.draggedContainer.setAlpha(0.65);
                this.draggedContainer.list.forEach((child) => {
                    if (child instanceof Phaser.GameObjects.Sprite) child.clearTint();
                });
            }
        });

        this.input.on('pointerup', () => {
            this.clearGhost(); // Always clear ghost on release

            if (!this.draggedContainer || this.isGameOver) {
                this.draggedContainer = null;
                return;
            }

            const container = this.draggedContainer;
            this.draggedContainer = null;

            const placements = this.tryPlaceShape(container);

            if (!placements) {
                this.tweens.add({
                    targets: container,
                    x: container.getData('homeX'),
                    y: container.getData('homeY'),
                    scaleX: GAME_CONFIG.dockScale,
                    scaleY: GAME_CONFIG.dockScale,
                    alpha: 1,
                    duration: 220,
                    ease: 'Sine.easeInOut',
                    onComplete: () => {
                        container.setDepth(GAME_CONFIG.depth.dock);
                        this.updateShapeVisuals();
                    }
                });
                return;
            }

            const textureKey = container.getData('textureKey') || BLOCK_TEXTURES[0].key;
            this.snapAndPlace(placements, textureKey);

            const placementScore = placements.length * GAME_CONFIG.pointsPerBlock;
            this.score += placementScore;
            this.updateScoreUI();

            GameJuice.showFloatingText(`+${placementScore}`, container.x, container.y, 'normal');
            SoundManager.getInstance().play('place');

            this.checkAndClearLines();

            const index = this.activeShapes.indexOf(container);
            if (index !== -1) this.activeShapes.splice(index, 1);

            // Release blocks back to pool efficiently
            const blocksToRelease = container.list.filter(c => c instanceof Phaser.GameObjects.Sprite) as Phaser.GameObjects.Sprite[];
            blocksToRelease.forEach(block => {
                this.blockPool?.killAndHide(block);
                this.add.existing(block); // Re-add to scene display list from container
            });
            container.removeAll(false); // Do NOT destroy the children, we want to reuse them
            container.destroy();

            if (this.activeShapes.length === 0) this.spawnAllShapes();
            this.checkGameOver();
        });
    }

    private setupEvents() {
        EventBus.on(GameEvents.ACTIVATE_HAMMER, this.enableHammerMode, this);
        EventBus.on(GameEvents.ACTIVATE_SHUFFLE, this.performShuffle, this);

        const hammerBtn = document.getElementById('power-hammer');
        const shuffleBtn = document.getElementById('power-shuffle');

        if (hammerBtn) hammerBtn.onclick = () => this.activateHammer();
        if (shuffleBtn) shuffleBtn.onclick = () => this.activateShuffle();
    }

    private tryPlaceShape(container: Phaser.GameObjects.Container): { gridX: number, gridY: number }[] | null {
        const blocks = container.list.filter(child => child instanceof Phaser.GameObjects.Sprite) as Phaser.GameObjects.Sprite[];
        if (blocks.length === 0) return null;

        const placements: { gridX: number, gridY: number }[] = [];
        for (const block of blocks) {
            const worldX = container.x + block.x;
            const worldY = container.y + block.y;
            const gridX = Math.round((worldX - this.startX - CELL_SIZE / 2) / CELL_SIZE);
            const gridY = Math.round((worldY - this.startY - CELL_SIZE / 2) / CELL_SIZE);

            if (gridX < 0 || gridX >= GAME_CONFIG.gridSize || gridY < 0 || gridY >= GAME_CONFIG.gridSize) return null;
            if (this.grid[gridY][gridX]) return null;
            placements.push({ gridX, gridY });
        }
        return placements;
    }

    private snapAndPlace(placements: any[], textureKey: string) {
        placements.forEach((p) => {
            const px = this.startX + p.gridX * CELL_SIZE + CELL_SIZE / 2;
            const py = this.startY + p.gridY * CELL_SIZE + CELL_SIZE / 2;

            // Get from pool
            let sprite = this.blockPool?.get(px, py, textureKey) as Phaser.GameObjects.Sprite;
            if (!sprite) {
                sprite = this.add.sprite(px, py, textureKey);
                this.blockPool?.add(sprite);
            }

            sprite.setTexture(textureKey); // Explicitly set texture to avoid pool mixups
            sprite.clearTint(); // Clear any drag/canFit tints
            sprite.setAlpha(1); // Reset alpha from potential greying/ghosting
            sprite.setActive(true).setVisible(true).setDepth(GAME_CONFIG.depth.placed);
            sprite.setInteractive();
            sprite.removeAllListeners('pointerdown');

            // Store coordinates for Hammer tool
            sprite.setData('gridX', p.gridX);
            sprite.setData('gridY', p.gridY);

            this.grid[p.gridY][p.gridX] = sprite;
        });
    }

    private checkAndClearLines() {
        const rowsToClear: number[] = [];
        const colsToClear: number[] = [];

        for (let y = 0; y < GAME_CONFIG.gridSize; y++) {
            if (this.grid[y].every(cell => cell !== null)) rowsToClear.push(y);
        }
        for (let x = 0; x < GAME_CONFIG.gridSize; x++) {
            let full = true;
            for (let y = 0; y < GAME_CONFIG.gridSize; y++) {
                if (!this.grid[y][x]) { full = false; break; }
            }
            if (full) colsToClear.push(x);
        }

        if (rowsToClear.length === 0 && colsToClear.length === 0) {
            this.comboStreak = 0;
            this.updateShapeVisuals(); // CRITICAL: Update visuals even if no lines cleared
            return;
        }

        const spritesToDestroy = new Set<Phaser.GameObjects.Sprite>();
        rowsToClear.forEach(y => {
            for (let x = 0; x < GAME_CONFIG.gridSize; x++) {
                if (this.grid[y][x]) {
                    spritesToDestroy.add(this.grid[y][x]!);
                    this.grid[y][x] = null;
                }
            }
        });
        colsToClear.forEach(x => {
            for (let y = 0; y < GAME_CONFIG.gridSize; y++) {
                if (this.grid[y][x]) {
                    spritesToDestroy.add(this.grid[y][x]!);
                    this.grid[y][x] = null;
                }
            }
        });

        // VFX
        rowsToClear.forEach(row => {
            const y = this.startY + row * CELL_SIZE + CELL_SIZE / 2;
            GameJuice.flashLineDOM(this.startX + (GAME_CONFIG.gridSize * CELL_SIZE) / 2, y, GAME_CONFIG.gridSize * CELL_SIZE, CELL_SIZE, true);
        });
        colsToClear.forEach(col => {
            const x = this.startX + col * CELL_SIZE + CELL_SIZE / 2;
            GameJuice.flashLineDOM(x, this.startY + (GAME_CONFIG.gridSize * CELL_SIZE) / 2, CELL_SIZE, GAME_CONFIG.gridSize * CELL_SIZE, false);
        });

        spritesToDestroy.forEach(sprite => {
            const gx = Math.round((sprite.x - this.startX - CELL_SIZE / 2) / CELL_SIZE);
            const gy = Math.round((sprite.y - this.startY - CELL_SIZE / 2) / CELL_SIZE);
            GameJuice.onBlockClear(sprite, gx, gy, this.startX, this.startY);
            this.blockPool?.killAndHide(sprite);
        });

        const clearedLines = rowsToClear.length + colsToClear.length;
        this.comboStreak++;

        let multiLineMultiplier = 1;
        if (clearedLines === 2) multiLineMultiplier = 1.5;
        else if (clearedLines === 3) multiLineMultiplier = 2.0;
        else if (clearedLines >= 4) multiLineMultiplier = 3.0;

        const streakMultiplier = 1 + ((this.comboStreak - 1) * 0.5);
        let earnedPoints = Math.round((clearedLines * GAME_CONFIG.basePointsPerLine * multiLineMultiplier) * streakMultiplier);
        if (clearedLines >= 3) earnedPoints += GAME_CONFIG.jackpotBonus;

        this.score += earnedPoints;
        this.updateScoreUI();
        this.updateHighScore();
        SoundManager.getInstance().play('clear');

        GameJuice.onLineClear(clearedLines, this.comboStreak, this.startX + (GAME_CONFIG.gridSize * CELL_SIZE) / 2, this.startY + (GAME_CONFIG.gridSize * CELL_SIZE) / 2);
        this.updateShapeVisuals();
    }

    private spawnAllShapes() {
        const defs = [
            Phaser.Utils.Array.GetRandom(SHAPE_DEFS),
            Phaser.Utils.Array.GetRandom(SHAPE_DEFS),
            Phaser.Utils.Array.GetRandom(SHAPE_DEFS)
        ];

        const totalWidth = defs.reduce((sum, d) => sum + (d.width || 0) * GAME_CONFIG.dockScale, 0) + GAME_CONFIG.slotGap * 2;
        let cursorX = GAME_CONFIG.dockPaddingX + Math.max(0, this.availableDockWidth - totalWidth) / 2;

        defs.forEach((def) => {
            const scaledWidth = (def.width || 0) * GAME_CONFIG.dockScale;
            cursorX += scaledWidth / 2;
            this.createShape(def, cursorX, this.shapeRowY);
            cursorX += scaledWidth / 2 + GAME_CONFIG.slotGap;
        });

        this.updateShapeVisuals();
    }

    private createShape(def: any, x: number, y: number) {
        const textureKey = Phaser.Utils.Array.GetRandom(BLOCK_TEXTURES).key;
        const offsetX = -(def.width || 0) / 2 + CELL_SIZE / 2;
        const offsetY = -(def.height || 0) / 2 + CELL_SIZE / 2;

        const container = this.add.container(x, y);
        container.setData({ homeX: x, homeY: y, shapeBlocks: def.blocks, textureKey: textureKey });
        container.setDepth(GAME_CONFIG.depth.dock).setScale(GAME_CONFIG.dockScale);

        def.blocks.forEach(([bx, by]: number[]) => {
            const bxPos = (bx - (def.minX || 0)) * CELL_SIZE + offsetX;
            const byPos = (by - (def.minY || 0)) * CELL_SIZE + offsetY;

            let block = this.blockPool?.get(bxPos, byPos, textureKey) as Phaser.GameObjects.Sprite;
            if (!block) {
                block = this.add.sprite(bxPos, byPos, textureKey);
                this.blockPool?.add(block);
            }
            block.setTexture(textureKey); // Explicitly set texture
            block.clearTint(); // Clear any previous tints
            block.setActive(true).setVisible(true);
            block.setData('parentContainer', container);

            // 🐛 Bug 2 Fix: Clear old grid data from pooled block
            block.setData('gridX', undefined);
            block.setData('gridY', undefined);

            block.setInteractive({ useHandCursor: !this.deleteMode });
            container.add(block);
        });

        this.activeShapes.push(container);
    }

    private checkGameOver() {
        if (this.isGameOver) return;
        const stillActive = this.activeShapes.filter(s => s && s.active);
        if (stillActive.length === 0) return;

        const canFit = stillActive.some(s => this.canPlaceBlocksAnywhere(s.getData('shapeBlocks')));
        if (!canFit) {
            this.isGameOver = true;
            this.setDeleteMode(false);
            SoundManager.getInstance().play('gameover');
            YandexManager.getInstance().onGameOver(this.score, this.highScore);
            if (this.domModal) this.domModal.classList.add('is-visible');
        }
    }

    private canPlaceBlocksAnywhere(blocks: number[][]): boolean {
        for (let bx = 0; bx < GAME_CONFIG.gridSize; bx++) {
            for (let by = 0; by < GAME_CONFIG.gridSize; by++) {
                let fits = true;
                for (const [ox, oy] of blocks) {
                    const gx = bx + ox;
                    const gy = by + oy;
                    if (gx < 0 || gx >= GAME_CONFIG.gridSize || gy < 0 || gy >= GAME_CONFIG.gridSize || this.grid[gy][gx]) {
                        fits = false; break;
                    }
                }
                if (fits) return true;
            }
        }
        return false;
    }

    private updateShapeVisuals() {
        this.activeShapes.forEach(s => {
            const canFit = this.canPlaceBlocksAnywhere(s.getData('shapeBlocks'));
            s.list.forEach(child => {
                if (child instanceof Phaser.GameObjects.Sprite) {
                    canFit ? child.clearTint() : child.setTint(0x888888);
                }
            });
            s.setAlpha(canFit ? 1 : 0.5);
        });
    }

    private activateHammer() {
        if (this.isGameOver) return;
        if (this.deleteMode) { this.setDeleteMode(false); return; }

        // Check if grid has any blocks to hammer
        let hasBlocks = false;
        for (let y = 0; y < GAME_CONFIG.gridSize; y++) {
            for (let x = 0; x < GAME_CONFIG.gridSize; x++) {
                if (this.grid[y][x]) {
                    hasBlocks = true;
                    break;
                }
            }
            if (hasBlocks) break;
        }

        if (!hasBlocks) {
            const i18n = LocalizationManager.getInstance();
            GameJuice.showFloatingText(
                i18n.t('no_blocks'),
                this.startX + (GAME_CONFIG.gridSize * CELL_SIZE) / 2,
                this.startY + (GAME_CONFIG.gridSize * CELL_SIZE) / 2,
                'normal'
            );
            return;
        }

        YandexManager.getInstance().showRewardAd('hammer');
    }

    private activateShuffle() {
        if (this.isGameOver) return;
        YandexManager.getInstance().showRewardAd('shuffle');
    }

    private enableHammerMode() { this.setDeleteMode(true); }

    private performShuffle() {
        this.activeShapes.forEach(s => {
            s.list.forEach(child => {
                if (child instanceof Phaser.GameObjects.Sprite) this.blockPool?.killAndHide(child);
            });
            s.destroy();
        });
        this.activeShapes = [];
        this.spawnAllShapes();
        SoundManager.getInstance().play('shuffle');
    }

    private setDeleteMode(enabled: boolean) {
        this.deleteMode = enabled;
        // Visual indicator in UI
        document.body.classList.toggle('delete-mode', enabled);
        if (this.domHammer) this.domHammer.classList.toggle('powerup--active', enabled);

        // Clear any existing hammer timeout
        if (this.hammerTimeout) {
            clearTimeout(this.hammerTimeout);
            this.hammerTimeout = null;
        }

        // Change cursor to hammer/crosshair
        if (enabled) {
            this.input.setDefaultCursor('none');
            // 🚀 Fix: Disable hand cursor on all interactive blocks to prevent browser override
            this.setAllBlocksHandCursor(false);
            // Initial state is hidden until mouse moves into canvas
            this.updateHammerPosition(this.input.activePointer.x, this.input.activePointer.y, false);

            // Auto-cancel hammer mode after 10 seconds
            this.hammerTimeout = setTimeout(() => {
                if (this.deleteMode) {
                    this.setDeleteMode(false);
                    this.updateShapeVisuals();
                }
            }, 10000);
        } else {
            this.input.setDefaultCursor('default');
            this.setAllBlocksHandCursor(true);
            this.updateHammerPosition(0, 0, false); // Hide on disable
        }
    }

    private setAllBlocksHandCursor(enabled: boolean) {
        // Clear hand cursor for grid
        this.grid.flat().forEach(sprite => {
            if (sprite) {
                if (sprite.input) sprite.input.cursor = enabled ? 'pointer' : 'none';
            }
        });
        // Clear hand cursor for dock
        this.activeShapes.forEach(container => {
            container.list.forEach(child => {
                if (child instanceof Phaser.GameObjects.Sprite && child.input) {
                    child.input.cursor = enabled ? 'pointer' : 'none';
                }
            });
        });
    }

    private updateHammerPosition(x: number, y: number, visible: boolean) {
        const hammer = document.getElementById('hammer-cursor');
        if (!hammer) return;

        if (!visible) {
            hammer.classList.remove('is-visible');
            return;
        }

        const container = document.getElementById('game-container');
        if (container) {
            const rect = container.getBoundingClientRect();

            // Tighten container check to avoid "floating" over sidebar
            // If pointer is far outside, hide it
            if (x < -10 || x > GAME_CONFIG.width + 10 || y < -10 || y > GAME_CONFIG.height + 10) {
                hammer.classList.remove('is-visible');
                return;
            }

            hammer.classList.add('is-visible');
            requestAnimationFrame(() => {
                hammer.style.left = `${rect.left + x}px`;
                hammer.style.top = `${rect.top + y}px`;
            });
        }
    }


    private handleHammerClick(gridX: number, gridY: number) {
        if (!this.deleteMode) return;

        const centerX = this.startX + gridX * CELL_SIZE + CELL_SIZE / 2;
        const centerY = this.startY + gridY * CELL_SIZE + CELL_SIZE / 2;

        GameJuice.createShockwave(centerX, centerY);
        GameJuice.playHammerSound();
        GameJuice.createExplosion(centerX, centerY, '#FFD700', 20); // Gold explosion for impact

        let destroyedCount = 0;
        const range = [-1, 0, 1];

        range.forEach(dy => {
            range.forEach(dx => {
                const nx = gridX + dx;
                const ny = gridY + dy;

                if (nx >= 0 && nx < GAME_CONFIG.gridSize && ny >= 0 && ny < GAME_CONFIG.gridSize) {
                    const target = this.grid[ny][nx];
                    if (target) {
                        GameJuice.createExplosion(target.x, target.y, '#FF0055', 8);
                        this.blockPool?.killAndHide(target);
                        this.grid[ny][nx] = null;
                        destroyedCount++;
                    }
                }
            });
        });

        if (destroyedCount > 0) {
            const pts = GameJuice.showHammerScore(destroyedCount, centerX, centerY);
            this.score += pts;
            this.updateScoreUI();
        }

        this.setDeleteMode(false);
        this.updateShapeVisuals();
    }

    private updateScoreUI() {
        if (this.domScoreValue) this.domScoreValue.textContent = String(this.score);
    }

    private loadHighScore() {
        EventBus.on(GameEvents.GAME_DATA_LOADED, (data: any) => {
            if (data && data.highScore > this.highScore) {
                this.highScore = data.highScore;
                this.updateHighScoreUI();
            }
        });
    }

    private updateHighScore() {
        if (this.score > this.highScore) {
            this.highScore = this.score;
            this.updateHighScoreUI();
            if (this.domHighLabel) this.domHighLabel.classList.add('record-glow');
            GameJuice.showFloatingText(LocalizationManager.getInstance().t('new_record'), this.startX + (GAME_CONFIG.gridSize * CELL_SIZE) / 2, this.startY + (GAME_CONFIG.gridSize * CELL_SIZE) / 2, 'excellent');
        }
    }

    private updateHighScoreUI() {
        if (this.domHighValue) this.domHighValue.textContent = String(this.highScore);
    }

    private restartGame() {
        if (this.domModal) this.domModal.classList.remove('is-visible');

        // 1. Restart immediately — don't wait for ad
        for (let y = 0; y < GAME_CONFIG.gridSize; y++) {
            for (let x = 0; x < GAME_CONFIG.gridSize; x++) {
                if (this.grid[y][x]) {
                    this.blockPool?.killAndHide(this.grid[y][x]!);
                    this.grid[y][x] = null;
                }
            }
        }
        this.activeShapes.forEach(s => {
            s.list.forEach(c => { if (c instanceof Phaser.GameObjects.Sprite) this.blockPool?.killAndHide(c); });
            s.destroy();
        });
        this.activeShapes = [];
        this.score = 0;
        this.isGameOver = false;
        this.comboStreak = 0;
        this.draggedContainer = null;
        this.setDeleteMode(false);
        this.clearGhost();
        this.updateScoreUI();
        if (this.domHighLabel) this.domHighLabel.classList.remove('record-glow');

        // 2. Spawn new shapes
        this.spawnAllShapes();

        // 3. Show interstitial ad (game already works in background)
        YandexManager.getInstance().showInterstitialAd().catch(() => { });
    }

    private initSettings() {
        const sound = SoundManager.getInstance();
        const settingsModal = document.getElementById('settings-modal');
        const howtoModal = document.getElementById('howtoplay-modal');
        const resetModal = document.getElementById('reset-modal');

        // Settings button
        const settingsBtn = document.getElementById('settings-btn');
        if (settingsBtn) {
            settingsBtn.onclick = () => {
                if (settingsModal) settingsModal.classList.add('is-visible');
                this.syncSettingsUI();
            };
        }

        // Close buttons & overlays
        const closeModal = (modal: HTMLElement | null) => {
            if (modal) modal.classList.remove('is-visible');
        };

        document.getElementById('settings-close')?.addEventListener('click', () => closeModal(settingsModal));
        document.getElementById('settings-overlay')?.addEventListener('click', () => closeModal(settingsModal));
        document.getElementById('howtoplay-close')?.addEventListener('click', () => closeModal(howtoModal));
        document.getElementById('howtoplay-overlay')?.addEventListener('click', () => closeModal(howtoModal));
        document.getElementById('reset-overlay')?.addEventListener('click', () => closeModal(resetModal));

        // Sound toggle
        const toggleSound = document.getElementById('toggle-sound') as HTMLInputElement;
        if (toggleSound) {
            toggleSound.addEventListener('change', () => {
                sound.setMuted(!toggleSound.checked);
                this.updateSoundIcon(!toggleSound.checked);
            });
        }

        // Vibration toggle
        const toggleVibration = document.getElementById('toggle-vibration') as HTMLInputElement;
        if (toggleVibration) {
            toggleVibration.addEventListener('change', () => {
                sound.setVibrationEnabled(toggleVibration.checked);
                if (toggleVibration.checked) sound.vibrate(20);
            });
        }

        // How to Play
        document.getElementById('btn-how-to-play')?.addEventListener('click', () => {
            closeModal(settingsModal);
            if (howtoModal) howtoModal.classList.add('is-visible');
        });

        // Reset Progress
        document.getElementById('btn-reset-progress')?.addEventListener('click', () => {
            closeModal(settingsModal);
            if (resetModal) resetModal.classList.add('is-visible');
        });

        document.getElementById('reset-cancel')?.addEventListener('click', () => {
            closeModal(resetModal);
        });

        document.getElementById('reset-confirm')?.addEventListener('click', () => {
            closeModal(resetModal);
            this.resetProgress();
        });

        // Initial sync
        this.syncSettingsUI();
    }

    private syncSettingsUI() {
        const sound = SoundManager.getInstance();
        const toggleSound = document.getElementById('toggle-sound') as HTMLInputElement;
        const toggleVibration = document.getElementById('toggle-vibration') as HTMLInputElement;

        if (toggleSound) toggleSound.checked = !sound.isMuted();
        if (toggleVibration) toggleVibration.checked = sound.isVibrationEnabled();
        this.updateSoundIcon(sound.isMuted());
    }

    private updateSoundIcon(muted: boolean) {
        const icon = document.getElementById('sound-icon');
        if (icon) {
            icon.className = muted
                ? 'ph ph-speaker-slash settings-row__icon'
                : 'ph ph-speaker-high settings-row__icon';
        }
    }

    private resetProgress() {
        const i18n = LocalizationManager.getInstance();

        // Reset scores
        this.highScore = 0;
        this.score = 0;
        this.updateScoreUI();
        this.updateHighScoreUI();

        // Clear saved data
        YandexManager.getInstance().clearGameData();

        // Visual feedback
        GameJuice.showFloatingText(
            i18n.t('reset_success'),
            this.startX + (GAME_CONFIG.gridSize * CELL_SIZE) / 2,
            this.startY + (GAME_CONFIG.gridSize * CELL_SIZE) / 2,
            'normal'
        );
    }

    private shareScore() {
        const modal = document.getElementById('share-modal');
        if (!modal) return;

        const i18n = LocalizationManager.getInstance();
        const scoreEl = document.getElementById('share-modal-score');
        const msgEl = document.getElementById('share-modal-message');
        const shareText = i18n.t('share_message').replace('{score}', String(this.score));
        const shareTitle = i18n.t('share_title');
        const gameUrl = window.location.href;

        if (scoreEl) scoreEl.textContent = String(this.score);
        if (msgEl) msgEl.textContent = shareText;

        modal.classList.add('is-visible');

        // Close button
        const close = document.getElementById('share-modal-close');
        if (close) close.onclick = () => modal.classList.remove('is-visible');

        // Overlay click to close
        const overlay = modal.querySelector('.share-modal__overlay') as HTMLElement;
        if (overlay) overlay.onclick = () => modal.classList.remove('is-visible');

        // Share button handlers
        const shareButtons = modal.querySelectorAll('[data-share]');
        shareButtons.forEach(btn => {
            const el = btn as HTMLElement;
            const type = el.getAttribute('data-share');

            el.onclick = () => {
                const encodedText = encodeURIComponent(shareText);
                const encodedUrl = encodeURIComponent(gameUrl);
                const encodedTitle = encodeURIComponent(shareTitle);

                switch (type) {
                    case 'telegram':
                        window.open(`https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`, '_blank');
                        break;

                    case 'whatsapp':
                        window.open(`https://wa.me/?text=${encodedText}%20${encodedUrl}`, '_blank');
                        break;

                    case 'email':
                        window.open(`mailto:?subject=${encodedTitle}&body=${encodedText}%0A${encodedUrl}`, '_self');
                        break;

                    case 'x':
                        window.open(`https://x.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`, '_blank');
                        break;

                    case 'copy':
                        navigator.clipboard.writeText(`${shareText}\n${gameUrl}`).then(() => {
                            const label = el.querySelector('span[data-i18n]');
                            if (label) {
                                const original = label.textContent;
                                label.textContent = i18n.t('copied_to_clipboard');
                                setTimeout(() => { label.textContent = original; }, 2000);
                            }
                        }).catch(() => {
                            const label = el.querySelector('span[data-i18n]');
                            if (label) {
                                const original = label.textContent;
                                label.textContent = i18n.t('copy_failed');
                                setTimeout(() => { label.textContent = original; }, 2000);
                            }
                        });
                        return; // Don't close modal on copy
                }

                modal.classList.remove('is-visible');
            };
        });
    }

    private checkTutorial() {
        if (!localStorage.getItem('tutorial_seen')) {
            const hand = document.getElementById('hand-tutorial');
            if (hand) {
                hand.classList.add('is-visible');
                setTimeout(() => hand.classList.remove('is-visible'), 4000);
                localStorage.setItem('tutorial_seen', '1');
            }
        }
    }

    private updateGhost(placements: { gridX: number, gridY: number }[] | null, textureKey: string) {
        this.clearGhost();

        if (placements) {
            placements.forEach(p => {
                const px = this.startX + p.gridX * CELL_SIZE + CELL_SIZE / 2;
                const py = this.startY + p.gridY * CELL_SIZE + CELL_SIZE / 2;

                let ghost = this.blockPool?.get(px, py, textureKey) as Phaser.GameObjects.Sprite;
                if (!ghost) {
                    ghost = this.add.sprite(px, py, textureKey);
                    this.blockPool?.add(ghost);
                }
                ghost.setTexture(textureKey);
                ghost.setActive(true).setVisible(true).setDepth(GAME_CONFIG.depth.gridFill + 0.1);
                ghost.setAlpha(0.35);
                ghost.setTint(0xffffff);
                this.ghostSprites.push(ghost);
            });
        }
    }

    private clearGhost() {
        this.ghostSprites.forEach(s => this.blockPool?.killAndHide(s));
        this.ghostSprites = [];
    }

    shutdown() {
        // Clear hammer timeout
        if (this.hammerTimeout) {
            clearTimeout(this.hammerTimeout);
            this.hammerTimeout = null;
        }

        // Correctly remove all EventBus listeners
        EventBus.off(GameEvents.ACTIVATE_HAMMER);
        EventBus.off(GameEvents.ACTIVATE_SHUFFLE);
        EventBus.off(GameEvents.GAME_DATA_LOADED);

        // Remove input listeners
        this.input.off('gameobjectdown');
        this.input.off('pointermove');
        this.input.off('pointerup');

        // Clear references
        this.blockPool?.clear(true, true);
        this.blockPool = null;
    }
}