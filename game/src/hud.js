export class HUD {
    constructor(game) {
        this.game = game;
        this.container = document.getElementById('hud-container');

        this.waypoint = null;
        this.waypointDist = 0;
        this.missionTimer = 0;
        this.showSpeedometer = false;
        this.crosshairVisible = false;

        this.notifications = [];
        this.notificationTimer = 0;

        this.initDOM();
    }

    initDOM() {
        this.container.innerHTML = `
            <div id="minimap-container">
                <canvas id="minimap-canvas" width="200" height="200"></canvas>
                <div id="minimap-labels"></div>
            </div>
            <div id="top-left">
                <div id="wanted-stars"></div>
                <div id="mission-panel">
                    <div id="mission-title"></div>
                    <div id="mission-objective"></div>
                    <div id="mission-stage"></div>
                    <div id="mission-next"></div>
                    <div id="mission-timer"></div>
                </div>
                <div id="police-response"></div>
            </div>
            <div id="top-center">
                <div id="clock">18:00</div>
                <div id="location">Sunspray Beach - Ocean Ave</div>
            </div>
            <div id="top-right">
                <div id="radio">Wave 88.5 - Neon Drive - Midnight Driver</div>
            </div>
            <div id="bottom-left">
                <div id="health-armour">
                    <div class="bar-container"><div id="health-bar" class="bar health"></div></div>
                    <div class="bar-container"><div id="armour-bar" class="bar armour"></div></div>
                </div>
                <div id="money-rep">
                    <div id="money">$5000</div>
                    <div id="rep">REP 1 [██████████░░░░░░░░░░] 0/1000</div>
                </div>
            </div>
            <div id="bottom-right">
                <div id="weapon-ammo">
                    <div id="weapon-name">PISTOL</div>
                    <div id="ammo-count">36 / 36</div>
                </div>
                <div id="speedometer" style="display:none;">
                    <div id="speed">0</div>
                    <div id="gear">N</div>
                    <div id="vehicle-name">FALCON GT</div>
                    <div class="bar-container"><div id="condition-bar" class="bar condition"></div></div>
                </div>
            </div>
            <div id="crosshair" style="display:none;">
                <div class="crosshair-gap"></div>
            </div>
            <div id="dialogue-box" style="display:none;">
                <div id="dialogue-portrait"></div>
                <div id="dialogue-content">
                    <div id="dialogue-name"></div>
                    <div id="dialogue-text"></div>
                </div>
            </div>
            <div id="notifications"></div>
            <div id="interaction-prompt" style="display:none;"></div>
        `;

        this.minimapCanvas = document.getElementById('minimap-canvas');
        this.minimapCtx = this.minimapCanvas.getContext('2d');
    }

    update(dt) {
        this.updateMinimap();
        this.updateClock();
        this.updateLocation();
        this.updateRadio();
        this.updateNotifications(dt);
    }

    updateMinimap() {
        const ctx = this.minimapCtx;
        const size = 200;
        const player = this.game.systems.player;
        const city = this.game.systems.city;

        ctx.fillStyle = '#1a3a2a';
        ctx.fillRect(0, 0, size, size);

        const scale = 0.1;
        const half = (city.gridSize * city.blockSize) / 2;
        const centerX = size / 2;
        const centerY = size / 2;

        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        const step = city.blockSize * scale;

        for (let i = 0; i <= city.gridSize; i++) {
            const offset = (i - city.gridSize/2) * step;
            ctx.beginPath();
            ctx.moveTo(centerX + offset, 0);
            ctx.lineTo(centerX + offset, size);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, centerY + offset);
            ctx.lineTo(size, centerY + offset);
            ctx.stroke();
        }

        ctx.fillStyle = '#8B5A2B';
        city.buildings.forEach(b => {
            const x = centerX + b.position.x * scale;
            const y = centerY - b.position.z * scale;
            const w = b.geometry.parameters.width * scale;
            const h = b.geometry.parameters.depth * scale;
            if (x > -w && x < size + w && y > -h && y < size + h) {
                ctx.fillRect(x - w/2, y - h/2, w, h);
            }
        });

        if (this.waypoint) {
            const wx = centerX + this.waypoint.x * scale;
            const wy = centerY - this.waypoint.z * scale;
            ctx.fillStyle = '#FFFF00';
            ctx.beginPath();
            ctx.arc(wx, wy, 6, 0, Math.PI * 2);
            ctx.fill();
        }

        const px = centerX;
        const py = centerY;
        ctx.fillStyle = '#00FFFF';
        ctx.beginPath();
        ctx.moveTo(px, py - 6);
        ctx.lineTo(px - 4, py + 4);
        ctx.lineTo(px + 4, py + 4);
        ctx.closePath();
        ctx.fill();

        const wanted = this.game.systems.police.getUnits();
        wanted.forEach(unit => {
            const ux = centerX + unit.vehicle.mesh.position.x * scale;
            const uy = centerY - unit.vehicle.mesh.position.z * scale;
            ctx.fillStyle = '#0000FF';
            ctx.beginPath();
            ctx.arc(ux, uy, 4, 0, Math.PI * 2);
            ctx.fill();
        });

        if (this.game.systems.police.helicopter) {
            const hx = centerX + this.game.systems.police.helicopter.mesh.position.x * scale;
            const hy = centerY - this.game.systems.police.helicopter.mesh.position.z * scale;
            ctx.fillStyle = '#FF0000';
            ctx.beginPath();
            ctx.arc(hx, hy, 5, 0, Math.PI * 2);
            ctx.fill();
        }

        this.minimapCtx.font = '10px monospace';
        this.minimapCtx.fillStyle = '#FFFFFF';
        this.minimapCtx.fillText('N', centerX, 12);
    }

    updateClock() {
        const hour = Math.floor(this.game.systems.city.timeOfDay * 24) % 24;
        const minute = Math.floor((this.game.systems.city.timeOfDay * 24 % 1) * 60);
        document.getElementById('clock').textContent = `${hour.toString().padStart(2,'0')}:${minute.toString().padStart(2,'0')}`;
    }

    updateLocation() {
        const player = this.game.systems.player;
        const district = this.game.systems.city.getDistrict(player.position.x, player.position.z);
        const street = this.game.systems.city.getStreetName(player.position.x, player.position.z);
        document.getElementById('location').textContent = `${district} - ${street}`;
    }

    updateRadio() {
        const stations = [
            { name: 'Wave 88.5', genre: 'Neon Drive', artist: 'Midnight Driver' },
            { name: 'Bay FM 97.3', genre: 'Coastal Vibes', artist: 'Sunset Collective' },
            { name: 'Static 104.1', genre: 'Underground', artist: 'Neon Shadows' }
        ];
        const idx = Math.floor(this.game.systems.city.timeOfDay * 3) % stations.length;
        const s = stations[idx];
        document.getElementById('radio').textContent = `${s.name} - ${s.genre} - ${s.artist}`;
    }

    updateNotifications(dt) {
        this.notificationTimer += dt;
        const container = document.getElementById('notifications');
        container.innerHTML = '';

        this.notifications = this.notifications.filter(n => n.time > 0);
        this.notifications.forEach(n => {
            n.time -= dt;
            const div = document.createElement('div');
            div.className = 'notification';
            div.textContent = n.text;
            div.style.opacity = Math.min(1, n.time);
            container.appendChild(div);
        });
    }

    showNotification(text) {
        this.notifications.push({ text, time: 3 });
    }

    updateHealth(health, armour) {
        document.getElementById('health-bar').style.width = `${(health/100)*100}%`;
        document.getElementById('armour-bar').style.width = `${(armour/100)*100}%`;
    }

    updateMoney(money) {
        document.getElementById('money').textContent = `$${money.toLocaleString()}`;
    }

    updateRep(rep, level) {
        const progress = (rep % 1000) / 100;
        const filled = Math.floor(progress);
        const empty = 10 - filled;
        document.getElementById('rep').textContent = `REP ${level} [${'█'.repeat(filled)}${'░'.repeat(empty)}] ${rep%1000}/1000`;
    }

    updateWeapon(weapon, ammo) {
        const maxAmmo = { pistol: 36, rifle: 120, shotgun: 20 }[weapon] || 36;
        document.getElementById('weapon-name').textContent = weapon.toUpperCase();
        document.getElementById('ammo-count').textContent = `${ammo} / ${maxAmmo}`;
    }

    updateAmmo(ammo) {
        const weapon = this.game.systems.player.weapon;
        const maxAmmo = { pistol: 36, rifle: 120, shotgun: 20 }[weapon] || 36;
        document.getElementById('ammo-count').textContent = `${ammo} / ${maxAmmo}`;
    }

    setCrosshair(visible) {
        this.crosshairVisible = visible;
        document.getElementById('crosshair').style.display = visible ? 'flex' : 'none';
    }

    setSpeedometer(visible) {
        this.showSpeedometer = visible;
        document.getElementById('speedometer').style.display = visible ? 'block' : 'none';
    }

    updateSpeedometer(speed, gear, vehicleName, condition) {
        if (!this.showSpeedometer) return;
        document.getElementById('speed').textContent = Math.round(Math.abs(speed * 3.6));
        document.getElementById('gear').textContent = gear === 0 ? 'R' : gear;
        document.getElementById('vehicle-name').textContent = vehicleName.toUpperCase();
        document.getElementById('condition-bar').style.width = `${condition}%`;
    }

    updateWanted(level) {
        const container = document.getElementById('wanted-stars');
        container.innerHTML = '';
        for (let i = 0; i < 5; i++) {
            const star = document.createElement('span');
            star.className = 'star';
            star.textContent = '★';
            star.style.color = i < Math.floor(level) ? '#FFD700' : '#444';
            if (i === Math.floor(level) && level % 1 > 0.5) star.style.color = '#FFAA00';
            container.appendChild(star);
        }

        const policeList = document.getElementById('police-response');
        if (policeList) {
            policeList.innerHTML = '';
            this.game.systems.police.getUnits().forEach(u => {
                const div = document.createElement('div');
                div.textContent = `${u.callsign}: ${u.state.toUpperCase()} - ${Math.round(u.vehicle.mesh.position.distanceTo(this.game.systems.player.position))}m`;
                policeList.appendChild(div);
            });
        }
    }

    updateWaypoint(pos, dist) {
        this.waypoint = pos;
        this.waypointDist = dist;
    }

    showMissionStart(mission) {
        const panel = document.getElementById('mission-panel');
        panel.style.display = 'block';
        document.getElementById('mission-title').textContent = `MISSION ${mission.id}/7: ${mission.title}`;
        document.getElementById('mission-objective').textContent = mission.stages[0].objective;
        document.getElementById('mission-stage').textContent = `STAGE 1/${mission.stages.length}`;
        document.getElementById('mission-next').textContent = '';
        this.showNotification(`New Mission: ${mission.title}`);
    }

    showStageUpdate(stage) {
        const m = this.game.systems.missions;
        document.getElementById('mission-objective').textContent = stage.objective;
        document.getElementById('mission-stage').textContent = `STAGE ${m.currentStage+1}/${m.currentMission.stages.length}`;
        if (m.currentStage + 1 < m.currentMission.stages.length) {
            document.getElementById('mission-next').textContent = `NEXT: ${m.currentMission.stages[m.currentStage+1].objective}`;
        }
    }

    showMissionComplete(mission, reward) {
        this.showNotification(`Mission Complete! +$${reward} +500 REP`);
        document.getElementById('mission-panel').style.display = 'none';
    }

    showMissionFailed() {
        this.showNotification('Mission Failed');
        document.getElementById('mission-panel').style.display = 'none';
    }

    updateKillObjective(remaining) {
        document.getElementById('mission-objective').textContent = `Eliminate targets: ${remaining} remaining`;
    }

    updateSurviveTimer(seconds) {
        document.getElementById('mission-timer').textContent = `SURVIVE: ${seconds}s`;
        document.getElementById('mission-timer').style.display = 'block';
    }

    updateLoseWanted(level) {
        document.getElementById('mission-objective').textContent = `Lose the police (Wanted: ${level.toFixed(1)})`;
    }

    showInteractionPrompt(text) {
        document.getElementById('interaction-prompt').textContent = text;
        document.getElementById('interaction-prompt').style.display = 'block';
    }

    hideInteractionPrompt() {
        document.getElementById('interaction-prompt').style.display = 'none';
    }

    showDialogue(name, text, portraitColor) {
        const box = document.getElementById('dialogue-box');
        document.getElementById('dialogue-name').textContent = name;
        document.getElementById('dialogue-text').textContent = text;
        document.getElementById('dialogue-portrait').style.background = portraitColor;
        box.style.display = 'flex';
    }

    hideDialogue() {
        document.getElementById('dialogue-box').style.display = 'none';
    }

    onResize() {
        // Minimap canvas is fixed size
    }
}
