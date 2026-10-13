// Quad Shot — Cyberpunk Sprite System
// Integrates the 20 pre-baked cyberpunk characters from /sprites

export class SpriteManager {
    constructor() {
        this.cache = new Map();
        this.roster = null;
        this.currentView = 'topdown'; // 'topdown' (twin-stick) or 'ortho' (isometric RPG)
        this.loaded = false;
    }

    async init() {
        try {
            const resp = await fetch('sprites/release/roster.json');
            if (resp.ok) {
                const data = await resp.json();
                this.roster = data.roster;
            }
        } catch (e) {
            console.warn('Roster fetch error, using defaults', e);
        }

        // Preload key sheets for player and enemies
        const preloadList = [
            'VX-0024', // Null-7 (Player Origin Point)
            'VX-0001', // Neon Jack
            'VX-0012', // Cipher (Ray-Caster)
            'VX-0048', // Ledger (Tessellator)
            'VX-0042', // Static (Sine-Seeker)
            'VX-0156', // Wire (Scalar)
            'VX-0240', // Glitch (Delta Swarm)
            'VX-0036', // Grit (Boss)
        ];

        for (const seed of preloadList) {
            await this.loadCharacter(seed, this.currentView);
        }
        this.loaded = true;
    }

    async loadCharacter(seed, view = 'topdown') {
        const key = `${seed}_${view}`;
        if (this.cache.has(key)) return this.cache.get(key);

        const pngUrl = `sprites/release/cyber/${seed}_${view}_sheet.png`;
        const meta = {
            cellW: 56,
            cellH: 84,
            directions: 8,
            frames: 6
        };

        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const sheetData = { image: img, meta };
                this.cache.set(key, sheetData);
                resolve(sheetData);
            };
            img.onerror = () => {
                // Try fallback to ortho if topdown fails
                if (view !== 'ortho') {
                    const fallbackImg = new Image();
                    fallbackImg.onload = () => {
                        const sheetData = { image: fallbackImg, meta };
                        this.cache.set(key, sheetData);
                        resolve(sheetData);
                    };
                    fallbackImg.onerror = () => resolve(null);
                    fallbackImg.src = `sprites/release/cyber/${seed}_ortho_sheet.png`;
                } else {
                    resolve(null);
                }
            };
            img.src = pngUrl;
        });
    }

    angleToRow(vx, vy, directions = 8) {
        // Row 0 = facing down (screen Y+ = down)
        // theta: 0 is down, Math.PI/2 is right, Math.PI is up, -Math.PI/2 is left
        const theta = Math.atan2(vx, vy);
        let d = Math.round((theta / (2 * Math.PI)) * directions);
        return ((d % directions) + directions) % directions;
    }

    draw(ctx, seed, dirRow, frameIdx, x, y, scale = 0.65, glowColor = null) {
        const key = `${seed}_${this.currentView}`;
        const sheet = this.cache.get(key) || this.cache.get(`${seed}_ortho`);
        if (!sheet) return false;

        const { image, meta } = sheet;
        const dir = Math.max(0, Math.min(meta.directions - 1, dirRow));
        const frame = Math.max(0, Math.min(meta.frames - 1, frameIdx));

        const sx = frame * meta.cellW;
        const sy = dir * meta.cellH;
        const dw = meta.cellW * scale;
        const dh = meta.cellH * scale;

        ctx.save();
        ctx.imageSmoothingEnabled = false;

        if (glowColor) {
            ctx.shadowBlur = 12;
            ctx.shadowColor = glowColor;
        }

        ctx.drawImage(
            image,
            sx, sy, meta.cellW, meta.cellH,
            x - dw / 2, y - dh / 2, dw, dh
        );

        ctx.restore();
        return true;
    }
}

export const spriteManager = new SpriteManager();
