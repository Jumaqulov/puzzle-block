import { SoundManager } from './SoundManager';
import { EventBus, GameEvents } from '../utils/EventBus';
import { ScoreIntegrity } from '../utils/ScoreIntegrity';

export class YandexManager {
    private static instance: YandexManager;

    public ysdk: YandexSDK | null = null;
    public player: YandexPlayer | null = null;

    public isInitialized: boolean = false;
    public isAdShowing: boolean = false;
    public isAuthorized: boolean = false;

    private leaderboardName: string = 'crystalpuzzlehighscore';
    public cachedData: any = null; // Cached loaded data for GameScene access

    public callbacks: {
        onAdOpen: (() => void) | null;
        onAdClose: (() => void) | null;
        onRewardGranted: ((type: string) => void) | null;
    } = {
            onAdOpen: null,
            onAdClose: null,
            onRewardGranted: null
        };

    private constructor() { }

    public static getInstance(): YandexManager {
        if (!YandexManager.instance) {
            YandexManager.instance = new YandexManager();
        }
        return YandexManager.instance;
    }

    public async init(): Promise<boolean> {
        try {
            // Endi SDK to'g'ridan-to'g'ri HTML dan keladi. 
            // Agar HTML da script bo'lmasa, demak lokal (dev) muhitdamiz.
            if (typeof YaGames === 'undefined') {
                console.log('[YaSDK] Local development mode - YaGames topilmadi');
                this.initFallbackMode();
                return false;
            }

            this.ysdk = await YaGames.init();
            window.ysdk = this.ysdk;

            console.log('[YaSDK] SDK initialized successfully');

            await this.initPlayer();
            await this.loadGameData();

            this.isInitialized = true;

            EventBus.emit(GameEvents.YANDEX_READY, { sdk: this.ysdk, player: this.player });

            return true;
        } catch (error) {
            console.log('[YaSDK] Init failed, using fallback mode', error);
            this.initFallbackMode();
            return false;
        }
    }

    private initFallbackMode(): void {
        this.isInitialized = false;
        this.ysdk = null;
        EventBus.emit(GameEvents.YANDEX_READY, { sdk: null, player: null });
    }

    public async initPlayer(): Promise<YandexPlayer | null> {
        if (!this.ysdk) return null;

        try {
            this.player = await this.ysdk.getPlayer({ scopes: false } as any);
            const mode = this.player.getMode();
            this.isAuthorized = (mode !== 'lite');

            if (this.isAuthorized) {
                const name = this.player.getName();
                const photo = this.player.getPhoto('medium');
                console.log(`[YaSDK] Player: ${name}`);

                EventBus.emit(GameEvents.PLAYER_AUTHORIZED, { name, photo });
            }

            return this.player;
        } catch (error) {
            console.log('[YaSDK] Player init skipped', error);
            return null;
        }
    }

    public async requestAuthorization(): Promise<boolean> {
        if (!this.ysdk) return false;

        try {
            await this.ysdk.auth.openAuthDialog();
            await this.initPlayer();
            return this.isAuthorized;
        } catch (error) {
            return false;
        }
    }

    public async showRewardAd(rewardType: string): Promise<boolean> {
        if (!this.ysdk) {
            console.log(`[YaSDK] Dev mode: ${rewardType} activated`);
            this.grantReward(rewardType);
            return true;
        }

        if (this.isAdShowing) return false;

        // Safety timeout — if ad callbacks don't fire within 30s, force recovery
        let safetyTimer: ReturnType<typeof setTimeout> | null = null;

        return new Promise<boolean>((resolve) => {
            this.isAdShowing = true;
            let rewarded = false;
            let closed = false;

            const cleanup = () => {
                if (closed) return;
                closed = true;
                this.isAdShowing = false;
                SoundManager.getInstance().setMuted(false);
                if (window.game && window.game.loop) window.game.loop.wake();
                if (this.callbacks.onAdClose) this.callbacks.onAdClose();
                if (safetyTimer) { clearTimeout(safetyTimer); safetyTimer = null; }
            };

            safetyTimer = setTimeout(() => {
                console.warn('[YaSDK] Ad safety timeout — forcing recovery');
                cleanup();
                resolve(false);
            }, 30000);

            this.ysdk!.adv.showRewardedVideo({
                callbacks: {
                    onOpen: () => {
                        SoundManager.getInstance().setMuted(true);
                        if (window.game && window.game.loop) window.game.loop.sleep();
                        if (this.callbacks.onAdOpen) this.callbacks.onAdOpen();
                    },
                    onClose: () => {
                        cleanup();
                        if (rewarded) {
                            setTimeout(() => this.grantReward(rewardType), 100);
                        }
                        resolve(rewarded);
                    },
                    onRewarded: () => {
                        console.log(`[YaSDK] Reward granted for: ${rewardType}`);
                        rewarded = true;
                        EventBus.emit(GameEvents.REWARD_SUCCESS, rewardType);
                        if (this.callbacks.onRewardGranted) {
                            this.callbacks.onRewardGranted(rewardType);
                        }
                    },
                    onError: (e: any) => {
                        cleanup();
                        console.error('Ad Error', e);
                        // Non-blocking notification instead of alert()
                        this.showToast("Reklama yuklanmadi");
                        resolve(false);
                    }
                }
            });
        }).catch((err) => {
            this.isAdShowing = false;
            if (window.game && window.game.loop) window.game.loop.wake();
            console.error('Ad Exception', err);
            return false;
        });
    }

    private grantReward(rewardType: string): void {
        switch (rewardType) {
            case 'hammer':
                EventBus.emit(GameEvents.ACTIVATE_HAMMER);
                break;
            case 'shuffle':
                EventBus.emit(GameEvents.ACTIVATE_SHUFFLE);
                break;
        }
    }

    public async showInterstitialAd(): Promise<boolean> {
        if (!this.ysdk || this.isAdShowing) return false;

        let safetyTimer: ReturnType<typeof setTimeout> | null = null;

        return new Promise<boolean>((resolve) => {
            this.isAdShowing = true;
            let closed = false;

            const cleanup = () => {
                if (closed) return;
                closed = true;
                this.isAdShowing = false;
                SoundManager.getInstance().setMuted(false);
                if (window.game && window.game.loop) window.game.loop.wake();
                if (this.callbacks.onAdClose) this.callbacks.onAdClose();
                if (safetyTimer) { clearTimeout(safetyTimer); safetyTimer = null; }
            };

            safetyTimer = setTimeout(() => {
                console.warn('[YaSDK] Interstitial safety timeout — forcing recovery');
                cleanup();
                resolve(false);
            }, 30000);

            this.ysdk!.adv.showFullscreenAdv({
                callbacks: {
                    onOpen: () => {
                        SoundManager.getInstance().setMuted(true);
                        if (window.game && window.game.loop) window.game.loop.sleep();
                        if (this.callbacks.onAdOpen) this.callbacks.onAdOpen();
                    },
                    onClose: (wasShown: boolean) => {
                        cleanup();
                        resolve(wasShown);
                    },
                    onError: (_e: any) => {
                        cleanup();
                        resolve(false);
                    },
                    onOffline: () => {
                        cleanup();
                        resolve(false);
                    }
                }
            });
        }).catch(() => {
            this.isAdShowing = false;
            if (window.game && window.game.loop) window.game.loop.wake();
            return false;
        });
    }

    // Non-blocking toast notification instead of alert()
    private showToast(message: string): void {
        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
            background: rgba(255,68,68,0.9); color: #fff; padding: 8px 20px;
            border-radius: 8px; font-size: 13px; z-index: 10000;
            font-family: 'Noto Sans', sans-serif; pointer-events: none;
            animation: floatUp 2s ease-out forwards;
        `;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2500);
    }

    // --- Score Integrity ---

    public async saveGameData(data: any): Promise<boolean> {
        if (!this.player || !this.isAuthorized) {
            try {
                localStorage.setItem('crystal_puzzle_data', JSON.stringify(data));
            } catch (e) { }
            return false;
        }

        try {
            await this.player.setData(data, true);
            return true;
        } catch (error) {
            try {
                localStorage.setItem('crystal_puzzle_data', JSON.stringify(data));
            } catch (e) { }
            return false;
        }
    }

    public async loadGameData(): Promise<any> {
        let rawData: any = null;

        if (!this.player || !this.isAuthorized) {
            try {
                const stored = localStorage.getItem('crystal_puzzle_data');
                if (stored) rawData = JSON.parse(stored);
            } catch (e) { }
        } else {
            try {
                rawData = await this.player.getData();
            } catch (error) { }
        }

        if (rawData) {
            // Multi-layer integrity verification
            if (rawData.highScore !== undefined) {
                const result = ScoreIntegrity.validatePayload(rawData);
                if (!result.valid) {
                    console.warn('[Security] Score integrity check failed! Resetting.');
                    rawData.highScore = 0;
                } else {
                    rawData.highScore = result.score;
                }
            }
            this.cachedData = rawData; // Cache for GameScene access
            EventBus.emit(GameEvents.GAME_DATA_LOADED, rawData);
        }

        return rawData;
    }

    public async saveHighScore(score: number): Promise<boolean> {
        if (!ScoreIntegrity.isScorePlausible(score)) {
            console.warn('[Security] Attempted to save implausible score:', score);
            return false;
        }

        const payload = ScoreIntegrity.createPayload(score);
        return await this.saveGameData(payload);
    }

    /**
     * Save full game state (grid + shapes + score) alongside highScore.
     * Uses Yandex Player Data API for authorized users, localStorage as fallback.
     */
    public async saveFullState(gameState: any, highScore: number): Promise<void> {
        // Build combined payload
        const scorePayload = ScoreIntegrity.isScorePlausible(highScore)
            ? ScoreIntegrity.createPayload(highScore)
            : { highScore: 0 };

        const combined = {
            ...scorePayload,
            gameState: gameState
        };

        // Save via Yandex player data (or localStorage fallback)
        await this.saveGameData(combined);
    }

    public async submitScore(score: number): Promise<boolean> {
        if (!this.ysdk) return false;

        try {
            const leaderboard = await this.ysdk.getLeaderboards();
            await leaderboard.setLeaderboardScore(this.leaderboardName, score);
            return true;
        } catch (error) {
            return false;
        }
    }

    public async onGameOver(score: number, highScore: number): Promise<void> {
        // Submit to leaderboard
        await this.submitScore(score);
    }

    public async clearGameData(): Promise<void> {
        try {
            localStorage.removeItem('crystal_puzzle_data');
            localStorage.removeItem('crystal_puzzle_state');
        } catch (_e) { }

        if (this.player && this.isAuthorized) {
            try {
                await this.player.setData({ highScore: 0 }, true);
            } catch (_e) { }
        }
    }
}