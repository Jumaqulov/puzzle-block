export class Starfield {
    private canvas: HTMLCanvasElement | null = null;
    private ctx: CanvasRenderingContext2D | null = null;
    private stars: any[] = [];
    private dustParticles: any[] = [];
    private shootingStars: any[] = [];
    private width: number = 0;
    private height: number = 0;
    private animationId: number | null = null;
    private lastTime: number = 0;
    private isMobile: boolean = false;
    private frameSkip: number = 0;

    private config = {
        starCount: 150,
        dustCount: 50,
        maxShootingStars: 2,
        shootingStarChance: 0.001,
        colors: {
            white: 'rgba(255, 255, 255,',
            blue: 'rgba(180, 200, 255,',
            purple: 'rgba(200, 180, 255,',
            cyan: 'rgba(150, 220, 255,'
        }
    };

    constructor() {
        this.resize = this.resize.bind(this);
    }

    public init(): void {
        this.canvas = document.getElementById('starfield-canvas') as HTMLCanvasElement;
        if (!this.canvas) return;

        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            this.canvas.style.display = 'none';
            return;
        }

        this.isMobile = window.innerWidth < 768;
        if (this.isMobile) {
            this.config.starCount = 40;       // was 80
            this.config.dustCount = 10;        // was 25
            this.config.maxShootingStars = 1;  // was 2
            this.config.shootingStarChance = 0.0003;
        }

        this.ctx = this.canvas.getContext('2d', { alpha: true });
        this.resize();
        this.createStars();
        this.createDust();
        this.animate(0);

        window.addEventListener('resize', this.resize);
    }

    private resize(): void {
        if (!this.canvas) return;
        // Use lower resolution on mobile for performance
        const dpr = this.isMobile ? 1 : Math.min(window.devicePixelRatio || 1, 2);
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width * dpr;
        this.canvas.height = this.height * dpr;
        this.canvas.style.width = this.width + 'px';
        this.canvas.style.height = this.height + 'px';
        if (this.ctx) this.ctx.scale(dpr, dpr);

        if (this.stars.length > 0) {
            this.createStars();
            this.createDust();
        }
    }

    private createStars(): void {
        this.stars = [];
        const colors = Object.values(this.config.colors);

        for (let i = 0; i < this.config.starCount; i++) {
            const colorBase = colors[Math.floor(Math.random() * colors.length)];
            this.stars.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                radius: Math.random() * 1.5 + 0.5,
                colorBase: colorBase,
                alpha: Math.random() * 0.5 + 0.3,
                twinkleSpeed: Math.random() * 0.02 + 0.005,
                twinklePhase: Math.random() * Math.PI * 2,
                static: Math.random() > 0.7,
                currentAlpha: 0
            });
        }
    }

    private createDust(): void {
        this.dustParticles = [];
        for (let i = 0; i < this.config.dustCount; i++) {
            this.dustParticles.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                radius: Math.random() * 0.8 + 0.3,
                alpha: Math.random() * 0.2 + 0.05,
                speedX: (Math.random() - 0.5) * 0.15,
                speedY: Math.random() * 0.1 + 0.02,
                drift: Math.random() * Math.PI * 2
            });
        }
    }

    private createShootingStar(): void {
        if (this.shootingStars.length >= this.config.maxShootingStars) return;

        this.shootingStars.push({
            x: Math.random() * this.width,
            y: Math.random() * this.height * 0.3,
            length: Math.random() * 60 + 30,
            speed: Math.random() * 8 + 6,
            angle: Math.PI / 4 + (Math.random() - 0.5) * 0.3,
            alpha: 1,
            decay: Math.random() * 0.015 + 0.01
        });
    }

    private update(deltaTime: number): void {
        const time = performance.now() * 0.001;

        for (let i = 0; i < this.stars.length; i++) {
            const star = this.stars[i];
            if (!star.static) {
                star.twinklePhase += star.twinkleSpeed * deltaTime * 60;
                star.currentAlpha = star.alpha + Math.sin(star.twinklePhase) * 0.3;
                if (star.currentAlpha < 0.1) star.currentAlpha = 0.1;
                else if (star.currentAlpha > 1) star.currentAlpha = 1;
            } else {
                star.currentAlpha = star.alpha;
            }
        }

        for (let i = 0; i < this.dustParticles.length; i++) {
            const dust = this.dustParticles[i];
            dust.x += dust.speedX + Math.sin(time + dust.drift) * 0.05;
            dust.y += dust.speedY;
            if (dust.y > this.height) { dust.y = -5; dust.x = Math.random() * this.width; }
            if (dust.x < 0) dust.x = this.width;
            if (dust.x > this.width) dust.x = 0;
        }

        this.shootingStars = this.shootingStars.filter(star => {
            star.x += Math.cos(star.angle) * star.speed;
            star.y += Math.sin(star.angle) * star.speed;
            star.alpha -= star.decay;
            return star.alpha > 0 && star.x < this.width && star.y < this.height;
        });

        if (Math.random() < this.config.shootingStarChance) {
            this.createShootingStar();
        }
    }

    private draw(): void {
        if (!this.ctx) return;
        this.ctx.clearRect(0, 0, this.width, this.height);

        // Batch draw stars (no glow on mobile)
        for (let i = 0; i < this.stars.length; i++) {
            const star = this.stars[i];
            this.ctx.beginPath();
            this.ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = star.colorBase + star.currentAlpha + ')';
            this.ctx.fill();

            // Skip glow effect on mobile
            if (!this.isMobile && star.radius > 1 && star.currentAlpha > 0.5) {
                this.ctx.beginPath();
                this.ctx.arc(star.x, star.y, star.radius * 2, 0, Math.PI * 2);
                this.ctx.fillStyle = star.colorBase + (star.currentAlpha * 0.2) + ')';
                this.ctx.fill();
            }
        }

        // Dust
        this.ctx.globalAlpha = 0.6;
        for (let i = 0; i < this.dustParticles.length; i++) {
            const dust = this.dustParticles[i];
            this.ctx.beginPath();
            this.ctx.arc(dust.x, dust.y, dust.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(200, 180, 255, ${dust.alpha})`;
            this.ctx.fill();
        }
        this.ctx.globalAlpha = 1;

        // Shooting stars (skip gradient on mobile — use simple line)
        for (let i = 0; i < this.shootingStars.length; i++) {
            const star = this.shootingStars[i];
            if (this.isMobile) {
                // Simple line — no gradient
                this.ctx.beginPath();
                this.ctx.moveTo(star.x, star.y);
                this.ctx.lineTo(
                    star.x - Math.cos(star.angle) * star.length,
                    star.y - Math.sin(star.angle) * star.length
                );
                this.ctx.strokeStyle = `rgba(255, 255, 255, ${star.alpha})`;
                this.ctx.lineWidth = 1.5;
                this.ctx.stroke();
            } else {
                const gradient = this.ctx.createLinearGradient(
                    star.x, star.y,
                    star.x - Math.cos(star.angle) * star.length,
                    star.y - Math.sin(star.angle) * star.length
                );
                gradient.addColorStop(0, `rgba(255, 255, 255, ${star.alpha})`);
                gradient.addColorStop(0.3, `rgba(180, 200, 255, ${star.alpha * 0.6})`);
                gradient.addColorStop(1, 'rgba(180, 200, 255, 0)');

                this.ctx.beginPath();
                this.ctx.moveTo(star.x, star.y);
                this.ctx.lineTo(
                    star.x - Math.cos(star.angle) * star.length,
                    star.y - Math.sin(star.angle) * star.length
                );
                this.ctx.strokeStyle = gradient;
                this.ctx.lineWidth = 2;
                this.ctx.lineCap = 'round';
                this.ctx.stroke();

                this.ctx.beginPath();
                this.ctx.arc(star.x, star.y, 2, 0, Math.PI * 2);
                this.ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
                this.ctx.fill();
            }
        }
    }

    private animate(currentTime: number): void {
        const deltaTime = Math.min((currentTime - this.lastTime) / 16.67, 2);
        this.lastTime = currentTime;

        // On mobile: render every 2nd frame (≈30fps)
        if (this.isMobile) {
            this.frameSkip++;
            if (this.frameSkip % 2 === 0) {
                this.update(deltaTime);
                this.draw();
            }
        } else {
            this.update(deltaTime);
            this.draw();
        }

        this.animationId = requestAnimationFrame((t) => this.animate(t));
    }

    public destroy(): void {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        window.removeEventListener('resize', this.resize);
    }
}