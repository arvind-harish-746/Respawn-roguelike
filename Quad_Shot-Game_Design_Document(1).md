# **Quad Shot — Game Design Document**

# **1\. Title & Core Concept**

**Quad Shot** is a high-speed 2D open-world roguelike set on an infinite Cartesian coordinate plane. The game visualizes combat through neon minimalism—a dark grid universe pulsing with high-contrast glowing vector graphics, geometric trajectory lines, and reactive grid deformation.

* **Core Theme:** Mathematical mechanics made physical. Players manipulate angles, velocity vectors, and momentum to survive inside an unstable Cartesian matrix.  
* **Visual Style:** Tron-inspired vector aesthetics featuring sharp neon hues (cyan, magenta, lime, hyper-violet) against deep space dark blue/black canvas grids.

## **The Protagonist**

The central protagonist of the game is a highly agile, neon-glowing stickman known as **'The Origin Point (0,0)'**. The core visual driving the combat experience features this nimble stickman fighting off massive hordes of abstract geometric shapes. The stickman's animations seamlessly blend fluid, martial-arts style combat strikes with dynamic ragdoll physics, integrating seamlessly into the neon minimalist vector aesthetic.

---

# **2\. Dual Physics System**

Players select an operational physics engine at the start of each run, fundamentally altering mobility and spatial interaction.

## **Kinematic Frame**

* **Behavior:** Direct, precise grid alignment with zero rotational drift. Input instantly yields directional movement; stopping is instantaneous.  
* **Playstyle:** Tactical precision, hit-and-run tactics, tight dodge patterns, and strict angle management.

## **Inertial Frame**

* **Behavior:** Momentum-driven physics utilizing ragdoll-style vector preservation, drift friction, and thrust acceleration.  
* **Playstyle:** High-velocity slingshot maneuvers, dynamic trajectory ricochets, and aggressive momentum-based impacts.

---

# **3\. The World Map**

The world is constructed around a central axis with four dynamic biomes occupy dynamic coordinate quadrants.  
                          \+Y (Axis)

                                  |

    QUADRANT II       |       QUADRANT I

  Parabolic Wastes    |    Domain of Order  
    
                                   |

  \------------------ (0,0) \------------------ \+X

                                    |

   QUADRANT III         |       QUADRANT IV

   Fractal Depths        |     Zero-G Void

                                   |  
   
                             \-Y (Axis)

## **The Origin Point (0,0)**

The non-combat hub zone. Features structural matrix anchors where players finalize upgrades, convert currencies, and launch world-generation cycles.

## **Quadrant Mechanics**

Upon player death, the relative positions of the 4 biomes scramble across the Cartesian quadrants, ensuring varied progression routes in subsequent runs.

* **Domain of Order:** Rigid, crystalline grid zones with linear laser hazards and perfectly right-angled obstacle layouts.  
* **Parabolic Wastes:** Curved geometry lines, gravitational arcs, and shifting surface slopes that bend projectile paths.  
* **Fractal Depths:** Self-similar repeating obstacle clusters, dense spatial corridors, and recursively splitting hazard zones.  
* **Zero-G Void:** Frictionless grid spaces featuring free-floating geometry hazards and long-distance directional drift.

---

# **4\. Movement Mechanics**

* **8-Directional Vector Dash:** Stores up to 5 charges. Allows instant linear movement along cardinal and diagonal vectors. Leaves glowing, damage-dealing neon trail lines behind for 1.5 seconds.  
* **Apex Step:** A double-jump pulse that releases a 360-degree radial shockwave, neutralizing light enemy projectiles and knocking back adjacent grunts.  
* **Suspension State:** Holding the mobility trigger slows local time by 60% and halts gravity for 2.5 seconds, allowing precision aim and complex trajectory planning in mid-air.

---

# **5\. Inventory & Combat Infrastructure**

## **Equipment Capacity**

* **Primary Weapons:** Maximum 3 slots.  
* **Deployable Traps:** Maximum 2 slots (Each possesses 3 auto-recharging active charges).  
* **Default Loadout:** Starts with **Sine Rifle** and **Gravity Tether**.

## **Intersection Pause System**

When a new weapon or trap drops, time slows to 5% speed (Intersection Pause). The interface displays trajectory comparison math, offering two immediate choices:

1. **Swap:** Equips the new item into an active slot, dropping the current selection.  
2. **Scrap:** Instantly breaks down the dropped item into **Vertices** (currency) based on its weapon grade.

---

# **6\. Weapon & Trap Arsenal**

Equipment scales from **Grade I (Linear)** to **Grade IV (Tesseract)**, expanding projectile complexity and particle output.

## **Weapon Arsenal**

| Weapon | Grade | Type | Primary Behavior |
| :---- | :---- | :---- | :---- |
| **Sine Rifle** | Grade I | Linear Wave | Fires alternating high-frequency sine-wave beam pulses. |
| **Parabolic Mortar** | Grade I | Arc Projectile | Fires explosive geometric shells along calculated arc trajectories. |
| **Reflection Ray** | Grade II | Multi-Bounce | High-velocity laser that ricochets off grid lines and enemy shields. |
| **Tangent Disc** | Grade II | Cutting Ricochet | Slices along obstacle edges, accelerating with every tangential contact. |
| **Scalar Shotgun** | Grade III | Area Spread | Fires cone-shaped bursts of vector points that widen and slow down over distance. |
| **Fractal Cluster** | Grade III | Explosive Split | Grenade that recursively splits into smaller sub-explosions upon impact. |
| **Asymptote Laser** | Grade IV | Continuous Beam | High-output beam that increases damage infinitely the longer it hits a single target. |
| **Doppler Repeater** | Grade IV | Velocity Scale | Rapid-fire bolt weapon whose damage scales directly with player movement speed. |

## **Deployable Traps**

* **Gravity Tether:** Pins enemies to a fixed coordinate point, pulling surrounding grunts inward.  
* **Prism Mine:** Detonates into 12 refracting light shards when an enemy crosses its laser trigger.  
* **Möbius Snare:** Deploys an infinite-loop energy field that traps enemy movement vectors inside its boundary for 4 seconds.  
* **Vector Repulsor:** Periodically emits a high-impact kinetic pulse that reflects incoming projectiles back toward enemies.

---

# **7\. Economy & Sustain**

## **Vertices Currency**

Collected from destroyed enemies and scrapped weapons. Vertices are spent between combat waves to acquire temporary run modifiers and structural enhancements:

* **Elastic Collision:** Increases projectile damage by 15% following ricochets.  
* **Terminal Velocity:** Grants a temporary speed boost whenever an enemy is destroyed at max velocity.

## **Health & Sustain Systems**

* **Vampiric Vectors:** Converts a percentage of critical damage into structural health repair. Critical chance increases linearly with the angle of attack relative to enemy orientation (flanking yields higher crit rate).  
* **Code Fragments:** Rare item drops from elite units that instantly restore 25% health and replenish all trap charges.

---

# **8\. Wave Structure & Enemy Types**

Combat encounters trigger through **Grid Lockdowns**, isolating the local area until all hostile waves are purged.

## **Scaling Mechanics**

Grunt spawn counts increase by **10% exponentially per wave**.

## **Hostile Units**

\[Ray-Caster\] \-------- Long-Range Sniper Beam \--------\> (Player)

                                                           |

\[Tessellator\] \===== Restrictive Wall Barrier \=====\>        |

                                                           v

\[Sine-Seeker\] \~\~\~\~\~ Homing Wave Trajectory \~\~\~\~\~\~\~\~\~\~\~\~\~\~\~\~\~\~

* **Ray-Caster:** High-precision anti-air sniper unit. Locks onto target paths with targeting lasers before firing high-damage beams.  
* **Tessellator:** Heavy support unit. Deploys solid neon laser walls that restrict player movement and alter combat geometry.  
* **Sine-Seeker:** Mobile drone that fires homing projectiles moving in oscillating wave patterns.  
* **Scalar:** Support unit that deploys localized gravity wells, pulling player vectors off-course.  
* **Delta Swarm:** Fast, low-health melee units that crawl along grid walls and swarm in high numbers.

---

# **9\. Mini-Boss Encounters (Every 5th Wave)**

At the start of every 5th wave, the camera zooms out to a **Macro-View**, expanding the visible grid area.

## **Boss Roster**

* **Orbital Torus:** Rotates nested energy rings around its core, firing radial salvo bursts.  
* **Hyperbolic Twins:** Dual bosses linked by a high-damage beam line that sweep across the arena in synchronized paths.  
* **Non-Euclidean Prism:** Warps screen space and redirects player projectiles along unpredictable curved vectors.  
* **Apex Icosahedron:** Heavy 20-sided boss that rotates armor faces toward the player while unleashing intense bullet patterns.

## **Mechanics & Modifiers**

* **Mini-Boss Surge:** Defeating a mini-boss grants a **50% base chance to trigger a full health restore**. This chance scales by **\+10% for each mini-boss defeated** during the run. If player health is already full, maximum HP permanently expands by 15%.  
* **Difficulty Scaling (Grunt Support):**  
  * *Easy:* 0% additional grunts spawn during mini-boss fights.  
  * *Normal:* 50% standard wave grunt density accompanies mini-bosses.  
  * *Hard:* 100% full wave grunt density spawns concurrently with mini-bosses.

---

# **10\. Boss 100: The Corruption Vector**

The ultimate encounter at Wave 100 features dynamic adaptive stats based on the active grunt population in the arena.       
  \[ HIGH GRUNT COUNT \]                      \[ LOW GRUNT COUNT \]

   \+---------------------------+          \+---------------------------+

   | Boss Attack:   HIGH (200%)|          | Boss Attack:   LOW (50%)  |

   | Boss Armor:    LOW (25%)  |          | Boss Armor:    HIGH (90%) |

   | Grunt Armor:   BUFFED (+2x)|         | Grunt Armor:   STANDARD   |

   \+---------------------------+          \+---------------------------+

## **Adaptive Mechanics**

* **High Grunt Count Active:** The Corruption Vector absorbs energy from its swarm, gaining massive attack damage boosts (+200%), reducing its own armor values (-75%), and granting heavy armor shields to all active grunts.  
* **Low Grunt Count Active:** The boss enters a defensive stance, gaining heavy armor reduction (-90% incoming damage) while reducing its direct attack output to passive levels.

## **Hard Mode Modifier**

On Hard Difficulty, **The Corruption Vector** spawns alongside a secondary random mini-boss from Wave 5-95, requiring simultaneous management of wave grunts, mini-boss mechanics, and the main boss's stat shifts.

---

# **11\. Meta-Progression**

Upon death or run completion, all unspent **Vertices** carried back to the **(0,0) Origin Hub** convert into **Prime Matrices** at a 10:1 ratio. Prime Matrices unlock permanent node upgrades in the Meta Matrix.  
                     \[ ORIGIN HUB (0,0) \]

                                  |

             Unspent Vertices \-\> Prime Matrices

                                  |

     \+----------------------------+----------------------------+

     |                                          |                                       |

     v                                         v                                      v

\[ Algorithmic Tree \]                \[ Loadout Variables \]                   \[ Chromatic Shifts \]

 \- Base Dash Charges           \- Starting Weapon Grades             \- Custom Neon Colors

 \- Kinetic Dampening             \- Trap Charge Rates                    \- Trail Vector FX

## **Algorithmic Skill Tree**

* **Vector Processing:** Permanently increases base movement speed and adds up to 2 extra dash charges.  
* **Kinetic Dampening:** Reduces collision and impact damage taken from environmental grid walls.  
* **Matrix Expansion:** Increases base health pool and passive health regeneration rates.

## **Loadout Variables**

* **Initial Matrix:** Unlock options to start runs with higher-grade base weapons (Up to Grade II).  
* **Trap Calibration:** Reduces default trap recharge timers by up to 30%.

## **Chromatic Shifts**

Cosmetic customization options that alter the visual presentation of the Cartesian plane:

* Unlocks custom color palettes for neon grid lines, UI elements, and player dash trails (e.g., Ultra-Violet, Thermal Yellow, Monochrome Vector).

