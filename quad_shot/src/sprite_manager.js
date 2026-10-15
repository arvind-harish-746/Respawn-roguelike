// Quad Shot — Cyberpunk Sprite & Visual Effects Engine
// Integrates 20 character sheets, weapon icon sprites, and cartoon slash effect animations

export const SLASH_FRAME_COUNTS = {
    1: 10,
    2: 5,
    3: 10,
    4: 8,
    5: 8,
    6: 10,
    7: 10,
    8: 10,
    9: 8,
    10: 8
};

export class SpriteManager {
    constructor() {
        this.cache = new Map();
        this.weaponIcons = new Map();
        this.slashEffects = new Map(); // slashId -> Array of Image
        this.roster = null;
        this.currentView = 'topdown'; // 'topdown' (twin-stick) or 'ortho' (isometric RPG)
        this.loaded = false;
    }

    async init() {
        try {
            let resp = await fetch('sprites/character-sprites/release/roster.json');
            if (!resp.ok) {
                resp = await fetch('sprites/release/roster.json');
            }
            if (resp.ok) {
                const data = await resp.json();
                this.roster = data.roster;
            }
        } catch (e) {
            console.warn('Roster fetch error, using defaults', e);
        }

        // 1. Preload key sheets for player and enemies
        const preloadCharacters = [
            'VX-0024', // Null-7 (Player Origin Point)
            'VX-0001', // Neon Jack
            'VX-0012', // Cipher (Ray-Caster)
            'VX-0048', // Ledger (Tessellator)
            'VX-0042', // Static (Sine-Seeker)
            'VX-0156', // Wire (Scalar)
            'VX-0240', // Glitch (Delta Swarm)
            'VX-0036', // Grit (Boss)
        ];
        for (const seed of preloadCharacters) {
            await this.loadCharacter(seed, this.currentView);
        }

        // 2. Preload Weapon Icon Sprites (from sprites/weapon_sprites/1 Icons)
        const weaponIcons = [
            'Icon28_01.png', 'Icon28_05.png', 'Icon28_10.png', 'Icon28_15.png',
            'Icon28_20.png', 'Icon28_25.png', 'Icon28_30.png', 'Icon28_35.png', 'Gun_SineRifle.png', 'Gun_ParabolicMortar.png', 'Gun_ReflectionRay.png', 'Gun_TangentDisc.png', 'Gun_ScalarShotgun.png', 'Gun_FractalCluster.png', 'Gun_AsymptoteLaser.png', 'Gun_DopplerRepeater.png'
        ];
        for (const iconName of weaponIcons) {
            await this.loadWeaponIcon(iconName);
        }

        // 3. Preload Slash Animation Effect Sequences (from sprites/slash-sprite-cartoon-effects/PNG)
        const slashIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        for (const sId of slashIds) {
            await this.loadSlashEffect(sId);
        }

        this.loaded = true;
    }

    async loadCharacter(seed, view = 'topdown') {
        const key = `${seed}_${view}`;
        if (this.cache.has(key)) return this.cache.get(key);

        const primaryUrl = `sprites/character-sprites/release/cyber/${seed}_${view}_sheet.png`;
        const fallbackUrl = `sprites/release/cyber/${seed}_${view}_sheet.png`;
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
                if (img.src.includes('character-sprites')) {
                    img.src = fallbackUrl;
                } else if (view !== 'ortho') {
                    const fallbackImg = new Image();
                    fallbackImg.onload = () => {
                        const sheetData = { image: fallbackImg, meta };
                        this.cache.set(key, sheetData);
                        resolve(sheetData);
                    };
                    fallbackImg.onerror = () => resolve(null);
                    fallbackImg.src = `sprites/character-sprites/release/cyber/${seed}_ortho_sheet.png`;
                } else {
                    console.warn(`Could not load sprite sheet for ${seed}_${view}`);
                    resolve(null);
                }
            };
            img.src = primaryUrl;
        });
    }

    async loadWeaponIcon(iconFilename) {
        if (this.weaponIcons.has(iconFilename)) {
            return this.weaponIcons.get(iconFilename);
        }

        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                this.weaponIcons.set(iconFilename, img);
                resolve(img);
            };
            img.onerror = () => {
                console.warn(`Could not load weapon icon ${iconFilename}`);
                resolve(null);
            };
            img.src = `sprites/weapon_sprites/1 Icons/${iconFilename}`;
        });
    }

    getHeldIcon(weaponDef, combatMode) {
        if (combatMode === 'RANGED' && weaponDef && weaponDef.name) {
            const gun = 'Gun_' + weaponDef.name.replace(/ /g, '') + '.png';
            if (this.weaponIcons.has(gun)) return gun;
        }
        return weaponDef ? weaponDef.icon : null;
    }

    getWeaponIcon(iconFilename) {
        return this.weaponIcons.get(iconFilename) || null;
    }

    async loadSlashEffect(slashId) {
        if (this.slashEffects.has(slashId)) {
            return this.slashEffects.get(slashId);
        }

        const totalFrames = SLASH_FRAME_COUNTS[slashId] || 8;
        const frames = [];

        const promises = [];
        for (let i = 1; i <= totalFrames; i++) {
            const p = new Promise((resolve) => {
                const img = new Image();
                img.onload = () => resolve({ index: i - 1, img });
                img.onerror = () => resolve({ index: i - 1, img: null });
                img.src = `sprites/slash-sprite-cartoon-effects/PNG/${slashId}/${i}.png`;
            });
            promises.push(p);
        }

        const loadedFrames = await Promise.all(promises);
        loadedFrames.sort((a, b) => a.index - b.index);
        const validFrames = loadedFrames.map(f => f.img).filter(Boolean);
        this.slashEffects.set(slashId, validFrames);
        return validFrames;
    }

    getSlashFrameCount(slashId) {
        return SLASH_FRAME_COUNTS[slashId] || 8;
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

    drawWeapon(ctx, iconFilename, x, y, angle, scale = 1.0, glowColor = null, flipped = false) {
        const img = this.weaponIcons.get(iconFilename);
        if (!img) return false;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        if (flipped) {
            ctx.scale(1, -1);
        }

        ctx.imageSmoothingEnabled = false;

        if (glowColor) {
            ctx.shadowBlur = 14;
            ctx.shadowColor = glowColor;
        }

        const w = img.width * scale;
        const h = img.height * scale;
        // Center the weapon at origin
        ctx.drawImage(img, -w / 2, -h / 2, w, h);

        ctx.restore();
        return true;
    }

    drawSlash(ctx, slashId, frameIdx, x, y, angle, scale = 0.35, glowColor = null) {
        const frames = this.slashEffects.get(slashId);
        if (!frames || frames.length === 0) return false;

        const idx = Math.max(0, Math.min(frames.length - 1, frameIdx));
        const img = frames[idx];
        if (!img) return false;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);

        if (glowColor) {
            ctx.shadowBlur = 20;
            ctx.shadowColor = glowColor;
        }

        const w = 496 * scale;
        const h = 496 * scale;
        // Draw centered on origin
        ctx.drawImage(img, -w / 2, -h / 2, w, h);

        ctx.restore();
        return true;
    }

    angleToRow(vx, vy, directions = 8) {
        const theta = Math.atan2(vx, vy);
        let d = Math.round((theta / (2 * Math.PI)) * directions);
        return ((d % directions) + directions) % directions;
    }
}

export const spriteManager = new SpriteManager();
