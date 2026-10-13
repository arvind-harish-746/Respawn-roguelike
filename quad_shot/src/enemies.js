// Quad Shot — Hostile Enemy Units & AI Engine
import { Vec2 } from './math.js';
import { audio } from './audio.js';
import { spriteManager } from './sprite_manager.js';

export class Enemy {
    constructor(config) {
        this.pos = config.pos.clone();
        this.vel = new Vec2(0, 0);
        this.type = config.type; // 'RAY_CASTER', 'TESSELLATOR', 'SINE_SEEKER', 'SCALAR', 'DELTA_SWARM'
        this.heading = 0;
        this.radius = 16;
        this.isDead = false;
        this.animTimer = Math.random() * 5;
        this.isElite = config.isElite || false;

        // Base Stats by Enemy Type
        switch (this.type) {
            case 'RAY_CASTER':
                this.maxHp = this.isElite ? 180 : 80;
                this.speed = 140;
                this.color = '#ff007f';
                this.spriteSeed = 'VX-0012'; // Cipher / Sniper
                this.attackCooldown = 2.8;
                this.aimTimer = 0;
                this.laserCharging = false;
                this.laserTarget = null;
                break;

            case 'TESSELLATOR':
                this.maxHp = this.isElite ? 280 : 130;
                this.speed = 90;
                this.color = '#00ffea';
                this.spriteSeed = 'VX-0048'; // Ledger / Heavy Shield
                this.wallTimer = 3.5;
                break;

            case 'SINE_SEEKER':
                this.maxHp = this.isElite ? 150 : 65;
                this.speed = 190;
                this.color = '#ffaa00';
                this.spriteSeed = 'VX-0042'; // Static / Seeker
                this.attackCooldown = 1.6;
                break;

            case 'SCALAR':
                this.maxHp = this.isElite ? 220 : 100;
                this.speed = 120;
                this.color = '#9d00ff';
                this.spriteSeed = 'VX-0156'; // Wire / Gravity
                this.wellTimer = 4.0;
                break;

            case 'DELTA_SWARM':
            default:
                this.maxHp = this.isElite ? 90 : 35;
                this.speed = 260;
                this.radius = 12;
                this.color = '#39ff14';
                this.spriteSeed = 'VX-0240'; // Glitch / Swarm
                break;
        }

        this.hp = this.maxHp;
        this.attackTimer = Math.random() * 1.5;
        this.verticesValue = this.isElite ? 35 : (this.type === 'DELTA_SWARM' ? 5 : 15);
    }

    takeDamage(amount) {
        this.hp -= amount;
        if (this.hp <= 0) {
            this.isDead = true;
            return true;
        }
        return false;
    }

    update(dt, player, spawnBulletCallback, grid, walls) {
        this.animTimer += dt;
        const toPlayer = Vec2.sub(player.pos, this.pos);
        const dist = toPlayer.mag();
        this.heading = toPlayer.angle();

        // Unit behaviors
        switch (this.type) {
            case 'RAY_CASTER':
                // Snipes from distance, keeps buffer
                if (dist < 320) {
                    this.vel = toPlayer.clone().normalize().scale(-this.speed);
                } else if (dist > 520) {
                    this.vel = toPlayer.clone().normalize().scale(this.speed);
                } else {
                    this.vel.scale(0.85); // Stays in range
                }

                this.attackTimer -= dt;
                if (this.attackTimer <= 1.0 && !this.laserCharging) {
                    this.laserCharging = true;
                    this.laserTarget = player.pos.clone();
                }

                if (this.laserCharging) {
                    // Update tracking with slight lead
                    this.laserTarget.lerp(player.pos, dt * 3.5);
                }

                if (this.attackTimer <= 0) {
                    this.laserCharging = false;
                    this.attackTimer = this.attackCooldown;
                    // Fire high-speed sniper beam
                    const beamDir = Vec2.sub(this.laserTarget, this.pos).normalize();
                    spawnBulletCallback({
                        pos: this.pos.clone(),
                        vel: beamDir.scale(1100),
                        type: 'BEAM',
                        damage: 42,
                        color: '#ff007f',
                        radius: 5,
                        life: 1.8,
                        isHostile: true
                    });
                    audio.playLaser('reflection');
                }
                break;

            case 'TESSELLATOR':
                // Moves steadily towards player
                this.vel = toPlayer.clone().normalize().scale(this.speed);
                this.wallTimer -= dt;
                if (this.wallTimer <= 0) {
                    this.wallTimer = 4.5;
                    // Deploys a laser wall barrier (temporary obstacle)
                    const perp = Vec2.fromAngle(this.heading + Math.PI / 2, 90);
                    walls.push({
                        p1: Vec2.add(this.pos, perp),
                        p2: Vec2.sub(this.pos, perp),
                        life: 6.0,
                        maxLife: 6.0,
                        color: '#00ffea'
                    });
                    audio.playLaser('mortar');
                    if (grid) grid.applyImpulse(this.pos.x, this.pos.y, 140, 30);
                }
                break;

            case 'SINE_SEEKER':
                // Circling pursuit drone firing oscillating homing waves
                const orbitAngle = this.heading + Math.PI / 2;
                const forward = toPlayer.clone().normalize().scale(this.speed * 0.7);
                const flank = Vec2.fromAngle(orbitAngle, this.speed * 0.7);
                this.vel = Vec2.add(forward, flank);

                this.attackTimer -= dt;
                if (this.attackTimer <= 0) {
                    this.attackTimer = this.attackCooldown;
                    spawnBulletCallback({
                        pos: this.pos.clone(),
                        vel: toPlayer.clone().normalize().scale(360),
                        type: 'SINE',
                        damage: 22,
                        color: '#ffaa00',
                        freq: 0.08,
                        amp: 24,
                        life: 3.5,
                        isHostile: true
                    });
                    audio.playLaser('sine');
                }
                break;

            case 'SCALAR':
                // Deploys localized gravity wells pulling player
                this.vel = toPlayer.clone().normalize().scale(this.speed);
                this.wellTimer -= dt;
                if (this.wellTimer <= 0) {
                    this.wellTimer = 4.0;
                    if (grid) grid.applyGravityWell(this.pos.x, this.pos.y, 280, 45);
                    // Gravity pull impulse on player
                    const pull = Vec2.sub(this.pos, player.pos).normalize().scale(250 * dt);
                    player.vel.add(pull);
                    audio.playLaser('mortar');
                }
                break;

            case 'DELTA_SWARM':
            default:
                // Fast direct swarm charge
                this.vel = toPlayer.clone().normalize().scale(this.speed);
                break;
        }

        // Apply movement
        this.pos.add(Vec2.scale(this.vel, dt));
    }

    render(ctx) {
        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);

        // Render Sniper Aiming Laser Line
        if (this.type === 'RAY_CASTER' && this.laserCharging && this.laserTarget) {
            ctx.save();
            ctx.strokeStyle = 'rgba(255, 0, 127, 0.75)';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(this.laserTarget.x - this.pos.x, this.laserTarget.y - this.pos.y);
            ctx.stroke();
            ctx.restore();
        }

        // Attempt sprite rendering
        const dirRow = spriteManager.angleToRow(Math.cos(this.heading), Math.sin(this.heading), 8);
        const frameIdx = Math.floor(this.animTimer * 8) % 6;
        const rendered = spriteManager.draw(
            ctx,
            this.spriteSeed,
            dirRow,
            frameIdx,
            0,
            0,
            0.6,
            this.color
        );

        if (!rendered) {
            // High-contrast vector geometric fallback
            ctx.shadowBlur = 14;
            ctx.shadowColor = this.color;
            ctx.strokeStyle = this.color;
            ctx.fillStyle = this.color;
            ctx.lineWidth = 2.5;

            ctx.rotate(this.heading);

            if (this.type === 'DELTA_SWARM') {
                // Sharp triangle
                ctx.beginPath();
                ctx.moveTo(14, 0);
                ctx.lineTo(-10, 8);
                ctx.lineTo(-6, 0);
                ctx.lineTo(-10, -8);
                ctx.closePath();
                ctx.stroke();
            } else if (this.type === 'TESSELLATOR') {
                // Sturdy diamond shield
                ctx.beginPath();
                ctx.moveTo(16, 0);
                ctx.lineTo(0, 16);
                ctx.lineTo(-16, 0);
                ctx.lineTo(0, -16);
                ctx.closePath();
                ctx.stroke();
            } else if (this.type === 'RAY_CASTER') {
                // Long sleek hex sniper
                ctx.beginPath();
                ctx.moveTo(20, 0);
                ctx.lineTo(6, 9);
                ctx.lineTo(-14, 9);
                ctx.lineTo(-8, 0);
                ctx.lineTo(-14, -9);
                ctx.lineTo(6, -9);
                ctx.closePath();
                ctx.stroke();
            } else {
                // Drone circle with crosshairs
                ctx.beginPath();
                ctx.arc(0, 0, 14, 0, Math.PI * 2);
                ctx.stroke();
            }
        }

        // Elite Crown Aura
        if (this.isElite) {
            ctx.shadowBlur = 18;
            ctx.shadowColor = '#ffff00';
            ctx.strokeStyle = '#ffff00';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(0, 0, this.radius + 8, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Health Bar (above unit)
        if (this.hp < this.maxHp) {
            const barW = 32;
            const barH = 3;
            const fillW = Math.max(0, (this.hp / this.maxHp) * barW);
            ctx.shadowBlur = 0;
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(-barW / 2, -26, barW, barH);
            ctx.fillStyle = this.color;
            ctx.fillRect(-barW / 2, -26, fillW, barH);
        }

        ctx.restore();
    }
}
