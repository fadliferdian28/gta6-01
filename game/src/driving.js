import * as THREE from 'three';

export class Driving {
    constructor(game) {
        this.game = game;
        this.camera = game.camera;
        this.player = game.systems.player;
        this.vehicles = game.systems.vehicles;

        this.cameraMode = 0;
        this.cameraModes = ['chase', 'hood', 'cinematic'];
        this.chaseDistance = 8;
        this.chaseHeight = 3;
        this.chaseLerp = 0.08;
        this.hoodOffset = new THREE.Vector3(0, 1.2, 2.5);
        this.cinematicAngle = 0;
    }

    toggleCamera() {
        this.cameraMode = (this.cameraMode + 1) % this.cameraModes.length;
        this.game.systems.hud.showNotification(`Camera: ${this.cameraModes[this.cameraMode]}`);
    }

    update(dt) {
        if (!this.player.inVehicle || !this.player.vehicle) return;

        const vehicle = this.player.vehicle;
        this.updateCamera(dt, vehicle);
        const gear = vehicle.speed < -0.5 ? 0 : (Math.abs(vehicle.speed) < 0.5 ? 'N' : 'D');
        this.game.systems.hud.updateSpeedometer(vehicle.speed, gear, vehicle.def.name, vehicle.condition);
    }

    updateCamera(dt, vehicle) {
        const mode = this.cameraModes[this.cameraMode];

        if (mode === 'chase') {
            this.updateChaseCamera(dt, vehicle);
        } else if (mode === 'hood') {
            this.updateHoodCamera(dt, vehicle);
        } else if (mode === 'cinematic') {
            this.updateCinematicCamera(dt, vehicle);
        }
    }

    updateChaseCamera(dt, vehicle) {
        const forward = new THREE.Vector3();
        vehicle.mesh.getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();

        const up = new THREE.Vector3(0, 1, 0);
        const right = new THREE.Vector3().crossVectors(forward, up);

        const targetPos = vehicle.mesh.position.clone()
            .sub(forward.multiplyScalar(this.chaseDistance))
            .add(up.multiplyScalar(this.chaseHeight));

        this.camera.position.lerp(targetPos, this.chaseLerp);
        this.camera.lookAt(vehicle.mesh.position.clone().add(new THREE.Vector3(0, 1.5, 0)));
    }

    updateHoodCamera(dt, vehicle) {
        const offset = this.hoodOffset.clone();
        offset.applyEuler(vehicle.mesh.rotation);
        const targetPos = vehicle.mesh.position.clone().add(offset);
        this.camera.position.lerp(targetPos, this.chaseLerp * 2);
        this.camera.lookAt(vehicle.mesh.position.clone().add(offset.clone().add(new THREE.Vector3(0, 0, 10))));
    }

    updateCinematicCamera(dt, vehicle) {
        this.cinematicAngle += dt * 0.3;
        const radius = 15;
        const height = 5;
        const pos = vehicle.mesh.position.clone();
        pos.x += Math.cos(this.cinematicAngle) * radius;
        pos.z += Math.sin(this.cinematicAngle) * radius;
        pos.y += height;
        this.camera.position.lerp(pos, this.chaseLerp);
        this.camera.lookAt(vehicle.mesh.position);
    }

    getCameraMode() {
        return this.cameraModes[this.cameraMode];
    }
}
