// Quad Shot — Economy, Sustain & Meta-Matrix Progression
import { audio } from './audio.js';

export class MetaProgression {
    constructor() {
        this.primeMatrices = 0;
        this.vertices = 0;
        this.runVertices = 0;

        // Algorithmic Tree
        this.upgrades = {
            vectorProcessing: 0, // Level 0..2 (+30 speed, +1 dash charge per lvl)
            kineticDampening: 0, // Level 0..3 (-20% collision damage per lvl)
            matrixExpansion: 0,  // Level 0..3 (+25 max HP, +2 HP/s regen per lvl)
            initialMatrix: 0,    // Level 0..1 (Start with Grade II weapon)
            trapCalibration: 0   // Level 0..3 (-10% trap recharge time per lvl)
        };

        // Chromatic Shifts (Unlocked Palettes)
        this.palette = 'CYBER'; // CYBER, ULTRAVIOLET, THERMAL, MATRIX, MONOCHROME
        this.unlockedPalettes = ['CYBER'];

        // Run Temporary Modifiers
        this.elasticCollision = false; // +15% ricochet damage
        this.terminalVelocity = false; // Speed boost on max speed kill
        this.vampiricVectors = true;   // Critical flanking heals structural HP

        // Load saved progression from localStorage if available
        this.load();
    }

    convertRunVerticesToPrimeMatrices() {
        const gainedPrime = Math.floor(this.runVertices / 10);
        this.primeMatrices += gainedPrime;
        const remainder = this.runVertices % 10;
        this.runVertices = 0;
        this.save();
        return gainedPrime;
    }

    addVertices(amount) {
        this.runVertices += amount;
        this.vertices += amount;
    }

    upgrade(nodeKey, cost) {
        if (this.primeMatrices >= cost) {
            this.primeMatrices -= cost;
            this.upgrades[nodeKey] = (this.upgrades[nodeKey] || 0) + 1;
            this.save();
            audio.playChime('drop');
            return true;
        }
        return false;
    }

    unlockPalette(name, cost) {
        if (this.primeMatrices >= cost && !this.unlockedPalettes.includes(name)) {
            this.primeMatrices -= cost;
            this.unlockedPalettes.push(name);
            this.palette = name;
            this.save();
            audio.playChime('drop');
            return true;
        }
        return false;
    }

    applyToPlayer(player) {
        // Apply Vector Processing
        const vp = this.upgrades.vectorProcessing;
        player.baseSpeed = 380 + vp * 35;
        player.dashChargesMax = 5 + vp;
        player.dashCharges = player.dashChargesMax;

        // Apply Matrix Expansion
        const me = this.upgrades.matrixExpansion;
        player.maxHp = 100 + me * 25;
        player.hp = player.maxHp;
        player.passiveRegenRate = me * 2.0;

        // Apply Palette
        if (this.palette === 'ULTRAVIOLET') {
            player.neonColor = '#9d00ff';
            player.trailColor = '#ff007f';
        } else if (this.palette === 'THERMAL') {
            player.neonColor = '#ffaa00';
            player.trailColor = '#ff0033';
        } else if (this.palette === 'MATRIX') {
            player.neonColor = '#00ff41';
            player.trailColor = '#39ff14';
        } else if (this.palette === 'MONOCHROME') {
            player.neonColor = '#ffffff';
            player.trailColor = '#aaaaaa';
        } else {
            player.neonColor = '#00ffea';
            player.trailColor = '#ff007f';
        }
    }

    save() {
        try {
            const data = {
                primeMatrices: this.primeMatrices,
                vertices: this.vertices,
                upgrades: this.upgrades,
                palette: this.palette,
                unlockedPalettes: this.unlockedPalettes
            };
            localStorage.setItem('quad_shot_meta', JSON.stringify(data));
        } catch (e) {
            // Ignore in private browsing
        }
    }

    load() {
        try {
            const raw = localStorage.getItem('quad_shot_meta');
            if (raw) {
                const data = JSON.parse(raw);
                if (data.primeMatrices !== undefined) this.primeMatrices = data.primeMatrices;
                if (data.vertices !== undefined) this.vertices = data.vertices;
                if (data.upgrades) this.upgrades = Object.assign(this.upgrades, data.upgrades);
                if (data.palette) this.palette = data.palette;
                if (data.unlockedPalettes) this.unlockedPalettes = data.unlockedPalettes;
            }
        } catch (e) {
            // Ignore
        }
    }
}
