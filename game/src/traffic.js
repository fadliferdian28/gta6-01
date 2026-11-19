import * as THREE from 'three';

const TRAFFIC_TYPES = ['streetfox', 'bay_breeze', 'harbor_hauler'];

export class Traffic {
    constructor(game) {
        this.game = game;
        this.scene = game.scene;
        this.vehicles = game.systems.vehicles;
        this.city = game.systems.city;
        this.trafficCars = [];
        this.maxTraffic = 20;
        this.spawnTimer = 0;
        this.rng = new SeededRNG(98765);
        this.initTraffic();
    }

    initTraffic() {
        for (let i = 0; i < this.maxTraffic; i++) {
            this.spawnTrafficCar();
        }
    }

    spawnTrafficCar() {
        if (this.trafficCars.length >= this.maxTraffic) return;

        const type = this.rng.choice(TRAFFIC_TYPES);
        const roadPos = this.getRandomRoadPosition();
        if (!roadPos) return;

        const vehicle = this.vehicles.buildVehicle(this.vehicles.VEHICLE_DEFS[type], type);
        vehicle.mesh.position.copy(roadPos.pos);
        vehicle.mesh.rotation.y = roadPos.angle;
        vehicle.engineOn = true;
        vehicle.parked = false;
        vehicle.ai = true;
        vehicle.aiPath = this.generatePath(roadPos);
        vehicle.aiWaypointIndex = 0;
        vehicle.aiTarget = vehicle.aiPath[0];
        vehicle.traffic = true;

        this.trafficCars.push(vehicle);
    }

    getRandomRoadPosition() {
        const half = (this.city.gridSize * this.city.blockSize) / 2;
        const step = this.city.blockSize;
        const roadW = this.city.roadWidth / 2;

        const attempts = 20;
        for (let i = 0; i < attempts; i++) {
            const gx = this.rng.int(1, this.city.gridSize - 2);
            const gz = this.rng.int(1, this.city.gridSize - 2);
            const cx = -half + gx * step;
            const cz = -half + gz * step;

            const axis = this.rng.float() < 0.5 ? 'x' : 'z';
            let pos, angle;

            if (axis === 'x') {
                const lane = this.rng.float() < 0.5 ? -1 : 1;
                pos = new THREE.Vector3(
                    this.rng.float(-half + 10, half - 10),
                    0.5,
                    cz + lane * (roadW + 1)
                );
                angle = lane > 0 ? Math.PI : 0;
            } else {
                const lane = this.rng.float() < 0.5 ? -1 : 1;
                pos = new THREE.Vector3(
                    cx + lane * (roadW + 1),
                    0.5,
                    this.rng.float(-half + 10, half - 10)
                );
                angle = lane > 0 ? -Math.PI/2 : Math.PI/2;
            }

            let tooClose = false;
            for (const v of this.trafficCars) {
                if (v.mesh.position.distanceTo(pos) < 15) {
                    tooClose = true; break;
                }
            }
            if (this.game.systems.player.position.distanceTo(pos) < 30) tooClose = true;

            if (!tooClose) return { pos, angle };
        }
        return null;
    }

    generatePath(start) {
        const path = [];
        const half = (this.city.gridSize * this.city.blockSize) / 2;
        const step = this.city.blockSize;

        let current = start.pos.clone();
        let angle = start.angle;
        const segments = this.rng.int(5, 15);

        for (let i = 0; i < segments; i++) {
            path.push(current.clone());

            const forward = new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle));
            const dist = this.rng.float(step * 0.8, step * 1.2);
            current.add(forward.multiplyScalar(dist));

            if (this.rng.float() < 0.3) {
                const turn = this.rng.choice([-1, 1]) * Math.PI/2;
                angle += turn;
            }

            if (current.x < -half + 20 || current.x > half - 20 ||
                current.z < -half + 20 || current.z > half - 20) {
                angle += Math.PI;
            }
        }

        path.push(path[0].clone());
        return path;
    }

    update(dt) {
        this.spawnTimer += dt;
        if (this.spawnTimer > 3 && this.trafficCars.length < this.maxTraffic) {
            this.spawnTrafficCar();
            this.spawnTimer = 0;
        }

        this.trafficCars.forEach((v, i) => {
            this.updateTrafficCar(v, dt);

            if (v.mesh.position.distanceTo(this.game.systems.player.position) > 200) {
                this.despawnCar(i);
            }
        });
    }

    updateTrafficCar(v, dt) {
        if (!v.ai || !v.aiTarget) return;

        const toTarget = v.aiTarget.clone().sub(v.mesh.position);
        toTarget.y = 0;
        const dist = toTarget.length();

        if (dist < 4) {
            v.aiWaypointIndex = (v.aiWaypointIndex + 1) % v.aiPath.length;
            v.aiTarget = v.aiPath[v.aiWaypointIndex];
            return;
        }

        const forward = new THREE.Vector3();
        v.mesh.getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();

        const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0));
        const targetDir = toTarget.normalize();

        const dot = forward.dot(targetDir);
        const cross = forward.cross(targetDir).y;

        const playerDist = v.mesh.position.distanceTo(this.game.systems.player.position);
        const playerVel = this.game.systems.player.velocity.length();

        if (playerDist < 15 && playerVel > 5) {
            const toPlayer = this.game.systems.player.position.clone().sub(v.mesh.position).normalize();
            const avoidDir = toPlayer.clone().multiplyScalar(-1);
            const avoidCross = forward.cross(avoidDir).y;
            v.steering = avoidCross * 2;
            v.brake = 0.8;
            v.throttle = 0;
            this.game.systems.audio.playSfx('honk', v.mesh.position);
        } else {
            v.throttle = dot > 0.3 ? 1 : 0;
            v.brake = dot < 0 ? 0.5 : 0;
            v.steering = cross;
        }

        if (dist < 15 && v.speed > 10) v.brake = 0.7;
    }

    despawnCar(index) {
        const v = this.trafficCars[index];
        this.scene.remove(v.mesh);
        this.trafficCars.splice(index, 1);
    }

    getTrafficCars() {
        return this.trafficCars;
    }
}

class SeededRNG {
    constructor(seed) { this.seed = seed; }
    next() { this.seed = (this.seed * 1664525 + 1013904223) % 4294967296; return this.seed / 4294967296; }
    float(min=0, max=1) { return min + this.next() * (max - min); }
    int(min, max) { return Math.floor(this.float(min, max+1)); }
    choice(arr) { return arr[this.int(0, arr.length-1)]; }
}
