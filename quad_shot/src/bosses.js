// Quad Shot — Mini-Bosses & Wave 100 Corruption Vector Boss
import { Vec2 } from './math.js';
import { audio } from './audio.js';
import { spriteManager } from './sprite_manager.js';

export class Boss {
    constructor(type, wave, difficulty = 'NORMAL') {
        this.type = type; // 'ORBITAL_TORUS', 'HYPERBOLIC_TWINS', 'NON_EUCLIDEAN_PRISM', 'APEX_ICOSAHEDRON', 'CORRUPTION_VECTOR'
        this.wave = wave;
        this.difficulty = difficulty; // 'EASY', 'NORMAL', 'HARD'

        this.pos = new Vec2(0, -600); // Spawns north of player
        this.vel = new Vec2(0, 0);
        this.heading = 0;
        this.timer = 0;
        this.attackTimer = 0;
        this.radius = 45;
        this.isDead = false;
        this.isBoss = true;

        // Twin specific
        this.posTwin = new Vec2(0, 600);
        this.velTwin = new Vec2(0, 0);

        // Stats calculation based on wave
        const hpMultiplier = 1 + wave * 0.08;
        if (this.type === 'CORRUPTION_VECTOR') {
            this.maxHp = Math.round(5000 * hpMultiplier);
            this.name = 'THE CORRUPTION VECTOR (WAVE 100)';
            this.color = '#ff0033';
            this.radius = 65;
            this.spriteSeed = 'VX-0036'; // Grit
            this.attackDamageMultiplier = 1.0;
            this.damageReduction = 0.0;
        } else {
            this.maxHp = Math.round(1200 * hpMultiplier);
            this.damageReduction = 0.0;
            this.attackDamageMultiplier = 1.0;

            if (this.type === 'ORBITAL_TORUS') {
                this.name = 'ORBITAL TORUS';
                this.color = '#00ffea';
                this.spriteSeed = 'VX-0060';
            } else if (this.type === 'HYPERBOLIC_TWINS') {
                this.name = 'HYPERBOLIC TWINS';
                this.color = '#ff007f';
                this.radius = 35;
                this.spriteSeed = 'VX-0012';
            } else if (this.type === 'NON_EUCLIDEAN_PRISM') {
                this.name = 'NON-EUCLIDEAN PRISM';
                this.color = '#9d00ff';
                this.spriteSeed = 'VX-0144';
            } else { // APEX_ICOSAHEDRON
                this.name = 'APEX ICOSAHEDRON';
                this.color = '#39ff14';
                this.radius = 55;
                this.spriteSeed = 'VX-0132';
            }
        }

        this.hp = this.maxHp;
    }

    takeDamage(amount) {
        // Apply dynamic armor/damage reduction
        const effectiveDamage = amount * (1 - this.damageReduction);
        this.hp -= effectiveDamage;
        if (this.hp <= 0) {
            this.hp = 0;
            this.isDead = true;
            audio.playExplosion(2.5);
            return true;
        }
        return false;
    }

    update(dt, player, activeGruntCount, spawnBulletCallback, grid) {
        this.timer += dt;
        this.attackTimer += dt;

        // BOSS 100: THE CORRUPTION VECTOR ADAPTIVE STANCE
        if (this.type === 'CORRUPTION_VECTOR') {
            // High Grunt Count (> 8 active):
            // Boss Attack +200%, Boss Armor -75% (takes 1.75x dmg)
            // Low Grunt Count (<= 8 active):
            // Boss enters defensive stance (-90% incoming dmg, -50% attack)
            if (activeGruntCount >= 8) {
                this.attackDamageMultiplier = 3.0; // +200%
                this.damageReduction = -0.75; // -75% armor = vulnerable!
                this.stance = 'OFFENSIVE BERSERK (+200% DMG / -75% ARMOR)';
            } else {
                this.attackDamageMultiplier = 0.5; // -50%
                this.damageReduction = 0.90; // -90% armor = heavy barrier!
                this.stance = 'DEFENSIVE FORTRESS (-90% DMG TAKEN)';
            }

            // Movement: Pursues with pulsing acceleration
            const toPlayer = Vec2.sub(player.pos, this.pos);
            this.heading = toPlayer.angle();
            this.vel = toPlayer.normalize().scale(160 + Math.sin(this.timer * 3) * 60);
            this.pos.add(Vec2.scale(this.vel, dt));

            // Attacks: Salvo spiral + corruption beam
            if (this.attackTimer >= 1.2) {
                this.attackTimer = 0;
                // Radial corruption spiral
                for (let i = 0; i < 12; i++) {
                    const angle = (i * Math.PI * 2 / 12) + this.timer * 2;
                    const bDir = Vec2.fromAngle(angle, 420);
                    spawnBulletCallback({
                        pos: this.pos.clone(),
                        vel: bDir,
                        type: 'BEAM',
                        damage: 28 * this.attackDamageMultiplier,
                        color: '#ff0033',
                        radius: 5,
                        life: 4.0,
                        isHostile: true
                    });
                }
                audio.playLaser('mortar');
                if (grid) grid.applyImpulse(this.pos.x, this.pos.y, 250, 50);
            }
            return;
        }

        // MINI-BOSS 1: ORBITAL TORUS
        if (this.type === 'ORBITAL_TORUS') {
            // Circling orbit around player + radial salvo bursts
            const dist = this.pos.dist(player.pos);
            const targetDist = 420;
            const toPlayer = Vec2.sub(player.pos, this.pos).normalize();
            const tangent = Vec2.fromAngle(toPlayer.angle() + Math.PI / 2, 1);
            
            this.vel = Vec2.add(
                toPlayer.scale((dist - targetDist) * 0.8),
                tangent.scale(220)
            );
            this.pos.add(Vec2.scale(this.vel, dt));

            if (this.attackTimer >= 1.8) {
                this.attackTimer = 0;
                for (let i = 0; i < 16; i++) {
                    const angle = i * Math.PI * 2 / 16 + this.timer;
                    spawnBulletCallback({
                        pos: this.pos.clone(),
                        vel: Vec2.fromAngle(angle, 350),
                        type: 'TORUS_BURST',
                        damage: 30,
                        color: '#00ffea',
                        radius: 5,
                        life: 3.5,
                        isHostile: true
                    });
                }
                audio.playLaser('reflection');
            }
            return;
        }

        // MINI-BOSS 2: HYPERBOLIC TWINS
        if (this.type === 'HYPERBOLIC_TWINS') {
            // Dual cores orbiting center with deadly connecting laser beam sweeping the arena!
            const orbitR = 360;
            const omega = 0.8;
            this.pos.set(
                player.pos.x + Math.cos(this.timer * omega) * orbitR,
                player.pos.y + Math.sin(this.timer * omega) * orbitR
            );
            this.posTwin.set(
                player.pos.x - Math.cos(this.timer * omega) * orbitR,
                player.pos.y - Math.sin(this.timer * omega) * orbitR
            );

            // Laser beam between twins deals damage if player crosses it!
            const beamDist = this.pos.dist(this.posTwin);
            // Check player distance to beam segment
            const v = Vec2.sub(this.posTwin, this.pos);
            const w = Vec2.sub(player.pos, this.pos);
            const c1 = w.dot(v);
            const c2 = v.dot(v);
            let b = 0;
            if (c2 > 0) b = Math.max(0, Math.min(1, c1 / c2));
            const pb = Vec2.add(this.pos, Vec2.scale(v, b));
            if (player.pos.dist(pb) < 22) {
                player.takeDamage(25);
            }

            if (this.attackTimer >= 2.0) {
                this.attackTimer = 0;
                // Both twins fire synchronized bolts
                [-1, 1].forEach(side => {
                    const p = side === 1 ? this.pos : this.posTwin;
                    const dir = Vec2.sub(player.pos, p).normalize().scale(400);
                    spawnBulletCallback({
                        pos: p.clone(),
                        vel: dir,
                        type: 'BEAM',
                        damage: 32,
                        color: '#ff007f',
                        radius: 5,
                        life: 3.0,
                        isHostile: true
                    });
                });
                audio.playLaser('sine');
            }
            return;
        }

        // MINI-BOSS 3: NON-EUCLIDEAN PRISM
        if (this.type === 'NON_EUCLIDEAN_PRISM') {
            // Warps space and curves player projectiles
            const toPlayer = Vec2.sub(player.pos, this.pos);
            this.vel = toPlayer.normalize().scale(130);
            this.pos.add(Vec2.scale(this.vel, dt));

            if (grid) grid.applyGravityWell(this.pos.x, this.pos.y, 450, 45);

            if (this.attackTimer >= 2.2) {
                this.attackTimer = 0;
                // Curved spatial shockwave bullets
                for (let i = 0; i < 8; i++) {
                    const angle = i * Math.PI * 2 / 8;
                    spawnBulletCallback({
                        pos: this.pos.clone(),
                        vel: Vec2.fromAngle(angle, 320),
                        type: 'SINE',
                        damage: 28,
                        color: '#9d00ff',
                        freq: 0.05,
                        amp: 30,
                        life: 4.0,
                        isHostile: true
                    });
                }
                audio.playLaser('mortar');
            }
            return;
        }

        // MINI-BOSS 4: APEX ICOSAHEDRON
        if (this.type === 'APEX_ICOSAHEDRON') {
            // Heavy 20-sided geometric boss with intense bullet hell patterns
            const toPlayer = Vec2.sub(player.pos, this.pos);
            this.vel = toPlayer.normalize().scale(90);
            this.pos.add(Vec2.scale(this.vel, dt));

            if (this.attackTimer >= 0.8) {
                this.attackTimer = 0;
                const offset = this.timer * 4;
                for (let i = 0; i < 6; i++) {
                    const a = offset + i * Math.PI * 2 / 6;
                    spawnBulletCallback({
                        pos: this.pos.clone(),
                        vel: Vec2.fromAngle(a, 360),
                        type: 'BEAM',
                        damage: 26,
                        color: '#39ff14',
                        radius: 4,
                        life: 3.5,
                        isHostile: true
                    });
                }
                audio.playLaser('reflection');
            }
        }
    }

    render(ctx) {
        ctx.save();
        ctx.shadowBlur = 24;
        ctx.shadowColor = this.color;
        ctx.strokeStyle = this.color;
        ctx.fillStyle = this.color;
        ctx.lineWidth = 3.5;

        // Render Twin Laser Link
        if (this.type === 'HYPERBOLIC_TWINS') {
            ctx.save();
            ctx.strokeStyle = '#ff007f';
            ctx.lineWidth = 4 + Math.sin(this.timer * 15) * 2;
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#ff007f';
            ctx.beginPath();
            ctx.moveTo(this.pos.x, this.pos.y);
            ctx.lineTo(this.posTwin.x, this.posTwin.y);
            ctx.stroke();

            // Twin 2 body
            ctx.beginPath();
            ctx.arc(this.posTwin.x, this.posTwin.y, this.radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        ctx.translate(this.pos.x, this.pos.y);

        // Rotating geometric geometry
        if (this.type === 'ORBITAL_TORUS') {
            // Concentric rings
            ctx.beginPath();
            ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
            ctx.stroke();

            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(0, 0, this.radius * 1.4, this.radius * 0.6, this.timer * 2, 0, Math.PI * 2);
            ctx.stroke();

            ctx.beginPath();
            ctx.ellipse(0, 0, this.radius * 1.4, this.radius * 0.6, -this.timer * 2, 0, Math.PI * 2);
            ctx.stroke();
        } else if (this.type === 'APEX_ICOSAHEDRON') {
            // 20-sided polygon projection
            ctx.rotate(this.timer * 1.5);
            ctx.beginPath();
            for (let i = 0; i < 8; i++) {
                const a = i * Math.PI / 4;
                const r = i % 2 === 0 ? this.radius : this.radius * 0.7;
                const px = Math.cos(a) * r;
                const py = Math.sin(a) * r;
                if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.stroke();
        } else if (this.type === 'NON_EUCLIDEAN_PRISM') {
            // Warping prism triangle
            ctx.rotate(this.timer * 3);
            ctx.beginPath();
            ctx.moveTo(0, -this.radius);
            ctx.lineTo(this.radius * 0.86, this.radius * 0.5);
            ctx.lineTo(-this.radius * 0.86, this.radius * 0.5);
            ctx.closePath();
            ctx.stroke();
        } else {
            // The Corruption Vector / Default Core
            ctx.rotate(this.timer);
            ctx.beginPath();
            for (let i = 0; i < 12; i++) {
                const a = i * Math.PI / 6;
                const r = i % 2 === 0 ? this.radius : this.radius * 0.6;
                const px = Math.cos(a) * r;
                const py = Math.sin(a) * r;
                if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.stroke();
        }

        // Draw Sprite inside boss core if available
        spriteManager.draw(ctx, this.spriteSeed, 0, Math.floor(this.timer * 6) % 6, 0, 0, 0.85, this.color);

        ctx.restore();
    }
}
