# 💎 Crystal Puzzle

**Crystal Puzzle** — bu zamonaviy "1010!" uslubidagi blok-topishmoq o'yini bo'lib, chuqur kosmos (Deep Space) mavzusida yaratilgan. O'yin yuqori sifatli vizual effektlar, "High Dopamine" ball tizimi va Yandex Games platformasi uchun to'liq optimallashtirilgan arxitekturaga ega.

## 🚀 Texnologiyalar

Loyiha eng so'nggi zamonaviy texnologiyalar asosida qayta qurildi:

*   **Engine:** [Phaser 3.80.0](https://phaser.io/)
*   **Language:** TypeScript (Strict Mode)
*   **Build Tool:** [Vite](https://vitejs.dev/)
*   **UI Icons:** `@phosphor-icons/web` (NPM paket)
*   **Styling:** Modern CSS3 (Glassmorphism, CSS Variables, Animations)
*   **Platform:** Yandex Games SDK (v2) integratsiyasi

## 🌟 Asosiy Xususiyatlar

### 1. "High-Dopamine" Ball Tizimi
*   **Line Clear Multipliers:** Bir vaqtning o'zida bir nechta qatorni o'chirish uchun oshirilgan ballar (1.5x, 2.0x, 3.0x).
*   **Combo Streak:** Ketma-ket qator o'chirishlar uchun qo'shimcha koeffitsiyentlar.
*   **Jackpot Bonus:** 3 va undan ortiq qatorni bir vaqtda o'chirganda +500 ball.

### 2. Vizual va Effektlar (The "Juice")
*   **Kosmik Muhit:** Dinamik "Starfield" foni va nebula effektlari.
*   **Vizual Feedback:** Bloklar o'chirilganda zarrachalar (particles) portlashi, ekranning silkinishi (Screen Shake) va uchuvchi matnlar.
*   **Smart Greying:** Dock'dagi shakllarni joylashtirish imkoni bo'lmaganda ular avtomatik ravishda kulrang rangga kiradi.

### 3. Power-Ups (Yordamchi Asboblar)
*   🔨 **Bolg'a (Hammer):** 3x3 sohadagi bloklarni tozalaydi.
*   🔀 **Aralashtirish (Shuffle):** Dock'dagi shakllarni yangisiga almashtiradi.
*   *Eslatma: Bu asboblar Yandex Reklama (Rewarded Ads) orqali ochiladi.*

### 4. Lokalizatsiya (i18n)
*   O'yin 3 xil tilda ishlaydi: **O'zbek (uz)**, **Rus (ru)**, **Ingliz (en)**.
*   Til avtomatik ravishda Yandex SDK yoki brauzer tiliga qarab aniqlanadi.

## 📂 Loyiha Strukturasi

*   `src/` — Barcha TypeScript manba kodlari.
    *   `scenes/` — Phaser sahnalari (Boot, Game).
    *   `managers/` — Sound, Localization va Yandex integratorlari.
    *   `visuals/` — Starfield va boshqa vizual tizimlar.
*   `public/` — Statik aktivlar (rasmlar, tovushlar, manifest).
*   `dist/` — Deployment uchun tayyor build fayllari.
*   `styles.css` — UI va animatsiyalar uchun asosiy CSS.

## 🛠 O'rnatish va Ishga tushirish

1.  Bog'liqliklarni o'rnating:
    ```bash
    npm install
    ```

2.  Development rejimida ishga tushirish:
    ```bash
    npm run dev
    ```

3.  Production uchun build tayyorlash:
    ```bash
    npm run build
    ```

## 📜 Litsenziya

Faqat shaxsiy portfolio va Yandex Games platformasi uchun mo'ljallangan.
