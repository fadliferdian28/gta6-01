import * as THREE from 'three';

export class Pedestrians {
    constructor(game) {
        this.game = game;
        this.scene = game.scene;
        this.city = game.systems.city;
        this.pedestrians = [];
        this.maxPeds = 30;
        this.spawnTimer = 0;
        this.rng = new SeededRNG(11111);
        this.initPedestrians();
    }

    initPedestrians() {
        for (let i = 0; i < this.maxPeds; i++) {
            this.spawnPedestrian();
        }
    }

    spawnPedestrian() {
        if (this.pedestrians.length >= this.maxPeds) return;

        const sidewalkPos = this.getRandomSidewalkPosition();
        if (!sidewalkPos) return;

        const ped = this.createPedestrian(sidewalkPos);
        this.pedestrians.push(ped);
    }

    spawnPedestrianAt(x, z) {
        if (this.pedestrians.length >= this.maxPeds) return null;

        const position = new THREE.Vector3(x, 0, z);
        const ped = this.createPedestrian(position);
        this.pedestrians.push(ped);
        return ped;
    }

    getRandomSidewalkPosition() {
        const half = (this.city.gridSize * this.city.blockSize) / 2;
        const step = this.city.blockSize;
        const roadW = this.city.roadWidth/2;
        const swW = this.city.sidewalkWidth;

        for (let attempt = 0; attempt < 20; attempt++) {
            const gx = this.rng.int(0, this.city.gridSize - 1);
            const gz = this.rng.int(0, this.city.gridSize - 1);
            const cx = -half + gx * step + step/2;
            const cz = -half + gz * step + step/2;

            if (this.city.isBeachArea(cx, cz)) {
                const x = cx + this.rng.float(-step/2 + 10, step/2 - 10);
                const z = cz + this.rng.float(-step/2 + 10, step/2 - 10);
                if (this.city.isOnRoad(x, z)) continue;
                return new THREE.Vector3(x, 0, z);
            }

            const axis = this.rng.float() < 0.5 ? 'x' : 'z';
            const side = this.rng.float() < 0.5 ? -1 : 1;

            let x, z;
            if (axis === 'x') {
                x = cx + this.rng.float(-step/2 + roadW + swW + 1, step/2 - roadW - swW - 1);
                z = cz + side * (roadW + swW/2);
            } else {
                x = cx + side * (roadW + swW/2);
                z = cz + this.rng.float(-step/2 + roadW + swW + 1, step/2 - roadW - swW - 1);
            }

            let tooClose = false;
            for (const p of this.pedestrians) {
                if (p.position.distanceTo(new THREE.Vector3(x, 0, z)) < 5) {
                    tooClose = true; break;
                }
            }
            if (this.game.systems.player.position.distanceTo(new THREE.Vector3(x, 0, z)) < 20) tooClose = true;

            if (!tooClose) return new THREE.Vector3(x, 0, z);
        }
        return null;
    }

    createPedestrian(position) {
        const group = new THREE.Group();
        const colors = [0xFFCCAA, 0xE8B4A0, 0xD4A590, 0xC09080, 0x8B6B55];
        const skinColor = this.rng.choice(colors);
        const shirtColors = [0xFF0000, 0x0000FF, 0x00FF00, 0xFFFF00, 0xFF00FF, 0xFFFFFF, 0xFFA500, 0x800080];
        const pantsColors = [0x000080, 0x333333, 0x555555, 0x8B4513, 0x2F4F4F];
        const shirtColor = this.rng.choice(shirtColors);
        const pantsColor = this.rng.choice(pantsColors);

        const bodyGeo = new THREE.CapsuleGeometry(0.25, 0.8, 6, 12);
        const bodyMat = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.8 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 1.1;
        body.castShadow = true;
        group.add(body);

        const headGeo = new THREE.SphereGeometry(0.2, 12, 12);
        const headMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.8 });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 1.7;
        head.castShadow = true;
        group.add(head);

        const legGeo = new THREE.CapsuleGeometry(0.12, 0.6, 4, 8);
        const legMat = new THREE.MeshStandardMaterial({ color: pantsColor, roughness: 0.8 });
        const leftLeg = new THREE.Mesh(legGeo, legMat);
        leftLeg.position.set(-0.12, 0.4, 0);
        group.add(leftLeg);
        const rightLeg = new THREE.Mesh(legGeo, legMat);
        rightLeg.position.set(0.12, 0.4, 0);
        group.add(rightLeg);

        const armGeo = new THREE.CapsuleGeometry(0.08, 0.5, 4, 8);
        const armMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.8 });
        const leftArm = new THREE.Mesh(armGeo, armMat);
        leftArm.position.set(-0.35, 1.2, 0);
        leftArm.rotation.x = -0.2;
        group.add(leftArm);
        const rightArm = new THREE.Mesh(armGeo, armMat);
        rightArm.position.set(0.35, 1.2, 0);
        rightArm.rotation.x = -0.2;
        group.add(rightArm);

        group.position.copy(position);
        this.scene.add(group);

        return {
            mesh: group,
            position: group.position,
            velocity: new THREE.Vector3(),
            target: position.clone(),
            state: 'walk',
            walkTimer: this.rng.float(0, 10),
            walkSpeed: this.rng.float(1.2, 2.5),
            fleeTarget: null,
            leftLeg, rightLeg, leftArm, rightArm,
            head,
            health: 100
        };
    }

    update(dt) {
        this.spawnTimer += dt;
        if (this.spawnTimer > 2 && this.pedestrians.length < this.maxPeds) {
            this.spawnPedestrian();
            this.spawnTimer = 0;
        }

        this.pedestrians.forEach((ped, i) => {
            this.updatePedestrian(ped, dt);

            if (ped.position.distanceTo(this.game.systems.player.position) > 150) {
                this.despawnPed(i);
            }
        });
    }

    updatePedestrian(ped, dt) {
        const player = this.game.systems.player;
        const playerDist = ped.position.distanceTo(player.position);

        if (playerDist < 8 && (player.aiming || player.velocity.length() > 10)) {
            ped.state = 'flee';
            if (!ped.fleeTarget) {
                const away = ped.position.clone().sub(player.position).normalize();
                ped.fleeTarget = ped.position.clone().add(away.multiplyScalar(30));
            }
        }

        if (ped.state === 'flee') {
            this.updateFlee(ped, dt);
        } else {
            this.updateWalk(ped, dt);
        }

        this.animatePedestrian(ped, dt);
    }

    updateWalk(ped, dt) {
        ped.walkTimer += dt;

        if (ped.walkTimer > this.rng.float(3, 8)) {
            ped.walkTimer = 0;
            const sidewalkPos = this.getNearSidewalkPosition(ped.position);
            if (sidewalkPos) ped.target = sidewalkPos;
        }

        const toTarget = ped.target.clone().sub(ped.position);
        toTarget.y = 0;
        const dist = toTarget.length();

        if (dist < 2) {
            ped.velocity.lerp(new THREE.Vector3(), dt * 3);
        } else {
            const dir = toTarget.normalize();
            ped.velocity.lerp(dir.multiplyScalar(ped.walkSpeed), dt * 3);
            ped.mesh.lookAt(ped.position.clone().add(dir));
        }

        ped.position.add(ped.velocity.clone().multiplyScalar(dt));
        ped.mesh.position.copy(ped.position);
    }

    updateFlee(ped, dt) {
        if (!ped.fleeTarget) return;

        const toTarget = ped.fleeTarget.clone().sub(ped.position);
        toTarget.y = 0;
        const dist = toTarget.length();

        if (dist < 3) {
            ped.state = 'walk';
            ped.fleeTarget = null;
            ped.walkTimer = 0;
            return;
        }

        const dir = toTarget.normalize();
        ped.velocity.lerp(dir.multiplyScalar(ped.walkSpeed * 2.5), dt * 5);
        ped.mesh.lookAt(ped.position.clone().add(dir));

        ped.position.add(ped.velocity.clone().multiplyScalar(dt));
        ped.mesh.position.copy(ped.position);
    }

    animatePedestrian(ped, dt) {
        const speed = ped.velocity.length();
        const t = Date.now() * 0.01;

        if (speed > 0.5) {
            ped.leftLeg.rotation.x = Math.sin(t * 2) * 0.8;
            ped.rightLeg.rotation.x = -Math.sin(t * 2) * 0.8;
            ped.leftArm.rotation.x = -Math.sin(t * 2) * 0.6;
            ped.rightArm.rotation.x = Math.sin(t * 2) * 0.6;
        } else {
            ped.leftLeg.rotation.x = THREE.MathUtils.lerp(ped.leftLeg.rotation.x, 0, dt * 5);
            ped.rightLeg.rotation.x = THREE.MathUtils.lerp(ped.rightLeg.rotation.x, 0, dt * 5);
            ped.leftArm.rotation.x = THREE.MathUtils.lerp(ped.leftArm.rotation.x, -0.2, dt * 5);
            ped.rightArm.rotation.x = THREE.MathUtils.lerp(ped.rightArm.rotation.x, -0.2, dt * 5);
        }
    }

    getNearSidewalkPosition(position) {
        const half = (this.city.gridSize * this.city.blockSize) / 2;
        const step = this.city.blockSize;
        const roadW = this.city.roadWidth/2;
        const swW = this.city.sidewalkWidth;

        const gx = Math.floor((position.x + half) / step);
        const gz = Math.floor((position.z + half) / step);
        const cx = -half + gx * step + step/2;
        const cz = -half + gz * step + step/2;

        const axis = this.rng.float() < 0.5 ? 'x' : 'z';
        const side = this.rng.float() < 0.5 ? -1 : 1;

        let x, z;
        if (axis === 'x') {
            x = cx + this.rng.float(-step/2 + roadW + swW + 1, step/2 - roadW - swW - 1);
            z = cz + side * (roadW + swW/2);
        } else {
            x = cx + side * (roadW + swW/2);
            z = cz + this.rng.float(-step/2 + roadW + swW + 1, step/2 - roadW - swW - 1);
        }
        return new THREE.Vector3(x, 0, z);
    }

    despawnPed(index) {
        const ped = this.pedestrians[index];
        this.scene.remove(ped.mesh);
        this.pedestrians.splice(index, 1);
    }

    applyDamage(ped, amount, position) {
        ped.health -= amount;
        if (ped.health <= 0) {
            ped.mesh.rotation.x = Math.PI/2;
            ped.velocity.set(0,0,0);
            ped.state = 'dead';
        } else {
            ped.state = 'flee';
            const away = ped.position.clone().sub(position).normalize();
            ped.fleeTarget = ped.position.clone().add(away.multiplyScalar(30));
        }
    }
}

class SeededRNG {
    constructor(seed) { this.seed = seed; }
    next() { this.seed = (this.seed * 1664525 + 1013904223) % 4294967296; return this.seed / 4294967296; }
    float(min=0, max=1) { return min + this.next() * (max - min); }
    int(min, max) { return Math.floor(this.float(min, max+1)); }
    choice(arr) { return arr[this.int(0, arr.length-1)]; }
}
