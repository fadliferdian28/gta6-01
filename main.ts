import { cpSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { buildDossier } from './vendor/makefun-game.ts';

// Caps the bounty's gate hands buildDossier; they only bound what may be handed in.
const DOSSIER_CAPS = {
  text_max_bytes: 163_840,
  screenshots: { max: 4, max_bytes: 262_144 },
  game_max_files: 993,
  game_max_bytes: 50_331_648,
  game_path_max_bytes: 1_000,
};

const ENTRY_DIR = import.meta.dirname;

function stageEntry(dest: string): void {
  for (const name of ['game', 'screenshots']) {
    cpSync(path.join(ENTRY_DIR, name), path.join(dest, name), {
      recursive: true,
      force: true,
    });
  }
}

function run(): void {
  const outDir = process.env.MAKEFUN_OUTPUT_DIR?.trim() || '/output';
  mkdirSync(outDir, { recursive: true });

  stageEntry(outDir);

  const dossier = buildDossier(outDir, DOSSIER_CAPS);
  const dossierPath = path.join(outDir, 'dossier.json');
  writeFileSync(dossierPath, dossier);

  console.log(`wrote ${dossierPath} (${dossier.byteLength} bytes)`);
}

run();
