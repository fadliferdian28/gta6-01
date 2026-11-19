import * as THREE from 'three';

export class City {
    constructor(game) {
        this.game = game;
        this.scene = game.scene;
        this.blockSize = 80;
        this.gridSize = 12;
        this.roadWidth = 12;
        this.sidewalkWidth = 4;
        this.buildings = [];
        this.roads = [];
        this.props = [];
        this.rng = new SeededRNG(12345);
        this.timeOfDay = 0.7;
        this.sunAngle = 0;
        this.init();
    }

    init() {
        this.createSky();
        this.createSun();
        this.createOcean();
        this.createGround();
        this.createRoadNetwork();
        this.createBuildings();
        this.createProps();
        this.createFerrisWheel();
        this.createPier();
        this.createNeonSigns();
    }

    createSky() {
        const geometry = new THREE.SphereGeometry(1000, 32, 16);
        geometry.scale(-1, 1, 1);
        const material = new THREE.MeshBasicMaterial({
            color: 0x87CEEB,
            side: THREE.BackSide,
            fog: false
        });
        this.sky = new THREE.Mesh(geometry, material);
        this.scene.add(this.sky);
    }

    createSun() {
        const sunGeo = new THREE.SphereGeometry(50, 16, 16);
        const sunMat = new THREE.MeshBasicMaterial({
            color: 0xFFD700,
            transparent: true,
            opacity: 0.9
        });
        this.sun = new THREE.Mesh(sunGeo, sunMat);
        this.sun.position.set(300, 200, -300);
        this.scene.add(this.sun);

        const light = new THREE.DirectionalLight(0xFFF8E7, 1.2);
        light.position.copy(this.sun.position);
        light.castShadow = true;
        light.shadow.mapSize.set(2048, 2048);
        light.shadow.camera.near = 10;
        light.shadow.camera.far = 500;
        light.shadow.camera.left = -200;
        light.shadow.camera.right = 200;
        light.shadow.camera.top = 200;
        light.shadow.camera.bottom = -200;
        this.sunLight = light;
        this.scene.add(light);

        const ambient = new THREE.AmbientLight(0x88AACC, 0.4);
        this.scene.add(ambient);
    }

    createOcean() {
        const geo = new THREE.PlaneGeometry(2000, 2000, 64, 64);
        const mat = new THREE.MeshStandardMaterial({
            color: 0x006994,
            roughness: 0.1,
            metalness: 0.3,
            transparent: true,
            opacity: 0.85
        });
        this.ocean = new THREE.Mesh(geo, mat);
        this.ocean.rotation.x = -Math.PI / 2;
        this.ocean.position.y = -2;
        this.ocean.receiveShadow = true;
        this.scene.add(this.ocean);
    }

    createGround() {
        const size = this.gridSize * this.blockSize;
        const geo = new THREE.PlaneGeometry(size, size, 32, 32);
        const mat = new THREE.MeshStandardMaterial({
            color: 0x8FBC8F,
            roughness: 0.9,
            metalness: 0
        });
        this.ground = new THREE.Mesh(geo, mat);
        this.ground.rotation.x = -Math.PI / 2;
        this.ground.position.y = -1;
        this.ground.receiveShadow = true;
        this.scene.add(this.ground);

        const beachGeo = new THREE.PlaneGeometry(size, 120, 32, 8);
        const beachMat = new THREE.MeshStandardMaterial({
            color: 0xF5DEB3,
            roughness: 0.95
        });
        this.beach = new THREE.Mesh(beachGeo, beachMat);
        this.beach.rotation.x = -Math.PI / 2;
        this.beach.position.set(0, -0.9, -size/2 + 60);
        this.beach.receiveShadow = true;
        this.scene.add(this.beach);
    }

    createRoadNetwork() {
        const roadMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.9 });
        const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0xAAAAAA, roughness: 0.9 });
        const lineMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.8 });

        const half = (this.gridSize * this.blockSize) / 2;
        const step = this.blockSize;

        for (let i = 0; i <= this.gridSize; i++) {
            const offset = -half + i * step;
            const isEdge = i === 0 || i === this.gridSize;

            const roadGeo = new THREE.PlaneGeometry(this.gridSize * this.blockSize, this.roadWidth);
            const road = new THREE.Mesh(roadGeo, roadMat);
            road.rotation.x = -Math.PI / 2;
            road.position.set(0, -0.5, offset);
            road.receiveShadow = true;
            this.scene.add(road);
            this.roads.push({ mesh: road, axis: 'x', pos: offset });

            if (!isEdge) {
                const lineGeo = new THREE.PlaneGeometry(this.gridSize * this.blockSize, 0.3);
                const line = new THREE.Mesh(lineGeo, lineMat);
                line.rotation.x = -Math.PI / 2;
                line.position.set(0, -0.4, offset);
                this.scene.add(line);
            }

            const swGeo = new THREE.PlaneGeometry(this.gridSize * this.blockSize, this.sidewalkWidth);
            const sw1 = new THREE.Mesh(swGeo, sidewalkMat);
            sw1.rotation.x = -Math.PI / 2;
            sw1.position.set(0, -0.45, offset - this.roadWidth/2 - this.sidewalkWidth/2);
            sw1.receiveShadow = true;
            this.scene.add(sw1);

            const sw2 = new THREE.Mesh(swGeo, sidewalkMat);
            sw2.rotation.x = -Math.PI / 2;
            sw2.position.set(0, -0.45, offset + this.roadWidth/2 + this.sidewalkWidth/2);
            sw2.receiveShadow = true;
            this.scene.add(sw2);
        }

        for (let i = 0; i <= this.gridSize; i++) {
            const offset = -half + i * step;
            const isEdge = i === 0 || i === this.gridSize;

            const roadGeo = new THREE.PlaneGeometry(this.roadWidth, this.gridSize * this.blockSize);
            const road = new THREE.Mesh(roadGeo, roadMat);
            road.rotation.x = -Math.PI / 2;
            road.position.set(offset, -0.5, 0);
            road.receiveShadow = true;
            this.scene.add(road);
            this.roads.push({ mesh: road, axis: 'z', pos: offset });

            if (!isEdge) {
                const lineGeo = new THREE.PlaneGeometry(0.3, this.gridSize * this.blockSize);
                const line = new THREE.Mesh(lineGeo, lineMat);
                line.rotation.x = -Math.PI / 2;
                line.position.set(offset, -0.4, 0);
                this.scene.add(line);
            }

            const swGeo = new THREE.PlaneGeometry(this.sidewalkWidth, this.gridSize * this.blockSize);
            const sw1 = new THREE.Mesh(swGeo, sidewalkMat);
            sw1.rotation.x = -Math.PI / 2;
            sw1.position.set(offset - this.roadWidth/2 - this.sidewalkWidth/2, -0.45, 0);
            sw1.receiveShadow = true;
            this.scene.add(sw1);

            const sw2 = new THREE.Mesh(swGeo, sidewalkMat);
            sw2.rotation.x = -Math.PI / 2;
            sw2.position.set(offset + this.roadWidth/2 + this.sidewalkWidth/2, -0.45, 0);
            sw2.receiveShadow = true;
            this.scene.add(sw2);
        }

        const interGeo = new THREE.PlaneGeometry(this.roadWidth, this.roadWidth);
        const interMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.9 });
        for (let i = 1; i < this.gridSize; i++) {
            for (let j = 1; j < this.gridSize; j++) {
                const x = -half + i * step;
                const z = -half + j * step;
                const inter = new THREE.Mesh(interGeo, interMat);
                inter.rotation.x = -Math.PI / 2;
                inter.position.set(x, -0.5, z);
                inter.receiveShadow = true;
                this.scene.add(inter);
            }
        }
    }

    createBuildings() {
        const half = (this.gridSize * this.blockSize) / 2;
        const step = this.blockSize;
        const buildingTypes = [
            { h: [8, 15], color: [0xDDD, 0xCCC, 0xBBB, 0xAAA], windows: true },
            { h: [15, 30], color: [0xAAA, 0x999, 0x888], windows: true },
            { h: [30, 60], color: [0x888, 0x777, 0x666], windows: true },
            { h: [5, 12], color: [0xE8D5B7, 0xD4C4A0, 0xC0B090], windows: false }
        ];

        for (let gx = 0; gx < this.gridSize; gx++) {
            for (let gz = 0; gz < this.gridSize; gz++) {
                const cx = -half + gx * step + step/2;
                const cz = -half + gz * step + step/2;

                if (this.isBeachArea(cx, cz)) continue;
                if (this.isPierArea(cx, cz)) continue;

                const numBuildings = this.rng.int(1, 4);
                for (let b = 0; b < numBuildings; b++) {
                    const type = this.rng.choice(buildingTypes);
                    const w = this.rng.float(12, 28);
                    const d = this.rng.float(12, 28);
                    const h = this.rng.float(type.h[0], type.h[1]);
                    const color = this.rng.choice(type.color);

                    const bx = cx + this.rng.float(-step/2 + w/2 + 4, step/2 - w/2 - 4);
                    const bz = cz + this.rng.float(-step/2 + d/2 + 4, step/2 - d/2 - 4);

                    const geo = new THREE.BoxGeometry(w, h, d);
                    if (type.windows) {
                        this.addWindowUVs(geo, w, h, d);
                    }
                    const mat = new THREE.MeshStandardMaterial({
                        color: color,
                        roughness: 0.7,
                        metalness: 0.1
                    });
                    const building = new THREE.Mesh(geo, mat);
                    building.position.set(bx, h/2 - 1, bz);
                    building.castShadow = true;
                    building.receiveShadow = true;
                    this.scene.add(building);
                    this.buildings.push(building);

                    if (h > 25 && this.rng.float() < 0.3) {
                        this.addRooftopAC(building, w, d);
                    }
                }
            }
        }
    }

    addWindowUVs(geo, w, h, d) {
        const uv = geo.attributes.uv.array;
        const pos = geo.attributes.position.array;
        for (let i = 0; i < pos.length; i += 3) {
            const x = pos[i], y = pos[i+1], z = pos[i+2];
            const face = Math.floor(i / (6 * 3));
            const local = i % 18;
            if (Math.abs(y - h/2) < 0.1) {
                uv[i/3*2] = (x + w/2) / w;
                uv[i/3*2+1] = (z + d/2) / d;
            } else if (Math.abs(y + h/2) < 0.1) {
                uv[i/3*2] = (x + w/2) / w;
                uv[i/3*2+1] = (z + d/2) / d;
            } else {
                uv[i/3*2] = (x + w/2) / w * 4;
                uv[i/3*2+1] = (y + h/2) / h * 4;
            }
        }
        geo.attributes.uv.needsUpdate = true;
    }

    addRooftopAC(building, w, d) {
        const geo = new THREE.BoxGeometry(4, 2, 3);
        const mat = new THREE.MeshStandardMaterial({ color: 0x666666 });
        const ac = new THREE.Mesh(geo, mat);
        ac.position.set(
            this.rng.float(-w/2 + 3, w/2 - 3),
            building.geometry.parameters.height/2 + 1,
            this.rng.float(-d/2 + 2, d/2 - 2)
        );
        building.add(ac);
    }

    createProps() {
        const half = (this.gridSize * this.blockSize) / 2;
        const step = this.blockSize;

        for (let gx = 0; gx < this.gridSize; gx++) {
            for (let gz = 0; gz < this.gridSize; gz++) {
                const cx = -half + gx * step + step/2;
                const cz = -half + gz * step + step/2;

                if (this.isBeachArea(cx, cz)) {
                    if (this.rng.float() < 0.15) this.addPalmTree(cx, cz);
                    if (this.rng.float() < 0.08) this.addBeachProp(cx, cz);
                    continue;
                }

                const numProps = this.rng.int(0, 3);
                for (let p = 0; p < numProps; p++) {
                    const px = cx + this.rng.float(-step/2 + 8, step/2 - 8);
                    const pz = cz + this.rng.float(-step/2 + 8, step/2 - 8);

                    if (this.isOnRoad(px, pz)) continue;

                    const propType = this.rng.float();
                    if (propType < 0.4) this.addStreetlight(px, pz);
                    else if (propType < 0.6) this.addBench(px, pz);
                    else if (propType < 0.8) this.addTrashCan(px, pz);
                    else this.addPalmTree(px, pz);
                }
            }
        }
    }

    addPalmTree(x, z) {
        const trunkGeo = new THREE.CylinderGeometry(0.3, 0.5, 8, 6);
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8B5A2B, roughness: 0.9 });
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.set(x, 3, z);
        trunk.castShadow = true;
        this.scene.add(trunk);

        const leaves = new THREE.Group();
        for (let i = 0; i < 6; i++) {
            const leafGeo = new THREE.PlaneGeometry(4, 1.5);
            const leafMat = new THREE.MeshStandardMaterial({
                color: 0x2E8B57,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.9
            });
            const leaf = new THREE.Mesh(leafGeo, leafMat);
            leaf.position.set(0, 7 + i * 0.3, 0);
            leaf.rotation.x = -Math.PI/4 - i * 0.15;
            leaf.rotation.y = i * Math.PI/3;
            leaf.castShadow = true;
            leaves.add(leaf);
        }
        leaves.position.set(x, 0, z);
        this.scene.add(leaves);
        this.props.push({ type: 'palm', trunk, leaves, pos: new THREE.Vector3(x, 0, z) });
    }

    addStreetlight(x, z) {
        const poleGeo = new THREE.CylinderGeometry(0.15, 0.15, 6, 6);
        const poleMat = new THREE.MeshStandardMaterial({ color: 0x444444 });
        const pole = new THREE.Mesh(poleGeo, poleMat);
        pole.position.set(x, 3, z);
        pole.castShadow = true;
        this.scene.add(pole);

        const armGeo = new THREE.CylinderGeometry(0.08, 0.08, 2, 6);
        const arm = new THREE.Mesh(armGeo, poleMat);
        arm.position.set(x, 5.8, z);
        arm.rotation.z = Math.PI/2;
        arm.castShadow = true;
        this.scene.add(arm);

        const lightGeo = new THREE.SphereGeometry(0.3, 8, 8);
        const lightMat = new THREE.MeshBasicMaterial({ color: 0xFFFFCC });
        const light = new THREE.Mesh(lightGeo, lightMat);
        light.position.set(x + 1, 5.8, z);
        this.scene.add(light);

        const pl = new THREE.PointLight(0xFFFFCC, 0.5, 20);
        pl.position.set(x + 1, 5.8, z);
        this.scene.add(pl);
        this.props.push({ type: 'streetlight', pos: new THREE.Vector3(x, 0, z), light: pl });
    }

    addBench(x, z) {
        const geo = new THREE.BoxGeometry(2.5, 0.4, 0.8);
        const mat = new THREE.MeshStandardMaterial({ color: 0x555555 });
        const bench = new THREE.Mesh(geo, mat);
        bench.position.set(x, 0.6, z);
        bench.rotation.y = this.rng.float(0, Math.PI*2);
        bench.castShadow = true;
        this.scene.add(bench);
        this.props.push({ type: 'bench', pos: new THREE.Vector3(x, 0, z) });
    }

    addTrashCan(x, z) {
        const geo = new THREE.CylinderGeometry(0.4, 0.35, 1, 8);
        const mat = new THREE.MeshStandardMaterial({ color: 0x333333 });
        const can = new THREE.Mesh(geo, mat);
        can.position.set(x, 0.5, z);
        can.castShadow = true;
        this.scene.add(can);
        this.props.push({ type: 'trash', pos: new THREE.Vector3(x, 0, z) });
    }

    addBeachProp(x, z) {
        const type = this.rng.int(0, 2);
        if (type === 0) {
            const geo = new THREE.SphereGeometry(0.5, 8, 8);
            const mat = new THREE.MeshStandardMaterial({ color: 0xFFD700 });
            const ball = new THREE.Mesh(geo, mat);
            ball.position.set(x, 0.5, z);
            this.scene.add(ball);
        } else {
            const geo = new THREE.BoxGeometry(1.5, 0.3, 1.5);
            const mat = new THREE.MeshStandardMaterial({ color: 0xF5DEB3 });
            const towel = new THREE.Mesh(geo, mat);
            towel.position.set(x, 0.15, z);
            towel.rotation.y = this.rng.float(0, Math.PI*2);
            this.scene.add(towel);
        }
    }

    createFerrisWheel() {
        const wheel = new THREE.Group();
        const rimGeo = new THREE.TorusGeometry(20, 0.5, 8, 32);
        const rimMat = new THREE.MeshStandardMaterial({ color: 0xFFD700, emissive: 0xFFD700, emissiveIntensity: 0.3 });
        const rim = new THREE.Mesh(rimGeo, rimMat);
        rim.rotation.x = Math.PI/2;
        wheel.add(rim);

        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const spokeGeo = new THREE.CylinderGeometry(0.2, 0.2, 20, 6);
            const spokeMat = new THREE.MeshStandardMaterial({ color: 0xCCCCCC });
            const spoke = new THREE.Mesh(spokeGeo, spokeMat);
            spoke.position.set(Math.sin(angle)*10, Math.cos(angle)*10, 0);
            spoke.rotation.z = angle;
            wheel.add(spoke);

            const cabinGeo = new THREE.BoxGeometry(3, 2, 2);
            const cabinMat = new THREE.MeshStandardMaterial({ color: 0xFF6B6B });
            const cabin = new THREE.Mesh(cabinGeo, cabinMat);
            cabin.position.set(Math.sin(angle)*20, Math.cos(angle)*20, 0);
            cabin.castShadow = true;
            wheel.add(cabin);
        }

        const baseGeo = new THREE.BoxGeometry(8, 10, 4);
        const baseMat = new THREE.MeshStandardMaterial({ color: 0x888888 });
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.position.set(0, -5, 0);
        base.castShadow = true;
        wheel.add(base);

        wheel.position.set(-200, 10, -280);
        this.scene.add(wheel);
        this.ferrisWheel = wheel;
    }

    createPier() {
        const pierGeo = new THREE.BoxGeometry(30, 2, 120);
        const pierMat = new THREE.MeshStandardMaterial({ color: 0x8B5A2B, roughness: 0.8 });
        const pier = new THREE.Mesh(pierGeo, pierMat);
        pier.position.set(0, 0, -300);
        pier.castShadow = true;
        pier.receiveShadow = true;
        this.scene.add(pier);

        for (let i = 0; i < 12; i++) {
            const postGeo = new THREE.CylinderGeometry(0.4, 0.4, 6, 6);
            const postMat = new THREE.MeshStandardMaterial({ color: 0x6B4A2B });
            const post = new THREE.Mesh(postGeo, postMat);
            post.position.set(-14, -2, -240 + i * 20);
            this.scene.add(post);
            const post2 = post.clone();
            post2.position.set(14, -2, -240 + i * 20);
            this.scene.add(post2);
        }
    }

    createNeonSigns() {
        const signs = [
            { text: 'LUMEN BAY', pos: new THREE.Vector3(-150, 25, -200), color: 0xFF00FF },
            { text: 'SUNSPRAY', pos: new THREE.Vector3(180, 18, 150), color: 0x00FFFF },
            { text: 'MARINA', pos: new THREE.Vector3(-180, 20, 180), color: 0xFFFF00 },
            { text: 'OLD TOWN', pos: new THREE.Vector3(100, 22, -100), color: 0xFF8800 },
        ];

        signs.forEach(s => {
            const group = new THREE.Group();
            const geo = new THREE.BoxGeometry(s.text.length * 1.2, 3, 0.5);
            const mat = new THREE.MeshBasicMaterial({ color: s.color, transparent: true, opacity: 0.9 });
            const sign = new THREE.Mesh(geo, mat);
            sign.position.set(0, 0, 0);
            group.add(sign);

            const light = new THREE.PointLight(s.color, 1, 50);
            light.position.set(0, 0, 2);
            group.add(light);

            group.position.copy(s.pos);
            this.scene.add(group);
            this.props.push({ type: 'neon', group, light });
        });
    }

    isBeachArea(x, z) {
        const half = (this.gridSize * this.blockSize) / 2;
        return z > half - 140;
    }

    isPierArea(x, z) {
        return Math.abs(x) < 20 && z < -240;
    }

    isOnRoad(x, z) {
        const half = (this.gridSize * this.blockSize) / 2;
        const step = this.blockSize;
        const rx = ((x + half) % step + step) % step;
        const rz = ((z + half) % step + step) % step;
        const roadW = this.roadWidth/2 + this.sidewalkWidth;
        return rx < roadW || rx > step - roadW || rz < roadW || rz > step - roadW;
    }

    getRoadPosition(x, z) {
        const half = (this.gridSize * this.blockSize) / 2;
        const step = this.blockSize;
        const rx = Math.round((x + half) / step) * step - half;
        const rz = Math.round((z + half) / step) * step - half;
        return new THREE.Vector3(rx, 0.5, rz);
    }

    getSpawnPoint() {
        return new THREE.Vector3(0, 2, -100);
    }

    update(dt) {
        this.timeOfDay += dt * 0.001;
        this.sunAngle = this.timeOfDay * Math.PI * 2;

        if (this.ferrisWheel) {
            this.ferrisWheel.children.forEach((c, i) => {
                if (c.geometry && c.geometry.type === 'BoxGeometry' && c.position.length() > 15) {
                    const angle = (Date.now() * 0.0002) + i * Math.PI/4;
                    c.position.x = Math.sin(angle) * 20;
                    c.position.y = Math.cos(angle) * 20;
                }
            });
        }

        if (this.sunLight) {
            this.sunLight.position.x = Math.sin(this.sunAngle) * 300;
            this.sunLight.position.y = Math.cos(this.sunAngle) * 200 + 100;
            this.sunLight.position.z = Math.cos(this.sunAngle * 0.5) * 300 - 100;
        }

        if (this.ocean) {
            const pos = this.ocean.geometry.attributes.position;
            const time = Date.now() * 0.001;
            for (let i = 0; i < pos.count; i++) {
                const x = pos.getX(i), z = pos.getZ(i);
                pos.setY(i, Math.sin(x * 0.05 + time) * 0.3 + Math.cos(z * 0.07 + time * 0.7) * 0.2);
            }
            pos.needsUpdate = true;
            this.ocean.geometry.computeVertexNormals();
        }
    }

    getDistrict(x, z) {
        const half = (this.gridSize * this.blockSize) / 2;
        if (z > half - 140) return 'Sunspray Beach';
        if (x < -half/2 && z < -half/2) return 'Portside Docks';
        if (x > half/2 && z > half/2) return 'The Hills';
        if (x > 0 && z < 0) return 'Marina District';
        if (x < 0 && z > 0) return 'Old Town';
        return 'Downtown Civic Center';
    }

    getStreetName(x, z) {
        const streets = ['Ocean Ave', 'Palm Blvd', 'Sunset Dr', 'Harbor Rd', 'Bay St', 'Marina Way', 'Pier Ln', 'Coast Hwy'];
        const idx = Math.abs(Math.floor(x/80) + Math.floor(z/80) * 13) % streets.length;
        return streets[idx];
    }
}

class SeededRNG {
    constructor(seed) { this.seed = seed; }
    next() { this.seed = (this.seed * 1664525 + 1013904223) % 4294967296; return this.seed / 4294967296; }
    float(min=0, max=1) { return min + this.next() * (max - min); }
    int(min, max) { return Math.floor(this.float(min, max+1)); }
    choice(arr) { return arr[this.int(0, arr.length-1)]; }
}
