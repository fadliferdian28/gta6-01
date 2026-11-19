import * as THREE from 'three';

const WEAPONS = {
    pistol: { damage: 25, range: 50, spread: 0.02, fireRate: 300, pelletCount: 1 },
    rifle: { damage: 18, range: 100, spread: 0.01, fireRate: 100, pelletCount: 1 },
    shotgun: { damage: 12, range: 20, spread: 0.15, fireRate: 800, pelletCount: 8 }
};

export class Combat {
    constructor(game) {
        this.game = game;
        this.scene = game.scene;
        this.bullets = [];
        this.muzzleFlashes = [];
        this.rng = new SeededRNG(22222);
        this.lastFireTime = 0;
    }

    fire(fromPos, targetPos, weaponName) {
        const weapon = WEAPONS[weaponName];
        const now = Date.now();
        if (now - this.lastFireTime < weapon.fireRate) return false;
        this.lastFireTime = now;

        const origin = fromPos.clone().add(new THREE.Vector3(0, 1.5, 0));
        const direction = targetPos.clone().sub(origin).normalize();

        for (let i = 0; i < weapon.pelletCount; i++) {
            const spread = weapon.spread;
            const dir = direction.clone().add(new THREE.Vector3(
                this.rng.float(-spread, spread),
                this.rng.float(-spread, spread),
                this.rng.float(-spread, spread)
            )).normalize();

            this.bullets.push({
                position: origin.clone(),
                direction: dir,
                speed: 200,
                damage: weapon.damage,
                range: weapon.range,
                traveled: 0,
                weapon: weaponName,
                time: now
            });
        }

        this.createMuzzleFlash(origin, direction);
        return true;
    }

    createMuzzleFlash(position, direction) {
        const geo = new THREE.SphereGeometry(0.3, 8, 8);
        const mat = new THREE.MeshBasicMaterial({ color: 0xFFFF88, transparent: true, opacity: 1 });
        const flash = new THREE.Mesh(geo, mat);
        flash.position.copy(position).add(direction.clone().multiplyScalar(1));
        this.scene.add(flash);
        this.muzzleFlashes.push({ mesh: flash, time: Date.now(), life: 0.05 });
    }

    update(dt) {
        this.updateBullets(dt);
        this.updateMuzzleFlashes(dt);
    }

    updateBullets(dt) {
        const player = this.game.systems.player;
        const peds = this.game.systems.pedestrians.pedestrians;
        const traffic = this.game.systems.traffic.trafficCars;
        const police = this.game.systems.police.policeUnits;

        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            const prevPos = bullet.position.clone();
            const move = bullet.direction.clone().multiplyScalar(bullet.speed * dt);
            bullet.position.add(move);
            bullet.traveled += move.length();

            if (bullet.traveled > bullet.range) {
                this.bullets.splice(i, 1);
                continue;
            }

            let hit = false;

            for (const ped of peds) {
                if (ped.state === 'dead') continue;
                const seg = this.segmentHit(ped.position, prevPos, bullet.position);
                if (seg.dist < 0.6) {
                    this.game.systems.pedestrians.applyDamage(ped, bullet.damage, seg.point);
                    this.createHitEffect(seg.point);
                    hit = true;
                    if (ped.state !== 'dead') this.game.systems.police.reportCrime('assault', seg.point);
                    break;
                }
            }

            if (!hit) {
                for (const v of traffic) {
                    const seg = this.segmentHit(v.mesh.position, prevPos, bullet.position);
                    if (seg.dist < 2) {
                        v.condition -= bullet.damage * 0.5;
                        this.createHitEffect(seg.point);
                        this.game.systems.police.reportCrime('vehicle_damage', seg.point);
                        hit = true;
                        break;
                    }
                }
            }

            if (!hit) {
                for (const cop of police) {
                    if (cop.state === 'dead') continue;
                    const seg = cop.vehicle ? this.segmentHit(cop.vehicle.mesh.position, prevPos, bullet.position) : null;
                    if (seg && seg.dist < 2) {
                        cop.health -= bullet.damage;
                        this.createHitEffect(seg.point);
                        if (cop.health <= 0) cop.state = 'dead';
                        this.game.systems.police.reportCrime('assault_on_officer', seg.point);
                        hit = true;
                        break;
                    }
                }
            }

            if (hit) {
                this.bullets.splice(i, 1);
            }
        }
    }

    // Distance from point p to the segment a->b, and the closest point on it.
    // Returns { dist, point }.
    segmentHit(p, a, b) {
        const ab = b.clone().sub(a);
        const lenSq = ab.lengthSq();
        let t = 0;
        if (lenSq > 0) {
            t = Math.max(0, Math.min(1, p.clone().sub(a).dot(ab) / lenSq));
        }
        const point = a.clone().add(ab.multiplyScalar(t));
        return { dist: p.distanceTo(point), point };
    }

    createHitEffect(position) {
        const geo = new THREE.SphereGeometry(0.2, 8, 8);
        const mat = new THREE.MeshBasicMaterial({ color: 0xFF4400, transparent: true, opacity: 0.8 });
        const hit = new THREE.Mesh(geo, mat);
        hit.position.copy(position);
        this.scene.add(hit);
        let scale = 1;
        const grow = setInterval(() => {
            scale += 0.3;
            hit.scale.setScalar(scale);
            hit.material.opacity = Math.max(0, 0.8 - scale * 0.2);
            if (scale > 3) { clearInterval(grow); this.scene.remove(hit); }
        }, 30);
    }

    updateMuzzleFlashes(dt) {
        const now = Date.now();
        for (let i = this.muzzleFlashes.length - 1; i >= 0; i--) {
            const flash = this.muzzleFlashes[i];
            if ((now - flash.time) / 1000 > flash.life) {
                this.scene.remove(flash.mesh);
                this.muzzleFlashes.splice(i, 1);
            }
        }
    }
}

class SeededRNG {
    constructor(seed) { this.seed = seed; }
    next() { this.seed = (this.seed * 1664525 + 1013904223) % 4294967296; return this.seed / 4294967296; }
    float(min=0, max=1) { return min + this.next() * (max - min); }
}
