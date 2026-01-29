import { SoundManager } from './SoundManager';


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
        // Safe check for window existence
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
            // Dynamic SDK Loading
            if (typeof YaGames === 'undefined') {
                await this.loadSDKScript();
            }

            // Initialize SDK
            this.ysdk = await YaGames.init();
            window.ysdk = this.ysdk;

            console.log('[YaSDK] SDK initialized successfully');

            await this.initPlayer();
            await this.loadGameData();

            this.isInitialized = true;

            window.dispatchEvent(new CustomEvent('yandexSDKReady', {
                detail: { sdk: this.ysdk, player: this.player }
            }));

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
        window.dispatchEvent(new CustomEvent('yandexSDKReady', {
            detail: { sdk: null, player: null }
        }));
    }

    public async initPlayer(): Promise<YandexPlayer | null> {
        if (!this.ysdk) return null;

        try {
            this.player = await this.ysdk.getPlayer({ scopes: false } as any); // Type assertion if needed
            const mode = this.player.getMode();
            this.isAuthorized = (mode !== 'lite');

            if (this.isAuthorized) {
                const name = this.player.getName();
                const photo = this.player.getPhoto('medium');
                console.log(`[YaSDK] Player: ${name}`);

                window.dispatchEvent(new CustomEvent('playerAuthorized', {
                    detail: { name, photo }
                }));
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

        return new Promise((resolve) => {
            this.isAdShowing = true;
            this.ysdk!.adv.showRewardedVideo({
                callbacks: {
                    onOpen: () => {
                        SoundManager.getInstance().setMuted(true);
                        if (typeof window.game !== 'undefined' && window.game && window.game.loop) {
                            window.game.loop.sleep();
                        }
                        if (this.callbacks.onAdOpen) this.callbacks.onAdOpen();
                    },
                    onClose: () => {
                        this.isAdShowing = false;
                        SoundManager.getInstance().setMuted(false);
                        if (typeof window.game !== 'undefined' && window.game && window.game.loop) {
                            window.game.loop.wake();
                        }
                        if (this.callbacks.onAdClose) this.callbacks.onAdClose();
                        resolve(true); // Assuming success if closed normally
                    },
                    onRewarded: () => {
                        this.grantReward(rewardType);
                        if (this.callbacks.onRewardGranted) {
                            this.callbacks.onRewardGranted(rewardType);
                        }
                    },
                    onError: (e: any) => {
                        this.isAdShowing = false;
                        SoundManager.getInstance().setMuted(false);
                        if (typeof window.game !== 'undefined' && window.game && window.game.loop) {
                            window.game.loop.wake();
                        }
                        console.error('Ad Error', e);
                        resolve(false);
                    }
                }
            });
        });
    }

    private grantReward(rewardType: string): void {
        switch (rewardType) {
            case 'hammer':
                window.dispatchEvent(new CustomEvent('activateHammer'));
                break;
            case 'shuffle':
                window.dispatchEvent(new CustomEvent('activateShuffle'));
                break;
        }
    }

    public async showInterstitialAd(): Promise<boolean> {
        if (!this.ysdk || this.isAdShowing) return false;

        return new Promise((resolve) => {
            this.isAdShowing = true;

            this.ysdk!.adv.showFullscreenAdv({
                callbacks: {
                    onOpen: () => {
                        SoundManager.getInstance().setMuted(true);
                        if (typeof window.game !== 'undefined' && window.game && window.game.loop) {
                            window.game.loop.sleep();
                        }
                        if (this.callbacks.onAdOpen) this.callbacks.onAdOpen();
                    },
                    onClose: (wasShown: boolean) => {
                        this.isAdShowing = false;
                        SoundManager.getInstance().setMuted(false);
                        if (typeof window.game !== 'undefined' && window.game && window.game.loop) {
                            window.game.loop.wake();
                        }
                        if (this.callbacks.onAdClose) this.callbacks.onAdClose();
                        resolve(wasShown);
                    },
                    onError: (_e: any) => {
                        this.isAdShowing = false;
                        SoundManager.getInstance().setMuted(false);
                        if (typeof window.game !== 'undefined' && window.game && window.game.loop) {
                            window.game.loop.wake();
                        }
                        resolve(false);
                    },
                    onOffline: () => {
                        this.isAdShowing = false;
                        SoundManager.getInstance().setMuted(false);
                        if (typeof window.game !== 'undefined' && window.game && window.game.loop) {
                            window.game.loop.wake();
                        }
                        resolve(false);
                    }
                }
            });
        });
    }

    // ... save/load methods ...

    public async saveGameData(data: any): Promise<boolean> {
        // ... implementation existing ...
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
        if (!this.player || !this.isAuthorized) {
            try {
                const data = localStorage.getItem('crystal_puzzle_data');
                if (data) {
                    const parsed = JSON.parse(data);
                    window.dispatchEvent(new CustomEvent('gameDataLoaded', { detail: parsed }));
                    return parsed;
                }
            } catch (e) { }
            return null;
        }

        try {
            const data = await this.player.getData();
            window.dispatchEvent(new CustomEvent('gameDataLoaded', { detail: data }));
            return data;
        } catch (error) {
            return null;
        }
    }

    public async saveHighScore(score: number): Promise<boolean> {
        return await this.saveGameData({
            highScore: score,
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
