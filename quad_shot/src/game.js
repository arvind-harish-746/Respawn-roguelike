// Quad Shot — Main Game Controller & Systems Orchestrator
import { Vec2, getFlankingAngle, calculateFlankCritChance } from './math.js';
import { audio } from './audio.js';
import { CartesianGrid } from './grid.js';
import { StickmanPlayer } from './stickman.js';
import { WEAPON_DEFS, TRAP_DEFS, Projectile, DeployableTrap } from './weapons.js';
import { Enemy } from './enemies.js';
import { Boss } from './bosses.js';
import { MetaProgression } from './economy_meta.js';
import { spriteManager } from './sprite_manager.js';

export class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        // Dimensions
        this.width = canvas.width = window.innerWidth;
        this.height = canvas.height = window.innerHeight;

        // Camera
        this.camera = {
            x: 0,
            y: 0,
            targetX: 0,
            targetY: 0,
            zoom: 1.0,
            targetZoom: 1.0,
            damping: 0.12,
            width: this.width,
            height: this.height
        };

        // World Bounds (Infinite Cartesian grid simulated at 4000x4000)
        this.worldBounds = { width: 4000, height: 4000 };
        this.grid = new CartesianGrid(4000, 4000, 60);

        // Meta Matrix & Progression
        this.meta = new MetaProgression();
        this.grid.theme = this.meta.palette;

        // Player Entity
        this.player = new StickmanPlayer(0, 0);
        this.meta.applyToPlayer(this.player);

        // Loadout (3 Weapons max, 2 Traps max)
        this.weapons = ['SINE_RIFLE'];
        if (this.meta.upgrades.initialMatrix > 0) {
            this.weapons.push('REFLECTION_RAY');
        }
        this.activeWeaponIdx = 0;
        this.weaponCooldown = 0;
        this.meleeCooldown = 0;
        this.combatMode = 'RANGED'; // 'RANGED' or 'MELEE'
        this.activeSlashes = [];

        this.traps = ['GRAVITY_TETHER'];
        this.activeTrapIdx = 0;
        this.trapCharges = [3, 3];
        this.trapRechargeTimers = [0, 0];
        this.trapRechargeMax = 8.0 * (1 - this.meta.upgrades.trapCalibration * 0.1);

        // State Machine
        this.state = 'HUB'; // 'HUB', 'COMBAT', 'INTERSECTION_PAUSE', 'GAME_OVER'
        this.timeScale = 1.0;
        this.targetTimeScale = 1.0;
        this.gameTime = 0;

        // Wave & Combat Management
        this.currentWave = 0;
        this.recordWave = parseInt(localStorage.getItem('quad_shot_record_wave') || '0', 10);
        this.waveTimer = 0;
        this.waveEnemiesToSpawn = 0;
        this.waveSpawnTimer = 0;
        this.activeBoss = null;
        this.miniBossesDefeated = 0;
        this.difficulty = 'NORMAL'; // EASY, NORMAL, HARD

        // Scoring loop from Endless Fire
        this.score = 0;
        this.recordScore = parseInt(localStorage.getItem('quad_shot_record_score') || '0', 10);
        this.multiplier = 1.0;
        this.multiplierDecayRate = 0.25;

        // Entities
        this.projectiles = [];
        this.trapsDeployed = [];
        this.enemies = [];
        this.pickups = []; // { pos, type: 'VERTICES'|'CODE_FRAGMENT'|'WEAPON'|'TRAP', value, itemDef, life }
        this.walls = []; // { p1, p2, life, maxLife, color }
        this.particles = [];

        // Intersection Pause Drop Candidate
        this.pendingDrop = null; // { type: 'WEAPON'|'TRAP', id: string, pos: Vec2 }

        // Input Tracking
        this.keys = new Set();
        this.mousePos = new Vec2(0, 0);
        this.worldMousePos = new Vec2(0, 0);
        this.isMouseDown = false;

        // Psycho Mode & Sprite Toggle
        this.psychoMode = false;
        this.useSprites = true;

        this.initInput();
        this.initResize();
    }

    async start() {
        await spriteManager.init();
        audio.init();
        this.lastTime = performance.now();
        requestAnimationFrame(this.loop.bind(this));
    }

    initResize() {
        window.addEventListener('resize', () => {
            this.width = this.canvas.width = window.innerWidth;
            this.height = this.canvas.height = window.innerHeight;
            this.camera.width = this.width;
            this.camera.height = this.height;
        });
    }

    initInput() {
        window.addEventListener('keydown', (e) => {
            const k = e.key.toLowerCase();
            this.keys.add(k);

            // Audio init on first gesture
            audio.resume();

            // Weapon switching: 1, 2, 3
            if (k === '1' && this.weapons[0]) this.activeWeaponIdx = 0;
            if (k === '2' && this.weapons[1]) this.activeWeaponIdx = 1;
            if (k === '3' && this.weapons[2]) this.activeWeaponIdx = 2;
            if (k === 'q') {
                this.activeWeaponIdx = (this.activeWeaponIdx + 1) % this.weapons.length;
            }

            // Trap deployment: E or F
            if (k === 'e' || k === 'f') {
                if (this.state === 'INTERSECTION_PAUSE') {
                    this.resolveIntersectionPause('SWAP');
                } else {
                    this.deployActiveTrap();
                }
            }

            // Intersection Pause Scrap: X
            if (k === 'x' && this.state === 'INTERSECTION_PAUSE') {
                this.resolveIntersectionPause('SCRAP');
            }

            // Dash: Space or Shift
            if (k === ' ') {
                const moveVec = this.getInputVector();
                this.player.triggerDash(moveVec);
            }

            // Apex Step: C
            if (k === 'c') {
                this.player.triggerApexStep();
            }

            // Psycho Mode Toggle: P (Endless Fire legacy feature)
            if (k === 'p') {
                this.psychoMode = !this.psychoMode;
                this.grid.psychoMode = this.psychoMode;
                audio.setPsychoMode(this.psychoMode);
            }

            // Toggle Sprites vs Vector: T
            if (k === 't') {
                this.useSprites = !this.useSprites;
            }

            // Dual Physics Toggle: Z (Kinematic vs Inertial Frame)
            if (k === 'z') {
                const nextFrame = this.player.physicsFrame === 'KINEMATIC' ? 'INERTIAL' : 'KINEMATIC';
                this.player.setPhysicsFrame(nextFrame);
                audio.playLaser('reflection');
            }

            // Toggle Melee vs Ranged Combat Mode: V
            if (k === 'v') {
                this.toggleCombatMode();
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys.delete(e.key.toLowerCase());
        });

        window.addEventListener('mousemove', (e) => {
            this.mousePos.set(e.clientX, e.clientY);
            this.updateWorldMousePos();
        });

        window.addEventListener('mousedown', (e) => {
            audio.resume();
            if (e.button === 0) this.isMouseDown = true;
            if (e.button === 2) {
                // Right click: Suspension State
                this.player.setSuspension(true);
            }
        });

        window.addEventListener('mouseup', (e) => {
            if (e.button === 0) this.isMouseDown = false;
            if (e.button === 2) {
                this.player.setSuspension(false);
            }
        });

        window.addEventListener('contextmenu', (e) => e.preventDefault());

        window.addEventListener('wheel', (e) => {
            if (this.weapons.length > 1) {
                if (e.deltaY > 0) {
                    this.activeWeaponIdx = (this.activeWeaponIdx + 1) % this.weapons.length;
                } else {
                    this.activeWeaponIdx = (this.activeWeaponIdx - 1 + this.weapons.length) % this.weapons.length;
                }
            }
        });
    }

    updateWorldMousePos() {
        this.worldMousePos.x = this.camera.x + (this.mousePos.x - this.width / 2) / this.camera.zoom;
        this.worldMousePos.y = this.camera.y + (this.mousePos.y - this.height / 2) / this.camera.zoom;
    }

    getInputVector() {
        const v = new Vec2(0, 0);
        if (this.keys.has('w') || this.keys.has('arrowup')) v.y -= 1;
        if (this.keys.has('s') || this.keys.has('arrowdown')) v.y += 1;
        if (this.keys.has('a') || this.keys.has('arrowleft')) v.x -= 1;
        if (this.keys.has('d') || this.keys.has('arrowright')) v.x += 1;
        return v;
    }

    startCombatLockdown() {
        this.state = 'COMBAT';
        this.currentWave = 1;
        this.startWave(this.currentWave);
        audio.playChime('drop');
    }

    startWave(waveNum) {
        this.currentWave = waveNum;
        if (this.currentWave > this.recordWave) {
            this.recordWave = this.currentWave;
            localStorage.setItem('quad_shot_record_wave', String(this.recordWave));
        }

        // Camera zoom: Zoom out to Macro-View every 5th wave!
        if (waveNum % 5 === 0) {
            this.camera.targetZoom = 0.65; // Macro-View
            this.spawnBossForWave(waveNum);
        } else {
            this.camera.targetZoom = 1.0;
            this.activeBoss = null;
        }

        // Grunt spawn count: 10% exponential scaling per wave!
        // N(w) = round(8 * 1.10^w)
        this.waveEnemiesToSpawn = Math.round(8 * Math.pow(1.10, waveNum));
        this.waveSpawnTimer = 0;
        audio.playLaser('mortar');
    }

    spawnBossForWave(waveNum) {
        let bType = 'ORBITAL_TORUS';
        if (waveNum === 100) {
            bType = 'CORRUPTION_VECTOR';
        } else {
            const roster = ['ORBITAL_TORUS', 'HYPERBOLIC_TWINS', 'NON_EUCLIDEAN_PRISM', 'APEX_ICOSAHEDRON'];
            bType = roster[Math.floor((waveNum / 5 - 1) % roster.length)];
        }
        this.activeBoss = new Boss(bType, waveNum, this.difficulty);
        audio.playExplosion(2.0);
    }

    deployActiveTrap() {
        const trapId = this.traps[this.activeTrapIdx];
        if (!trapId) return;

        const charges = this.trapCharges[this.activeTrapIdx];
        if (charges > 0) {
            this.trapCharges[this.activeTrapIdx]--;
            this.trapsDeployed.push(new DeployableTrap({
                pos: this.player.pos.clone(),
                type: trapId
            }));
            audio.playTrapDeploy();
            if (this.grid) this.grid.applyImpulse(this.player.pos.x, this.player.pos.y, 220, 45);
        }
    }

    toggleCombatMode() {
        this.combatMode = this.combatMode === 'RANGED' ? 'MELEE' : 'RANGED';
        if (audio) {
            audio.playLaser(this.combatMode === 'MELEE' ? 'reflection' : 'sine');
        }
        const btn = document.getElementById('btn-combat-mode');
        if (btn) {
            btn.innerText = this.combatMode === 'MELEE' ? '⚔ MELEE [V]' : '🏹 RANGED [V]';
            btn.classList.toggle('active', this.combatMode === 'MELEE');
        }
    }

    executeMeleeAttack() {
        const wId = this.weapons[this.activeWeaponIdx];
        const def = WEAPON_DEFS[wId];
        if (!def || this.meleeCooldown > 0) return;

        this.meleeCooldown = def.meleeCooldown || 0.22;
        this.player.combatPose = 'SLASH';
        this.player.poseTimer = 0.22;

        const slashId = def.slashId || 1;
        const slash = {
            pos: this.player.pos.clone(),
            angle: this.player.aimAngle,
            slashId: slashId,
            frame: 0,
            totalFrames: spriteManager.getSlashFrameCount(slashId),
            frameTimer: 0,
            frameDuration: 0.024,
            radius: def.meleeRange || 90,
            arc: def.meleeArc || Math.PI * 0.7,
            damage: def.meleeDmg || 60,
            color: def.color || '#00ffea',
            hitEnemies: new Set(),
            weaponId: def.id,
            swingProgress: 0
        };

        this.activeSlashes.push(slash);
        audio.playMeleeSlash(slashId);
        if (this.grid) this.grid.applyImpulse(this.player.pos.x, this.player.pos.y, 200, 35);
    }

    fireActiveWeapon() {
        const wId = this.weapons[this.activeWeaponIdx];
        const def = WEAPON_DEFS[wId];
        if (!def || this.weaponCooldown > 0) return;

        this.weaponCooldown = def.cooldown;
        this.player.recoilOffset = 9;
        this.player.muzzleFlashTimer = 0.06;

        const aimDir = this.player.facing.clone();
        const fireOrigin = Vec2.add(this.player.pos, aimDir.clone().scale(25));

        switch (wId) {
            case 'SINE_RIFLE':
                // Alternating high-frequency sine-wave beam pulses
                this.projectiles.push(new Projectile({
                    pos: fireOrigin,
                    vel: aimDir.scale(850),
                    type: 'SINE',
                    damage: def.baseDmg,
                    color: def.color,
                    freq: 0.09,
                    amp: 20,
                    phase: (this.gameTime * 20) % (Math.PI * 2),
                    hasRicochetBoost: this.meta.elasticCollision
                }));
                audio.playLaser('sine');
                break;

            case 'PARABOLIC_MORTAR':
                // Explosive geometric shell along arc trajectory towards cursor
                this.projectiles.push(new Projectile({
                    pos: fireOrigin,
                    targetPos: this.worldMousePos.clone(),
                    type: 'MORTAR',
                    isMortar: true,
                    damage: def.baseDmg,
                    radius: def.radius,
                    color: def.color,
                    flightDuration: 0.65
                }));
                audio.playLaser('mortar');
                break;

            case 'REFLECTION_RAY':
                // Laser ricocheting off grid lines & shields
                this.projectiles.push(new Projectile({
                    pos: fireOrigin,
                    vel: aimDir.scale(1200),
                    type: 'REFLECTION',
                    damage: def.baseDmg,
                    color: def.color,
                    bouncesLeft: def.maxBounces,
                    hasRicochetBoost: this.meta.elasticCollision
                }));
                audio.playLaser('reflection');
                break;

            case 'TANGENT_DISC':
                // Cutting ricochet disc accelerating with tangential contact
                this.projectiles.push(new Projectile({
                    pos: fireOrigin,
                    vel: aimDir.scale(700),
                    type: 'TANGENT',
                    isTangent: true,
                    damage: def.baseDmg,
                    color: def.color,
                    bouncesLeft: 6,
                    hasRicochetBoost: this.meta.elasticCollision
                }));
                audio.playLaser('sine');
                break;

            case 'SCALAR_SHOTGUN':
                // Cone burst of 8 vector points
                for (let i = 0; i < def.pellets; i++) {
                    const spreadAngle = this.player.aimAngle + (Math.random() - 0.5) * 0.55;
                    const spd = 750 + Math.random() * 200;
                    this.projectiles.push(new Projectile({
                        pos: fireOrigin,
                        vel: Vec2.fromAngle(spreadAngle, spd),
                        type: 'SCALAR',
                        damage: def.baseDmg,
                        color: def.color,
                        radius: 3.5,
                        life: 1.4,
                        hasRicochetBoost: this.meta.elasticCollision
                    }));
                }
                audio.playLaser('shotgun');
                break;

            case 'FRACTAL_CLUSTER':
                // Grenade recursively splitting into smaller sub-explosions
                this.projectiles.push(new Projectile({
                    pos: fireOrigin,
                    vel: aimDir.scale(600),
                    type: 'FRACTAL',
                    damage: def.baseDmg,
                    color: def.color,
                    splitGen: 2,
                    life: 1.1
                }));
                audio.playLaser('mortar');
                break;

            case 'ASYMPTOTE_LASER':
                // Continuous laser beam
                this.projectiles.push(new Projectile({
                    pos: fireOrigin,
                    vel: aimDir.scale(1600),
                    type: 'ASYMPTOTE',
                    damage: def.baseDmg,
                    color: def.color,
                    radius: 3,
                    life: 0.25
                }));
                audio.playLaser('reflection');
                break;

            case 'DOPPLER_REPEATER':
                // Damage scales with player velocity!
                const pSpeed = this.player.vel.mag();
                const vRatio = 1 + (pSpeed / this.player.baseSpeed);
                this.projectiles.push(new Projectile({
                    pos: fireOrigin,
                    vel: aimDir.scale(950),
                    type: 'DOPPLER',
                    damage: Math.round(def.baseDmg * vRatio),
                    color: def.color,
                    radius: 4.5,
                    hasRicochetBoost: this.meta.elasticCollision
                }));
                audio.playLaser('sine');
                break;
        }

        // Slight player recoil impulse
        if (this.player.physicsFrame === 'INERTIAL') {
            this.player.vel.add(aimDir.clone().scale(-40));
        }
    }

    triggerIntersectionPause(itemType, itemId, pos) {
        this.pendingDrop = { type: itemType, id: itemId, pos: pos.clone() };
        this.state = 'INTERSECTION_PAUSE';
        this.targetTimeScale = 0.05; // Slow down to 5% speed!
        audio.playChime('drop');
    }

    resolveIntersectionPause(choice) {
        if (!this.pendingDrop) return;
        const drop = this.pendingDrop;
        const def = drop.type === 'WEAPON' ? WEAPON_DEFS[drop.id] : TRAP_DEFS[drop.id];

        if (choice === 'SWAP') {
            if (drop.type === 'WEAPON') {
                if (this.weapons.length < 3) {
                    this.weapons.push(drop.id);
                    this.activeWeaponIdx = this.weapons.length - 1;
                } else {
                    this.weapons[this.activeWeaponIdx] = drop.id;
                }
            } else {
                if (this.traps.length < 2) {
                    this.traps.push(drop.id);
                    this.activeTrapIdx = this.traps.length - 1;
                } else {
                    this.traps[this.activeTrapIdx] = drop.id;
                }
            }
            audio.playChime('pickup');
        } else if (choice === 'SCRAP') {
            // Instant scrap into Vertices
            const val = def.scrapValue || 40;
            this.meta.addVertices(val);
            audio.playChime('pickup');
        }

        this.pendingDrop = null;
        this.state = 'COMBAT';
        this.targetTimeScale = 1.0;
    }

    handleMiniBossDefeat() {
        this.miniBossesDefeated++;
        // Mini-Boss Surge: 50% base chance + 10% per prior defeated mini-boss
        const surgeChance = Math.min(1.0, 0.50 + (this.miniBossesDefeated - 1) * 0.10);
        if (Math.random() < surgeChance) {
            if (this.player.hp >= this.player.maxHp) {
                // Permanently expands Max HP by 15%!
                this.player.maxHp = Math.round(this.player.maxHp * 1.15);
                this.player.hp = this.player.maxHp;
            } else {
                // Full HP restore!
                this.player.hp = this.player.maxHp;
            }
            audio.playChime('drop');
        }
    }

    update(rawDt) {
        // Smooth timeScale transition
        this.timeScale += (this.targetTimeScale - this.timeScale) * 0.2;
        const dt = rawDt * this.timeScale * (this.player.suspensionActive ? 0.4 : 1.0);
        this.gameTime += dt;

        this.updateWorldMousePos();

        // Multiplier decay over time (Endless Fire mechanic)
        if (this.multiplier > 1.0) {
            this.multiplier = Math.max(1.0, this.multiplier - this.multiplierDecayRate * dt);
        }

        // Current quadrant biome
        const currentBiome = this.grid.getBiomeAt(this.player.pos.x, this.player.pos.y);

        // Update Grid deformation & relaxation
        this.grid.update(dt);

        // Update Player
        const inputVec = this.getInputVector();
        this.player.update(dt, inputVec, this.worldMousePos, this.worldBounds, currentBiome);

        // Player attack (Ranged shooting or Melee slashing)
        if (this.weaponCooldown > 0) this.weaponCooldown -= dt;
        if (this.meleeCooldown > 0) this.meleeCooldown -= dt;
        if (this.isMouseDown && (this.state === 'COMBAT' || this.state === 'HUB')) {
            if (this.combatMode === 'RANGED') {
                this.fireActiveWeapon();
            } else {
                this.executeMeleeAttack();
            }
        }

        // Update Active Melee Slashes
        for (let i = this.activeSlashes.length - 1; i >= 0; i--) {
            const sl = this.activeSlashes[i];
            sl.frameTimer += dt;
            if (sl.frameTimer >= sl.frameDuration) {
                sl.frameTimer -= sl.frameDuration;
                sl.frame++;
            }
            sl.swingProgress = sl.frame / sl.totalFrames;
            sl.pos = Vec2.add(this.player.pos, Vec2.fromAngle(sl.angle, 18));

            // Collision check against enemies
            for (const e of this.enemies) {
                if (e.isDead || sl.hitEnemies.has(e)) continue;
                const toEnemy = Vec2.sub(e.pos, this.player.pos);
                const dist = toEnemy.mag();
                if (dist <= sl.radius + (e.radius || 15)) {
                    let diffAngle = Math.abs(toEnemy.angle() - sl.angle);
                    while (diffAngle > Math.PI) diffAngle = Math.abs(diffAngle - 2 * Math.PI);

                    if (diffAngle <= sl.arc / 2 || sl.arc >= Math.PI * 1.9) {
                        sl.hitEnemies.add(e);
                        let dmg = sl.damage;
                        if (sl.weaponId === 'DOPPLER_REPEATER') {
                            dmg = Math.round(dmg * (1 + this.player.vel.mag() / this.player.baseSpeed));
                        }
                        const flankAngle = getFlankingAngle(this.player.pos, e.pos, e.facing ? e.facing.angle() : 0);
                        const critChance = calculateFlankCritChance(flankAngle);
                        const isCrit = Math.random() < critChance;
                        if (isCrit) dmg = Math.round(dmg * 2.0);

                        e.takeDamage(dmg, isCrit, this);
                        if (e.vel) e.vel.add(Vec2.fromAngle(sl.angle, 350));
                        if (this.grid) this.grid.applyImpulse(e.pos.x, e.pos.y, 220, 30);

                        for (let p = 0; p < 8; p++) {
                            this.particles.push({
                                pos: e.pos.clone(),
                                vel: Vec2.fromAngle(sl.angle + (Math.random() - 0.5) * 1.2, 120 + Math.random() * 200),
                                color: sl.color,
                                life: 0.35,
                                maxLife: 0.35,
                                size: 3
                            });
                        }

                        if (sl.weaponId === 'FRACTAL_CLUSTER') {
                            this.projectiles.push(new Projectile({
                                pos: e.pos.clone(),
                                vel: Vec2.fromAngle(sl.angle + (Math.random() - 0.5) * 1.5, 300),
                                type: 'FRACTAL',
                                damage: 35,
                                color: sl.color,
                                splitGen: 1,
                                life: 0.4
                            }));
                        }
                    }
                }
            }

            // Deflect / Cancel Hostile Projectiles
            for (let pIdx = this.projectiles.length - 1; pIdx >= 0; pIdx--) {
                const proj = this.projectiles[pIdx];
                if (proj.isDead || !proj.isHostile) continue;
                const toProj = Vec2.sub(proj.pos, this.player.pos);
                const pDist = toProj.mag();
                if (pDist <= sl.radius + 15) {
                    let diffA = Math.abs(toProj.angle() - sl.angle);
                    while (diffA > Math.PI) diffA = Math.abs(diffA - 2 * Math.PI);
                    if (diffA <= sl.arc / 2 || sl.arc >= Math.PI * 1.9) {
                        if (sl.weaponId === 'REFLECTION_RAY') {
                            proj.isHostile = false;
                            proj.vel.scale(-1.2);
                            proj.color = '#39ff14';
                            proj.damage = 45;
                            audio.playDeflect();
                        } else {
                            proj.isDead = true;
                            audio.playDeflect();
                            for (let p = 0; p < 5; p++) {
                                this.particles.push({
                                    pos: proj.pos.clone(),
                                    vel: Vec2.fromAngle(Math.random() * Math.PI * 2, 80 + Math.random() * 100),
                                    color: '#00ffea',
                                    life: 0.25,
                                    maxLife: 0.25,
                                    size: 2.5
                                });
                            }
                        }
                    }
                }
            }

            if (sl.frame >= sl.totalFrames) {
                this.activeSlashes.splice(i, 1);
            }
        }

        // Trap recharge timers
        for (let i = 0; i < this.traps.length; i++) {
            if (this.trapCharges[i] < 3) {
                this.trapRechargeTimers[i] += dt;
                if (this.trapRechargeTimers[i] >= this.trapRechargeMax) {
                    this.trapCharges[i]++;
                    this.trapRechargeTimers[i] = 0;
                }
            }
        }

        // Camera Smooth Follow (Damped follow like G-Wars)
        this.camera.targetX = this.player.pos.x;
        this.camera.targetY = this.player.pos.y;
        this.camera.x += (this.camera.targetX - this.camera.x) * this.camera.damping;
        this.camera.y += (this.camera.targetY - this.camera.y) * this.camera.damping;
        this.camera.zoom += (this.camera.targetZoom - this.camera.zoom) * 0.08;

        // Wave Spawner in Combat
        if (this.state === 'COMBAT') {
            if (this.waveEnemiesToSpawn > 0) {
                this.waveSpawnTimer += dt;
                if (this.waveSpawnTimer >= 0.45) {
                    this.waveSpawnTimer = 0;
                    this.waveEnemiesToSpawn--;
                    this.spawnGruntEnemy();
                }
            } else if (this.enemies.length === 0 && !this.activeBoss) {
                // Wave cleared! Advance to next wave
                this.startWave(this.currentWave + 1);
            }
        }

        // Update Deployed Traps
        for (let i = this.trapsDeployed.length - 1; i >= 0; i--) {
            const trap = this.trapsDeployed[i];
            trap.update(dt, this.enemies, this.projectiles, this.grid);
            if (trap.isDead) this.trapsDeployed.splice(i, 1);
        }

        // Update Hostile Laser Walls
        for (let i = this.walls.length - 1; i >= 0; i--) {
            const w = this.walls[i];
            w.life -= dt;
            if (w.life <= 0) this.walls.splice(i, 1);
        }

        // Update Boss
        if (this.activeBoss) {
            this.activeBoss.update(
                dt,
                this.player,
                this.enemies.length,
                (bulletConfig) => this.projectiles.push(new Projectile(bulletConfig)),
                this.grid
            );
            if (this.activeBoss.isDead) {
                this.handleMiniBossDefeat();
                this.activeBoss = null;
                this.camera.targetZoom = 1.0;
            }
        }

        // Update Grunt Enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            enemy.update(
                dt,
                this.player,
                (bulletConfig) => this.projectiles.push(new Projectile(bulletConfig)),
                this.grid,
                this.walls
            );

            // Melee damage to player
            if (this.player.pos.dist(enemy.pos) < this.player.pos.dist(enemy.pos) && this.player.pos.dist(enemy.pos) < 26) {
                this.player.takeDamage(enemy.type === 'DELTA_SWARM' ? 14 : 22);
            }

            // Dash Trail damage to enemies
            this.player.dashTrails.forEach(tr => {
                const distToLine = this.distPointToSegment(enemy.pos, tr.p1, tr.p2);
                if (distToLine < enemy.radius + 6) {
                    enemy.takeDamage(tr.damage * dt * 4);
                }
            });

            // Shockwave damage & knockback
            this.player.shockwaves.forEach(sw => {
                const d = enemy.pos.dist(sw.pos);
                if (Math.abs(d - sw.radius) < 25) {
                    enemy.takeDamage(sw.damage);
                    const kb = Vec2.sub(enemy.pos, sw.pos).normalize().scale(300);
                    enemy.pos.add(kb);
                }
            });

            if (enemy.isDead) {
                this.handleEnemyDeath(enemy);
                this.enemies.splice(i, 1);
            }
        }

        // Update Projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.update(dt, this.worldBounds, this.grid, currentBiome);

            // Player shockwave neutralizes hostile light projectiles!
            if (p.isHostile) {
                this.player.shockwaves.forEach(sw => {
                    if (p.pos.dist(sw.pos) < sw.radius) {
                        p.isDead = true; // Neutralized!
                    }
                });

                // Check collision with player
                if (!p.isDead && p.pos.dist(this.player.pos) < 18) {
                    this.player.takeDamage(p.damage);
                    p.isDead = true;
                }
            } else {
                // Friendly projectile hitting enemies
                let hitTarget = null;
                for (const e of this.enemies) {
                    if (p.pos.dist(e.pos) < e.radius + p.radius) {
                        hitTarget = e;
                        break;
                    }
                }
                if (!hitTarget && this.activeBoss) {
                    if (p.pos.dist(this.activeBoss.pos) < this.activeBoss.radius + p.radius) {
                        hitTarget = this.activeBoss;
                    }
                }

                if (hitTarget) {
                    // Flanking angle crit calculation for Vampiric Vectors
                    const flankAngle = getFlankingAngle(this.player.pos, hitTarget.pos, hitTarget.heading || 0);
                    const critChance = calculateFlankCritChance(flankAngle);
                    const isCrit = Math.random() < critChance;
                    let finalDmg = p.damage * p.bounceDamageMultiplier;

                    if (isCrit) {
                        finalDmg *= 1.8;
                        audio.playCritHit();
                        // Vampiric Vectors: heal percentage of crit damage!
                        if (this.meta.vampiricVectors) {
                            this.player.heal(finalDmg * 0.12);
                        }
                    }

                    hitTarget.takeDamage(finalDmg);
                    if (this.grid) this.grid.applyImpulse(hitTarget.pos.x, hitTarget.pos.y, 80, 18);

                    // Multiplier increase from hits (Endless Fire scoring synergy)
                    this.multiplier = Math.min(25.0, this.multiplier + 0.15);

                    // Fractal split logic
                    if (p.type === 'FRACTAL' && p.splitGen > 0) {
                        for (let s = 0; s < 3; s++) {
                            const angle = (s * Math.PI * 2 / 3) + Math.random() * 0.5;
                            this.projectiles.push(new Projectile({
                                pos: p.pos.clone(),
                                vel: Vec2.fromAngle(angle, 450),
                                type: 'SCALAR',
                                damage: Math.round(p.damage * 0.55),
                                color: p.color,
                                splitGen: p.splitGen - 1,
                                life: 0.8
                            }));
                        }
                        audio.playExplosion(0.8);
                    }

                    p.isDead = true;
                }
            }

            if (p.isDead) this.projectiles.splice(i, 1);
        }

        // Update Pickups
        for (let i = this.pickups.length - 1; i >= 0; i--) {
            const pk = this.pickups[i];
            pk.life -= dt;
            const distToPlayer = this.player.pos.dist(pk.pos);

            // Vacuum pull towards player within 140px
            if (distToPlayer < 140) {
                const pull = Vec2.sub(this.player.pos, pk.pos).normalize().scale(400 * dt);
                pk.pos.add(pull);
            }

            if (distToPlayer < 24) {
                // Collect pickup!
                if (pk.type === 'VERTICES') {
                    const gained = Math.round(pk.value * this.multiplier);
                    this.meta.addVertices(gained);
                    this.score += gained * 10;
                    audio.playChime('pickup');
                } else if (pk.type === 'CODE_FRAGMENT') {
                    // Restores 25% health & replenishes all trap charges!
                    this.player.heal(this.player.maxHp * 0.25);
                    this.trapCharges = [3, 3];
                    audio.playChime('drop');
                } else if (pk.type === 'WEAPON' || pk.type === 'TRAP') {
                    this.triggerIntersectionPause(pk.type, pk.itemId, pk.pos);
                }
                this.pickups.splice(i, 1);
            } else if (pk.life <= 0) {
                this.pickups.splice(i, 1);
            }
        }

        // Player Death check
        if (this.player.isDead && this.state !== 'GAME_OVER') {
            this.handlePlayerDeath();
        }
    }

    distPointToSegment(p, a, b) {
        const l2 = a.distSq(b);
        if (l2 === 0) return p.dist(a);
        let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2;
        t = Math.max(0, Math.min(1, t));
        return Math.hypot(p.x - (a.x + t * (b.x - a.x)), p.y - (a.y + t * (b.y - a.y)));
    }

    spawnGruntEnemy() {
        // Spawn around player with distance buffer (> 450px)
        const angle = Math.random() * Math.PI * 2;
        const dist = 500 + Math.random() * 300;
        const spawnPos = new Vec2(
            this.player.pos.x + Math.cos(angle) * dist,
            this.player.pos.y + Math.sin(angle) * dist
        );

        // Clamp to world
        const halfW = this.worldBounds.width / 2 - 100;
        const halfH = this.worldBounds.height / 2 - 100;
        spawnPos.x = Math.max(-halfW, Math.min(halfW, spawnPos.x));
        spawnPos.y = Math.max(-halfH, Math.min(halfH, spawnPos.y));

        const types = ['DELTA_SWARM', 'DELTA_SWARM', 'SINE_SEEKER', 'RAY_CASTER', 'TESSELLATOR', 'SCALAR'];
        const chosenType = types[Math.floor(Math.random() * types.length)];
        const isElite = Math.random() < 0.12;

        this.enemies.push(new Enemy({
            pos: spawnPos,
            type: chosenType,
            isElite
        }));
    }

    handleEnemyDeath(enemy) {
        audio.playExplosion(enemy.isElite ? 1.2 : 0.6);
        if (this.grid) this.grid.applyImpulse(enemy.pos.x, enemy.pos.y, 160, 35);

        // Vertices Drop
        this.pickups.push({
            pos: enemy.pos.clone(),
            type: 'VERTICES',
            value: enemy.verticesValue,
            life: 14.0
        });

        // Elite unit drop chance: Code Fragments or Weapons/Traps!
        if (enemy.isElite) {
            if (Math.random() < 0.45) {
                this.pickups.push({
                    pos: Vec2.add(enemy.pos, new Vec2(15, 0)),
                    type: 'CODE_FRAGMENT',
                    life: 20.0
                });
            } else if (Math.random() < 0.40) {
                // Drop a higher grade weapon
                const pool = ['REFLECTION_RAY', 'TANGENT_DISC', 'SCALAR_SHOTGUN', 'FRACTAL_CLUSTER', 'DOPPLER_REPEATER', 'ASYMPTOTE_LASER'];
                const dropId = pool[Math.floor(Math.random() * pool.length)];
                this.pickups.push({
                    pos: Vec2.add(enemy.pos, new Vec2(0, 15)),
                    type: 'WEAPON',
                    itemId: dropId,
                    life: 30.0
                });
            }
        }
    }

    handlePlayerDeath() {
        this.state = 'GAME_OVER';
        // Scramble quadrants on death! (GDD Section 3: Quadrant Mechanics)
        this.grid.scrambleQuadrants();
        // Convert run vertices to Prime Matrices (10:1 ratio)
        this.meta.convertRunVerticesToPrimeMatrices();
    }

    render() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.width, this.height);

        // Deep space background
        ctx.fillStyle = this.psychoMode ? '#0a0014' : '#030811';
        ctx.fillRect(0, 0, this.width, this.height);

        // Begin Camera Transformation
        ctx.save();
        ctx.translate(this.width / 2, this.height / 2);
        ctx.scale(this.camera.zoom, this.camera.zoom);
        ctx.translate(-this.camera.x, -this.camera.y);

        // 1. Render Cartesian Grid & Quadrants
        this.grid.render(ctx, this.camera);

        // 2. Render Hostile Laser Walls
        this.walls.forEach(w => {
            ctx.save();
            ctx.strokeStyle = w.color;
            ctx.lineWidth = 4;
            ctx.shadowBlur = 18;
            ctx.shadowColor = w.color;
            ctx.beginPath();
            ctx.moveTo(w.p1.x, w.p1.y);
            ctx.lineTo(w.p2.x, w.p2.y);
            ctx.stroke();
            ctx.restore();
        });

        // 3. Render Deployed Traps
        this.trapsDeployed.forEach(t => t.render(ctx));

        // 4. Render Pickups (Vertices crystals & Code Fragments)
        this.pickups.forEach(pk => {
            ctx.save();
            ctx.translate(pk.pos.x, pk.pos.y);
            if (pk.type === 'VERTICES') {
                ctx.shadowBlur = 12;
                ctx.shadowColor = '#39ff14';
                ctx.strokeStyle = '#39ff14';
                ctx.fillStyle = 'rgba(57, 255, 20, 0.4)';
                ctx.lineWidth = 2;
                // Diamond vertex crystal
                ctx.beginPath();
                ctx.moveTo(0, -7);
                ctx.lineTo(6, 0);
                ctx.lineTo(0, 7);
                ctx.lineTo(-6, 0);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            } else if (pk.type === 'CODE_FRAGMENT') {
                ctx.shadowBlur = 16;
                ctx.shadowColor = '#00ffea';
                ctx.strokeStyle = '#00ffea';
                ctx.fillStyle = '#00ffea';
                ctx.lineWidth = 2;
                // Hexagon Code Fragment
                ctx.beginPath();
                for (let a = 0; a < 6; a++) {
                    const ang = a * Math.PI / 3;
                    const hx = Math.cos(ang) * 9;
                    const hy = Math.sin(ang) * 9;
                    if (a === 0) ctx.moveTo(hx, hy); else ctx.lineTo(hx, hy);
                }
                ctx.closePath();
                ctx.stroke();
            } else {
                // Dropped Weapon / Trap item box
                ctx.shadowBlur = 18;
                ctx.shadowColor = '#ffff00';
                ctx.strokeStyle = '#ffff00';
                ctx.lineWidth = 2.5;
                ctx.strokeRect(-12, -12, 24, 24);
            }
            ctx.restore();
        });

        // 5. Render Enemies & Boss
        this.enemies.forEach(e => e.render(ctx));
        if (this.activeBoss) this.activeBoss.render(ctx);

        // 6. Render Projectiles
        this.projectiles.forEach(p => p.render(ctx));

        // 6.5 Render Active Melee Slashes
        this.activeSlashes.forEach(sl => {
            spriteManager.drawSlash(ctx, sl.slashId, sl.frame, sl.pos.x, sl.pos.y, sl.angle, sl.radius / 190, sl.color);
        });

        // 7. Render Player Stickman / Sprite
        const activeWDef = WEAPON_DEFS[this.weapons[this.activeWeaponIdx]];
        const currentSlash = this.activeSlashes.length > 0 ? this.activeSlashes[this.activeSlashes.length - 1] : null;
        this.player.render(ctx, activeWDef, this.combatMode, currentSlash, spriteManager);

        ctx.restore();
        // End Camera Transformation

        // 8. Render HUD & UI Overlays
        this.renderHUD(ctx);
    }

    renderHUD(ctx) {
        ctx.save();
        ctx.shadowBlur = 0;

        // Health Bar & Lives (Top-Left)
        ctx.fillStyle = 'rgba(0, 10, 25, 0.7)';
        ctx.strokeStyle = 'rgba(0, 255, 234, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.fillRect(20, 20, 240, 24);
        ctx.strokeRect(20, 20, 240, 24);

        const hpRatio = Math.max(0, this.player.hp / this.player.maxHp);
        ctx.fillStyle = hpRatio > 0.3 ? '#00ffea' : '#ff0055';
        ctx.shadowBlur = 10;
        ctx.shadowColor = ctx.fillStyle;
        ctx.fillRect(22, 22, (240 - 4) * hpRatio, 20);

        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px "JetBrains Mono", monospace';
        ctx.fillText(`HP: ${Math.round(this.player.hp)} / ${this.player.maxHp}`, 30, 36);

        // Dash Charges (5 Pips)
        for (let i = 0; i < this.player.dashChargesMax; i++) {
            const filled = i < this.player.dashCharges;
            ctx.fillStyle = filled ? '#ff007f' : 'rgba(255, 0, 127, 0.2)';
            ctx.strokeStyle = '#ff007f';
            ctx.lineWidth = 1;
            ctx.fillRect(20 + i * 24, 52, 18, 8);
            ctx.strokeRect(20 + i * 24, 52, 18, 8);
        }
        ctx.fillStyle = '#ff007f';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillText('DASH [SPACE]', 20 + this.player.dashChargesMax * 24 + 10, 60);

        // Dual Physics Frame Indicator
        ctx.fillStyle = this.player.physicsFrame === 'KINEMATIC' ? '#39ff14' : '#ffaa00';
        ctx.font = 'bold 13px "JetBrains Mono", monospace';
        ctx.fillText(`PHYSICS: ${this.player.physicsFrame} FRAME [Z to toggle]`, 20, 84);

        // Biome & Coordinates Indicator (Top-Center)
        const currentBiome = this.grid.getBiomeAt(this.player.pos.x, this.player.pos.y);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#00ffea';
        ctx.font = 'bold 14px "JetBrains Mono", monospace';
        ctx.fillText(`COORD: (${Math.round(this.player.pos.x)}, ${Math.round(this.player.pos.y)}) — [${currentBiome}]`, this.width / 2, 30);

        if (this.state === 'COMBAT') {
            ctx.fillStyle = '#ff007f';
            ctx.font = 'bold 18px "Outfit", sans-serif';
            ctx.fillText(`GRID LOCKDOWN: WAVE ${this.currentWave}`, this.width / 2, 54);
            if (this.activeBoss) {
                ctx.fillStyle = '#ff0033';
                ctx.font = 'bold 14px "JetBrains Mono", monospace';
                ctx.fillText(`ALERT: ${this.activeBoss.name} ACTIVE`, this.width / 2, 74);
            }
        } else if (this.state === 'HUB') {
            ctx.fillStyle = '#39ff14';
            ctx.font = 'bold 16px "Outfit", sans-serif';
            ctx.fillText('THE ORIGIN POINT (0,0) — SECURE MATRIX HUB', this.width / 2, 54);
        }

        // Multiplier & Score (Top-Right)
        ctx.textAlign = 'right';
        ctx.fillStyle = '#ffff00';
        ctx.font = 'bold 22px "JetBrains Mono", monospace';
        ctx.fillText(`SCORE: ${this.score}`, this.width - 20, 36);

        ctx.fillStyle = this.multiplier > 1.5 ? '#ffaa00' : '#888888';
        ctx.font = 'bold 15px "JetBrains Mono", monospace';
        ctx.fillText(`MULTIPLIER: x${this.multiplier.toFixed(1)}`, this.width - 20, 60);

        ctx.fillStyle = '#39ff14';
        ctx.font = '13px "JetBrains Mono", monospace';
        ctx.fillText(`VERTICES: ${this.meta.vertices}`, this.width - 20, 82);

        // Weapon Loadout & Combat Mode (Bottom-Left)
        ctx.textAlign = 'left';
        ctx.fillStyle = 'rgba(0, 15, 30, 0.75)';
        ctx.fillRect(20, this.height - 92, 370, 78);
        ctx.strokeStyle = this.combatMode === 'MELEE' ? '#ff007f' : '#00ffea';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(20, this.height - 92, 370, 78);

        // Combat Mode Header
        ctx.fillStyle = this.combatMode === 'MELEE' ? '#ff007f' : '#00ffea';
        ctx.font = 'bold 12px "JetBrains Mono", monospace';
        ctx.fillText(`[V] COMBAT MODE: ${this.combatMode === 'MELEE' ? '⚔ MELEE (SLASH & DEFLECT)' : '🏹 RANGED (AIM & FIRE)'}`, 30, this.height - 74);

        this.weapons.forEach((wId, idx) => {
            const def = WEAPON_DEFS[wId];
            const isActive = idx === this.activeWeaponIdx;
            const yPos = this.height - 54 + idx * 18;

            // Draw weapon icon
            if (spriteManager && def.icon) {
                spriteManager.drawWeapon(ctx, def.icon, 38, yPos - 3, 0, 0.55, isActive ? def.color : null);
            }

            ctx.fillStyle = isActive ? def.color : '#666666';
            ctx.font = (isActive ? 'bold 12px' : '11px') + ' "JetBrains Mono", monospace';
            const statText = this.combatMode === 'MELEE' ? `Melee ${def.meleeDmg} DMG` : `${def.type} (${def.baseDmg} DMG)`;
            ctx.fillText(`[${idx + 1}] ${def.name} — ${statText}`, 54, yPos);
        });

        // Traps Indicator (Bottom-Right)
        ctx.textAlign = 'right';
        ctx.fillStyle = 'rgba(0, 15, 30, 0.7)';
        ctx.fillRect(this.width - 280, this.height - 70, 260, 50);
        ctx.strokeRect(this.width - 280, this.height - 70, 260, 50);

        this.traps.forEach((tId, idx) => {
            const def = TRAP_DEFS[tId];
            ctx.fillStyle = def.color;
            ctx.font = 'bold 12px "JetBrains Mono", monospace';
            const charges = this.trapCharges[idx];
            ctx.fillText(`[E] ${def.name} : ${charges}/3 Charges`, this.width - 30, this.height - 48 + idx * 18);
        });

        // INTERSECTION PAUSE MODAL OVERLAY
        if (this.state === 'INTERSECTION_PAUSE' && this.pendingDrop) {
            this.renderIntersectionPauseModal(ctx);
        }

        // GAME OVER MODAL OVERLAY
        if (this.state === 'GAME_OVER') {
            this.renderGameOverModal(ctx);
        }

        ctx.restore();
    }

    renderIntersectionPauseModal(ctx) {
        ctx.fillStyle = 'rgba(2, 6, 18, 0.88)';
        ctx.fillRect(0, 0, this.width, this.height);

        const drop = this.pendingDrop;
        const def = drop.type === 'WEAPON' ? WEAPON_DEFS[drop.id] : TRAP_DEFS[drop.id];

        ctx.save();
        ctx.textAlign = 'center';
        ctx.fillStyle = '#00ffea';
        ctx.font = 'bold 28px "Outfit", sans-serif';
        ctx.fillText('INTERSECTION PAUSE — TRAJECTORY ANALYSIS', this.width / 2, this.height / 2 - 120);

        ctx.fillStyle = def.color;
        ctx.font = 'bold 22px "JetBrains Mono", monospace';
        ctx.fillText(`DISCOVERED: ${def.name} [${def.grade || 'TRAP'}]`, this.width / 2, this.height / 2 - 70);

        ctx.fillStyle = '#cccccc';
        ctx.font = '15px "JetBrains Mono", monospace';
        ctx.fillText(def.desc, this.width / 2, this.height / 2 - 30);

        // Options: Swap vs Scrap
        ctx.fillStyle = '#39ff14';
        ctx.font = 'bold 18px "JetBrains Mono", monospace';
        ctx.fillText('[E] SWAP — EQUIP ITEM INTO ACTIVE LOADOUT', this.width / 2, this.height / 2 + 40);

        ctx.fillStyle = '#ff007f';
        ctx.fillText(`[X] SCRAP — CONVERT TO +${def.scrapValue} VERTICES`, this.width / 2, this.height / 2 + 80);

        ctx.restore();
    }

    renderGameOverModal(ctx) {
        ctx.fillStyle = 'rgba(10, 0, 5, 0.9)';
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.save();
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ff0055';
        ctx.font = 'bold 36px "Outfit", sans-serif';
        ctx.fillText('ORIGIN DEVIATION — MATRIX COMPROMISED', this.width / 2, this.height / 2 - 90);

        ctx.fillStyle = '#ffffff';
        ctx.font = '16px "JetBrains Mono", monospace';
        ctx.fillText(`SURVIVED TO WAVE ${this.currentWave} | RECORD WAVE: ${this.recordWave}`, this.width / 2, this.height / 2 - 40);
        ctx.fillText(`FINAL SCORE: ${this.score}`, this.width / 2, this.height / 2 - 10);

        ctx.fillStyle = '#39ff14';
        ctx.font = 'bold 18px "JetBrains Mono", monospace';
        ctx.fillText(`VERTICES CONVERTED TO PRIME MATRICES: +${Math.floor(this.meta.runVertices / 10)} [TOTAL: ${this.meta.primeMatrices}]`, this.width / 2, this.height / 2 + 35);

        ctx.fillStyle = '#00ffea';
        ctx.fillText('CLICK TO RESPAWN AT (0,0) ORIGIN HUB', this.width / 2, this.height / 2 + 90);
        ctx.restore();
    }

    loop(timestamp) {
        const rawDt = Math.min(0.1, (timestamp - this.lastTime) / 1000);
        this.lastTime = timestamp;

        this.update(rawDt);
        this.render();

        requestAnimationFrame(this.loop.bind(this));
    }
}
