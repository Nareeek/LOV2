import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readRepoFile(relativePath) {
  return readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function toPublicFilePath(assetPath) {
  return path.join(repoRoot, 'apps/web/public', assetPath.replace(/^\//, '').replaceAll('/', path.sep));
}

const failures = [];
const manifestText = readRepoFile('packages/art-pipeline/src/index.ts');
const gameDataText = readRepoFile('packages/game-data/src/index.ts');
const manifestRecords = [];
const recordPattern = /{\s*id:\s*'([^']+)'[\s\S]*?path:\s*'([^']+)'[\s\S]*?kind:\s*'([^']+)'/g;

for (const match of manifestText.matchAll(recordPattern)) {
  manifestRecords.push({ id: match[1], path: match[2], kind: match[3] });
}

if (manifestRecords.length === 0) {
  failures.push('No artManifest records were found.');
}

const ids = new Set();
const duplicateIds = new Set();
for (const record of manifestRecords) {
  if (ids.has(record.id)) {
    duplicateIds.add(record.id);
  }
  ids.add(record.id);
}

for (const id of duplicateIds) {
  failures.push(`Duplicate artManifest id: ${id}`);
}

for (const record of manifestRecords) {
  if (!record.path.startsWith('/assets/generated/')) {
    continue;
  }

  const publicFilePath = toPublicFilePath(record.path);
  if (!existsSync(publicFilePath)) {
    failures.push(`Generated asset is missing for ${record.id}: ${record.path}`);
  }
}

const referencedAssetIds = new Set();
const referencePattern = /(?:sceneAssetId|iconAssetId):\s*'([^']+)'/g;
for (const match of gameDataText.matchAll(referencePattern)) {
  referencedAssetIds.add(match[1]);
}

for (const assetId of referencedAssetIds) {
  if (!ids.has(assetId)) {
    failures.push(`game-data references missing artManifest id: ${assetId}`);
  }
}

if (failures.length > 0) {
  console.error('Asset validation failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(
  `Asset validation passed: ${manifestRecords.length} artManifest records, ${referencedAssetIds.size} game-data references.`,
);

