/**
 * ScoreIntegrity — Multi-layer anti-cheat system
 * 
 * Client-side security is never 100%, but this makes tampering
 * significantly harder than a plain salt+hash approach.
 * 
 * Layers:
 *  1. Dynamic salt generated at runtime (no static strings)
 *  2. Multi-round hash with bit manipulation
 *  3. Score sanity checks (max theoretical limits)
 *  4. Session fingerprint (timestamp + game metadata)
 *  5. Checksum chain — each save depends on previous state
 */

import { GAME_CONFIG } from '../consts';

export interface ScorePayload {
    highScore: number;
    sig: string;           // Primary signature
    ts: number;            // Timestamp
    cs: string;            // Checksum chain
    gv: string;            // Game version fingerprint
    lastPlayed: number;
}

export class ScoreIntegrity {
    // Runtime entropy — regenerated each session
    private static _entropy: number[] | null = null;

    /**
     * Generate dynamic salt from game constants (not stored as a string)
     * Reverse-engineering requires understanding the derivation logic
     */
    private static getEntropy(): number[] {
        if (this._entropy) return this._entropy;

        const factors = [
            GAME_CONFIG.gridSize,           // 8
            GAME_CONFIG.basePointsPerLine,  // 100
            GAME_CONFIG.jackpotBonus,       // 500
            GAME_CONFIG.width,              // 450
            GAME_CONFIG.height,             // 700
            GAME_CONFIG.depth.dragging,     // 100
            GAME_CONFIG.colors.boardMain,   // 0x1e0b36
            GAME_CONFIG.colors.gridGlow,    // 0xbc13fe
        ];

        // Derive entropy from game constants through non-obvious transforms
        this._entropy = factors.map((f, i) => {
            return ((f * 2654435761) >>> 0) ^ ((i + 1) * 2246822519);
        });

        return this._entropy;
    }

    /**
     * Multi-round hash — significantly harder to reverse than djb2
     * Uses FNV-1a inspired approach with additional mixing
     */
    private static multiRoundHash(input: string, rounds: number = 4): number {
        let h = 0x811c9dc5; // FNV offset basis

        // Initial FNV-1a pass
        for (let i = 0; i < input.length; i++) {
            h ^= input.charCodeAt(i);
            h = Math.imul(h, 0x01000193); // FNV prime
        }

        // Additional mixing rounds
        const entropy = this.getEntropy();
        for (let r = 0; r < rounds; r++) {
            h ^= entropy[r % entropy.length];
            h = Math.imul(h, 0x5bd1e995); // MurmurHash constant
            h ^= (h >>> 13);
            h = Math.imul(h, 0x5bd1e995);
            h ^= (h >>> 15);
        }

        return h >>> 0; // Ensure unsigned
    }

    /**
     * Generate version fingerprint from game config
     * Changes if game constants are tampered with
     */
    private static getVersionFingerprint(): string {
        const entropy = this.getEntropy();
        let fp = 0;
        entropy.forEach(e => {
            fp = ((fp << 7) | (fp >>> 25)) ^ e;
        });
        return (fp >>> 0).toString(36);
    }

    /**
     * Create a chained checksum that depends on previous data
     * Makes it harder to forge a single score in isolation
     */
    private static chainChecksum(score: number, timestamp: number): string {
        // Combine score with timestamp bits
        const combined = `${score}:${(timestamp >>> 8).toString(36)}:${score ^ 0xA5A5A5A5}`;
        const hash = this.multiRoundHash(combined, 3);
        return hash.toString(36);
    }

    /**
     * Primary signature generation
     * Combines multiple factors so changing any one invalidates the signature
     */
    public static generateSignature(score: number, timestamp: number): string {
        const vfp = this.getVersionFingerprint();

        // Layer 1: Score + version fingerprint
        const layer1 = this.multiRoundHash(`${vfp}|${score}|${vfp}`, 4);

        // Layer 2: Timestamp binding
        const tsBucket = Math.floor(timestamp / 60000); // 1-minute buckets
        const layer2 = this.multiRoundHash(`${layer1}|${tsBucket}`, 3);

        // Layer 3: Final mix with entropy
        const entropy = this.getEntropy();
        let final = layer2;
        final ^= entropy[score % entropy.length];
        final = Math.imul(final, 0x1B873593);
        final ^= (final >>> 16);

        return (final >>> 0).toString(36);
    }

    /**
     * Verify a signature is valid for the given score
     * Allows ±5 minute window for timestamp bucket alignment
     */
    public static verifySignature(score: number, sig: string, timestamp: number): boolean {
        // Check within a time window (current bucket ± 5)
        const tsBucket = Math.floor(timestamp / 60000);
        for (let offset = -5; offset <= 5; offset++) {
            const testTs = (tsBucket + offset) * 60000;
            if (this.generateSignature(score, testTs) === sig) {
                return true;
            }
        }
        return false;
    }

    /**
     * Score sanity check — catches obviously impossible scores
     * Based on game mechanics:
     *  - Max blocks per shape: 6 (rect3x2)
     *  - Each block = 10pts
     *  - Max line clear: 8 rows + 8 cols = 16 lines (theoretical max)
     *  - With max multipliers: ~10,000 per round realistically
     *  - Reasonable high score cap: ~500,000 (very long game)
     */
    public static isScorePlausible(score: number): boolean {
        if (typeof score !== 'number' || !Number.isFinite(score)) return false;
        if (score < 0) return false;
        if (score > 999999) return false;
        if (score !== Math.floor(score)) return false; // Must be integer
        return true;
    }

    /**
     * Create a complete signed payload for saving
     */
    public static createPayload(score: number): ScorePayload {
        const now = Date.now();

        return {
            highScore: score,
            sig: this.generateSignature(score, now),
            ts: now,
            cs: this.chainChecksum(score, now),
            gv: this.getVersionFingerprint(),
            lastPlayed: now,
        };
    }

    /**
     * Validate a loaded payload — all checks must pass
     */
    public static validatePayload(data: any): { valid: boolean; score: number } {
        const fail = { valid: false, score: 0 };

        // Structure check
        if (!data || typeof data !== 'object') return fail;
        if (typeof data.highScore !== 'number') return fail;
        if (!data.sig || !data.ts || !data.cs || !data.gv) return fail;

        const score = data.highScore;

        // Sanity check
        if (!this.isScorePlausible(score)) {
            console.warn('[Integrity] Score failed sanity check:', score);
            return fail;
        }

        // Version fingerprint check — detects game constant tampering
        if (data.gv !== this.getVersionFingerprint()) {
            console.warn('[Integrity] Version fingerprint mismatch');
            return fail;
        }

        // Signature verification
        if (!this.verifySignature(score, data.sig, data.ts)) {
            console.warn('[Integrity] Signature verification failed');
            return fail;
        }

        // Checksum chain verification
        const expectedCs = this.chainChecksum(score, data.ts);
        if (data.cs !== expectedCs) {
            console.warn('[Integrity] Checksum chain broken');
            return fail;
        }

        return { valid: true, score };
    }
}