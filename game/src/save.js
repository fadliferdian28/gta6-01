export class Save {
    constructor(game) {
        this.game = game;
    }

    getSaveData() {
        return {
            version: 1,
            player: {
                position: this.game.systems.player.position.toArray(),
                health: this.game.systems.player.health,
                armour: this.game.systems.player.armour,
                money: this.game.systems.player.money,
                rep: this.game.systems.player.rep,
                repLevel: this.game.systems.player.repLevel,
                weapon: this.game.systems.player.weapon,
                ammo: { ...this.game.systems.player.ammo }
            },
            mission: this.game.systems.missions.currentMission ? this.game.systems.missions.currentMission.id : 0,
            missionStage: this.game.systems.missions.currentStage,
            wanted: this.game.systems.police.wantedLevel,
            completedMissions: [...this.game.systems.missions.completedMissions],
            timestamp: Date.now()
        };
    }

    applySaveData(data) {
        this.game.systems.player.position.fromArray(data.player.position);
        this.game.systems.player.mesh.position.copy(this.game.systems.player.position);
        this.game.systems.player.health = data.player.health;
        this.game.systems.player.armour = data.player.armour;
        this.game.systems.player.money = data.player.money;
        this.game.systems.player.rep = data.player.rep;
        this.game.systems.player.repLevel = data.player.repLevel;
        this.game.systems.player.weapon = data.player.weapon;
        this.game.systems.player.ammo = data.player.ammo;
        this.game.systems.player.updateRepLevel();

        this.game.systems.police.wantedLevel = data.wanted;
        this.game.systems.police.wantedTimer = 0;
        this.game.systems.hud.updateWanted(data.wanted);

        this.game.systems.missions.completedMissions = data.completedMissions || [];
        if (data.mission > 0) {
            this.game.systems.missions.startMission(data.mission);
            this.game.systems.missions.currentStage = data.missionStage;
        }
    }
}
