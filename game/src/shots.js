import * as THREE from 'three';

export class Shots {
    constructor(game) {
        this.game = game;
        this.player = game.systems.player;
        this.city = game.systems.city;
        this.vehicles = game.systems.vehicles;
        this.police = game.systems.police;
        this.missions = game.systems.missions;
    }

    stage(shotName, seed) {
        this.rng = new SeededRNG(seed);

        switch (shotName) {
            case 'chase': this.stageChase(); break;
            case 'start': this.stageStart(); break;
            case 'foot': this.stageFoot(); break;
            case 'coast': this.stageCoast(); break;
        }
    }

    stageChase() {
        this.player.position.set(-100, 1, -50);
        this.player.mesh.position.copy(this.player.position);
        this.player.health = 100;
        this.player.armour = 50;

        const falcon = this.vehicles.buildVehicle(this.vehicles.VEHICLE_DEFS.falcon_gt, 'falcon_gt');
        falcon.mesh.position.set(-100, 0.5, -50);
        falcon.mesh.rotation.y = Math.PI / 4;
        falcon.engineOn = true;
        falcon.parked = false;
        this.player.enterVehicle(falcon);

        this.police.wantedLevel = 4;
        this.police.wantedTimer = 0;
        this.game.systems.hud.updateWanted(4);

        for (let i = 0; i < 4; i++) {
            const angle = Math.PI / 4 + (i - 1.5) * 0.3;
            const dist = 15 + i * 8;
            const px = -100 + Math.sin(angle) * dist;
            const pz = -50 + Math.cos(angle) * dist;

            const cop = this.vehicles.buildVehicle(this.vehicles.VEHICLE_DEFS.lbpd_interceptor, 'lbpd_interceptor');
            cop.mesh.position.set(px, 0.5, pz);
            cop.mesh.rotation.y = angle + Math.PI;
            cop.engineOn = true;
            cop.parked = false;

            const callsign = ['GULL-1', 'MARLIN-11', 'SNAPPER-25', 'TARPON-18'][i];
            const unit = {
                callsign,
                vehicle: cop,
                state: 'pursuit',
                health: 100
            };
            this.police.policeUnits.push(unit);
        }

        this.police.spawnHelicopter();
        if (this.police.helicopter) {
            this.police.helicopter.mesh.position.set(-92, 12, -27);
        }

        this.missions.currentMission = this.missions.missions[5];
        this.missions.currentStage = 1;
        this.game.systems.hud.showMissionStart(this.missions.missions[5]);

        // Snap the camera to the Driving chase-cam orbit position so the
        // first frame is already framed (the 0.08/frame lerp cannot
        // converge in headless, where this scene runs ~0.4 fps)
        const chaseForward = new THREE.Vector3();
        falcon.mesh.getWorldDirection(chaseForward);
        chaseForward.y = 0;
        chaseForward.normalize();
        this.game.camera.position.copy(falcon.mesh.position)
            .sub(chaseForward.clone().multiplyScalar(8))
            .add(new THREE.Vector3(0, 3, 0));
        this.game.camera.lookAt(falcon.mesh.position.clone().add(new THREE.Vector3(0, 1.5, 0)));
    }

    stageStart() {
        this.game.systems.menu.showScreen('main');
        this.game.systems.menu.visible = true;
        document.getElementById('menu-container').style.display = 'block';

        this.game.camera.position.set(0, 80, 100);
        this.game.camera.lookAt(0, 0, -100);
    }

    stageFoot() {
        this.player.position.set(0, 1, 0);
        this.player.mesh.position.copy(this.player.position);

        // Clear palms near the shot so the orbit camera isn't blocked
        this.city.props.forEach(pr => {
            if (pr.type === 'palm' && pr.pos.distanceTo(this.player.position) < 14) {
                pr.trunk.visible = false;
                pr.leaves.visible = false;
            }
        });

        this.player.health = 100;
        this.player.armour = 0;
        this.player.giveWeapon('rifle', 120);
        this.player.aiming = true;
        this.game.systems.hud.setCrosshair(true);

        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const dist = 10 + this.rng.float(0, 10);
            const px = 0 + Math.cos(angle) * dist;
            const pz = 0 + Math.sin(angle) * dist;
            this.game.systems.pedestrians.spawnPedestrianAt(px, pz);
        }

        for (let i = 0; i < 3; i++) {
            const type = this.rng.choice(['streetfox', 'bay_breeze']);
            const angle = (i / 3) * Math.PI * 2;
            const dist = 20;
            const px = 0 + Math.cos(angle) * dist;
            const pz = 0 + Math.sin(angle) * dist;

            const vehicle = this.vehicles.buildVehicle(this.vehicles.VEHICLE_DEFS[type], type);
            vehicle.mesh.position.set(px, 0.5, pz);
            vehicle.mesh.rotation.y = angle + Math.PI/2;
            vehicle.engineOn = true;
            vehicle.parked = false;
            vehicle.ai = true;
            vehicle.aiPath = this.generateCirclePath(0, 0, 25);
            vehicle.aiWaypointIndex = 0;
            vehicle.aiTarget = vehicle.aiPath[0];
            vehicle.traffic = true;
            this.game.systems.traffic.trafficCars.push(vehicle);
        }

        // Snap the orbit camera state so updateCamera starts converged
        // (cameraTarget starts at the origin and lerps — without this the
        // camera dives across the map on the first frames)
        this.player.cameraTarget.copy(this.player.position).add(new THREE.Vector3(0, 1.5, 0));
        const aimOffset = new THREE.Vector3(0.5, 1.8, 4);
        aimOffset.applyEuler(new THREE.Euler(0, this.player.rotation.y, 0));
        this.game.camera.position.copy(this.player.cameraTarget).add(aimOffset);
        this.game.camera.lookAt(this.player.cameraTarget);

        this.city.props.forEach(pr => {
            if (pr.type === 'palm' && pr.pos.distanceTo(this.game.camera.position) < 10) {
                pr.trunk.visible = false;
                pr.leaves.visible = false;
            }
        });
    }

    stageCoast() {
        const convertible = this.vehicles.buildVehicle(this.vehicles.VEHICLE_DEFS.bay_breeze, 'bay_breeze');
        convertible.mesh.position.set(-160, 0.5, 400);
        convertible.mesh.rotation.y = 0;
        convertible.engineOn = true;
        convertible.parked = false;
        this.player.enterVehicle(convertible);

        this.game.systems.city.timeOfDay = 0.85;
        this.game.systems.city.sunAngle = 0.85 * Math.PI * 2;

        // Snap the camera to the Driving chase-cam orbit position (see Fix 1)
        const coastForward = new THREE.Vector3();
        convertible.mesh.getWorldDirection(coastForward);
        coastForward.y = 0;
        coastForward.normalize();
        this.game.camera.position.copy(convertible.mesh.position)
            .sub(coastForward.clone().multiplyScalar(8))
            .add(new THREE.Vector3(0, 3, 0));
        this.game.camera.lookAt(convertible.mesh.position.clone().add(new THREE.Vector3(0, 1.5, 0)));
    }

    generateCirclePath(cx, cz, radius) {
        const path = [];
        for (let i = 0; i < 16; i++) {
            const angle = (i / 16) * Math.PI * 2;
            path.push(new THREE.Vector3(cx + Math.cos(angle) * radius, 0, cz + Math.sin(angle) * radius));
        }
        return path;
    }
}

class SeededRNG {
    constructor(seed) { this.seed = seed; }
    next() { this.seed = (this.seed * 1664525 + 1013904223) % 4294967296; return this.seed / 4294967296; }
    float(min=0, max=1) { return min + this.next() * (max - min); }
    choice(arr) { return arr[this.int(0, arr.length-1)]; }
    int(min, max) { return Math.floor(this.float(min, max+1)); }
}
