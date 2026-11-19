import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPO_ROOT = __dirname;
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR || path.join(REPO_ROOT, 'out');

function buildDossier() {
    const gameDir = path.join(OUTPUT_DIR, 'game');
    const screenshotsDir = path.join(OUTPUT_DIR, 'screenshots');

    let fileCount = 0;
    let totalSize = 0;

    function countFiles(dir: string) {
        if (!fs.existsSync(dir)) return;
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                countFiles(fullPath);
            } else {
                fileCount++;
                totalSize += stat.size;
            }
        }
    }

    countFiles(gameDir);
    countFiles(screenshotsDir);

    return {
        name: "LUMEN BAY",
        version: "1.0.0",
        competition: "gta6-01",
        author: "fadliferdian28",
        repository: "gta6-01",
        caps: {
            maxFiles: 993,
            maxSizeMiB: 48,
            maxIndexHtmlMiB: 1,
            screenshotCount: 4,
            screenshotMaxKiB: 256,
            screenshotLongSide: 1280,
            screenshotShortSideMin: 480
        },
        stats: {
            fileCount,
            totalSizeBytes: totalSize,
            totalSizeMiB: Math.round(totalSize / 1024 / 1024 * 100) / 100
        },
        systems: [
            "city", "player", "vehicles", "driving", "traffic",
            "pedestrians", "combat", "police", "missions", "hud",
            "menu", "audio", "save", "shots"
        ],
        missions: 7,
        vehicles: 5,
        districts: 6,
        radioStations: 3
    };
}

function copyRecursive(src: string, dest: string) {
    if (!fs.existsSync(src)) return;
    fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            copyRecursive(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

function validateOutput() {
    const indexHtml = path.join(OUTPUT_DIR, 'game', 'index.html');
    if (fs.existsSync(indexHtml)) {
        const stat = fs.statSync(indexHtml);
        if (stat.size > 1024 * 1024) {
            console.warn(`WARNING: index.html exceeds 1 MiB (${stat.size} bytes)`);
        }
    }

    const screenshotsDir = path.join(OUTPUT_DIR, 'screenshots');
    if (fs.existsSync(screenshotsDir)) {
        const shots = fs.readdirSync(screenshotsDir).filter(f => f.endsWith('.jpg'));
        for (const shot of shots) {
            const stat = fs.statSync(path.join(screenshotsDir, shot));
            if (stat.size > 256 * 1024) {
                console.warn(`WARNING: ${shot} exceeds 256 KiB (${stat.size} bytes)`);
            }
        }
    }
}

async function main() {
    console.log('Building LUMEN BAY for make.fun gta6-01...');

    fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    copyRecursive(path.join(REPO_ROOT, 'game'), path.join(OUTPUT_DIR, 'game'));
    copyRecursive(path.join(REPO_ROOT, 'screenshots'), path.join(OUTPUT_DIR, 'screenshots'));

    const dossier = buildDossier();
    fs.writeFileSync(path.join(OUTPUT_DIR, 'dossier.json'), JSON.stringify(dossier, null, 2));

    validateOutput();

    console.log('Build complete!');
    console.log(`Files: ${dossier.stats.fileCount}`);
    console.log(`Size: ${dossier.stats.totalSizeMiB} MiB`);
    console.log(`Output: ${OUTPUT_DIR}`);
}

main().catch(console.error);
