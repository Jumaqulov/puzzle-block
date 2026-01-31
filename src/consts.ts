export const CELL_SIZE = 50;

export interface BlockTextureConfig {
    key: string;
    fill: string;
    stroke: string;
}

export const BLOCK_TEXTURES: BlockTextureConfig[] = [
    { key: 'crystal_red', fill: '#FF0055', stroke: '#c00040' },
    { key: 'crystal_blue', fill: '#00D4FF', stroke: '#008db0' },
    { key: 'crystal_green', fill: '#39FF14', stroke: '#26b50e' },
    { key: 'crystal_purple', fill: '#BC13FE', stroke: '#7f0bb0' },
    { key: 'crystal_yellow', fill: '#FFD700', stroke: '#c9a500' }
];

export interface ShapeDef {
    name: string;
    blocks: number[][];
    minX?: number;
    maxX?: number;
    minY?: number;
    maxY?: number;
    width?: number;
    height?: number;
}

export const SHAPE_DEFS: ShapeDef[] = [
    { name: 'single', blocks: [[0, 0]] },
    { name: 'domino_h', blocks: [[0, 0], [1, 0]] },
    { name: 'domino_v', blocks: [[0, 0], [0, 1]] },
    { name: 'bar3_h', blocks: [[0, 0], [1, 0], [2, 0]] },
    { name: 'bar3_v', blocks: [[0, 0], [0, 1], [0, 2]] },
    { name: 'square2', blocks: [[0, 0], [1, 0], [0, 1], [1, 1]] },
    { name: 'el_small', blocks: [[0, 0], [0, 1], [1, 1]] },
    { name: 'el_large', blocks: [[0, 0], [0, 1], [0, 2], [1, 2]] },
    { name: 'el_large_rev', blocks: [[1, 0], [1, 1], [1, 2], [0, 2]] },
    { name: 'rect3x2', blocks: [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]] },
    { name: 'rect2x3', blocks: [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2], [1, 2]] },
    { name: 'tee', blocks: [[0, 0], [1, 0], [2, 0], [1, 1]] },
    { name: 'ess', blocks: [[1, 0], [2, 0], [0, 1], [1, 1]] },
    { name: 'zee', blocks: [[0, 0], [1, 0], [1, 1], [2, 1]] },
    { name: 'plus', blocks: [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]] }
];

export const GAME_CONFIG = {
    width: 450,
    height: 700,
    backgroundColor: '#0F051D',
    minWidth: 320,
    minHeight: 480,
    maxWidth: 540,
    maxHeight: 960,

    gridSize: 8,
    dockPaddingX: 16,
    slotGap: 40,
    dockScale: 0.75,

    // Scoring
    basePointsPerLine: 100,
    pointsPerBlock: 10,
    jackpotBonus: 500,

    // Depth Values
    depth: {
        board: 1,
        gridFill: 2,
        gridGlow: 3,
        grid: 4,
        placed: 6,
        dockBase: 8,
        dock: 10,
        dragging: 100
    },

    // Colors
    colors: {
        background: 0x0F051D,
        boardMain: 0x1e0b36,
        boardStroke: 0x3d1c71,
        gridGlow: 0xbc13fe,
        error: 0xff4444,
        crystalGlow: 0xbc13fe
    }
};

export const SECURITY_CONFIG = {
    salt: 'crystal_puzzle_secret_key_2024'
};
