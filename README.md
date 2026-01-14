# 💎 Crystal Puzzle - Project Overview

## 🎮 Game Description
**Crystal Puzzle** is a high-polish, "1010!"-style block puzzle game set in a mesmerizing deep space environment. Players drag and drop jewel-like tetromino shapes onto a grid to form complete lines. The game is designed for maximum player engagement ("High Dopamine") through satisfying visual effects, deep soundscapes, and a rewarding scoring system.

## 🛠️ Technology Stack
*   **Engine:** [Phaser 3.60.0](https://phaser.io/) (WebGL/Canvas)
*   **Language:** JavaScript (ES6+)
*   **Styling:** CSS3 (Variables, Flexbox, Glassmorphism effects)
*   **Markup:** HTML5 (Semantic, optimized for mobile)
*   **Monetization & Platform:** Yandex Games SDK (v2)
*   **Build Tooling:** None (Vanilla JS implementation for ease of editing)

## 🌟 Key Features

### 1. Core Gameplay
*   **Grid System:** 10x10 Grid where players place random shapes.
*   **Mechanics:** Drag & drop controls with "snap-to-grid" logic.
*   **Line Clearing:** Classic row/column clearing logic.
*   **Game Over:** Triggers when no shapes can fit on the board; shapes turn grey (`alpha: 0.4`) as a visual hint.

### 2. "High-Dopamine" Scoring System
*   **Placement Rewards:** Instant points for every block placed.
*   **Advanced Multipliers:**
    *   1 Line: Base score
    *   2 Lines: 1.5x Multiplier
    *   3 Lines: 2.0x Multiplier
    *   4+ Lines: 3.0x Multiplier
*   **Combo Streak:** Consecutive line clears build a "Streak Multiplier" regarding of how many lines are cleared.
*   **Jackpot:** +500 point bonus for clearing 3 or more lines at once.

### 3. Visual & Audio Experience (The "Juice")
*   **Theme:** Deep Space Nebula with dynamic breathing animations and floating cosmic dust.
*   **UI Style:** Glassmorphism (frosted glass) panels, neon glows (`#BC13FE`, `#00D4FF`), and "Exo 2" / "Orbitron" typography.
*   **VFX:**
    *   Particle explosions on block clear.
    *   Screen shake (Light, Medium, Heavy intensities).
    *   Floating score popups ("+30", "EXCELLENT!").
    *   Line flash effects.
*   **Audio:** Synthesized sound effects (Sine/Sawtooth waves) generated via Web Audio API (no external mp3s needed).

### 4. Power-Ups & Monetization
*   **Tools:**
    *   🔨 **Hammer:** Clears a 3x3 area of blocks.
    *   🔀 **Shuffle:** Refreshes the available shapes in the dock.
*   **Integration:** Tools are unlocked by watching Rewarded Video Ads (Yandex Games SDK).
*   **UI:** Professional "AD" corner badges on tool buttons.

### 5. Localization (i18n)
*   Top-level `LocalizationManager` object.
*   Supports: **English (en)**, **Russian (ru)**, **Uzbek (uz)**.
*   Auto-detection via Yandex SDK environment or Browser language.
*   Persists language preference in `localStorage`.

## 📂 Project Structure

### `game.js` (The Brain)
Contains the entire game logic within a single Phaser Scene (`create`, `update`).
*   **Custom Objects:** `LocalizationManager`, `SoundManager` (Web Audio), `GameJuice` (VFX), `YandexGamesSDK`.
*   **Key Functions:**
    *   `spawnAllShapes()`: Spawns new shapes in the dock.
    *   `checkAndClearLines()`: Core grid logic.
    *   `updateShapeVisuals()`: Checks fit and greys out unplayable shapes.
    *   `applyHammerEffect()`: Logic for power-up destruction.

### `styles.css` (The Look)
Handles the non-canvas UI overlay.
*   **Layout:** Responsive 3-column layout (HUD - Game - Powerups) using Flexbox.
*   **Responsiveness:** Mobile-first media queries to adjust layout for phones vs tablets/desktops.
*   **Effects:** CSS Animations (`nebulaBreath`, `dustDrift`, `pulse`, `modalPop`).

### `index.html` (The Skeleton)
*   Loads fonts (Google Fonts: Orbitron, Exo 2).
*   Initializes Yandex SDK in `<head>`.
*   Contains the DOM Overlay UI (Splash screen, HUD, Buttons, Modals).

## 🚀 Deployment
*   **PWA Ready:** manifest.json included.
*   **CSP Compliance:** All scripts and styles are local or standard CDNs (Phaser), compliant with Yandex Games CSP policies.
