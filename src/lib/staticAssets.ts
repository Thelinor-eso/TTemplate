import staticAssetMap from '@/data/staticAssetMap.json';

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
const assetMap: Record<string, string> = staticAssetMap;

export function withBasePath(assetPath: string): string {
  return `${BASE_PATH}${assetPath}`;
}

export function getStaticAssetPath(sourcePath: string): string | null {
  const localPath = assetMap[sourcePath];
  return localPath ? withBasePath(localPath) : null;
}

export function requireStaticAssetPath(sourcePath: string): string {
  const localPath = getStaticAssetPath(sourcePath);
  if (!localPath) throw new Error(`Missing local static asset for ${sourcePath}`);
  return localPath;
}
