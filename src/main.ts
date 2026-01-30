import 'phaser';
import { GAME_CONFIG } from './consts';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { YandexManager } from './managers/YandexManager';
import { Starfield } from './visuals/Starfield';

// Import CSS
import '@phosphor-icons/web/regular'; // Loads regular weight icons
import '../styles.css';

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    backgroundColor: GAME_CONFIG.backgroundColor,
    parent: 'game-container',
    pixelArt: false,
    width: GAME_CONFIG.width,
    height: GAME_CONFIG.height,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        parent: 'game-container',
        width: GAME_CONFIG.width,
        height: GAME_CONFIG.height,
        min: {
            width: GAME_CONFIG.minWidth,
            height: GAME_CONFIG.minHeight
        },
        max: {
            width: GAME_CONFIG.maxWidth,
            height: GAME_CONFIG.maxHeight
        }
    },
    scene: [BootScene, GameScene]
};

async function initializeApp() {
    console.log('[Init] Starting app initialization...');

    // Prevent context menu
    window.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('selectstart', (e) => e.preventDefault());
    window.addEventListener('dragstart', (e) => e.preventDefault());

    // Initialize Starfield
    const starfield = new Starfield();
    starfield.init();

    // Yandex SDK First
    const yandex = YandexManager.getInstance();
    await yandex.init();

    // Start Phaser
    window.game = new Phaser.Game(config);

    // Localization uses Yandex for language detection, so it's init inside BootScene using singleton
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}
