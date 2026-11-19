import * as THREE from 'three';

export class Player {
    constructor(game) {
        this.game = game;
        this.scene = game.scene;
        this.camera = game.camera;
        this.input = game.input;

        this.mesh = null;
        this.position = new THREE.Vector3(0, 1, -100);
        this.velocity = new THREE.Vector3();
        this.rotation = new THREE.Euler(0, 0, 0);
        this.speed = 5;
        this.sprintSpeed = 10;
        this.health = 100;
        this.maxHealth = 100;
        this.armour = 0;
        this.maxArmour = 100;

        this.inVehicle = false;
        this.fKeyWasDown = false;
        this.vehicle = null;
        this.vehicleSeat = 'driver';

        this.weapon = 'pistol';
        this.ammo = { pistol: 36, rifle: 120, shotgun: 20 };
        this.maxAmmo = { pistol: 36, rifle: 120, shotgun: 20 };
        this.aiming = false;
        this.aimTarget = new THREE.Vector3();

        this.cameraOffset = new THREE.Vector3(0, 3, 6);
        this.cameraTarget = new THREE.Vector3();
        this.cameraLerp = 0.1;

        this.money = 5000;
        this.rep = 0;
        this.repLevel = 1;

        this.createMesh();
        this.setupCamera();
    }

    createMesh() {
        const group = new THREE.Group();

        const bodyGeo = new THREE.CapsuleGeometry(0.4, 1.2, 8, 16);
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0xFFCCAA, roughness: 0.8 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 1.3;
        body.castShadow = true;
        group.add(body);

        const headGeo = new THREE.SphereGeometry(0.25, 16, 16);
        const headMat = new THREE.MeshStandardMaterial({ color: 0xFFCCAA, roughness: 0.8 });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 2.1;
        head.castShadow = true;
        group.add(head);

        const armGeo = new THREE.CapsuleGeometry(0.12, 0.6, 4, 8);
        const armMat = new THREE.MeshStandardMaterial({ color: 0xFFCCAA, roughness: 0.8 });
        this.leftArm = new THREE.Mesh(armGeo, armMat);
        this.leftArm.position.set(-0.5, 1.5, 0);
        this.leftArm.rotation.x = -0.3;
        group.add(this.leftArm);

        this.rightArm = new THREE.Mesh(armGeo, armMat);
        this.rightArm.position.set(0.5, 1.5, 0);
        this.rightArm.rotation.x = -0.3;
        group.add(this.rightArm);

        const legGeo = new THREE.CapsuleGeometry(0.15, 0.7, 4, 8);
        const legMat = new THREE.MeshStandardMaterial({ color: 0x336699, roughness: 0.8 });
        this.leftLeg = new THREE.Mesh(legGeo, legMat);
        this.leftLeg.position.set(-0.2, 0.35, 0);
        group.add(this.leftLeg);

        this.rightLeg = new THREE.Mesh(legGeo, legMat);
        this.rightLeg.position.set(0.2, 0.35, 0);
        group.add(this.rightLeg);

        this.mesh = group;
        this.mesh.position.copy(this.position);
        this.scene.add(this.mesh);
    }

    setupCamera() {
        this.cameraTarget.copy(this.position).add(new THREE.Vector3(0, 1.5, 0));
    }

    update(dt) {
        if (this.inVehicle) {
            this.updateInVehicle(dt);
        } else {
            this.updateOnFoot(dt);
        }
        this.updateCamera(dt);
        this.updateAnimation(dt);
    }

    updateOnFoot(dt) {
        const forward = new THREE.Vector3();
        this.camera.getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();

        const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0));

        const moveDir = new THREE.Vector3();
        let moving = false;

        if (this.input.keys['KeyW']) { moveDir.add(forward); moving = true; }
        if (this.input.keys['KeyS']) { moveDir.sub(forward); moving = true; }
        if (this.input.keys['KeyA']) { moveDir.sub(right); moving = true; }
        if (this.input.keys['KeyD']) { moveDir.add(right); moving = true; }

        if (moveDir.length() > 0) {
            moveDir.normalize();
            const currentSpeed = this.input.keys['ShiftLeft'] ? this.sprintSpeed : this.speed;
            this.velocity.lerp(moveDir.multiplyScalar(currentSpeed), dt * 10);
        } else {
            this.velocity.lerp(new THREE.Vector3(), dt * 10);
        }

        this.position.add(this.velocity.clone().multiplyScalar(dt));
        this.mesh.position.copy(this.position);

        if (this.velocity.length() > 0.1) {
            const targetRot = Math.atan2(-this.velocity.x, -this.velocity.z);
            this.rotation.y = THREE.MathUtils.lerp(this.rotation.y, targetRot, dt * 10);
            this.mesh.rotation.y = this.rotation.y;
        }

        const fDown = this.input.keys['KeyF'];
        if (fDown && !this.fKeyWasDown) this.tryEnterVehicle();
        this.fKeyWasDown = fDown;

        if (this.input.mouse.left && !this.aiming) this.startAiming();
        if (!this.input.mouse.left && this.aiming) this.stopAiming();

        if (this.aiming) this.updateAiming();
        if (this.aiming && this.input.mouse.left) this.shoot();
    }

    updateInVehicle(dt) {
        if (this.vehicle) {
            this.position.copy(this.vehicle.mesh.position);
            this.mesh.position.copy(this.position);
            this.mesh.visible = false;
        }
        const fDown = this.input.keys['KeyF'];
        if (fDown && !this.fKeyWasDown) this.exitVehicle();
        this.fKeyWasDown = fDown;
    }

    updateCamera(dt) {
        if (this.inVehicle && this.vehicle) {
            return; // Driving system owns the in-vehicle camera
        }

        this.cameraTarget.lerp(this.position.clone().add(new THREE.Vector3(0, 1.5, 0)), dt * 5);

        if (this.aiming) {
            this.cameraOffset.set(0.5, 1.8, 4);
        } else {
            this.cameraOffset.set(0, 3, 6);
        }

        const offset = this.cameraOffset.clone();
        offset.applyEuler(new THREE.Euler(0, this.rotation.y, 0));
        const targetPos = this.cameraTarget.clone().add(offset);

        this.camera.position.lerp(targetPos, this.cameraLerp);
        this.camera.lookAt(this.cameraTarget);
    }

    updateAnimation(dt) {
        if (!this.inVehicle) {
            const walkSpeed = this.velocity.length();
            const t = Date.now() * 0.01;

            if (walkSpeed > 0.5) {
                this.leftArm.rotation.x = -0.3 + Math.sin(t) * 0.5;
                this.rightArm.rotation.x = -0.3 - Math.sin(t) * 0.5;
                this.leftLeg.rotation.x = Math.sin(t) * 0.6;
                this.rightLeg.rotation.x = -Math.sin(t) * 0.6;
            } else {
                this.leftArm.rotation.x = THREE.MathUtils.lerp(this.leftArm.rotation.x, -0.3, dt * 5);
                this.rightArm.rotation.x = THREE.MathUtils.lerp(this.rightArm.rotation.x, -0.3, dt * 5);
                this.leftLeg.rotation.x = THREE.MathUtils.lerp(this.leftLeg.rotation.x, 0, dt * 5);
                this.rightLeg.rotation.x = THREE.MathUtils.lerp(this.rightLeg.rotation.x, 0, dt * 5);
            }

            if (this.aiming) {
                this.rightArm.rotation.x = -1.2;
                this.rightArm.rotation.z = 0.3;
            }
        }
    }

    updateAiming() {
        this.game.raycaster.setFromCamera(this.input.mouse, this.camera);
        const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        this.game.raycaster.ray.intersectPlane(groundPlane, this.aimTarget);

        const dir = this.aimTarget.clone().sub(this.position).normalize();
        this.rotation.y = Math.atan2(-dir.x, -dir.z);
        this.mesh.rotation.y = this.rotation.y;
    }

    startAiming() {
        if (this.ammo[this.weapon] <= 0) return;
        this.aiming = true;
        this.game.systems.hud.setCrosshair(true);
    }

    stopAiming() {
        this.aiming = false;
        this.game.systems.hud.setCrosshair(false);
    }

    shoot() {
        if (!this.aiming || this.ammo[this.weapon] <= 0) return;
        if (!this.game.systems.combat.fire(this.position, this.aimTarget, this.weapon)) return;
        this.ammo[this.weapon]--;
        this.game.systems.hud.updateAmmo(this.ammo[this.weapon]);
        this.game.systems.audio.playSfx('shoot');
    }

    tryEnterVehicle() {
        if (this.inVehicle) return;
        const vehicle = this.game.systems.vehicles.getNearestVehicle(this.position, 4);
        if (vehicle) {
            this.enterVehicle(vehicle);
        }
    }

    enterVehicle(vehicle) {
        this.inVehicle = true;
        this.vehicle = vehicle;
        vehicle.enter(this);
        this.mesh.visible = false;
        this.game.systems.hud.setSpeedometer(true);
        this.game.systems.audio.playSfx('car_door');
    }

    exitVehicle() {
        if (!this.inVehicle || !this.vehicle) return;
        this.vehicle.exit(this);
        this.inVehicle = false;
        this.position.copy(this.vehicle.mesh.position).add(new THREE.Vector3(3, 0, 0));
        this.mesh.position.copy(this.position);
        this.mesh.visible = true;
        this.vehicle = null;
        this.game.systems.hud.setSpeedometer(false);
        this.game.systems.audio.playSfx('car_door');
    }

    takeDamage(amount) {
        if (this.armour > 0) {
            this.armour = Math.max(0, this.armour - amount);
            amount = Math.max(0, amount - this.armour);
        }
        this.health = Math.max(0, this.health - amount);
        this.game.systems.hud.updateHealth(this.health, this.armour);
        if (this.health <= 0) this.die();
    }

    die() {
        this.health = this.maxHealth;
        this.armour = 0;
        this.position.set(0, 2, -100);
        this.mesh.position.copy(this.position);
        this.money = Math.floor(this.money * 0.9);
        this.game.systems.police.clearWanted();
        this.game.systems.missions.failMission();
        this.game.systems.audio.playSfx('death');
    }

    addMoney(amount) { this.money += amount; this.game.systems.hud.updateMoney(this.money); }
    addRep(amount) { this.rep += amount; this.updateRepLevel(); }
    updateRepLevel() {
        const newLevel = Math.floor(this.rep / 1000) + 1;
        if (newLevel > this.repLevel) {
            this.repLevel = newLevel;
            this.game.systems.hud.showNotification(`REP Level ${this.repLevel}!`);
        }
        this.game.systems.hud.updateRep(this.rep, this.repLevel);
    }

    giveWeapon(weapon, ammo) {
        this.weapon = weapon;
        this.ammo[weapon] = Math.min(this.maxAmmo[weapon], (this.ammo[weapon] || 0) + ammo);
        this.game.systems.hud.updateWeapon(this.weapon, this.ammo[weapon]);
    }

    switchWeapon() {
        const weapons = ['pistol', 'rifle', 'shotgun'];
        const idx = weapons.indexOf(this.weapon);
        this.weapon = weapons[(idx + 1) % weapons.length];
        this.game.systems.hud.updateWeapon(this.weapon, this.ammo[this.weapon]);
    }
}
