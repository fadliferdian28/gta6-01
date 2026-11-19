export class Menu {
    constructor(game) {
        this.game = game;
        this.visible = false;
        this.currentScreen = 'main';
        this.saveSlots = [null, null, null];
        this.selectedSlot = 0;
        this.settings = {
            musicVolume: 0.5,
            sfxVolume: 0.7,
            mouseSensitivity: 1.0
        };

        this.initDOM();
        this.loadSaves();
    }

    initDOM() {
        const container = document.getElementById('menu-container');
        container.innerHTML = `
            <div id="start-screen" class="menu-screen">
                <div id="start-background"></div>
                <div id="start-content">
                    <div id="logo">LUMEN BAY</div>
                    <div id="tagline">A sun-soaked crime story in a city that never sleeps</div>
                    <div id="menu-buttons">
                        <button class="menu-btn" data-action="continue">CONTINUE</button>
                        <button class="menu-btn" data-action="new-game">NEW GAME</button>
                        <button class="menu-btn" data-action="controls">HOW TO PLAY</button>
                        <button class="menu-btn" data-action="settings">SETTINGS</button>
                    </div>
                </div>
                <div id="character-roster">
                    <div class="character" data-char="kai"><span class="name">KAI MARLOW</span><span class="role">Getaway Driver</span></div>
                    <div class="character" data-char="nadia"><span class="name">NADIA VOSS</span><span class="role">Fixer</span></div>
                    <div class="character" data-char="mira"><span class="name">MIRA SOLACE</span><span class="role">Mechanic</span></div>
                    <div class="character" data-char="theo"><span class="name">THEO "WRENCH" OKAFOR</span><span class="role">Wheelman</span></div>
                </div>
            </div>

            <div id="how-to-play-screen" class="menu-screen" style="display:none;">
                <div class="panel-header">
                    <h2>HOW TO PLAY</h2>
                    <button class="close-btn" data-action="back">×</button>
                </div>
                <div class="controls-list">
                    <div class="control-section">
                        <h3>ON FOOT</h3>
                        <div class="control-row"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd><span>Move</span></div>
                        <div class="control-row"><kbd>Shift</kbd><span>Sprint</span></div>
                        <div class="control-row"><kbd>Mouse</kbd><span>Look / Aim</span></div>
                        <div class="control-row"><kbd>Left Click</kbd><span>Shoot (when aiming)</span></div>
                        <div class="control-row"><kbd>F</kbd><span>Enter/Exit Vehicle</span></div>
                        <div class="control-row"><kbd>E</kbd><span>Interact</span></div>
                        <div class="control-row"><kbd>1/2/3</kbd><span>Switch Weapon</span></div>
                    </div>
                    <div class="control-section">
                        <h3>DRIVING</h3>
                        <div class="control-row"><kbd>W</kbd><span>Accelerate</span></div>
                        <div class="control-row"><kbd>S</kbd><span>Brake / Reverse</span></div>
                        <div class="control-row"><kbd>A</kbd><kbd>D</kbd><span>Steer</span></div>
                        <div class="control-row"><kbd>Space</kbd><span>Handbrake Drift</span></div>
                        <div class="control-row"><kbd>V</kbd><span>Switch Camera</span></div>
                        <div class="control-row"><kbd>F</kbd><span>Exit Vehicle</span></div>
                    </div>
                    <div class="control-section">
                        <h3>GAMEPLAY</h3>
                        <div class="control-row"><kbd>Esc</kbd><span>Pause Menu</span></div>
                        <div class="control-row"><kbd>M</kbd><span>Toggle Map</span></div>
                    </div>
                </div>
            </div>

            <div id="pause-screen" class="menu-screen" style="display:none;">
                <div class="panel-header">
                    <h2>PAUSED</h2>
                    <button class="close-btn" data-action="resume">×</button>
                </div>
                <div id="pause-buttons">
                    <button class="menu-btn" data-action="resume">RESUME</button>
                    <button class="menu-btn" data-action="save">SAVE GAME</button>
                    <button class="menu-btn" data-action="load">LOAD GAME</button>
                    <button class="menu-btn" data-action="settings">SETTINGS</button>
                    <button class="menu-btn" data-action="quit">QUIT TO MENU</button>
                </div>
            </div>

            <div id="save-screen" class="menu-screen" style="display:none;">
                <div class="panel-header">
                    <h2>SAVE GAME</h2>
                    <button class="close-btn" data-action="back">×</button>
                </div>
                <div id="save-slots"></div>
            </div>

            <div id="load-screen" class="menu-screen" style="display:none;">
                <div class="panel-header">
                    <h2>LOAD GAME</h2>
                    <button class="close-btn" data-action="back">×</button>
                </div>
                <div id="load-slots"></div>
            </div>

            <div id="settings-screen" class="menu-screen" style="display:none;">
                <div class="panel-header">
                    <h2>SETTINGS</h2>
                    <button class="close-btn" data-action="back">×</button>
                </div>
                <div class="settings-list">
                    <div class="setting-row">
                        <label>Music Volume</label>
                        <input type="range" id="music-volume" min="0" max="1" step="0.1" value="0.5">
                    </div>
                    <div class="setting-row">
                        <label>SFX Volume</label>
                        <input type="range" id="sfx-volume" min="0" max="1" step="0.1" value="0.7">
                    </div>
                    <div class="setting-row">
                        <label>Mouse Sensitivity</label>
                        <input type="range" id="mouse-sens" min="0.5" max="2" step="0.1" value="1.0">
                    </div>
                </div>
            </div>
        `;

        this.bindEvents();
    }

    bindEvents() {
        document.querySelectorAll('.menu-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleAction(e.target.dataset.action));
        });
        document.querySelectorAll('.close-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleAction(e.target.dataset.action));
        });

        document.getElementById('music-volume').addEventListener('input', (e) => {
            this.settings.musicVolume = parseFloat(e.target.value);
            this.game.systems.audio.setMusicVolume(this.settings.musicVolume);
        });
        document.getElementById('sfx-volume').addEventListener('input', (e) => {
            this.settings.sfxVolume = parseFloat(e.target.value);
            this.game.systems.audio.setSfxVolume(this.settings.sfxVolume);
        });
        document.getElementById('mouse-sens').addEventListener('input', (e) => {
            this.settings.mouseSensitivity = parseFloat(e.target.value);
        });
    }

    handleAction(action) {
        switch (action) {
            case 'continue':
                this.loadLatestSave();
                this.hide();
                break;
            case 'new-game':
                this.startNewGame();
                this.hide();
                break;
            case 'controls':
                this.showScreen('how-to-play');
                break;
            case 'settings':
                this.showScreen('settings');
                break;
            case 'save':
                this.showScreen('save');
                break;
            case 'load':
                this.showScreen('load');
                break;
            case 'resume':
                this.hide();
                break;
            case 'back':
                if (this.currentScreen === 'how-to-play' || this.currentScreen === 'settings') {
                    this.showScreen('main');
                } else {
                    this.showScreen('pause');
                }
                break;
            case 'quit':
                this.showScreen('main');
                break;
        }
    }

    showScreen(screen) {
        document.querySelectorAll('.menu-screen').forEach(s => s.style.display = 'none');
        const screenId = screen === 'main' ? 'start-screen' : `${screen}-screen`;
        document.getElementById(screenId).style.display = 'flex';
        this.currentScreen = screen;

        if (screen === 'save' || screen === 'load') this.renderSaveSlots(screen);
        if (screen === 'settings') this.updateSettingsUI();
    }

    show() {
        this.visible = true;
        document.getElementById('menu-container').style.display = 'block';
        if (!this.game.systems.player.inVehicle) {
            this.showScreen('main');
        } else {
            this.showScreen('pause');
        }
    }

    hide() {
        this.visible = false;
        document.getElementById('menu-container').style.display = 'none';
        this.game.paused = false;
    }

    showPause(show) {
        if (show) {
            this.visible = true;
            document.getElementById('menu-container').style.display = 'block';
            this.showScreen('pause');
        } else {
            this.hide();
        }
    }

    startNewGame() {
        this.game.systems.player.position.set(0, 2, -100);
        this.game.systems.player.mesh.position.copy(this.game.systems.player.position);
        this.game.systems.player.health = 100;
        this.game.systems.player.armour = 0;
        this.game.systems.player.money = 5000;
        this.game.systems.player.rep = 0;
        this.game.systems.player.repLevel = 1;
        this.game.systems.police.clearWanted();
        this.game.systems.missions.currentMission = null;
        this.game.systems.audio.startMusic();
    }

    loadLatestSave() {
        const saves = this.saveSlots.filter(s => s).sort((a,b) => b.timestamp - a.timestamp);
        if (saves.length > 0) this.loadSave(saves[0]);
    }

    renderSaveSlots(mode) {
        const container = document.getElementById(`${mode}-slots`);
        container.innerHTML = '';
        this.saveSlots.forEach((save, i) => {
            const slot = document.createElement('div');
            slot.className = 'save-slot';
            if (save) {
                slot.innerHTML = `
                    <div class="save-info">
                        <span class="save-mission">Mission ${save.mission}/${7}</span>
                        <span class="save-money">$${save.money}</span>
                        <span class="save-time">${new Date(save.timestamp).toLocaleString()}</span>
                    </div>
                    <button class="menu-btn" data-slot="${i}" data-action="${mode}-slot">${mode === 'save' ? 'SAVE' : 'LOAD'}</button>
                `;
            } else {
                slot.innerHTML = `<span class="empty-slot">EMPTY SLOT</span><button class="menu-btn" data-slot="${i}" data-action="${mode}-slot">${mode === 'save' ? 'SAVE HERE' : 'EMPTY'}</button>`;
            }
            container.appendChild(slot);
        });

        container.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const slot = parseInt(e.target.dataset.slot);
                if (mode === 'save') this.saveGame(slot);
                else this.loadSave(this.saveSlots[slot]);
            });
        });
    }

    updateSettingsUI() {
        document.getElementById('music-volume').value = this.settings.musicVolume;
        document.getElementById('sfx-volume').value = this.settings.sfxVolume;
        document.getElementById('mouse-sens').value = this.settings.mouseSensitivity;
    }

    saveGame(slot) {
        const data = {
            player: {
                position: this.game.systems.player.position.toArray(),
                health: this.game.systems.player.health,
                armour: this.game.systems.player.armour,
                money: this.game.systems.player.money,
                rep: this.game.systems.player.rep,
                repLevel: this.game.systems.player.repLevel
            },
            mission: this.game.systems.missions.currentMission ? this.game.systems.missions.currentMission.id : 0,
            missionStage: this.game.systems.missions.currentStage,
            wanted: this.game.systems.police.wantedLevel,
            timestamp: Date.now()
        };
        this.saveSlots[slot] = data;
        localStorage.setItem(`lumenbay_save_${slot}`, JSON.stringify(data));
        this.showNotification(`Game saved to slot ${slot+1}`);
        this.renderSaveSlots('save');
    }

    loadSave(save) {
        if (!save) return;
        this.game.systems.player.position.fromArray(save.player.position);
        this.game.systems.player.mesh.position.copy(this.game.systems.player.position);
        this.game.systems.player.health = save.player.health;
        this.game.systems.player.armour = save.player.armour;
        this.game.systems.player.money = save.player.money;
        this.game.systems.player.rep = save.player.rep;
        this.game.systems.player.repLevel = save.player.repLevel;
        this.game.systems.police.wantedLevel = save.wanted;
        this.game.systems.police.wantedTimer = 0;
        this.game.systems.hud.updateWanted(save.wanted);
        if (save.mission > 0) {
            this.game.systems.missions.startMission(save.mission);
            this.game.systems.missions.currentStage = save.missionStage;
        }
        this.hide();
        this.showNotification('Game loaded!');
    }

    loadSaves() {
        for (let i = 0; i < 3; i++) {
            const data = localStorage.getItem(`lumenbay_save_${i}`);
            if (data) this.saveSlots[i] = JSON.parse(data);
        }
    }

    showNotification(text) {
        this.game.systems.hud.showNotification(text);
    }
}
