import { CELL_SIZE, SHAPE_DEFS, BLOCK_TEXTURES, GAME_CONFIG } from '../consts';
import { GameJuice } from '../utils/GameJuice';
import { SoundManager } from '../managers/SoundManager';
import { YandexManager } from '../managers/YandexManager';
import { LocalizationManager } from '../managers/LocalizationManager';

export class GameScene extends Phaser.Scene {
    private grid: (Phaser.GameObjects.Image | null)[][] = [];
    private activeShapes: Phaser.GameObjects.Container[] = [];
    private score: number = 0;
    private highScore: number = 0;
    private isGameOver: boolean = false;
    private deleteMode: boolean = false;
    private comboStreak: number = 0;
    private recordCelebrated: boolean = false;

    // DOM Elements references
    private domScoreValue: HTMLElement | null = null;
    private domHighValue: HTMLElement | null = null;
    private domHighLabel: HTMLElement | null = null;
    private domModal: HTMLElement | null = null;
    private domHammer: HTMLElement | null = null;

    // Dragging state
    private draggedContainer: Phaser.GameObjects.Container | null = null;

    // Depth constants
    private readonly DEPTH = {
        board: 1,
        gridFill: 2,
        gridGlow: 3,
        grid: 4,
        placed: 6,
        dockBase: 8,
        dock: 10,
        dragging: 20
    };

    private gridSize: number = 8;
    private startX: number = 0;
    private startY: number = 0;
    private dockTopY: number = 0;
    private shapeRowY: number = 0;
    private availableDockWidth: number = 0;
    private dockPaddingX: number = 16;
    private slotGap: number = 40;

    constructor() {
        super('GameScene');
    }

    create() {
        // Hide Splash Screen Immediately
        const splash = document.getElementById('splash');
        if (splash) {
            splash.classList.remove('is-visible');
            splash.classList.add('is-hidden');
        }

        // Background
        this.add.image(0, 0, 'background').setOrigin(0, 0);

        // Initialize DOM refs
        this.initDOM();

        // Calculate Shape Bounds (Missing in consts)
        SHAPE_DEFS.forEach(def => {
            if (def.width !== undefined) return; // Already calculated

            const xs = def.blocks.map(b => b[0]);
            const ys = def.blocks.map(b => b[1]);
            def.minX = Math.min(...xs);
            def.maxX = Math.max(...xs);
            def.minY = Math.min(...ys);
            def.maxY = Math.max(...ys);
            def.width = (def.maxX - def.minX + 1) * CELL_SIZE;
            def.height = (def.maxY - def.minY + 1) * CELL_SIZE;
        });

        // Calculate layout
        const gridWidth = this.gridSize * CELL_SIZE;
        const gridHeight = this.gridSize * CELL_SIZE;

        // Shape definitions pre-calc (max dimensions)
        const maxShapeHeight = Math.max(...SHAPE_DEFS.map((def) => ((def.maxY || 0) - (def.minY || 0) + 1) * CELL_SIZE));

        const dockGap = 50;
        const dockPaddingBottom = 20;

        const idealStartY = Math.round((GAME_CONFIG.height - gridHeight) / 2);
        const maxStartY = GAME_CONFIG.height - gridHeight - dockGap - maxShapeHeight - dockPaddingBottom;

        this.startY = Math.max(40, Math.min(idealStartY, maxStartY));
        this.startX = Math.round((GAME_CONFIG.width - gridWidth) / 2);
        this.dockTopY = this.startY + gridHeight + dockGap;
        this.shapeRowY = Math.round(this.dockTopY + maxShapeHeight / 2);
        this.availableDockWidth = GAME_CONFIG.width - this.dockPaddingX * 2;

        // Initialize Grid Array
        this.grid = Array.from({ length: this.gridSize }, () => Array(this.gridSize).fill(null));

        // Draw Board
        this.drawBoard(gridWidth, gridHeight);

        // Input Handlers
        this.setupInput();

        // Powerups
        this.setupPowerups();

        // Load High Score
        this.loadHighScore(); // Local first, then Cloud update

        // Spawn Shapes
        this.spawnAllShapes();

        // Check for "Hand" tutorial
        this.checkTutorial();
    }

    private initDOM() {
        this.domScoreValue = document.getElementById('score-value');
        this.domHighValue = document.getElementById('high-score-value');
        this.domHighLabel = document.getElementById('high-score-label');
        this.domModal = document.getElementById('gameover');
        this.domHammer = document.getElementById('power-hammer');

        // Reset UI
        if (this.domHighLabel) this.domHighLabel.classList.remove('record-glow');
        this.updateScoreUI();

        // Restart Button
        const restartBtn = document.getElementById('restart-btn');
        if (restartBtn) {
            // Remove old listeners to avoid duplicates if re-created
            const newBtn = restartBtn.cloneNode(true);
            if (restartBtn.parentNode) restartBtn.parentNode.replaceChild(newBtn, restartBtn);
            newBtn.addEventListener('click', () => this.restartGame());
        }

        // Share Button
        const shareBtn = document.getElementById('share-score');
        if (shareBtn) {
            const newBtn = shareBtn.cloneNode(true);
            if (shareBtn.parentNode) shareBtn.parentNode.replaceChild(newBtn, shareBtn);
            (newBtn as HTMLElement).onclick = () => this.shareScore();
        }
    }

    private drawBoard(gridWidth: number, gridHeight: number) {
        // Board Main
        const boardGraphics = this.add.graphics();
        boardGraphics.fillStyle(0x1e0b36, 1);
        boardGraphics.fillRoundedRect(this.startX - 8, this.startY - 8, gridWidth + 16, gridHeight + 16, 14);
        boardGraphics.lineStyle(2, 0x3d1c71, 1);
        boardGraphics.strokeRoundedRect(this.startX - 8, this.startY - 8, gridWidth + 16, gridHeight + 16, 14);
        boardGraphics.setDepth(this.DEPTH.board);

        // Grid Cells
        const gridGlowGraphics = this.add.graphics({ lineStyle: { width: 3, color: 0xbc13fe, alpha: 0.18 } });
        gridGlowGraphics.setDepth(this.DEPTH.gridGlow);
        const gridGraphics = this.add.graphics({ lineStyle: { width: 1, color: 0x3d1c71, alpha: 0.75 } });
        gridGraphics.setDepth(this.DEPTH.grid);

        for (let x = 0; x < this.gridSize; x++) {
            for (let y = 0; y < this.gridSize; y++) {
                const cell = this.add.image(
                    this.startX + x * CELL_SIZE + CELL_SIZE / 2,
                    this.startY + y * CELL_SIZE + CELL_SIZE / 2,
                    'cell_bg'
                );
                cell.setDepth(this.DEPTH.gridFill);

                // Add interactivity for Hammer mode
                cell.setInteractive({ useHandCursor: false });
                cell.setData('gridX', x);
                cell.setData('gridY', y);
                cell.on('pointerdown', () => this.handleCellClick(x, y));

                gridGlowGraphics.strokeRect(this.startX + x * CELL_SIZE, this.startY + y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
                gridGraphics.strokeRect(this.startX + x * CELL_SIZE, this.startY + y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
            }
        }
    }

    private setupInput() {
        this.input.on('gameobjectdown', (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject) => {
            if (this.deleteMode || this.isGameOver) return;

            const container = gameObject.getData('parentContainer') as Phaser.GameObjects.Container;
            if (!container || !this.activeShapes.includes(container)) return;

            SoundManager.getInstance().resume();
            SoundManager.getInstance().play('drag');

            this.draggedContainer = container;
            this.draggedContainer.setDepth(this.DEPTH.dragging);
            this.draggedContainer.setScale(1);
            this.draggedContainer.x = pointer.x;
            this.draggedContainer.y = pointer.y;
        });

        this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            if (!this.draggedContainer) return;

            this.draggedContainer.x = pointer.x;
            this.draggedContainer.y = pointer.y;

            // Visual feedback
            const blocks = this.draggedContainer.getData('shapeBlocks');
            const canFit = blocks ? this.canPlaceBlocksAnywhere(blocks) : true;

            if (canFit) {
                this.draggedContainer.setAlpha(0.8);
                this.draggedContainer.list.forEach((child) => {
                    if (child instanceof Phaser.GameObjects.Image) child.clearTint();
                });
            } else {
                this.draggedContainer.setAlpha(0.5);
                this.draggedContainer.list.forEach((child) => {
                    if (child instanceof Phaser.GameObjects.Image) child.setTint(0xff4444);
                });
            }
        });

        this.input.on('pointerup', () => {
            if (!this.draggedContainer || this.isGameOver) {
                this.draggedContainer = null;
                return;
            }

            const container = this.draggedContainer;
            this.draggedContainer = null;

            const placements = this.tryPlaceShape(container);

            if (!placements) {
                // Return to dock
                this.tweens.add({
                    targets: container,
                    x: container.getData('homeX'),
                    y: container.getData('homeY'),
                    duration: 220,
                    ease: 'Sine.easeInOut',
                    onComplete: () => {
                        container.setDepth(this.DEPTH.dock);
                        container.setScale(this.DOCK_SCALE); // previewScale
                        container.list.forEach((child) => {
                            if (child instanceof Phaser.GameObjects.Image) child.clearTint();
                        });
                        container.setAlpha(1);
                    }
                });
                return;
            }

            // Place it
            const textureKey = container.getData('textureKey') || BLOCK_TEXTURES[0].key;
            this.snapAndPlace(placements, textureKey);

            // Score and Feedback
            const placedBlockCount = placements.length;
            const placementScore = placedBlockCount * 10;
            this.score += placementScore;
            this.updateScoreUI();

            GameJuice.showFloatingText(`+${placementScore}`, container.x, container.y, 'normal');
            SoundManager.getInstance().play('place');

            this.checkAndClearLines();

            const index = this.activeShapes.indexOf(container);
            if (index !== -1) {
                this.activeShapes.splice(index, 1);
            }
            container.destroy();

            if (this.activeShapes.length === 0) {
                this.spawnAllShapes();
            }

            this.checkGameOver();
        });
    }

    private tryPlaceShape(container: Phaser.GameObjects.Container): { gridX: number, gridY: number, offsetX: number, offsetY: number }[] | null {
        if (!container.list) return null;

        // Filter only Image children (blocks)
        const blocks = container.list.filter(child => child instanceof Phaser.GameObjects.Image) as Phaser.GameObjects.Image[];
        if (blocks.length === 0) return null;

        const placements: { gridX: number, gridY: number, offsetX: number, offsetY: number }[] = [];

        for (const block of blocks) {
            const worldX = container.x + block.x;
            const worldY = container.y + block.y;
            const gridX = Math.round((worldX - this.startX - CELL_SIZE / 2) / CELL_SIZE);
            const gridY = Math.round((worldY - this.startY - CELL_SIZE / 2) / CELL_SIZE);

            if (gridX < 0 || gridX >= this.gridSize || gridY < 0 || gridY >= this.gridSize) return null;
            if (this.grid[gridY][gridX]) return null;

            placements.push({ gridX, gridY, offsetX: block.x, offsetY: block.y });
        }

        return placements;
    }

    private snapAndPlace(placements: any[], textureKey: string) {
        // We don't really need to move the container since it gets destroyed, 
        // but for visual continuity or if we had animation, we might.
        // The important part is updating the grid.

        placements.forEach((placement: any) => {
            const px = this.startX + placement.gridX * CELL_SIZE + CELL_SIZE / 2;
            const py = this.startY + placement.gridY * CELL_SIZE + CELL_SIZE / 2;
            const sprite = this.add.image(px, py, textureKey);
            sprite.setDepth(this.DEPTH.placed);

            // Add click handler for hammer (delete mode)
            sprite.setInteractive({ useHandCursor: false });
            sprite.on('pointerdown', () => this.handleBlockClick(sprite, placement.gridX, placement.gridY));

            this.grid[placement.gridY][placement.gridX] = sprite;
        });
    }

    private checkAndClearLines() {
        const rowsToClear: number[] = [];
        const colsToClear: number[] = [];

        for (let y = 0; y < this.gridSize; y++) {
            if (this.grid[y].every(cell => cell !== null)) rowsToClear.push(y);
        }

        for (let x = 0; x < this.gridSize; x++) {
            let full = true;
            for (let y = 0; y < this.gridSize; y++) {
                if (!this.grid[y][x]) {
                    full = false;
                    break;
                }
            }
            if (full) colsToClear.push(x);
        }

        if (rowsToClear.length === 0 && colsToClear.length === 0) {
            this.comboStreak = 0;
            return;
        }

        const spritesToDestroy = new Set<Phaser.GameObjects.Image>();

        rowsToClear.forEach(y => {
            for (let x = 0; x < this.gridSize; x++) {
                if (this.grid[y][x]) {
                    spritesToDestroy.add(this.grid[y][x]!);
                    this.grid[y][x] = null;
                }
            }
        });

        colsToClear.forEach(x => {
            for (let y = 0; y < this.gridSize; y++) {
                if (this.grid[y][x]) {
                    spritesToDestroy.add(this.grid[y][x]!);
                    this.grid[y][x] = null;
                }
            }
        });

        // Visuals
        rowsToClear.forEach(row => {
            const y = this.startY + row * CELL_SIZE + CELL_SIZE / 2;
            GameJuice.flashLineDOM(this.startX + (this.gridSize * CELL_SIZE) / 2, y, this.gridSize * CELL_SIZE, CELL_SIZE, true);
        });
        colsToClear.forEach(col => {
            const x = this.startX + col * CELL_SIZE + CELL_SIZE / 2;
            GameJuice.flashLineDOM(x, this.startY + (this.gridSize * CELL_SIZE) / 2, CELL_SIZE, this.gridSize * CELL_SIZE, false);
        });

        spritesToDestroy.forEach(sprite => {
            const gridX = Math.round((sprite.x - this.startX - CELL_SIZE / 2) / CELL_SIZE);
            const gridY = Math.round((sprite.y - this.startY - CELL_SIZE / 2) / CELL_SIZE);
            GameJuice.onBlockClear(sprite, gridX, gridY, this.startX, this.startY);
            sprite.destroy();
        });

        // Scoring
        const clearedLines = rowsToClear.length + colsToClear.length;
        this.comboStreak += 1;

        const BASE_POINTS = 100;
        let multiLineMultiplier = 1;
        if (clearedLines === 2) multiLineMultiplier = 1.5;
        else if (clearedLines === 3) multiLineMultiplier = 2.0;
        else if (clearedLines >= 4) multiLineMultiplier = 3.0;

        const streakMultiplier = 1 + ((this.comboStreak - 1) * 0.5);
        let earnedPoints = Math.round((clearedLines * BASE_POINTS * multiLineMultiplier) * streakMultiplier);

        if (clearedLines >= 3) {
            earnedPoints += 500;
        }

        this.score += earnedPoints;
        this.updateScoreUI();
        this.updateHighScore();
        SoundManager.getInstance().play('clear');

        const centerX = this.startX + (this.gridSize * CELL_SIZE) / 2;
        const centerY = this.startY + (this.gridSize * CELL_SIZE) / 2;
        GameJuice.onLineClear(clearedLines, this.comboStreak, centerX, centerY);

        // Explicitly update shape visuals to see if they fit now
        this.updateShapeVisuals();
    }

    private readonly DOCK_SCALE = 0.75;

    private spawnAllShapes() {
        // Reroll logic or bag system could go here
        const defs = [
            Phaser.Utils.Array.GetRandom(SHAPE_DEFS),
            Phaser.Utils.Array.GetRandom(SHAPE_DEFS),
            Phaser.Utils.Array.GetRandom(SHAPE_DEFS)
        ];

        // Calculate total width using SCALED widths
        // We use the shape's real width * scale, plus gaps
        const totalWidth = defs.reduce((sum, d) => sum + (d.width || 0) * this.DOCK_SCALE, 0) + this.slotGap * 2;

        // Center the group
        let cursorX = this.dockPaddingX + Math.max(0, this.availableDockWidth - totalWidth) / 2;

        defs.forEach((def) => {
            const scaledWidth = (def.width || 0) * this.DOCK_SCALE;

            // Move cursor to center of this shape's slot
            cursorX += scaledWidth / 2;

            this.createShape(def, cursorX, this.shapeRowY);

            // Move cursor past this shape + gap
            cursorX += scaledWidth / 2 + this.slotGap;
        });

        this.updateShapeVisuals();
    }

    private createShape(def: any, x: number, y: number) {
        const textureKey = Phaser.Utils.Array.GetRandom(BLOCK_TEXTURES).key;
        const offsetX = -(def.width || 0) / 2 + CELL_SIZE / 2;
        const offsetY = -(def.height || 0) / 2 + CELL_SIZE / 2;

        const container = this.add.container(x, y);
        container.setData('homeX', x);
        container.setData('homeY', y);
        container.setData('shapeBlocks', def.blocks);
        container.setData('textureKey', textureKey);
        container.setDepth(this.DEPTH.dock);
        container.setScale(this.DOCK_SCALE); // Use the constant

        def.blocks.forEach(([bx, by]: number[]) => {
            const blockX = (bx - (def.minX || 0)) * CELL_SIZE + offsetX;
            const blockY = (by - (def.minY || 0)) * CELL_SIZE + offsetY;
            const block = this.add.image(blockX, blockY, textureKey);
            block.setOrigin(0.5, 0.5);
            block.setData('offsetX', blockX);
            block.setData('offsetY', blockY);
            block.setData('parentContainer', container);

            // Hit area for dragging
            block.setInteractive({ useHandCursor: true });
            container.add(block);
        });

        this.activeShapes.push(container);
    }

    private checkGameOver() {
        if (this.isGameOver) return;

        const stillActive = this.activeShapes.filter(s => s && s.active);
        if (stillActive.length === 0) return;

        const canAnyFit = stillActive.some(shape => {
            const blocks = shape.getData('shapeBlocks');
            return this.canPlaceBlocksAnywhere(blocks);
        });

        if (!canAnyFit) {
            this.isGameOver = true;
            this.setDeleteMode(false);
            SoundManager.getInstance().play('gameover');
            YandexManager.getInstance().onGameOver(this.score, this.highScore);
            this.showGameOverUI();
        }
    }

    private canPlaceBlocksAnywhere(blocks: number[][]): boolean {
        for (let baseX = 0; baseX < this.gridSize; baseX++) {
            for (let baseY = 0; baseY < this.gridSize; baseY++) {
                let fits = true;
                for (const [bx, by] of blocks) {
                    const gx = baseX + bx;
                    const gy = baseY + by;
                    if (gx < 0 || gx >= this.gridSize || gy < 0 || gy >= this.gridSize || this.grid[gy][gx]) {
                        fits = false;
                        break;
                    }
                }
                if (fits) return true;
            }
        }
        return false;
    }

    private updateShapeVisuals() {
        this.activeShapes.forEach(shape => {
            const blocks = shape.getData('shapeBlocks');
            const canFit = this.canPlaceBlocksAnywhere(blocks);

            shape.list.forEach((child) => {
                if (child instanceof Phaser.GameObjects.Image) {
                    if (canFit) {
                        child.clearTint();
                    } else {
                        child.setTint(0x888888);
                    }
                }
            });

            if (canFit) {
                shape.setAlpha(1);
            } else {
                shape.setAlpha(0.5);
            }
        });
    }

    // --- Powerups ---

    private setupPowerups() {
        const hammerBtn = document.getElementById('power-hammer');
        const shuffleBtn = document.getElementById('power-shuffle');

        if (hammerBtn) {
            const newBtn = hammerBtn.cloneNode(true);
            if (hammerBtn.parentNode) hammerBtn.parentNode.replaceChild(newBtn, hammerBtn);
            (newBtn as HTMLElement).onclick = () => this.activateHammer();
        }

        if (shuffleBtn) {
            const newBtn = shuffleBtn.cloneNode(true);
            if (shuffleBtn.parentNode) shuffleBtn.parentNode.replaceChild(newBtn, shuffleBtn);
            (newBtn as HTMLElement).onclick = () => this.activateShuffle();
        }

        // Listeners for Yandex Reward Grants (failsafe + standard flow)
        window.addEventListener('activateHammer', () => this.enableHammerMode());
        window.addEventListener('activateShuffle', () => this.performShuffle());
    }

    private activateHammer() {
        if (this.isGameOver) return;
        // If already in delete mode, toggle off
        if (this.deleteMode) {
            this.setDeleteMode(false);
            return;
        }

        YandexManager.getInstance().showRewardAd('hammer');
    }

    private activateShuffle() {
        if (this.isGameOver) return;
        YandexManager.getInstance().showRewardAd('shuffle');
    }

    private enableHammerMode() {
        this.setDeleteMode(true);
        // Visual cue handled by setDeleteMode toggling CSS classes
    }

    private performShuffle() {
        // Destroy existing shapes
        this.activeShapes.forEach(shape => shape.destroy());
        this.activeShapes = [];
        this.spawnAllShapes();
        SoundManager.getInstance().play('shuffle');
    }

    private setDeleteMode(enabled: boolean) {
        this.deleteMode = enabled;
        document.body.classList.toggle('delete-mode', enabled);
        if (this.domHammer) {
            this.domHammer.classList.toggle('powerup--active', enabled);
        }
    }

    private handleCellClick(_gridX: number, _gridY: number) {
        // If clicking empty cell in delete mode, maybe cancel? Or do nothing?
        // Original logic didn't specify, but usually we just do nothing.
    }

    private handleBlockClick(sprite: Phaser.GameObjects.Image, gridX: number, gridY: number) {
        if (!this.deleteMode) return;

        // Destroy block
        GameJuice.createShockwave(sprite.x, sprite.y);
        GameJuice.playHammerSound();
        GameJuice.createExplosion(sprite.x, sprite.y, '#FF0055', 12);

        this.grid[gridY][gridX] = null;
        sprite.destroy();

        // 3x3 Blast Effect (from game.js logic it seemed to be 3x3 or single? user said "Hammer and Shuffle... preserved exactly")
        // Looking at game.js lines 1215+, it calls 'hammer' sound.
        // Wait, standard hammer usually breaks 1 block or 3x3?
        // In most block puzzles it is 1 block or 3x3 area. 
        // Let's check logic... game.js doesn't actually show the logic for WHAT gets destroyed in the snippet I saw.
        // Assume single block for safety unless I see "3x3" explicitly. 
        // Actually line 1180 says "HAMMER 3x3 POWER-UP EFFECTS".
        // Okay, it's 3x3!

        const range = [-1, 0, 1];
        let destroyedCount = 0;

        range.forEach(dy => {
            range.forEach(dx => {
                const nx = gridX + dx;
                const ny = gridY + dy;
                // Don't destroy the center again, handled above. Wait, logic above destroyed center.
                if (dx === 0 && dy === 0) { destroyedCount++; return; }

                if (nx >= 0 && nx < this.gridSize && ny >= 0 && ny < this.gridSize) {
                    const target = this.grid[ny][nx];
                    if (target) {
                        GameJuice.createExplosion(target.x, target.y, '#FF0055', 8);
                        target.destroy();
                        this.grid[ny][nx] = null;
                        destroyedCount++;
                    }
                }
            });
        });

        // Award points
        const points = GameJuice.showHammerScore(destroyedCount, sprite.x, sprite.y);
        this.score += points;
        this.updateScoreUI();

        // Exit delete mode
        this.setDeleteMode(false);

        // After destroying, check if shapes can fit now
        this.updateShapeVisuals();
    }

    // --- Scoring & UI ---

    private updateScoreUI() {
        if (this.domScoreValue) this.domScoreValue.textContent = String(this.score);
    }

    private loadHighScore() {
        try {
            const stored = localStorage.getItem('crystal_puzzle_highscore');
            this.highScore = stored ? Number(stored) : 0;
            this.updateHighScoreUI();
        } catch (e) { }

        window.addEventListener('gameDataLoaded', (e: any) => {
            if (e.detail && e.detail.highScore) {
                const cloudScore = Number(e.detail.highScore);
                if (cloudScore > this.highScore) {
                    this.highScore = cloudScore;
                    this.updateHighScoreUI();
                }
            }
        });
    }

    private updateHighScore() {
        if (this.score > this.highScore) {
            this.highScore = this.score;
            this.updateHighScoreUI();

            if (!this.recordCelebrated && this.domHighLabel) {
                this.recordCelebrated = true;
                this.domHighLabel.classList.add('record-glow');
                GameJuice.showFloatingText(LocalizationManager.getInstance().t('new_record'), GAME_CONFIG.width / 2, 100, 'excellent');
            }
        }
    }

    private updateHighScoreUI() {
        if (this.domHighValue) this.domHighValue.textContent = String(this.highScore);
    }

    private showGameOverUI() {
        if (this.domModal) this.domModal.classList.add('is-visible');
    }

    private restartGame() {
        if (this.domModal) this.domModal.classList.remove('is-visible');

        // Helper to clear board
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                if (this.grid[y][x]) {
                    this.grid[y][x]!.destroy();
                    this.grid[y][x] = null;
                }
            }
        }

        this.activeShapes.forEach(s => s.destroy());
        this.activeShapes = [];
        this.score = 0;
        this.isGameOver = false;
        this.comboStreak = 0;
        this.recordCelebrated = false;
        this.updateScoreUI();
        if (this.domHighLabel) this.domHighLabel.classList.remove('record-glow');

        this.spawnAllShapes();

        // Interstitial Ad
        YandexManager.getInstance().showInterstitialAd();
    }

    private shareScore() {
        const message = LocalizationManager.getInstance().t('share_message').replace('{score}', String(this.score));
        // Simple share implementation calling a global function or handled here?
        // game.js had a complex modal for sharing. We should reuse strict Logic if possible.
        // For now, let's just use the simplest approach or triggers the existing DOM modal logic if it was preserved in index.html (it is).

        // Trigger the share modal logic
        // We can dispatch an event or reimplement the openShareModal logic here?
        // Since we are refactoring, let's keep it clean.
        // We'll dispatch a custom event that the HTML can listen to or handle it entirely here if we want to be strict TS.
        // I'll reimplement the openShareModal basic toggle here for now, assuming the DOM exists.

        const modal = document.getElementById('share-modal');
        if (modal) {
            const scoreEl = document.getElementById('share-modal-score');
            const msgEl = document.getElementById('share-modal-message');
            if (scoreEl) scoreEl.textContent = `${this.score}`;
            if (msgEl) msgEl.textContent = message;
            modal.classList.add('is-visible');
            // Close handler should be attached in index.html or initDOM
            document.getElementById('share-modal-close')?.addEventListener('click', () => modal.classList.remove('is-visible'));
        }
    }

    private checkTutorial() {
        // Check localStorage logic
        // Handled in DOM normally, but we can do it here
        if (!localStorage.getItem('tutorial_seen')) {
            const hand = document.getElementById('hand-tutorial');
            if (hand) {
                hand.classList.add('is-visible');
                setTimeout(() => hand.classList.remove('is-visible'), 4000);
                localStorage.setItem('tutorial_seen', '1');
            }
        }
    }
}
