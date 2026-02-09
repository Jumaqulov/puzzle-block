export type Language = 'en' | 'ru' | 'uz';

export class LocalizationManager {
    private static instance: LocalizationManager;

    public supportedLanguages: Language[] = ['en', 'ru', 'uz'];
    public currentLang: Language = 'uz';

    private translations: Record<Language, Record<string, string>> = {
        en: {
            game_title: 'CRYSTAL PUZZLE',
            loading: 'Loading...',
            score_label: 'Score',
            record_label: 'Record',
            game_over_title: 'Game Over',
            restart_button: 'Restart',
            share_button: 'Share',
            hammer_tool: 'Hammer',
            shuffle_tool: 'Shuffle',
            new_record: 'NEW RECORD!',
            combo_text: 'COMBO',
            excellent: 'EXCELLENT!',
            hammer_clear: 'HAMMER CLEAR!',
            landscape_warning_title: 'Please rotate your device',
            landscape_warning_text: 'This game only works in portrait mode',
            copied_to_clipboard: 'Copied to clipboard!',
            copy_failed: 'Failed to copy',
            share_not_supported: 'Sharing is not supported',
            share_message: 'I scored {score} points in Crystal Puzzle! Try it yourself!',
            share_title: 'Crystal Puzzle - Block Puzzle Game',
            share_modal_title: 'Share!',
            copy_link: 'Copy Link',
            instagram_note: 'Instagram sharing: Paste the copied link in your Instagram bio or story!',
            settings_title: 'Settings',
            settings_sound: 'Sound',
            settings_vibration: 'Vibration',
            settings_how_to_play: 'How to Play?',
            settings_reset: 'Reset Progress',
            howto_title: 'How to Play?',
            howto_step1: 'Drag shapes onto the game board',
            howto_step2: 'Fill a complete row or column — it clears automatically',
            howto_step3: 'Clear lines consecutively for combo bonuses and more points',
            howto_step4: 'Hammer clears a 3×3 area, Shuffle gives you new shapes',
            reset_confirm_title: 'Are you sure?',
            reset_confirm_text: 'All records and saved data will be deleted. This action cannot be undone.',
            reset_cancel: 'Cancel',
            reset_confirm: 'Reset',
            reset_success: 'Progress has been reset',
            no_blocks: 'No blocks!'
        },
        ru: {
            game_title: 'КРИСТАЛЛ ПАЗЛ',
            loading: 'Загрузка...',
            score_label: 'Счёт',
            record_label: 'Рекорд',
            game_over_title: 'Игра окончена',
            restart_button: 'Начать заново',
            share_button: 'Поделиться',
            hammer_tool: 'Молоток',
            shuffle_tool: 'Перемешать',
            new_record: 'НОВЫЙ РЕКОРД!',
            combo_text: 'КОМБО',
            excellent: 'ОТЛИЧНО!',
            hammer_clear: 'УДАР МОЛОТОМ!',
            landscape_warning_title: 'Пожалуйста, поверните устройство',
            landscape_warning_text: 'Эта игра работает только в вертикальном режиме',
            copied_to_clipboard: 'Скопировано!',
            copy_failed: 'Не удалось скопировать',
            share_not_supported: 'Функция не поддерживается',
            share_message: 'Я набрал {score} очков в Crystal Puzzle! Попробуй и ты!',
            share_title: 'Crystal Puzzle - Блок головоломка',
            share_modal_title: 'Поделиться!',
            copy_link: 'Скопировать ссылку',
            instagram_note: 'Делитесь через Instagram: Вставьте скопированную ссылку в био или историю Instagram!',
            settings_title: 'Настройки',
            settings_sound: 'Звук',
            settings_vibration: 'Вибрация',
            settings_how_to_play: 'Как играть?',
            settings_reset: 'Сбросить прогресс',
            howto_title: 'Как играть?',
            howto_step1: 'Перетащите фигуры на игровое поле',
            howto_step2: 'Заполните полный ряд или столбец — он очистится автоматически',
            howto_step3: 'Очищайте линии подряд для комбо-бонусов и больше очков',
            howto_step4: 'Молоток очищает область 3×3, Перемешать даёт новые фигуры',
            reset_confirm_title: 'Вы уверены?',
            reset_confirm_text: 'Все рекорды и сохранённые данные будут удалены. Это действие необратимо.',
            reset_cancel: 'Отмена',
            reset_confirm: 'Сбросить',
            reset_success: 'Прогресс сброшен',
            no_blocks: 'Нет блоков!'
        },
        uz: {
            game_title: 'KRISTAL PAZL',
            loading: 'Yuklanmoqda...',
            score_label: 'Ochko',
            record_label: 'Rekord',
            game_over_title: "O'yin tugadi",
            restart_button: 'Qayta boshlash',
            share_button: 'Ulashish',
            hammer_tool: "Bolg'a",
            shuffle_tool: 'Aralashtirish',
            new_record: 'YANGI REKORD!',
            combo_text: 'KOMBO',
            excellent: "A'LO!",
            hammer_clear: "BOLG'A ZARBI!",
            landscape_warning_title: "Iltimos, telefoningizni aylantiring",
            landscape_warning_text: "Bu o'yin faqat vertikal holatda ishlaydi",
            copied_to_clipboard: 'Nusxalandi!',
            copy_failed: 'Nusxalash amalga oshmadi',
            share_not_supported: "Ulashish qo'llab-quvvatlanmaydi",
            share_message: "Men Crystal Puzzle o'yinida {score} ochko to'pladim! Sen ham o'ynab ko'r!",
            share_title: 'Crystal Puzzle - Blok Boshqotirma',
            share_modal_title: 'Ulashing!',
            copy_link: 'Linkni nusxalash',
            instagram_note: "Instagram orqali ulashing: Nusxalangan linkni Instagram bio yoki story'ga joylashtiring!",
            settings_title: 'Sozlamalar',
            settings_sound: 'Ovoz',
            settings_vibration: 'Tebranish',
            settings_how_to_play: "Qanday o'ynaladi?",
            settings_reset: 'Progressni tozalash',
            howto_title: "Qanday o'ynaladi?",
            howto_step1: "Shakllarni sudrab o'yin maydoniga joylashtiring",
            howto_step2: "To'liq qator yoki ustunni to'ldiring — u avtomatik tozalanadi",
            howto_step3: "Ketma-ket tozalash combo beradi va ko'proq ochko olasiz",
            howto_step4: "Bolg'a 3×3 maydonni tozalaydi, Aralashtirish esa yangi shakllar beradi",
            reset_confirm_title: 'Ishonchingiz komilmi?',
            reset_confirm_text: "Barcha rekordlar va saqlangan ma'lumotlar o'chib ketadi. Bu amalni qaytarib bo'lmaydi.",
            reset_cancel: 'Bekor qilish',
            reset_confirm: 'Tozalash',
            reset_success: 'Progress tozalandi',
            no_blocks: "Bloklar yo'q!"
        }
    };

    private constructor() { }

    public static getInstance(): LocalizationManager {
        if (!LocalizationManager.instance) {
            LocalizationManager.instance = new LocalizationManager();
        }
        return LocalizationManager.instance;
    }

    public init(): void {
        const detectedLang = this.detectLanguage();
        this.setLanguage(detectedLang);
        this.initLanguageSelector();
        console.log(`[i18n] Language set to: ${this.currentLang}`);
    }

    private detectLanguage(): Language {
        // 1. Check Yandex Games SDK
        if (typeof window !== 'undefined' && window.ysdk) {
            try {
                const yandexLang = window.ysdk.environment.i18n.lang as Language;
                if (yandexLang && this.supportedLanguages.includes(yandexLang)) {
                    return yandexLang;
                }
            } catch (e) {
                console.log('[i18n] Yandex SDK not available');
            }
        }

        // 2. Check localStorage
        const savedLang = localStorage.getItem('crystal_puzzle_lang') as Language;
        if (savedLang && this.supportedLanguages.includes(savedLang)) {
            return savedLang;
        }

        // 3. Browser
        const browserLang = navigator.language || (navigator as any).userLanguage || 'en';
        const langCode = browserLang.split('-')[0].toLowerCase();

        const langMap: Record<string, Language> = {
            'en': 'en',
            'ru': 'ru',
            'uz': 'uz',
            'uk': 'ru',
            'be': 'ru',
            'kk': 'ru',
        };

        const mappedLang = langMap[langCode];
        if (mappedLang && this.supportedLanguages.includes(mappedLang)) {
            return mappedLang;
        }

        return 'uz';
    }

    public setLanguage(lang: string): void {
        if (!this.supportedLanguages.includes(lang as Language)) {
            console.warn(`[i18n] Unsupported language: ${lang}, falling back to uz`);
            lang = 'uz';
        }

        this.currentLang = lang as Language;
        localStorage.setItem('crystal_puzzle_lang', lang);
        document.documentElement.lang = lang;

        this.updateAllElements();
        this.updateSelectorState();

        window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
    }

    public t(key: string, fallback: string = ''): string {
        const translations = this.translations[this.currentLang];
        if (translations && translations[key]) {
            return translations[key];
        }
        const enTranslations = this.translations['en'];
        return (enTranslations && enTranslations[key]) || fallback || key;
    }

    public get(key: string, fallback: string = ""): string {
        return this.t(key, fallback);
    }

    public updateAllElements(): void {
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (key) {
                const translation = this.t(key);
                if (translation) {
                    el.textContent = translation;
                }
            }
        });
        document.title = this.t('game_title', 'Crystal Puzzle');
    }

    private initLanguageSelector(): void {
        const selector = document.getElementById('lang-selector');
        const toggle = document.getElementById('lang-toggle');

        if (!selector || !toggle) return;

        toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            selector.classList.toggle('open');
        });

        document.addEventListener('click', (e) => {
            const target = e.target as Node;
            if (!selector.contains(target)) {
                selector.classList.remove('open');
            }
        });

        const options = selector.querySelectorAll('.lang-option');
        options.forEach(option => {
            option.addEventListener('click', () => {
                const lang = option.getAttribute('data-lang');
                if (lang) {
                    this.setLanguage(lang);
                    selector.classList.remove('open');
                }
            });
        });

        this.updateSelectorState();
    }

    private updateSelectorState(): void {
        const currentLangEl = document.getElementById('lang-current');
        const options = document.querySelectorAll('.lang-option');

        if (currentLangEl) {
            currentLangEl.textContent = this.currentLang.toUpperCase();
        }

        options.forEach(option => {
            const lang = option.getAttribute('data-lang');
            option.classList.toggle('active', lang === this.currentLang);
        });
    }
}