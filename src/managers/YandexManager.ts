import { SoundManager } from './SoundManager';
import { EventBus, GameEvents } from '../utils/EventBus';
import { SECURITY_CONFIG } from '../consts';

export class YandexManager {
    private static instance: YandexManager;

    public ysdk: YandexSDK | null = null;
    public player: YandexPlayer | null = null;

    public isInitialized: boolean = false;
    public isAdShowing: boolean = false;
    public isAuthorized: boolean = false;

    private leaderboardName: string = 'crystalpuzzlehighscore';

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

    private isYandexEnvironment(): boolean {
        if (typeof window === 'undefined') return false;
        if ((window as any).YandexGamesSDKEnvironment) return true;
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('app-id') || urlParams.has('draft')) return true;
        if (window.location.hostname.includes('yandex')) return true;
        return false;
    }

    private loadSDKScript(): Promise<void> {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://yandex.ru/games/sdk/v2';
            script.async = true;
            script.onload = () => resolve();
            script.onerror = (e) => reject(e);
            document.head.appendChild(script);
        });
    }

    public async init(): Promise<boolean> {
        if (!this.isYandexEnvironment()) {
            console.log('[YaSDK] Local development mode - SDK disabled');
            this.initFallbackMode();
            return false;
        }

        try {
            if (typeof YaGames === 'undefined') {
                await this.loadSDKScript();
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

        return new Promise<boolean>((resolve) => {
            this.isAdShowing = true;
            this.ysdk!.adv.showRewardedVideo({
                callbacks: {
                    onOpen: () => {
                        SoundManager.getInstance().setMuted(true);
                        if (window.game && window.game.loop) window.game.loop.sleep();
                        if (this.callbacks.onAdOpen) this.callbacks.onAdOpen();
                    },
                    onClose: () => {
                        this.isAdShowing = false;
                        SoundManager.getInstance().setMuted(false);
                        if (window.game && window.game.loop) window.game.loop.wake();
                        if (this.callbacks.onAdClose) this.callbacks.onAdClose();
                        resolve(true);
                    },
                    onRewarded: () => {
                        console.log(`[YaSDK] Reward granted for: ${rewardType}`);
                        this.grantReward(rewardType);
                        EventBus.emit(GameEvents.REWARD_SUCCESS, rewardType);
                        if (this.callbacks.onRewardGranted) {
                            this.callbacks.onRewardGranted(rewardType);
                        }
                    },
                    onError: (e: any) => {
                        this.isAdShowing = false;
                        SoundManager.getInstance().setMuted(false);
                        if (window.game && window.game.loop) window.game.loop.wake();
                        console.error('Ad Error', e);
                        // Using localized message if possible, or fallback
                        alert("Reklama yuklanmadi. Internetni tekshiring!");
                        resolve(false);
                    }
                }
            });
        }).catch((err) => {
            this.isAdShowing = false;
            console.error('Ad Exception', err);
            alert("Reklama yuklanmadi. Internetni tekshiring!");
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

        return new Promise<boolean>((resolve) => {
            this.isAdShowing = true;

            this.ysdk!.adv.showFullscreenAdv({
                callbacks: {
                    onOpen: () => {
                        SoundManager.getInstance().setMuted(true);
                        if (window.game && window.game.loop) window.game.loop.sleep();
                        if (this.callbacks.onAdOpen) this.callbacks.onAdOpen();
                    },
                    onClose: (wasShown: boolean) => {
                        this.isAdShowing = false;
                        SoundManager.getInstance().setMuted(false);
                        if (window.game && window.game.loop) window.game.loop.wake();
                        if (this.callbacks.onAdClose) this.callbacks.onAdClose();
                        resolve(wasShown);
                    },
                    onError: (_e: any) => {
                        this.isAdShowing = false;
                        SoundManager.getInstance().setMuted(false);
                        if (window.game && window.game.loop) window.game.loop.wake();
                        resolve(false);
                    },
                    onOffline: () => {
                        this.isAdShowing = false;
                        SoundManager.getInstance().setMuted(false);
                        if (window.game && window.game.loop) window.game.loop.wake();
                        resolve(false);
                    }
                }
            });
        }).catch(() => {
            this.isAdShowing = false;
            return false;
        });
    }

    // --- Security Hashing ---
    private generateHash(score: number): string {
        const str = `${SECURITY_CONFIG.salt}_${score}_${SECURITY_CONFIG.salt}`;
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash |= 0;
        }
        return hash.toString(16);
    }

    private verifyHash(score: number, hash: string): boolean {
        return this.generateHash(score) === hash;
    }

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
            // Anti-cheat verification
            if (rawData.highScore !== undefined) {
                if (!rawData.hash || !this.verifyHash(rawData.highScore, rawData.hash)) {
                    console.warn('[Security] High score tampered or missing hash! Resetting.');
                    rawData.highScore = 0;
                }
            }
            EventBus.emit(GameEvents.GAME_DATA_LOADED, rawData);
        }

        return rawData;
    }

    public async saveHighScore(score: number): Promise<boolean> {
        const hash = this.generateHash(score);
        return await this.saveGameData({
            highScore: score,
            hash: hash,
            lastPlayed: Date.now()
        });
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

    public async onGameOver(_score: number, highScore: number): Promise<void> {
        await this.saveHighScore(highScore);
        await this.submitScore(highScore);
    }
}
