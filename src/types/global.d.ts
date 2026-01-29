export { };

declare global {
    interface Window {
        ysdk: YandexSDK | null;
        YandexGamesSDKEnvironment?: any;
        LocalizationManager: any;
        GameJuice: any;
        game: Phaser.Game | null;
    }

    var YaGames: YaGames;

    interface YandexPlayer {
        getMode(): 'lite' | '';
        getName(): string;
        getPhoto(size: 'small' | 'medium' | 'large'): string;
        getData(keys?: string[]): Promise<any>;
        setData(data: any, flush?: boolean): Promise<void>;
        getStats(keys?: string[]): Promise<any>;
        setStats(stats: any): Promise<void>;
        incrementStats(stats: any): Promise<void>;
    }

    interface YandexLeaderboard {
        setLeaderboardScore(leaderboardName: string, score: number, extraData?: string): Promise<void>;
        getLeaderboardEntries(leaderboardName: string, options?: {
            quantityTop?: number;
            includeUser?: boolean;
            quantityAround?: number;
        }): Promise<any>;
    }

    interface YandexAuth {
        openAuthDialog(): Promise<void>;
    }

    interface YandexAdv {
        showFullscreenAdv(options?: {
            callbacks?: {
                onClose?: (wasShown: boolean) => void;
                onOpen?: () => void;
                onError?: (error: any) => void;
                onOffline?: () => void;
            }
        }): void;
        showRewardedVideo(options?: {
            callbacks?: {
                onOpen?: () => void;
                onRewarded?: () => void;
                onClose?: () => void;
                onError?: (error: any) => void;
            }
        }): void;
    }

    interface YandexSDK {
        getPlayer(options?: any): Promise<YandexPlayer>;
        auth: YandexAuth;
        adv: YandexAdv;
        getLeaderboards(): Promise<YandexLeaderboard>;
        getEnvironment(): any;
        deviceInfo: {
            type: string; // 'desktop' | 'mobile' | 'tablet'
            isMobile: () => boolean;
            isTablet: () => boolean;
            isDesktop: () => boolean;
        };
        environment: {
            i18n: {
                lang: string;
                tld: string;
            }
        }
        features: {
            LoadingAPI?: {
                ready(): void;
            }
        }
    }

    interface YaGames {
        init(): Promise<YandexSDK>;
    }
}
