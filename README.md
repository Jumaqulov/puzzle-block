# Crystal Puzzle

Futuristik 8x8 kristal-blokli puzzle o'yini. To'liq front-end (HTML/CSS/JS) stackida yozilgan, Phaser 3 grafikasi, Web Audio effektlari, PWA manifesti va Yandex Games SDK (reklama, bulut saqlash, reytinglar) bilan integratsiyalangan.

## O'yin qanday ishlaydi
- Har doim 3 ta tasodifiy shakl paydo bo'ladi; har biri tortib olib 8x8 maydonga qo'yiladi. Uchalasini ham ishlatsangiz, yangilari keladi.
- Shakl qo'yilganda har bir blok uchun +10 ochko, to'liq qator/ustunlar olib tashlansa yuqori ball: baza 100, 2 qator = 1.5x, 3 qator = 2x, 4+ = 3x, streak multiplikatori (1 + 0.5 * streak) va 3+ qator uchun +500 "jackpot".
- "Hammer" power-up: reklamadan keyin 3x3 hududni tozalaydi (har blok uchun +5 ochko, ekranni titratish va portlash effektlari). "Shuffle": faollashgan shakllarni yangilaydi.
- Joylash mumkin bo'lmagan shakllar avtomatik xiralashadi; o'yin boshida qisqa qo'l animatsiyasi ko'rsatiladi. Hech bir shakl joylashmasa — o'yin tugaydi va restart/sharing tugmalari chiqadi.
- Web Share API orqali natijani ulashish, desktopda esa matn avtomatik clipboard'ga nusxalanadi.

## Asosiy texnologiyalar
- `index.html`: Yadro markup, PWA manifesti, Google Fonts, Phaser, Yandex Games SDK ulangan.
- `game.js`: Lokalizatsiya, Yandex SDK fallbeklari, ovoz menejeri, “cosmic starfield” fon animatsiyasi, o'yin sikli, scoring, combo va power-uplar.
- `styles.css`: Kosmik fon (nebula, chang, vignette), kursor va UI (HUD, modallar, power-up tugmalari, til menyusi) uchun styling. `prefers-reduced-motion` bo'yicha starfield o'chadi.
- Kutubxonalar: `assets/lib/phaser.min.js`, Phosphor ikon seti (`assets/lib/regular`), WAV tovushlar (`sounds`).
- PWA: `manifest.json` (maskable `assets/icon.png`, portret rejim, tema ranglari). Screenshots: `assets/Screenshot-*.png`.

## Lokalizatsiya
- Til aniqlash tartibi: Yandex SDK → `localStorage` (`crystal_puzzle_lang`) → brauzer tili → `uz` defolt.
- Qo'llab-quvvatlanadigan tillar: `uz`, `ru`, `en`. Tilni UI dagi til tanlagichidan almashtirish mumkin.
- Tarjima matnlari va yangi tillarni qo'shish: `LocalizationManager.translations` blokida (`game.js`).

## Yandex Games integratsiyasi
- Avto-aniqlash: agar Yandex muhitida bo'lmasa, dev/fallback rejimi ishga tushadi (power-uplar reklamasiz darhol faollashadi, audio mute/unmute ishlaydi, lekin reklamalar ko'tarilmaydi).
- Rewarded ads: `YandexGamesSDK.showRewardAd('hammer'|'shuffle')` tugmalar bosilganda chaqiriladi; muvaffaqiyatli ko'rsatishda tegishli power-up faollashadi.
- Interstitial: `onGameOver` ichida (Yandex'da) kechiktirib ko'rsatiladi.
- Reyting/bulut: rekordlar `crystal_puzzle_highscore` leaderboardiga yuboriladi; foydalanuvchi avtorizatsiya qilingan bo'lsa, bulutda saqlanadi. Aks holda `localStorage` (`ancient_treasures_high_score`) ishlatiladi.

## Vizual va audio jihatlar
- Fonga chuqur kosmik starfield (canvas), uchta nebula qatlamlari, chang va vignette overlay.
- Drag, joylash, line clear, shuffle va hammer uchun audio effektlar (`sounds/`), ads vaqtida avtomatik mute qilinadi.
- Hammer uchun shockwave, DOM-partikllar, combo matni va ekran titrashi orqali "game juice".

## Papka tuzilmasi
- `index.html` — kirish nuqtasi.
- `styles.css` — umumiy styling va animatsiyalar.
- `game.js` — o'yin logikasi, integratsiyalar va effektlar.
- `assets/` — `icon.png`, ko'rsatkich rasmlar, Phaser va ikon font.
- `sounds/` — WAV tovushlar.
- `manifest.json` — PWA sozlamalari.

## Lokal ishga tushirish
1) Har qanday statik serverdan foydalaning (brauzer xavfsizlik cheklovlarini chetlash uchun lokal fayl sifatida emas):
   - `npx http-server . -p 8080` yoki `python -m http.server 8080`
2) Brauzerda `http://localhost:8080/` ni oching.
- Yandex SDK lokal rejimda fallbek qiladi; power-uplar darhol ishlaydi, reklama ko'rsatilmaydi. Real reklamalar/bulut uchun Yandex Games iframe muhitida sinang.

## Konfiguratsiya uchun eslatmalar
- Power-up tugmalari, HUD va modal matnlari `LocalizationManager` orqali olinadi; yangi kalit qo'shsangiz, til tanlagichiga ham qo'shing (`index.html`).
- Reklama va leaderboard nomlari `YandexGamesSDK` blokida (`game.js`) sozlangan; kerak bo'lsa o'zgartiring.
- Starfield va nebula intensivligini kamaytirmoqchi bo'lsangiz, `Starfield.config` va CSS animatsiyalarini tahrir qiling.
