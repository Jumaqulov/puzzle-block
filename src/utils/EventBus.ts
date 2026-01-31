import Phaser from 'phaser';

export const EventBus = new Phaser.Events.EventEmitter();

export enum GameEvents {
    YANDEX_READY = 'yandex_ready',
    PLAYER_AUTHORIZED = 'player_authorized',
    GAME_DATA_LOADED = 'game_data_loaded',
    ACTIVATE_HAMMER = 'activate_hammer',
    ACTIVATE_SHUFFLE = 'activate_shuffle',
    REWARD_SUCCESS = 'reward_success',
    SCORE_UPDATED = 'score_updated',
    GAME_OVER = 'game_over'
}
