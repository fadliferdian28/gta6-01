import * as THREE from 'three';

const MISSIONS = [
    {
        id: 1,
        title: 'HOMECOMING',
        giver: 'Nadia Voss',
        stages: [
            { objective: 'Drive to Nadia\'s safehouse in Old Town', type: 'waypoint', pos: new THREE.Vector3(-200, 0, 150), radius: 5 },
            { objective: 'Enter the safehouse', type: 'interact', pos: new THREE.Vector3(-200, 0, 150), radius: 3 },
            { objective: 'Listen to the briefing', type: 'wait', duration: 3 }
        ]
    },
    {
        id: 2,
        title: 'THE WHEELMAN',
        giver: 'Theo "Wrench" Okafor',
        stages: [
            { objective: 'Meet Theo at the Marina', type: 'waypoint', pos: new THREE.Vector3(200, 0, 200), radius: 5 },
            { objective: 'Steal the Bay Breeze convertible', type: 'enter_vehicle', vehicleType: 'bay_breeze' },
            { objective: 'Deliver the car to the garage', type: 'waypoint', pos: new THREE.Vector3(100, 0, -100), radius: 5 }
        ]
    },
    {
        id: 3,
        title: 'SUPPLY RUN',
        giver: 'Mira Solace',
        stages: [
            { objective: 'Pick up parts at Portside Docks', type: 'waypoint', pos: new THREE.Vector3(-300, 0, -200), radius: 5 },
            { objective: 'Load the Harbor Hauler', type: 'enter_vehicle', vehicleType: 'harbor_hauler' },
            { objective: 'Drive to Mira\'s workshop', type: 'waypoint', pos: new THREE.Vector3(-100, 0, 50), radius: 5 },
            { objective: 'Unload the parts', type: 'interact', pos: new THREE.Vector3(-100, 0, 50), radius: 3 }
        ]
    },
    {
        id: 4,
        title: 'BEACH PARTY',
        giver: 'Nadia Voss',
        stages: [
            { objective: 'Go to Sunspray Beach', type: 'waypoint', pos: new THREE.Vector3(0, 0, 300), radius: 10 },
            { objective: 'Eliminate the rival dealers', type: 'kill', count: 4, pos: new THREE.Vector3(0, 0, 300), radius: 20 },
            { objective: 'Escape the police', type: 'lose_wanted' }
        ]
    },
    {
        id: 5,
        title: 'HIGH STAKES',
        giver: 'Theo "Wrench" Okafor',
        stages: [
            { objective: 'Race to the Hills checkpoint', type: 'waypoint', pos: new THREE.Vector3(300, 0, 300), radius: 10, timeLimit: 120 },
            { objective: 'Return to Downtown', type: 'waypoint', pos: new THREE.Vector3(50, 0, -50), radius: 10, timeLimit: 180 }
        ]
    },
    {
        id: 6,
        title: 'THE CHASE',
        giver: 'Marcus Thorne',
        stages: [
            { objective: 'Steal the Falcon GT', type: 'enter_vehicle', vehicleType: 'falcon_gt' },
            { objective: 'Survive the police chase for 3 minutes', type: 'survive', duration: 180 },
            { objective: 'Lose the wanted level', type: 'lose_wanted' }
        ]
    },
    {
        id: 7,
        title: 'ENDGAME',
        giver: 'Nadia Voss',
        stages: [
            { objective: 'Assault Thorne\'s penthouse', type: 'waypoint', pos: new THREE.Vector3(100, 0, -100), radius: 5 },
            { objective: 'Eliminate Thorne\'s guards', type: 'kill', count: 6, pos: new THREE.Vector3(100, 0, -100), radius: 30 },
            { objective: 'Confront Marcus Thorne', type: 'interact', pos: new THREE.Vector3(100, 0, -100), radius: 3 },
            { objective: 'Escape Lumen Bay', type: 'waypoint', pos: new THREE.Vector3(0, 0, -400), radius: 20 }
        ]
    }
];

export class Missions {
    constructor(game) {
        this.game = game;
        this.missions = MISSIONS;
        this.currentMission = null;
        this.currentStage = 0;
        this.stageStartTime = 0;
        this.stageTimer = 0;
        this.killCount = 0;
        this.missionMarkers = [];
        this.completedMissions = [];
    }

    update(dt) {
        if (!this.currentMission) return;

        const stage = this.currentMission.stages[this.currentStage];
        if (!stage) return;

        this.stageTimer += dt;

        switch (stage.type) {
            case 'waypoint':
                this.checkWaypoint(stage, dt);
                break;
            case 'interact':
                this.checkInteract(stage);
                break;
            case 'enter_vehicle':
                this.checkVehicleEnter(stage);
                break;
            case 'kill':
                this.checkKill(stage);
                break;
            case 'survive':
                this.checkSurvive(stage, dt);
                break;
            case 'lose_wanted':
                this.checkLoseWanted();
                break;
            case 'wait':
                if (this.stageTimer >= stage.duration) this.nextStage();
                break;
        }

        if (stage.timeLimit && this.stageTimer > stage.timeLimit) {
            this.failMission();
        }
    }

    checkWaypoint(stage, dt) {
        const dist = this.game.systems.player.position.distanceTo(stage.pos);
        this.game.systems.hud.updateWaypoint(stage.pos, dist);

        if (dist < stage.radius) {
            this.nextStage();
        }
    }

    checkInteract(stage) {
        const dist = this.game.systems.player.position.distanceTo(stage.pos);
        if (dist < stage.radius) {
            this.game.systems.hud.showInteractionPrompt('Press E');
            if (this.game.input.keys['KeyE']) {
                this.nextStage();
            }
        }
    }

    checkVehicleEnter(stage) {
        if (this.game.systems.player.inVehicle &&
            this.game.systems.player.vehicle &&
            this.game.systems.player.vehicle.type === stage.vehicleType) {
            this.nextStage();
        }
    }

    checkKill(stage) {
        this.game.systems.hud.updateKillObjective(stage.count - this.killCount);
        if (this.killCount >= stage.count) {
            this.killCount = 0;
            this.nextStage();
        }
    }

    checkSurvive(stage, dt) {
        const remaining = Math.ceil(stage.duration - this.stageTimer);
        this.game.systems.hud.updateSurviveTimer(remaining);
        if (this.stageTimer >= stage.duration) {
            this.nextStage();
        }
    }

    checkLoseWanted() {
        if (this.game.systems.police.wantedLevel === 0) {
            this.nextStage();
        } else {
            this.game.systems.hud.updateLoseWanted(this.game.systems.police.wantedLevel);
        }
    }

    startMission(id) {
        const mission = this.missions.find(m => m.id === id);
        if (!mission) return false;

        this.currentMission = mission;
        this.currentStage = 0;
        this.stageTimer = 0;
        this.killCount = 0;
        this.createMissionMarker();
        this.game.systems.hud.showMissionStart(mission);
        this.game.systems.audio.playSfx('mission_start');
        return true;
    }

    nextStage() {
        this.currentStage++;
        this.stageTimer = 0;
        this.killCount = 0;

        if (this.currentStage >= this.currentMission.stages.length) {
            this.completeMission();
        } else {
            this.createMissionMarker();
            this.game.systems.hud.showStageUpdate(this.currentMission.stages[this.currentStage]);
        }
    }

    completeMission() {
        const reward = this.currentMission.id * 1000;
        this.game.systems.player.addMoney(reward);
        this.game.systems.player.addRep(500);
        this.completedMissions.push(this.currentMission.id);
        this.game.systems.hud.showMissionComplete(this.currentMission, reward);
        this.game.systems.audio.playSfx('mission_complete');

        this.currentMission = null;
        this.currentStage = 0;
        this.clearMissionMarker();
    }

    failMission() {
        this.game.systems.hud.showMissionFailed();
        this.game.systems.audio.playSfx('mission_fail');
        this.currentMission = null;
        this.currentStage = 0;
        this.clearMissionMarker();
    }

    createMissionMarker() {
        this.clearMissionMarker();
        if (!this.currentMission) return;

        const stage = this.currentMission.stages[this.currentStage];
        if (!stage) return;
        if (stage.type === 'waypoint' || stage.type === 'kill' || stage.type === 'survive') {
            const geo = new THREE.CylinderGeometry(0.5, 2, 4, 8);
            const mat = new THREE.MeshBasicMaterial({ color: 0xFFFF00, transparent: true, opacity: 0.7 });
            const marker = new THREE.Mesh(geo, mat);
            marker.position.copy(stage.pos);
            marker.position.y = 2;
            this.game.scene.add(marker);
            this.missionMarkers.push(marker);

            const pulse = setInterval(() => {
                marker.scale.y = 1 + Math.sin(Date.now() * 0.005) * 0.2;
            }, 50);
            marker.pulseInterval = pulse;
        }
    }

    clearMissionMarker() {
        this.missionMarkers.forEach(m => {
            if (m.pulseInterval) clearInterval(m.pulseInterval);
            this.game.scene.remove(m);
        });
        this.missionMarkers = [];
    }

    getActiveMission() {
        return this.currentMission;
    }

    getCurrentStage() {
        if (!this.currentMission) return null;
        return this.currentMission.stages[this.currentStage];
    }

    registerKill() {
        this.killCount++;
    }

    isMissionActive(id) {
        return this.currentMission && this.currentMission.id === id;
    }

    getProgress() {
        if (!this.currentMission) return { current: 0, total: this.missions.length };
        return { current: this.currentMission.id, total: this.missions.length };
    }
}
