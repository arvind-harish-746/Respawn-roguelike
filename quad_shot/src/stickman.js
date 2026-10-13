// Quad Shot — The Origin Point (0,0) Stickman & Dual Physics Engine
import { Vec2 } from './math.js';
import { audio } from './audio.js';

export class StickmanPlayer {
    constructor(x = 0, y = 0) {
        this.pos = new Vec2(x, y);
        this.vel = new Vec2(0, 0);
        this.facing = new Vec2(1, 0);
        this.aimAngle = 0;
        
        // Physics Engine Selection: 'KINEMATIC' or 'INERTIAL'
        this.physicsFrame = 'KINEMATIC';

        // Stats & Meta Attributes
        this.baseSpeed = 380;
        this.accel = 2400; // For Inertial Frame
        this.friction = 0.91; // For Inertial Frame
        
        // Health & Survivability
        this.maxHp = 100;
        this.hp = 100;
        this.invincibleTimer = 0;
        this.invincibleDuration = 1.0;
        this.lives = 3;
        this.passiveRegenRate = 0; // Upgraded via Matrix Expansion

        // 8-Directional Vector Dash
        this.dashChargesMax = 5;
        this.dashCharges = 5;
        this.dashRechargeTimer = 0;
        this.dashRechargeRate = 1.8; // seconds per charge
        this.dashSpeed = 1200;
        this.dashDuration = 0.15;
        this.dashActiveTimer = 0;
        this.dashTrails = []; // { p1: Vec2, p2: Vec2, life: 1.5, maxLife: 1.5, damage: 45 }

        // Apex Step (Double-jump shockwave pulse)
        this.apexCooldown = 0;
        this.apexCooldownMax = 3.0;
        this.apexActiveTimer = 0;
        this.shockwaves = []; // { x, y, radius, maxRadius, life, maxLife }

        // Suspension State (Bullet-time 60% slow down)
        this.suspensionActive = false;
        this.suspensionTimer = 2.5;
        this.suspensionTimerMax = 2.5;
        this.suspensionRechargeCooldown = 0;

        // Visual / Martial Arts Animation State
        this.animTime = 0;
        this.combatPose = 'IDLE'; // IDLE, RUN, DASH, KICK, PUNCH, RECOIL
        this.poseTimer = 0;
        this.isDead = false;
        this.ragdollPieces = [];

        // Neon Glow Color
        this.neonColor = '#00ffea'; // Cyan
        this.trailColor = '#ff007f'; // Magenta

        // Weapon & Combat Visual Animation State
        this.recoilOffset = 0;
        this.muzzleFlashTimer = 0;
    }

    setPhysicsFrame(frame) {
        this.physicsFrame = frame;
        this.vel.set(0, 0);
    }

    triggerDash(dirVector) {
        if (this.dashCharges < 1 || this.dashActiveTimer > 0) return false;
        this.dashCharges--;
        this.dashActiveTimer = this.dashDuration;

        const dashDir = dirVector.magSq() > 0.01 ? dirVector.clone().normalize() : this.facing.clone();
        const startPos = this.pos.clone();

        if (this.physicsFrame === 'KINEMATIC') {
            this.vel.copy(dashDir).scale(this.dashSpeed);
        } else {
            // Inertial adds massive instantaneous impulse
            this.vel.add(dashDir.clone().scale(this.dashSpeed * 1.25));
        }

        const endPos = Vec2.add(startPos, dashDir.clone().scale(this.dashSpeed * this.dashDuration));
        
        // Neon damage-dealing trail for 1.5 seconds
        this.dashTrails.push({
            p1: startPos,
            p2: endPos,
            life: 1.5,
            maxLife: 1.5,
            damage: 40
        });

        this.combatPose = 'DASH';
        this.poseTimer = 0.25;
        audio.playDash();
        return true;
    }

    triggerApexStep() {
        if (this.apexCooldown > 0) return false;
        this.apexCooldown = this.apexCooldownMax;
        this.apexActiveTimer = 0.35;

        // Shockwave neutralizes light projectiles and knocks back grunts
        this.shockwaves.push({
            pos: this.pos.clone(),
            radius: 20,
            maxRadius: 260,
            life: 0.45,
            maxLife: 0.45,
            damage: 30
        });

        this.combatPose = 'KICK';
        this.poseTimer = 0.35;
        audio.playApexShockwave();
        return true;
    }

    setSuspension(active) {
        if (active && this.suspensionTimer > 0.2) {
            if (!this.suspensionActive) audio.playSuspension(true);
            this.suspensionActive = true;
        } else {
            if (this.suspensionActive) audio.playSuspension(false);
            this.suspensionActive = false;
        }
    }

    takeDamage(amount) {
        if (this.invincibleTimer > 0 || this.isDead) return false;
        this.hp -= amount;
        this.invincibleTimer = this.invincibleDuration;
        this.combatPose = 'RECOIL';
        this.poseTimer = 0.2;
        audio.playExplosion(0.5);

        if (this.hp <= 0) {
            this.handleDeath();
            return true;
        }
        return false;
    }

    heal(amount) {
        this.hp = Math.min(this.maxHp, this.hp + amount);
    }

    handleDeath() {
        this.isDead = true;
        this.hp = 0;
        // Init ragdoll pieces
        this.ragdollPieces = [
            { x: this.pos.x, y: this.pos.y, vx: (Math.random() - 0.5) * 400, vy: (Math.random() - 0.5) * 400, r: 8, angle: 0, va: 5 }, // Head
            { x: this.pos.x, y: this.pos.y - 12, vx: (Math.random() - 0.5) * 350, vy: (Math.random() - 0.5) * 350, len: 20, angle: 0, va: 3 }, // Torso
            { x: this.pos.x - 8, y: this.pos.y - 5, vx: (Math.random() - 0.5) * 300, vy: (Math.random() - 0.5) * 300, len: 14, angle: 0, va: 4 }, // Left arm
            { x: this.pos.x + 8, y: this.pos.y - 5, vx: (Math.random() - 0.5) * 300, vy: (Math.random() - 0.5) * 300, len: 14, angle: 0, va: -4 }, // Right arm
            { x: this.pos.x - 6, y: this.pos.y - 25, vx: (Math.random() - 0.5) * 320, vy: (Math.random() - 0.5) * 320, len: 18, angle: 0, va: 2 }, // Left leg
            { x: this.pos.x + 6, y: this.pos.y - 25, vx: (Math.random() - 0.5) * 320, vy: (Math.random() - 0.5) * 320, len: 18, angle: 0, va: -2 }, // Right leg
        ];
        audio.playExplosion(1.5);
    }

    update(dt, inputVector, targetMousePos, worldBounds, currentBiome = '') {
        if (this.isDead) {
            // Update ragdoll pieces
            this.ragdollPieces.forEach(p => {
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.vx *= 0.94;
                p.vy *= 0.94;
                p.angle += p.va * dt;
            });
            return;
        }

        this.animTime += dt;
        if (this.invincibleTimer > 0) this.invincibleTimer -= dt;
        if (this.poseTimer > 0) {
            this.poseTimer -= dt;
            if (this.poseTimer <= 0) this.combatPose = 'IDLE';
        }

        // Passive Regen from Meta Matrix
        if (this.passiveRegenRate > 0 && this.hp < this.maxHp) {
            this.heal(this.passiveRegenRate * dt);
        }

        // Aiming direction towards mouse
        const toMouse = Vec2.sub(targetMousePos, this.pos);
        if (toMouse.magSq() > 1) {
            this.facing.copy(toMouse).normalize();
            this.aimAngle = this.facing.angle();
        }

        // Suspension State timing
        if (this.suspensionActive) {
            this.suspensionTimer -= dt / 0.4; // Consumes faster during slowdown
            if (this.suspensionTimer <= 0) {
                this.suspensionTimer = 0;
                this.setSuspension(false);
            }
        } else {
            if (this.suspensionTimer < this.suspensionTimerMax) {
                this.suspensionTimer = Math.min(this.suspensionTimerMax, this.suspensionTimer + dt * 0.8);
            }
        }

        // Dash recharge
        if (this.dashCharges < this.dashChargesMax) {
            this.dashRechargeTimer += dt;
            if (this.dashRechargeTimer >= this.dashRechargeRate) {
                this.dashCharges++;
                this.dashRechargeTimer = 0;
            }
        }

        // Apex cooldown
        if (this.apexCooldown > 0) this.apexCooldown -= dt;

        // DUAL PHYSICS FRAME HANDLING
        const hasInput = inputVector.magSq() > 0.01;
        const normInput = hasInput ? inputVector.clone().normalize() : new Vec2(0, 0);

        if (this.dashActiveTimer > 0) {
            this.dashActiveTimer -= dt;
            // Velocity maintains dash vector
        } else {
            // Biome modifiers (Zero-G Void has frictionless drift!)
            let effectiveFriction = this.friction;
            if (currentBiome === 'Zero-G Void') {
                effectiveFriction = 0.99; // Near frictionless
            }

            if (this.physicsFrame === 'KINEMATIC') {
                // Kinematic Frame: Instant velocity response, zero drift
                if (hasInput) {
                    this.vel.copy(normInput).scale(this.baseSpeed);
                    if (this.combatPose === 'IDLE') this.combatPose = 'RUN';
                } else {
                    this.vel.set(0, 0);
                    if (this.combatPose === 'RUN') this.combatPose = 'IDLE';
                }
            } else {
                // Inertial Frame: Thrust acceleration, momentum preservation & drift
                if (hasInput) {
                    this.vel.add(normInput.scale(this.accel * dt));
                    // Cap max velocity
                    const maxV = this.baseSpeed * 1.8;
                    if (this.vel.mag() > maxV) this.vel.normalize().scale(maxV);
                    if (this.combatPose === 'IDLE') this.combatPose = 'RUN';
                } else {
                    this.vel.scale(effectiveFriction);
                    if (this.combatPose === 'RUN' && this.vel.mag() < 30) this.combatPose = 'IDLE';
                }
            }
        }

        // Position integration
        this.pos.add(Vec2.scale(this.vel, dt));

        // Arena boundary clamping
        const halfW = worldBounds.width / 2 - 25;
        const halfH = worldBounds.height / 2 - 25;
        if (this.pos.x < -halfW) { this.pos.x = -halfW; this.vel.x = -this.vel.x * 0.5; }
        if (this.pos.x > halfW) { this.pos.x = halfW; this.vel.x = -this.vel.x * 0.5; }
        if (this.pos.y < -halfH) { this.pos.y = -halfH; this.vel.y = -this.vel.y * 0.5; }
        if (this.pos.y > halfH) { this.pos.y = halfH; this.vel.y = -this.vel.y * 0.5; }

        // Update dash trails
        for (let i = this.dashTrails.length - 1; i >= 0; i--) {
            const tr = this.dashTrails[i];
            tr.life -= dt;
            if (tr.life <= 0) this.dashTrails.splice(i, 1);
        }

        // Update shockwaves
        for (let i = this.shockwaves.length - 1; i >= 0; i--) {
            const sw = this.shockwaves[i];
            sw.life -= dt;
            const progress = 1 - sw.life / sw.maxLife;
            sw.radius = 20 + progress * (sw.maxRadius - 20);
            if (sw.life <= 0) this.shockwaves.splice(i, 1);
        }

        // Weapon visual animation decay
        if (this.recoilOffset > 0) {
            this.recoilOffset = Math.max(0, this.recoilOffset - dt * 50);
        }
        if (this.muzzleFlashTimer > 0) {
            this.muzzleFlashTimer -= dt;
        }
    }

    render(ctx, weaponDef = null, combatMode = 'RANGED', activeSlash = null, spriteMgr = null) {
        if (this.isDead) {
            // Render ragdoll
            ctx.save();
            ctx.strokeStyle = '#ff0055';
            ctx.fillStyle = '#ff0055';
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#ff0055';
            ctx.lineWidth = 2.5;

            this.ragdollPieces.forEach(p => {
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.angle);
                if (p.r) {
                    ctx.beginPath();
                    ctx.arc(0, 0, p.r, 0, Math.PI * 2);
                    ctx.stroke();
                } else if (p.len) {
                    ctx.beginPath();
                    ctx.moveTo(-p.len / 2, 0);
                    ctx.lineTo(p.len / 2, 0);
                    ctx.stroke();
                }
                ctx.restore();
            });
            ctx.restore();
            return;
        }

        // Render Active Dash Trails (Neon line obstacles that damage enemies)
        this.dashTrails.forEach(tr => {
            const alpha = tr.life / tr.maxLife;
            ctx.save();
            ctx.strokeStyle = this.trailColor;
            ctx.lineWidth = 4;
            ctx.shadowBlur = 16;
            ctx.shadowColor = this.trailColor;
            ctx.globalAlpha = alpha;

            ctx.beginPath();
            ctx.moveTo(tr.p1.x, tr.p1.y);
            ctx.lineTo(tr.p2.x, tr.p2.y);
            ctx.stroke();
            ctx.restore();
        });

        // Render Apex Step Shockwaves
        this.shockwaves.forEach(sw => {
            const alpha = sw.life / sw.maxLife;
            ctx.save();
            ctx.strokeStyle = '#39ff14';
            ctx.lineWidth = 3.5;
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#39ff14';
            ctx.globalAlpha = alpha;

            ctx.beginPath();
            ctx.arc(sw.pos.x, sw.pos.y, sw.radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        });

        // Suspension State Trajectory Planning Line
        if (this.suspensionActive) {
            ctx.save();
            ctx.strokeStyle = 'rgba(0, 255, 234, 0.45)';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([6, 6]);
            ctx.beginPath();
            ctx.moveTo(this.pos.x, this.pos.y);
            ctx.lineTo(this.pos.x + Math.cos(this.aimAngle) * 600, this.pos.y + Math.sin(this.aimAngle) * 600);
            ctx.stroke();
            ctx.restore();
        }

        // Render Stickman Character with Martial Arts Animation Poses
        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);

        // Invulnerability flicker
        if (this.invincibleTimer > 0 && Math.floor(this.invincibleTimer * 15) % 2 === 0) {
            ctx.globalAlpha = 0.4;
        }

        // Stickman Glow styling
        ctx.strokeStyle = this.neonColor;
        ctx.fillStyle = this.neonColor;
        ctx.shadowBlur = 14;
        ctx.shadowColor = this.neonColor;
        ctx.lineWidth = 2.8;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Orientation alignment
        const angle = this.aimAngle;
        const speed = this.vel.mag();
        const walkCycle = Math.sin(this.animTime * 12);

        // Body proportions
        const headR = 7;
        const torsoLen = 22;

        if (this.combatPose === 'DASH') {
            // Flying spear punch / dash strike pose
            ctx.rotate(angle);
            // Head
            ctx.beginPath();
            ctx.arc(torsoLen, 0, headR, 0, Math.PI * 2);
            ctx.stroke();
            // Torso
            ctx.beginPath();
            ctx.moveTo(-10, 0);
            ctx.lineTo(torsoLen - headR, 0);
            ctx.stroke();
            // Extended punch arm
            ctx.beginPath();
            ctx.moveTo(12, 0);
            ctx.lineTo(torsoLen + 14, 0);
            ctx.stroke();
            // Tucked leg
            ctx.beginPath();
            ctx.moveTo(-10, 0);
            ctx.lineTo(-24, 8);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(-10, 0);
            ctx.lineTo(-22, -8);
            ctx.stroke();
        } else if (this.combatPose === 'KICK') {
            // Apex Step 360 roundhouse kick pose
            ctx.rotate(this.animTime * 25);
            // Head
            ctx.beginPath();
            ctx.arc(0, -torsoLen - headR, headR, 0, Math.PI * 2);
            ctx.stroke();
            // Torso
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(0, -torsoLen);
            ctx.stroke();
            // Extended kick leg
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(24, 4);
            ctx.stroke();
            // Supporting bent leg
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(-12, 16);
            ctx.stroke();
        } else {
            // Standard dynamic stance (aiming + running/idle)
            const facingSign = Math.cos(angle) >= 0 ? 1 : -1;

            // Head (at top)
            const headY = -torsoLen - headR;
            ctx.beginPath();
            ctx.arc(0, headY, headR, 0, Math.PI * 2);
            ctx.stroke();

            // Glowing visor / origin indicator
            ctx.beginPath();
            ctx.moveTo(facingSign * 2, headY - 1);
            ctx.lineTo(facingSign * 7, headY - 1);
            ctx.stroke();

            // Torso (vertical line)
            ctx.beginPath();
            ctx.moveTo(0, -torsoLen);
            ctx.lineTo(0, 0);
            ctx.stroke();

            // Legs (running or combat stance)
            const legSwing = speed > 20 ? walkCycle * 14 : 6;
            // Left leg
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(-legSwing * facingSign, 12);
            ctx.lineTo(-legSwing * 1.3 * facingSign, 22);
            ctx.stroke();
            // Right leg
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(legSwing * facingSign, 12);
            ctx.lineTo(legSwing * 1.3 * facingSign, 22);
            ctx.stroke();

            // Arms & Weapon Grip
            const shoulderY = -torsoLen + 6;
            const armLen = 16;

            let gunTipX = Math.cos(angle) * (armLen * 1.3 - this.recoilOffset);
            let gunTipY = shoulderY + Math.sin(angle) * (armLen * 1.3 - this.recoilOffset);
            let weaponAngle = angle;
            let weaponScale = 1.0;

            if (combatMode === 'MELEE') {
                if (activeSlash) {
                    const swingProg = activeSlash.swingProgress || 0;
                    weaponAngle = angle - activeSlash.arc / 2 + swingProg * activeSlash.arc;
                    gunTipX = Math.cos(weaponAngle) * (armLen * 1.35);
                    gunTipY = shoulderY + Math.sin(weaponAngle) * (armLen * 1.35);
                    weaponAngle += Math.PI / 4;
                    weaponScale = 1.2;
                } else {
                    const readyAngle = angle - 0.45 * facingSign;
                    gunTipX = Math.cos(readyAngle) * (armLen * 0.9);
                    gunTipY = shoulderY + Math.sin(readyAngle) * (armLen * 0.9);
                    weaponAngle = angle + 0.35 * facingSign;
                }
            }

            // Firing / Primary arm
            ctx.beginPath();
            ctx.moveTo(0, shoulderY);
            ctx.lineTo(gunTipX, gunTipY);
            ctx.stroke();

            // Support arm
            ctx.beginPath();
            ctx.moveTo(0, shoulderY);
            ctx.lineTo(gunTipX * 0.6, gunTipY * 0.6 + 5);
            ctx.stroke();

            // Render Weapon Icon Sprite
            if (weaponDef && spriteMgr && weaponDef.icon) {
                const flipY = Math.cos(angle) < 0 && combatMode === 'RANGED';
                spriteMgr.drawWeapon(ctx, weaponDef.icon, gunTipX, gunTipY, weaponAngle, weaponScale, weaponDef.color, flipY);

                // Muzzle Flash in Ranged Mode
                if (combatMode === 'RANGED' && this.muzzleFlashTimer > 0) {
                    ctx.save();
                    const muzzleX = gunTipX + Math.cos(angle) * 16;
                    const muzzleY = gunTipY + Math.sin(angle) * 16;
                    ctx.translate(muzzleX, muzzleY);
                    ctx.fillStyle = '#ffffff';
                    ctx.shadowBlur = 18;
                    ctx.shadowColor = weaponDef.color || '#00ffea';
                    ctx.beginPath();
                    ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
                    ctx.fill();

                    // Muzzle spark lines
                    ctx.strokeStyle = weaponDef.color || '#00ffea';
                    ctx.lineWidth = 1.8;
                    for (let s = 0; s < 4; s++) {
                        const spkAngle = angle + (s - 1.5) * 0.55;
                        ctx.beginPath();
                        ctx.moveTo(0, 0);
                        ctx.lineTo(Math.cos(spkAngle) * 12, Math.sin(spkAngle) * 12);
                        ctx.stroke();
                    }
                    ctx.restore();
                }
            }

            // Origin Cross Marker on Chest
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(-4, -torsoLen / 2);
            ctx.lineTo(4, -torsoLen / 2);
            ctx.moveTo(0, -torsoLen / 2 - 4);
            ctx.lineTo(0, -torsoLen / 2 + 4);
            ctx.stroke();
        }

        ctx.restore();
    }
}
