import * as THREE from 'three';

const CALSIGNS = ['GULL-1', 'MARLIN-11', 'SNAPPER-25', 'TARPON-18', 'HERON-17', 'IBIS-43', 'KESTREL-31'];
const POLICE_STATES = ['patrol', 'pursuit', 'ramming', 'roadblock', 'spotlight'];

export class Police {
    constructor(game) {
        this.game = game;
        this.scene = game.scene;
        this.vehicles = game.systems.vehicles;
        this.city = game.systems.city;

        this.wantedLevel = 0;
        this.maxWanted = 5;
        this.wantedTimer = 0;
        this.wantedDecayRate = 0.5;

        this.policeUnits = [];
        this.maxUnits = 8;
        this.spawnTimer = 0;
        this.helicopter = null;
        this.heliSpawned = false;

        this.rng = new SeededRNG(33333);
        this.crimeReports = [];
    }

    update(dt) {
        this.updateWanted(dt);
        this.updateUnits(dt);
        this.updateHelicopter(dt);
        this.manageSpawns(dt);
    }

    updateWanted(dt) {
        if (this.wantedLevel > 0) {
            this.wantedTimer += dt;
            if (this.wantedTimer > 5) {
                this.wantedTimer = 0;
                this.wantedLevel = Math.max(0, this.wantedLevel - this.wantedDecayRate);
                this.game.systems.hud.updateWanted(this.wantedLevel);
            }
        }

        if (this.wantedLevel >= 3 && !this.heliSpawned) {
            this.spawnHelicopter();
        } else if (this.wantedLevel < 3 && this.heliSpawned) {
            this.despawnHelicopter();
        }
    }

    reportCrime(type, position) {
        const multipliers = {
            'vehicle_theft': 2,
            'assault': 1,
            'vehicle_damage': 1,
            'assault_on_officer': 3,
            'speeding': 0.5
        };

        const increase = (multipliers[type] || 1) * (1 + this.wantedLevel * 0.2);
        this.wantedLevel = Math.min(this.maxWanted, this.wantedLevel + increase);
        this.wantedTimer = 0;
        this.game.systems.hud.updateWanted(this.wantedLevel);

        this.crimeReports.push({ type, position, time: Date.now() });
        if (this.crimeReports.length > 10) this.crimeReports.shift();
    }

    updateUnits(dt) {
        this.policeUnits.forEach((unit, i) => {
            this.updateUnit(unit, dt);

            if (unit.vehicle && unit.vehicle.mesh.position.distanceTo(this.game.systems.player.position) > 250) {
                this.despawnUnit(i);
            }
        });
    }

    updateUnit(unit, dt) {
        if (!unit.vehicle) return;

        const player = this.game.systems.player;
        const playerPos = player.position;
        const dist = unit.vehicle.mesh.position.distanceTo(playerPos);

        const v = unit.vehicle;
        const toPlayer = playerPos.clone().sub(v.mesh.position);
        toPlayer.y = 0;
        const playerDist = toPlayer.length();

        const forward = new THREE.Vector3();
        v.mesh.getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();

        const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0));
        const targetDir = toPlayer.normalize();

        const dot = forward.dot(targetDir);
        const cross = forward.cross(targetDir).y;

        if (unit.state === 'patrol') {
            if (!v.aiTarget && v.aiPath) {
                v.aiWaypointIndex = (v.aiWaypointIndex + 1) % v.aiPath.length;
                v.aiTarget = v.aiPath[v.aiWaypointIndex];
            }
            this.vehicles.handleAIInput(v);

            if (playerDist < 30 && this.wantedLevel > 0) {
                unit.state = 'pursuit';
            }
        } else if (unit.state === 'pursuit') {
            v.throttle = 1;
            v.brake = 0;
            v.steering = cross * 1.5;

            if (playerDist < 15 && Math.abs(cross) < 0.3 && dot > 0.8) {
                unit.state = 'ramming';
            }

            if (this.wantedLevel >= 3 && unit.callsign.includes('GULL')) {
                unit.state = 'spotlight';
            }
        } else if (unit.state === 'ramming') {
            v.throttle = 1;
            v.steering = cross * 2;
            if (playerDist > 20) unit.state = 'pursuit';
        } else if (unit.state === 'spotlight') {
            v.throttle = 0.5;
            v.steering = cross;
            this.updateSpotlight(unit, playerPos);
        } else if (unit.state === 'roadblock') {
            v.throttle = 0;
            v.brake = 1;
            v.engineOn = false;
        }
    }

    updateSpotlight(unit, targetPos) {
        if (!unit.spotlight) return;
        const dir = targetPos.clone().sub(unit.spotlight.position).normalize();
        unit.spotlight.target.position.copy(targetPos);
        unit.spotlight.target.updateMatrixWorld();
    }

    updateHelicopter(dt) {
        if (!this.helicopter) return;

        const player = this.game.systems.player;
        // Hover ahead of the player's facing direction so the heli is
        // visible from the chase camera instead of directly overhead
        const ref = (player.inVehicle && player.vehicle) ? player.vehicle.mesh : player.mesh;
        const forward = new THREE.Vector3();
        ref.getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();
        const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0));
        const target = player.position.clone()
            .add(forward.multiplyScalar(22))
            .add(right.multiplyScalar(10));
        target.y = 12;

        const toTarget = target.clone().sub(this.helicopter.mesh.position);
        this.helicopter.mesh.position.lerp(target, dt * 0.5);

        this.helicopter.rotor.rotation.y += dt * 50;
        this.helicopter.tailRotor.rotation.x += dt * 80;

        if (this.helicopter.spotlight) {
            this.helicopter.spotlight.target.position.copy(player.position);
            this.helicopter.spotlight.target.updateMatrixWorld();
        }
    }

    manageSpawns(dt) {
        this.spawnTimer += dt;
        const targetUnits = Math.min(this.maxUnits, Math.ceil(this.wantedLevel * 1.5));

        if (this.policeUnits.length < targetUnits && this.spawnTimer > 3) {
            this.spawnUnit();
            this.spawnTimer = 0;
        }
    }

    spawnUnit() {
        const spawnPos = this.getSpawnPosition();
        if (!spawnPos) return;

        const vehicle = this.vehicles.buildVehicle(this.vehicles.VEHICLE_DEFS.lbpd_interceptor, 'lbpd_interceptor');
        vehicle.mesh.position.copy(spawnPos.pos);
        vehicle.mesh.rotation.y = spawnPos.angle;
        vehicle.engineOn = true;
        vehicle.parked = false;

        const callsign = this.rng.choice(CALSIGNS.filter(c => !this.policeUnits.some(u => u.callsign === c)));
        if (!callsign) return;

        const path = this.generatePatrolPath(spawnPos.pos);
        vehicle.ai = true;
        vehicle.aiPath = path;
        vehicle.aiWaypointIndex = 0;
        vehicle.aiTarget = path[0];

        const unit = {
            callsign,
            vehicle,
            state: 'patrol',
            health: 100,
            spotlight: null
        };

        if (this.wantedLevel >= 3 && this.rng.float() < 0.3) {
            unit.state = 'spotlight';
            this.addSpotlight(unit);
        }

        this.policeUnits.push(unit);
    }

    addSpotlight(unit) {
        const light = new THREE.SpotLight(0xFFFFFF, 2, 80, Math.PI/6, 0.5, 1);
        light.position.set(0, 2, 0);
        light.target = new THREE.Object3D();
        unit.vehicle.mesh.add(light);
        unit.vehicle.mesh.add(light.target);
        unit.spotlight = light;
    }

    spawnHelicopter() {
        const heli = new THREE.Group();
        const bodyGeo = new THREE.BoxGeometry(2, 1, 5);
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x003366 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.5;
        body.castShadow = true;
        heli.add(body);

        const rotorGeo = new THREE.BoxGeometry(8, 0.1, 0.4);
        const rotorMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
        const rotor = new THREE.Mesh(rotorGeo, rotorMat);
        rotor.position.y = 1.5;
        rotor.castShadow = true;
        heli.add(rotor);

        const tailGeo = new THREE.BoxGeometry(0.3, 0.3, 3);
        const tail = new THREE.Mesh(tailGeo, bodyMat);
        tail.position.set(0, 0.5, -2.5);
        heli.add(tail);

        const tailRotorGeo = new THREE.BoxGeometry(1.5, 0.1, 0.2);
        const tailRotor = new THREE.Mesh(tailRotorGeo, rotorMat);
        tailRotor.position.set(0, 0.5, -4);
        tailRotor.rotation.x = Math.PI/2;
        heli.add(tailRotor);

        const skidGeo = new THREE.CylinderGeometry(0.1, 0.1, 4, 6);
        const skidMat = new THREE.MeshStandardMaterial({ color: 0x444444 });
        const skid1 = new THREE.Mesh(skidGeo, skidMat);
        skid1.position.set(-0.8, -0.5, 0);
        skid1.rotation.z = Math.PI/2;
        heli.add(skid1);
        const skid2 = skid1.clone();
        skid2.position.set(0.8, -0.5, 0);
        heli.add(skid2);

        const light = new THREE.SpotLight(0xFFFFFF, 3, 100, Math.PI/4, 0.3, 1);
        light.position.set(0, -1, 0);
        light.target = new THREE.Object3D();
        light.target.position.set(0, 0, -10);
        heli.add(light);
        heli.add(light.target);

        heli.position.set(this.game.systems.player.position.x, 40, this.game.systems.player.position.z);
        this.scene.add(heli);

        this.helicopter = {
            mesh: heli,
            rotor,
            tailRotor,
            spotlight: light
        };
        this.heliSpawned = true;
    }

    despawnHelicopter() {
        if (this.helicopter) {
            this.scene.remove(this.helicopter.mesh);
            this.helicopter = null;
            this.heliSpawned = false;
        }
    }

    despawnUnit(index) {
        const unit = this.policeUnits[index];
        this.scene.remove(unit.vehicle.mesh);
        this.policeUnits.splice(index, 1);
    }

    getSpawnPosition() {
        const half = (this.city.gridSize * this.city.blockSize) / 2;
        const step = this.city.blockSize;
        const roadW = this.city.roadWidth / 2;

        for (let attempt = 0; attempt < 20; attempt++) {
            const gx = this.rng.int(0, this.city.gridSize - 1);
            const gz = this.rng.int(0, this.city.gridSize - 1);
            const cx = -half + gx * step;
            const cz = -half + gz * step;

            const axis = this.rng.float() < 0.5 ? 'x' : 'z';
            const lane = this.rng.float() < 0.5 ? -1 : 1;

            let pos, angle;
            if (axis === 'x') {
                pos = new THREE.Vector3(
                    this.rng.float(-half + 20, half - 20),
                    0.5,
                    cz + lane * (roadW + 2)
                );
                angle = lane > 0 ? Math.PI : 0;
            } else {
                pos = new THREE.Vector3(
                    cx + lane * (roadW + 2),
                    0.5,
                    this.rng.float(-half + 20, half - 20)
                );
                angle = lane > 0 ? -Math.PI/2 : Math.PI/2;
            }

            if (pos.distanceTo(this.game.systems.player.position) < 50) continue;
            if (pos.distanceTo(this.game.systems.player.position) > 200) continue;

            return { pos, angle };
        }
        return null;
    }

    generatePatrolPath(start) {
        const path = [];
        const half = (this.city.gridSize * this.city.blockSize) / 2;
        const step = this.city.blockSize;

        let current = start.clone();
        let angle = this.rng.float(0, Math.PI * 2);
        const segments = this.rng.int(6, 12);

        for (let i = 0; i < segments; i++) {
            path.push(current.clone());
            const forward = new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle));
            const dist = this.rng.float(step * 0.8, step * 1.5);
            current.add(forward.multiplyScalar(dist));

            if (this.rng.float() < 0.4) {
                angle += this.rng.choice([-1, 1]) * Math.PI/2;
            }

            if (current.x < -half + 20 || current.x > half - 20 ||
                current.z < -half + 20 || current.z > half - 20) {
                angle += Math.PI;
            }
        }
        path.push(path[0].clone());
        return path;
    }

    clearWanted() {
        this.wantedLevel = 0;
        this.wantedTimer = 0;
        this.game.systems.hud.updateWanted(0);
        this.policeUnits.forEach(u => this.scene.remove(u.vehicle.mesh));
        this.policeUnits = [];
        this.despawnHelicopter();
    }

    getWantedLevel() {
        return this.wantedLevel;
    }

    getUnits() {
        return this.policeUnits;
    }
}

class SeededRNG {
    constructor(seed) { this.seed = seed; }
    next() { this.seed = (this.seed * 1664525 + 1013904223) % 4294967296; return this.seed / 4294967296; }
    float(min=0, max=1) { return min + this.next() * (max - min); }
    int(min, max) { return Math.floor(this.float(min, max+1)); }
    choice(arr) { return arr[this.int(0, arr.length-1)]; }
}
