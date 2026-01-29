export class SoundManager {
    private static instance: SoundManager;

    private context: AudioContext | null = null;
    private enabled: boolean = true;
    private muted: boolean = false;
    private initialized: boolean = false;
    private files: Record<string, HTMLAudioElement> = {};

    private constructor() { }

    public static getInstance(): SoundManager {
        if (!SoundManager.instance) {
            SoundManager.instance = new SoundManager();
        }
        return SoundManager.instance;
    }

    public init(): void {
        if (this.initialized) return;
        this.initialized = true;

        this.files = {
            drag: new Audio('sounds/click.wav'),
            place: new Audio('sounds/ding.wav'),
            clear: new Audio('sounds/boom.wav')
        };

        Object.values(this.files).forEach((audio) => {
            audio.preload = 'auto';
            audio.volume = 0.7;
        });

        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass && !this.context) {
            this.context = new AudioContextClass();
        }
    }

    public setMuted(muted: boolean): void {
        this.muted = muted;
        console.log(`[Sound] Muted: ${muted}`);

        Object.values(this.files).forEach((audio) => {
            audio.muted = muted;
        });

        if (this.context) {
            if (muted && this.context.state === 'running') {
                this.context.suspend();
            } else if (!muted && this.context.state === 'suspended') {
                this.context.resume();
            }
        }
    }

    public isMuted(): boolean {
        return this.muted;
    }

    public resume(): void {
        this.init();
        if (this.context && this.context.state === 'suspended' && !this.muted) {
            this.context.resume();
        }
    }

    private playTone(freq: number, duration: number, type: OscillatorType = 'sine', gain: number = 0.08): void {
        if (!this.enabled || this.muted) return;
        this.init();
        if (!this.context) return;

        const ctx = this.context;
        const oscillator = ctx.createOscillator();
        const volume = ctx.createGain();
        oscillator.type = type;
        oscillator.frequency.value = freq;
        volume.gain.value = gain;
        oscillator.connect(volume);
        volume.connect(ctx.destination);
        oscillator.start();

        // Use exponentialRampToValueAtTime for smooth decay
        // Needed to handle the volume ramp carefully to avoid errors if duration is too small
        try {
            volume.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
        } catch (e) {
            // Fallback linear ramp if exponential fails (sometimes happens with values near 0)
            volume.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);
        }

        oscillator.stop(ctx.currentTime + duration);
    }

    private playChord(freqs: number[], duration: number, type: OscillatorType = 'sine', gain: number = 0.05): void {
        freqs.forEach((freq) => this.playTone(freq, duration, type, gain));
    }

    public playFile(name: string): boolean {
        if (this.muted) return false;

        const audio = this.files[name];
        if (!audio) return false;

        const instance = audio.cloneNode(true) as HTMLAudioElement;
        instance.volume = audio.volume;
        instance.play().catch(() => { });
        return true;
    }

    public play(name: string): void {
        if (!this.enabled || this.muted) return;
        this.init();

        if (this.playFile(name)) return;

        // Procedural fallbacks if files missing or for specific effects
        switch (name) {
            case 'drag':
                this.playTone(240, 0.06, 'triangle', 0.06);
                break;
            case 'place':
                this.playChord([420, 620], 0.12, 'sine', 0.07);
                break;
            case 'clear':
                this.playChord([760, 980], 0.16, 'sine', 0.08);
                break;
            case 'gameover':
                this.playChord([180, 240], 0.4, 'sine', 0.06);
                break;
            case 'shuffle':
                this.playTone(300, 0.08, 'triangle', 0.06);
                break;
            case 'hammer':
                this.playTone(80, 0.15, 'sawtooth', 0.12);
                setTimeout(() => this.playChord([200, 400, 600], 0.2, 'sine', 0.08), 50);
                break;
        }
    }
}
