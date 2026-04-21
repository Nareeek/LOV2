import { artManifest } from '@lov2/art-pipeline';

const assetPaths = new Map(artManifest.map((asset) => [asset.id, asset.path]));

export function assetPath(assetId: string): string {
  return assetPaths.get(assetId) ?? '/assets/original/icon-onyx.svg';
}
