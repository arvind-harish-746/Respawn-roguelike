// Quad Shot — Weapon & Trap Arsenal (Grade I to IV)
import { Vec2, calculateSineWavePoint, getFlankingAngle, calculateFlankCritChance } from './math.js';
import { audio } from './audio.js';

export const WEAPON_DEFS = {
    'SINE_RIFLE': {
        id: 'SINE_RIFLE',
        name: 'Sine Rifle',
        grade: 'Grade I',
        type: 'Linear Wave',
        desc: 'Fires alternating high-frequency sine-wave beam pulses.',
        cooldown: 0.16,
        baseDmg: 28,
        color: '#00ffea',
        scrapValue: 25
    },
    'PARABOLIC_MORTAR': {
        id: 'PARABOLIC_MORTAR',
        name: 'Parabolic Mortar',
        grade: 'Grade I',
        type: 'Arc Projectile',
        desc: 'Fires explosive geometric shells along calculated arc trajectories.',
        cooldown: 0.85,
        baseDmg: 85,
        radius: 120,
        color: '#ffaa00',
        scrapValue: 30
    },
    'REFLECTION_RAY': {
        id: 'REFLECTION_RAY',
        name: 'Reflection Ray',
        grade: 'Grade II',
        type: 'Multi-Bounce',
        desc: 'High-velocity laser that ricochets off grid lines and enemy shields.',
        cooldown: 0.28,
        baseDmg: 45,
        maxBounces: 4,
        color: '#39ff14',
        scrapValue: 60
    },
    'TANGENT_DISC': {
        id: 'TANGENT_DISC',
        name: 'Tangent Disc',
        grade: 'Grade II',
        type: 'Cutting Ricochet',
        desc: 'Slices along obstacle edges, accelerating with every tangential contact.',
        cooldown: 0.45,
        baseDmg: 40,
        color: '#ffff00',
        scrapValue: 70
    },
    'SCALAR_SHOTGUN': {
        id: 'SCALAR_SHOTGUN',
        name: 'Scalar Shotgun',
        grade: 'Grade III',
        type: 'Area Spread',
        desc: 'Fires cone-shaped bursts of vector points that widen and slow down over distance.',
        cooldown: 0.65,
        baseDmg: 22, // per pellet (8 pellets)
        pellets: 8,
        color: '#ff007f',
        scrapValue: 150
    },
    'FRACTAL_CLUSTER': {
        id: 'FRACTAL_CLUSTER',
        name: 'Fractal Cluster',
        grade: 'Grade III',
        type: 'Explosive Split',
        desc: 'Grenade that recursively splits into smaller sub-explosions upon impact.',
        cooldown: 0.9,
        baseDmg: 90,
        color: '#9d00ff',
        scrapValue: 180
    },
    'ASYMPTOTE_LASER': {
        id: 'ASYMPTOTE_LASER',
        name: 'Asymptote Laser',
        grade: 'Grade IV',
        type: 'Continuous Beam',
        desc: 'Continuous beam that increases damage infinitely the longer it hits a single target.',
        cooldown: 0.05,
        baseDmg: 15,
        color: '#00ffff',
        scrapValue: 350
    },
    'DOPPLER_REPEATER': {
        id: 'DOPPLER_REPEATER',
        name: 'Doppler Repeater',
        grade: 'Grade IV',
        type: 'Velocity Scale',
        desc: 'Rapid-fire bolt weapon whose damage scales directly with player movement speed.',
        cooldown: 0.1,
        baseDmg: 32,
        color: '#ff0055',
        scrapValue: 380
    }
};

export const TRAP_DEFS = {
    'GRAVITY_TETHER': {
        id: 'GRAVITY_TETHER',
        name: 'Gravity Tether',
        desc: 'Pins enemies to a fixed coordinate point, pulling surrounding grunts inward.',
        duration: 6.0,
        radius: 260,
        pullForce: 450,
        color: '#9d00ff',
        scrapValue: 40
    },
    'PRISM_MINE': {
        id: 'PRISM_MINE',
        name: 'Prism Mine',
        desc: 'Detonates into 12 refracting light shards when an enemy crosses its laser trigger.',
        duration: 15.0,
        radius: 180,
        color: '#00ffea',
        scrapValue: 50
    },
    'MOEBIUS_SNARE': {
        id: 'MOEBIUS_SNARE',
        name: 'Möbius Snare',
        desc: 'Deploys an infinite-loop energy field that traps enemy movement vectors inside its boundary for 4 seconds.',
        duration: 4.0,
        radius: 160,
        color: '#ff007f',
        scrapValue: 75
    },
    'VECTOR_REPULSOR': {
        id: 'VECTOR_REPULSOR',
        name: 'Vector Repulsor',
        desc: 'Periodically emits a high-impact kinetic pulse that reflects incoming projectiles back toward enemies.',
        duration: 8.0,
        radius: 200,
        color: '#39ff14',
        scrapValue: 90
    }
};

// Projectile Class
export class Projectile {
    constructor(config) {
        this.pos = config.pos.clone();
        this.vel = config.vel ? config.vel.clone() : new Vec2(0, 0);
        this.origin = this.pos.clone();
        this.targetPos = config.targetPos ? config.targetPos.clone() : null;
        this.type = config.type;
        this.damage = config.damage || 25;
        this.bouncesLeft = config.bouncesLeft || 0;
        this.color = config.color || '#00ffea';
        this.life = config.life || 2.5;
        this.maxLife = this.life;
        this.radius = config.radius || 4;
        this.isDead = false;
        
        // Sine wave params
        this.phase = config.phase || 0;
        this.freq = config.freq || 0.05;
        this.amp = config.amp || 18;
        this.distTraveled = 0;
        this.heading = config.heading || (config.vel ? config.vel.angle() : 0);

        // Parabolic mortar params
        this.isMortar = config.isMortar || false;
        this.t = 0;
        this.flightDuration = config.flightDuration || 0.7;

        // Tangent disc
        this.isTangent = config.isTangent || false;
        this.speedMultiplier = 1.0;

        // Fractal split generation
        this.splitGen = config.splitGen || 0;

        // Doppler scaling
        this.speedScale = config.speedScale || 1.0;

        // Ricochet damage boost
        this.bounceDamageMultiplier = 1.0;
        this.hasRicochetBoost = config.hasRicochetBoost || false;
    }

    update(dt, worldBounds, grid = null, currentBiome = '') {
        this.life -= dt;
        if (this.life <= 0) {
            this.isDead = true;
            return;
        }

        // Parabolic arc projectile
        if (this.isMortar) {
            this.t += dt / this.flightDuration;
            if (this.t >= 1.0) {
                this.t = 1.0;
                this.isDead = true;
                return; // Triggers explosion
            }
            this.pos = Vec2.add(this.origin, Vec2.scale(Vec2.sub(this.targetPos, this.origin), this.t));
            return;
        }

        // Biome mechanic: Parabolic Wastes bends projectile paths with gravitational curve!
        if (currentBiome === 'Parabolic Wastes') {
            const curveForce = 120;
            this.vel.y += curveForce * dt;
        }

        // Sine wave projectile
        if (this.type === 'SINE') {
            const step = this.vel.mag() * dt;
            this.distTraveled += step;
            this.heading = this.vel.angle();
            const forward = Vec2.fromAngle(this.heading, this.distTraveled);
            const perp = Vec2.fromAngle(this.heading + Math.PI / 2, Math.sin(this.distTraveled * this.freq + this.phase) * this.amp);
            this.pos = Vec2.add(this.origin, forward).add(perp);
        } else {
            // Standard linear / tangent disc / scalar spread
            if (this.type === 'SCALAR') {
                // Scalar pellets decelerate over distance
                this.vel.scale(Math.pow(0.85, dt * 60));
            }
            this.pos.add(Vec2.scale(this.vel, dt));
        }

        // Ricochet against world boundary
        const halfW = worldBounds.width / 2;
        const halfH = worldBounds.height / 2;

        if (this.bouncesLeft > 0) {
            let bounced = false;
            if (this.pos.x < -halfW || this.pos.x > halfW) {
                this.vel.x = -this.vel.x;
                this.pos.x = Math.max(-halfW, Math.min(halfW, this.pos.x));
                bounced = true;
            }
            if (this.pos.y < -halfH || this.pos.y > halfH) {
                this.vel.y = -this.vel.y;
                this.pos.y = Math.max(-halfH, Math.min(halfH, this.pos.y));
                bounced = true;
            }

            if (bounced) {
                this.bouncesLeft--;
                if (this.hasRicochetBoost) {
                    this.bounceDamageMultiplier += 0.15; // Elastic Collision modifier
                }
                if (this.isTangent) {
                    this.vel.scale(1.2); // Tangent disc accelerates
                }
                if (grid) grid.applyImpulse(this.pos.x, this.pos.y, 100, 25);
            }
        } else {
            if (this.pos.x < -halfW || this.pos.x > halfW || this.pos.y < -halfH || this.pos.y > halfH) {
                this.isDead = true;
            }
        }
    }

    render(ctx) {
        ctx.save();
        ctx.shadowBlur = 12;
        ctx.shadowColor = this.color;
        ctx.strokeStyle = this.color;
        ctx.fillStyle = this.color;
        ctx.lineWidth = 2.5;

        if (this.isMortar) {
            // Parabolic mortar shell + height elevation shadow
            const arcH = 4 * 160 * this.t * (1 - this.t);
            // Shadow on ground
            ctx.fillStyle = 'rgba(255, 170, 0, 0.25)';
            ctx.beginPath();
            ctx.arc(this.pos.x, this.pos.y, 6, 0, Math.PI * 2);
            ctx.fill();
            // Elevated shell
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.pos.x, this.pos.y - arcH, 7, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        } else if (this.isTangent) {
            // Spinning geometric disc
            ctx.translate(this.pos.x, this.pos.y);
            ctx.rotate(this.life * 20);
            ctx.beginPath();
            ctx.moveTo(0, -9);
            ctx.lineTo(8, 0);
            ctx.lineTo(0, 9);
            ctx.lineTo(-8, 0);
            ctx.closePath();
            ctx.stroke();
        } else {
            // Glowing neon projectile bolt / particle
            ctx.beginPath();
            ctx.arc(this.pos.x, this.pos.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Trail line behind velocity
            const trailLen = Math.min(25, this.vel.mag() * 0.03);
            if (trailLen > 2) {
                const back = Vec2.sub(this.pos, this.vel.clone().normalize().scale(trailLen));
                ctx.beginPath();
                ctx.moveTo(this.pos.x, this.pos.y);
                ctx.lineTo(back.x, back.y);
                ctx.stroke();
            }
        }
        ctx.restore();
    }
}

// Deployable Trap Class
export class DeployableTrap {
    constructor(config) {
        this.pos = config.pos.clone();
        this.type = config.type;
        this.def = TRAP_DEFS[this.type];
        this.duration = this.def.duration;
        this.life = this.duration;
        this.radius = this.def.radius;
        this.color = this.def.color;
        this.isDead = false;
        this.timer = 0;
    }

    update(dt, enemies, projectiles, grid) {
        this.life -= dt;
        this.timer += dt;
        if (this.life <= 0) {
            this.isDead = true;
            return;
        }

        if (this.type === 'GRAVITY_TETHER') {
            // Pull enemies inward to anchor point
            enemies.forEach(e => {
                const dist = this.pos.dist(e.pos);
                if (dist < this.radius && dist > 10) {
                    const pull = Vec2.sub(this.pos, e.pos).normalize().scale(this.def.pullForce * dt);
                    e.pos.add(pull);
                }
            });
            if (grid) grid.applyGravityWell(this.pos.x, this.pos.y, this.radius, 20);
        } else if (this.type === 'MOEBIUS_SNARE') {
            // Trap enemy velocities within boundary
            enemies.forEach(e => {
                const dist = this.pos.dist(e.pos);
                if (dist < this.radius) {
                    e.vel.scale(0.3); // Stun / snared
                }
            });
        } else if (this.type === 'VECTOR_REPULSOR') {
            // Repel incoming hostile projectiles back at enemies every 1.5s
            if (Math.floor(this.timer / 1.5) !== Math.floor((this.timer - dt) / 1.5)) {
                projectiles.forEach(p => {
                    if (p.isHostile && this.pos.dist(p.pos) < this.radius) {
                        p.isHostile = false; // Turned friendly!
                        p.vel.scale(-1.2);
                        p.color = '#39ff14';
                        audio.playLaser('reflection');
                    }
                });
                if (grid) grid.applyImpulse(this.pos.x, this.pos.y, this.radius, 40);
            }
        }
    }

    render(ctx) {
        ctx.save();
        ctx.shadowBlur = 16;
        ctx.shadowColor = this.color;
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2.5;

        const pulse = Math.sin(this.timer * 6) * 6;

        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, this.radius + pulse, 0, Math.PI * 2);
        ctx.stroke();

        if (this.type === 'GRAVITY_TETHER') {
            // Spiral vortex rings
            for (let i = 0; i < 3; i++) {
                ctx.beginPath();
                ctx.arc(this.pos.x, this.pos.y, (this.radius * (i + 1) / 3), this.timer * 3 + i, this.timer * 3 + i + Math.PI);
                ctx.stroke();
            }
        } else if (this.type === 'MOEBIUS_SNARE') {
            // Infinity figure-8 symbol
            ctx.beginPath();
            const s = 40;
            ctx.ellipse(this.pos.x - 20, this.pos.y, 25, 14, 0, 0, Math.PI * 2);
            ctx.ellipse(this.pos.x + 20, this.pos.y, 25, 14, 0, 0, Math.PI * 2);
            ctx.stroke();
        } else if (this.type === 'VECTOR_REPULSOR') {
            // Hexagon forcefield
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const a = i * Math.PI / 3 + this.timer;
                const hx = this.pos.x + Math.cos(a) * 35;
                const hy = this.pos.y + Math.sin(a) * 35;
                if (i === 0) ctx.moveTo(hx, hy); else ctx.lineTo(hx, hy);
            }
            ctx.closePath();
            ctx.stroke();
        }

        ctx.restore();
    }
}
