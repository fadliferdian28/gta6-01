import * as THREE from 'three';

const VEHICLE_DEFS = {
    falcon_gt: {
        name: 'Falcon GT',
        color: 0xCC0000,
        mass: 1500,
        maxSpeed: 60,
        acceleration: 35,
        braking: 25,
        steering: 2.2,
        driftFactor: 0.85,
        dimensions: { w: 2, l: 4.5, h: 1.3 },
        wheels: { fl: [-1.1, 0.4, 1.8], fr: [1.1, 0.4, 1.8], rl: [-1.1, 0.4, -1.8], rr: [1.1, 0.4, -1.8] }
    },
    bay_breeze: {
        name: 'Bay Breeze',
        color: 0x00AAFF,
        mass: 1600,
        maxSpeed: 50,
        acceleration: 28,
        braking: 22,
        steering: 1.8,
        driftFactor: 0.75,
        dimensions: { w: 2, l: 4.8, h: 1.4 },
        wheels: { fl: [-1.1, 0.4, 1.9], fr: [1.1, 0.4, 1.9], rl: [-1.1, 0.4, -1.9], rr: [1.1, 0.4, -1.9] }
    },
    streetfox: {
        name: 'Streetfox',
        color: 0x888888,
        mass: 1400,
        maxSpeed: 45,
        acceleration: 25,
        braking: 20,
        steering: 1.6,
        driftFactor: 0.7,
        dimensions: { w: 1.9, l: 4.6, h: 1.5 },
        wheels: { fl: [-1.0, 0.4, 1.8], fr: [1.0, 0.4, 1.8], rl: [-1.0, 0.4, -1.8], rr: [1.0, 0.4, -1.8] }
    },
    harbor_hauler: {
        name: 'Harbor Hauler',
        color: 0xFFAA00,
        mass: 3000,
        maxSpeed: 35,
        acceleration: 18,
        braking: 18,
        steering: 1.2,
        driftFactor: 0.5,
        dimensions: { w: 2.5, l: 6, h: 2.5 },
        wheels: { fl: [-1.3, 0.5, 2.2], fr: [1.3, 0.5, 2.2], rl: [-1.3, 0.5, -2.2], rr: [1.3, 0.5, -2.2] }
    },
    lbpd_interceptor: {
        name: 'LBPD Interceptor',
        color: 0x003366,
        mass: 1600,
        maxSpeed: 65,
        acceleration: 38,
        braking: 28,
        steering: 2.4,
        driftFactor: 0.9,
        dimensions: { w: 2, l: 4.7, h: 1.4 },
        wheels: { fl: [-1.1, 0.4, 1.9], fr: [1.1, 0.4, 1.9], rl: [-1.1, 0.4, -1.9], rr: [1.1, 0.4, -1.9] }
    }
};

export class Vehicles {
    constructor(game) {
        this.game = game;
        this.scene = game.scene;
        this.vehicles = [];
        this.parkedVehicles = [];
        this.rng = new SeededRNG(54321);
        this.VEHICLE_DEFS = VEHICLE_DEFS;
        this.createParkedVehicles();
    }

    createParkedVehicles() {
        const types = Object.keys(VEHICLE_DEFS);
        const half = (this.game.systems.city.gridSize * this.game.systems.city.blockSize) / 2;
        const step = this.game.systems.city.blockSize;

        for (let gx = 0; gx < this.game.systems.city.gridSize; gx++) {
            for (let gz = 0; gz < this.game.systems.city.gridSize; gz++) {
                const cx = -half + gx * step + step/2;
                const cz = -half + gz * step + step/2;

                if (this.game.systems.city.isBeachArea(cx, cz)) continue;
                if (this.rng.float() > 0.15) continue;

                const type = this.rng.choice(types);
                const pos = this.findParkingSpot(cx, cz);
                if (pos) {
                    this.spawnParkedVehicle(type, pos);
                }
            }
        }
    }

    findParkingSpot(cx, cz) {
        const step = this.game.systems.city.blockSize;
        const roadW = this.game.systems.city.roadWidth/2 + this.game.systems.city.sidewalkWidth + 2;

        for (let attempt = 0; attempt < 10; attempt++) {
            const x = cx + this.rng.float(-step/2 + roadW, step/2 - roadW);
            const z = cz + this.rng.float(-step/2 + roadW, step/2 - roadW);

            if (!this.game.systems.city.isOnRoad(x, z)) {
                let tooClose = false;
                for (const v of this.parkedVehicles) {
                    if (v.position.distanceTo(new THREE.Vector3(x, 0, z)) < 6) {
                        tooClose = true; break;
                    }
                }
                if (!tooClose) return new THREE.Vector3(x, 0.5, z);
            }
        }
        return null;
    }

    spawnParkedVehicle(type, position) {
        const def = VEHICLE_DEFS[type];
        const vehicle = this.buildVehicle(def, type);
        vehicle.mesh.position.copy(position);
        vehicle.mesh.rotation.y = this.rng.float(0, Math.PI * 2);
        vehicle.parked = true;
        vehicle.engineOn = false;
        this.parkedVehicles.push(vehicle);
        this.vehicles.push(vehicle);
        return vehicle;
    }

    buildVehicle(def, type) {
        const group = new THREE.Group();
        const bodyMat = new THREE.MeshStandardMaterial({ color: def.color, roughness: 0.3, metalness: 0.7 });
        const glassMat = new THREE.MeshStandardMaterial({ color: 0x223344, roughness: 0.1, metalness: 0.9, transparent: true, opacity: 0.4 });
        const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
        const lightMat = new THREE.MeshBasicMaterial({ color: 0xFFFF00 });
        const redLightMat = new THREE.MeshBasicMaterial({ color: 0xFF0000 });
        const blueLightMat = new THREE.MeshBasicMaterial({ color: 0x0000FF });

        const bodyGeo = new THREE.BoxGeometry(def.dimensions.w, def.dimensions.h, def.dimensions.l);
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = def.dimensions.h / 2;
        body.castShadow = true;
        group.add(body);

        const cabinGeo = new THREE.BoxGeometry(def.dimensions.w * 0.85, def.dimensions.h * 0.7, def.dimensions.l * 0.5);
        const cabin = new THREE.Mesh(cabinGeo, bodyMat);
        cabin.position.y = def.dimensions.h * 0.85;
        cabin.castShadow = true;
        group.add(cabin);

        const glassGeo = new THREE.BoxGeometry(def.dimensions.w * 0.8, def.dimensions.h * 0.6, def.dimensions.l * 0.45);
        const glass = new THREE.Mesh(glassGeo, glassMat);
        glass.position.y = def.dimensions.h * 0.85;
        group.add(glass);

        const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 16);
        const wheels = {};
        Object.entries(def.wheels).forEach(([name, pos]) => {
            const wheel = new THREE.Mesh(wheelGeo, wheelMat);
            wheel.position.set(pos[0], pos[1], pos[2]);
            wheel.rotation.z = Math.PI / 2;
            wheel.castShadow = true;
            group.add(wheel);
            wheels[name] = wheel;
        });

        let blueLight = null, redLight = null;
        if (type === 'lbpd_interceptor') {
            const barGeo = new THREE.BoxGeometry(1.5, 0.3, 0.3);
            const bar = new THREE.Mesh(barGeo, bodyMat);
            bar.position.y = def.dimensions.h + 0.2;
            group.add(bar);

            const blueGeo = new THREE.BoxGeometry(0.4, 0.2, 0.2);
            const redGeo = new THREE.BoxGeometry(0.4, 0.2, 0.2);
            blueLight = new THREE.Mesh(blueGeo, blueLightMat);
            blueLight.position.set(-0.6, def.dimensions.h + 0.4, 0);
            redLight = new THREE.Mesh(redGeo, redLightMat);
            redLight.position.set(0.6, def.dimensions.h + 0.4, 0);
            group.add(blueLight);
            group.add(redLight);
        }

        const headlightGeo = new THREE.SphereGeometry(0.2, 8, 8);
        const headlightL = new THREE.Mesh(headlightGeo, lightMat);
        headlightL.position.set(-0.7, 0.6, def.dimensions.l/2 + 0.1);
        const headlightR = new THREE.Mesh(headlightGeo, lightMat);
        headlightR.position.set(0.7, 0.6, def.dimensions.l/2 + 0.1);
        group.add(headlightL);
        group.add(headlightR);

        const tailLightGeo = new THREE.BoxGeometry(0.4, 0.3, 0.1);
        const tailL = new THREE.Mesh(tailLightGeo, redLightMat);
        tailL.position.set(-0.8, 0.6, -def.dimensions.l/2 - 0.1);
        const tailR = new THREE.Mesh(tailLightGeo, redLightMat);
        tailR.position.set(0.8, 0.6, -def.dimensions.l/2 - 0.1);
        group.add(tailL);
        group.add(tailR);

        const vehicle = {
            type,
            def,
            mesh: group,
            position: group.position,
            velocity: new THREE.Vector3(),
            angularVelocity: 0,
            speed: 0,
            gear: 1,
            rpm: 0,
            engineOn: true,
            parked: false,
            driver: null,
            enter(driver) { this.driver = driver; this.engineOn = true; },
            exit() { this.driver = null; },
            condition: 100,
            maxCondition: 100,
            wheels,
            steering: 0,
            handbrake: false,
            siren: false,
            sirenTimer: 0,
            lightsOn: false
        };

        if (type === 'lbpd_interceptor') {
            vehicle.sirenLights = { blue: blueLight, red: redLight };
        }

        this.scene.add(group);
        return vehicle;
    }

    getNearestVehicle(position, radius) {
        let nearest = null;
        let minDist = radius;
        for (const v of this.parkedVehicles) {
            if (v.parked) {
                const d = v.mesh.position.distanceTo(position);
                if (d < minDist) {
                    minDist = d;
                    nearest = v;
                }
            }
        }
        return nearest;
    }

    update(dt) {
        this.vehicles.forEach(v => {
            if (v.parked && !v.driver) return;
            this.updateVehiclePhysics(v, dt);
        });
    }

    updateVehiclePhysics(v, dt) {
        if (!v.engineOn) return;

        const forward = new THREE.Vector3();
        v.mesh.getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();

        const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0));

        const localVel = new THREE.Vector3();
        localVel.x = v.velocity.dot(right);
        localVel.z = v.velocity.dot(forward);

        v.speed = localVel.z;
        v.rpm = Math.abs(v.speed) * 50 + 800;

        if (v.driver === this.game.systems.player) {
            this.handlePlayerInput(v);
        } else if (v.ai) {
            this.handleAIInput(v);
        }

        const steerForce = v.steering * v.def.steering * dt;
        v.angularVelocity = THREE.MathUtils.lerp(v.angularVelocity, v.steering * v.def.steering * (v.speed / v.def.maxSpeed), dt * 5);

        if (v.handbrake && Math.abs(v.speed) > 2) {
            v.angularVelocity *= 1.5;
            localVel.x *= v.def.driftFactor;
        }

        v.mesh.rotation.y += v.angularVelocity * dt;

        const accel = v.throttle * v.def.acceleration - v.brake * v.def.braking;
        localVel.z += accel * dt;
        localVel.z = THREE.MathUtils.clamp(localVel.z, -v.def.maxSpeed * 0.3, v.def.maxSpeed);

        const drag = 0.02;
        localVel.z *= (1 - drag * dt);
        localVel.x *= (1 - drag * dt * 2);

        if (Math.abs(localVel.z) < 0.1 && Math.abs(v.throttle) < 0.01) localVel.z = 0;

        v.velocity.x = localVel.x * right.x + localVel.z * forward.x;
        v.velocity.z = localVel.x * right.z + localVel.z * forward.z;

        v.mesh.position.add(v.velocity.clone().multiplyScalar(dt));

        v.wheels.fl.rotation.x += v.speed * dt * 5;
        v.wheels.fr.rotation.x += v.speed * dt * 5;
        v.wheels.rl.rotation.x += v.speed * dt * 5;
        v.wheels.rr.rotation.x += v.speed * dt * 5;

        const maxSteerAngle = 0.6;
        v.wheels.fl.rotation.y = THREE.MathUtils.clamp(v.steering, -maxSteerAngle, maxSteerAngle);
        v.wheels.fr.rotation.y = THREE.MathUtils.clamp(v.steering, -maxSteerAngle, maxSteerAngle);

        if (v.siren) {
            v.sirenTimer += dt;
            if (v.sirenLights) {
                v.sirenLights.blue.visible = Math.sin(v.sirenTimer * 20) > 0;
                v.sirenLights.red.visible = Math.sin(v.sirenTimer * 20) < 0;
            }
        }

        if (v.condition <= 0) {
            this.destroyVehicle(v);
        }
    }

    handlePlayerInput(v) {
        const input = this.game.input;
        v.throttle = 0;
        v.brake = 0;
        v.steering = 0;
        v.handbrake = false;

        if (input.keys['KeyW']) v.throttle = 1;
        if (input.keys['KeyS']) v.brake = 1;
        if (input.keys['KeyA']) v.steering = -1;
        if (input.keys['KeyD']) v.steering = 1;
        if (input.keys['Space']) v.handbrake = true;

    }

    handleAIInput(v) {
        if (!v.aiTarget) return;

        const toTarget = v.aiTarget.clone().sub(v.mesh.position);
        toTarget.y = 0;
        const dist = toTarget.length();

        if (dist < 5) {
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

        v.throttle = dot > 0.5 ? 1 : 0;
        v.brake = dot < 0.2 ? 1 : 0;
        v.steering = cross;

        if (dist < 20 && v.speed > 15) v.brake = 0.5;
    }

    setAIVehicle(vehicle, path) {
        vehicle.ai = true;
        vehicle.aiPath = path;
        vehicle.aiWaypointIndex = 0;
        vehicle.aiTarget = path[0];
        vehicle.engineOn = true;
        vehicle.parked = false;
    }

    destroyVehicle(v) {
        this.game.systems.audio.playSfx('explosion');
        const expGeo = new THREE.SphereGeometry(1, 16, 16);
        const expMat = new THREE.MeshBasicMaterial({ color: 0xFF8800, transparent: true, opacity: 0.8 });
        const exp = new THREE.Mesh(expGeo, expMat);
        exp.position.copy(v.mesh.position);
        this.scene.add(exp);
        let scale = 1;
        const grow = setInterval(() => {
            scale += 0.5;
            exp.scale.setScalar(scale);
            exp.material.opacity = Math.max(0, 0.8 - scale * 0.1);
            if (scale > 8) { clearInterval(grow); this.scene.remove(exp); }
        }, 50);
        this.scene.remove(v.mesh);
        this.vehicles = this.vehicles.filter(x => x !== v);
        this.parkedVehicles = this.parkedVehicles.filter(x => x !== v);
    }

    updateVehicle(v, dt) { }
}

class SeededRNG {
    constructor(seed) { this.seed = seed; }
    next() { this.seed = (this.seed * 1664525 + 1013904223) % 4294967296; return this.seed / 4294967296; }
    float(min=0, max=1) { return min + this.next() * (max - min); }
    int(min, max) { return Math.floor(this.float(min, max+1)); }
    choice(arr) { return arr[this.int(0, arr.length-1)]; }
}
