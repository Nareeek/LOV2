import { artManifest } from '@lov2/art-pipeline';

const assetPaths = new Map(artManifest.map((asset) => [asset.id, asset.path]));

export function hasAsset(assetId: string): boolean {
  return assetPaths.has(assetId);
}

export function assetPath(assetId: string): string {
  return assetPaths.get(assetId) ?? '/assets/original/icon-onyx.svg';
}
