import 'phaser';
import { GAME_CONFIG } from './consts';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { YandexManager } from './managers/YandexManager';
import { Starfield } from './visuals/Starfield';
import { LocalizationManager } from './managers/LocalizationManager';

// Import CSS
import '@phosphor-icons/web/regular'; // Loads regular weight icons
import '../styles.css';

// Signal that CSS is loaded — removes FOUC protection
document.documentElement.classList.add('css-loaded');

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

    // Prevent pull-to-refresh / swipe-to-refresh on iOS and Android (п. 1.10.2)
    document.addEventListener('touchmove', (e) => {
        // Allow scroll inside settings/howto modals if content overflows
        const target = e.target as HTMLElement;
        if (target.closest('.settings-modal__body')) return;
        e.preventDefault();
    }, { passive: false });

    // Prevent scroll on body
    document.body.addEventListener('scroll', (e) => {
        e.preventDefault();
        document.body.scrollTop = 0;
        document.documentElement.scrollTop = 0;
    }, { passive: false });

    // iOS Safari: prevent overscroll bounce
    document.addEventListener('touchstart', (e) => {
        if (e.touches.length > 1) {
            e.preventDefault(); // Prevent pinch-to-zoom
        }
    }, { passive: false });

    // Try to lock screen to portrait mode
    try {
        if (screen.orientation && (screen.orientation as any).lock) {
            (screen.orientation as any).lock('portrait').catch(() => { });
        }
    } catch (_e) { /* Not supported */ }

    // Initialize Starfield
    const starfield = new Starfield();
    starfield.init();

    // Yandex SDK First
    const yandex = YandexManager.getInstance();
    await yandex.init();

    LocalizationManager.getInstance().init();

    // Start Phaser
    window.game = new Phaser.Game(config);

    // Force Phaser to recalculate scale on orientation change
    const handleResize = () => {
        // Small delay to let CSS layout settle before Phaser recalculates
        setTimeout(() => {
            const g = window.game;
            if (g && g.scale) {
                g.scale.refresh();
            }
        }, 150);
    };

    window.addEventListener('orientationchange', handleResize);
    screen.orientation?.addEventListener('change', handleResize);
    window.addEventListener('resize', handleResize);

    // Localization uses Yandex for language detection, so it's init inside BootScene using singleton
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}