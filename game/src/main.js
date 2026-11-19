import * as THREE from 'three';
import { City } from './city.js';
import { Player } from './player.js';
import { Vehicles } from './vehicles.js';
import { Driving } from './driving.js';
import { Traffic } from './traffic.js';
import { Pedestrians } from './pedestrians.js';
import { Combat } from './combat.js';
import { Police } from './police.js';
import { Missions } from './missions.js';
import { HUD } from './hud.js';
import { Menu } from './menu.js';
import { Audio } from './audio.js';
import { Save } from './save.js';
import { Shots } from './shots.js';

class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB);

        this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 2000);
        this.camera.position.set(0, 10, 20);

        this.clock = new THREE.Clock();
        this.running = false;
        this.paused = false;

        this.systems = {};
        this.input = { keys: {}, mouse: { x: 0, y: 0, down: false } };
        this.raycaster = new THREE.Raycaster();

        this.initSystems();
        this.bindEvents();
        this.handleShotParam();
    }

    initSystems() {
        this.systems.city = new City(this);
        this.systems.audio = new Audio(this);
        this.systems.vehicles = new Vehicles(this);
        this.systems.player = new Player(this);
        this.systems.driving = new Driving(this);
        this.systems.traffic = new Traffic(this);
        this.systems.pedestrians = new Pedestrians(this);
        this.systems.combat = new Combat(this);
        this.systems.police = new Police(this);
        this.systems.missions = new Missions(this);
        this.systems.hud = new HUD(this);
        this.systems.menu = new Menu(this);
        this.systems.save = new Save(this);
        this.systems.shots = new Shots(this);
    }

    bindEvents() {
        window.addEventListener('resize', () => this.onResize());
        window.addEventListener('keydown', (e) => this.onKeyDown(e));
        window.addEventListener('keyup', (e) => this.onKeyUp(e));
        window.addEventListener('mousemove', (e) => this.onMouseMove(e));
        window.addEventListener('mousedown', (e) => this.onMouseDown(e));
        window.addEventListener('mouseup', (e) => this.onMouseUp(e));
        window.addEventListener('contextmenu', (e) => e.preventDefault());
        this.canvas.addEventListener('click', () => {
            try {
                const p = this.canvas.requestPointerLock();
                if (p && p.catch) p.catch(() => {});
            } catch (e) {}
        });
    }

    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.systems.hud?.onResize();
    }

    onKeyDown(e) {
        this.input.keys[e.code] = true;
        if (e.code === 'Escape') this.togglePause();
        if (e.code === 'KeyV' && this.systems.driving) this.systems.driving.toggleCamera();
    }

    onKeyUp(e) {
        this.input.keys[e.code] = false;
    }

    onMouseMove(e) {
        this.input.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        this.input.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        if (document.pointerLockElement === this.canvas) {
            this.input.mouse.dx = e.movementX;
            this.input.mouse.dy = e.movementY;
        }
    }

    onMouseDown(e) {
        this.input.mouse.down = true;
        if (e.button === 0) this.input.mouse.left = true;
        if (e.button === 2) this.input.mouse.right = true;
    }

    onMouseUp(e) {
        this.input.mouse.down = false;
        this.input.mouse.left = false;
        this.input.mouse.right = false;
    }

    togglePause() {
        if (this.systems.menu.visible && !this.paused) return;
        this.paused = !this.paused;
        this.systems.menu.showPause(this.paused);
    }

    handleShotParam() {
        const params = new URLSearchParams(window.location.search);
        const shot = params.get('shot');
        const seed = parseInt(params.get('seed')) || 1;
        if (shot) {
            this.systems.shots.stage(shot, seed);
        }
    }

    start() {
        this.running = true;
        this.systems.audio.init();
        // Show the start screen on a plain load; shot stagings manage
        // the menu themselves (stageStart shows it, other shots hide it)
        if (!new URLSearchParams(window.location.search).get('shot')) {
            this.systems.menu.show();
        }
        this.animate();
    }

    animate() {
        if (!this.running) return;
        requestAnimationFrame(() => this.animate());

        const dt = Math.min(this.clock.getDelta(), 1/30);

        if (!this.paused && !this.systems.menu.visible) {
            this.update(dt);
        }

        this.render();
    }

    update(dt) {
        this.systems.player.update(dt);
        this.systems.driving.update(dt);
        this.systems.traffic.update(dt);
        this.systems.pedestrians.update(dt);
        this.systems.combat.update(dt);
        this.systems.police.update(dt);
        this.systems.missions.update(dt);
        this.systems.hud.update(dt);
        this.systems.city.update(dt);
        this.systems.vehicles.update(dt);
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }

    getWorld() {
        return this.scene;
    }
}

window.addEventListener('load', () => {
    window.__game = new Game();
    window.__game.start();
});

export { Game };
