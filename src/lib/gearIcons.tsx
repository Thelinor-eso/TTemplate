'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { ensureCatalogItemLoaded, getCachedCatalogItem, type CatalogSetItem } from './esoSetCatalog';
import type { GearPiece } from '@/features/template/raidTemplate';
import { buildGearIconCandidates, normalizeSetName } from './gearIconCandidates';
import { getStaticAssetPath, requireStaticAssetPath, withBasePath } from './staticAssets';
import { SET_ICON_PREFIXES, SET_ICON_SOURCES as STATIC_SET_ICON_SOURCES } from '@/data/setIconPrefixes';

export { SET_ICON_PREFIXES };
export { normalizeSetName } from './gearIconCandidates';

export const SET_ICON_SOURCES = Object.fromEntries(
  Object.entries(STATIC_SET_ICON_SOURCES).map(([setName, source]) => [setName, requireStaticAssetPath(source)]),
);
const NORMALIZED_SET_ICON_PREFIXES = new Map(
  Object.entries(SET_ICON_PREFIXES).map(([setName, prefix]) => [normalizeSetName(setName), prefix]),
);
const NORMALIZED_SET_ICON_SOURCES = new Map(
  Object.entries(SET_ICON_SOURCES).map(([setName, source]) => [normalizeSetName(setName), source]),
);
const GEAR_TYPE_FALLBACKS = {
  armor: withBasePath('/gear-fallback-armor.svg'),
  weapon: withBasePath('/gear-fallback-weapon.svg'),
} as const;

export function getGearTypeFallback(gearType: CatalogSetItem['gearType'] | undefined, slot: string): string | undefined {
  if (gearType === 'armor' || gearType === 'weapon') {
    return GEAR_TYPE_FALLBACKS[gearType];
  }
  if (slot.toLowerCase().includes('weapon')) return GEAR_TYPE_FALLBACKS.weapon;
  if (['head', 'shoulders', 'chest', 'gloves', 'waist', 'legs', 'boots'].includes(slot)) {
    return GEAR_TYPE_FALLBACKS.armor;
  }
  return undefined;
}

export function getGearIconCandidates(gear: GearPiece, slot: string): string[] {
  const itemMeta = gear.itemId !== null ? getCachedCatalogItem(gear.itemId) : null;
  if (!itemMeta) return [];
  return getGearIconCandidatesForItem(itemMeta, slot);
}

export function getGearIconCandidatesForItem(
  itemMeta: Pick<CatalogSetItem, 'gearType' | 'armorWeight' | 'weaponType' | 'name' | 'icon' | 'setName'>,
  slot: string,
): string[] {
  const prefix = SET_ICON_PREFIXES[itemMeta.setName]
    ?? NORMALIZED_SET_ICON_PREFIXES.get(normalizeSetName(itemMeta.setName));
  const source = SET_ICON_SOURCES[itemMeta.setName]
    ?? NORMALIZED_SET_ICON_SOURCES.get(normalizeSetName(itemMeta.setName));
  const candidates = buildGearIconCandidates(itemMeta, slot, prefix, source)
    .map(getStaticAssetPath)
    .filter((candidate): candidate is string => candidate !== null);
  return [...new Set(candidates)];
}

type GearIconProps = {
  gear: GearPiece | undefined;
  slot: string;
  fallbackSrc: string;
  alt: string;
  className: string;
};

export function GearIcon({ gear, slot, fallbackSrc, alt, className }: GearIconProps) {
  const [loadedItemId, setLoadedItemId] = useState<number | null>(null);
  const [candidateState, setCandidateState] = useState({ key: '', index: 0 });
  const itemId = gear?.itemId ?? null;

  useEffect(() => {
    if (itemId === null) return;
    let active = true;
    void ensureCatalogItemLoaded(itemId)
      .then((item) => {
        if (active && item) setLoadedItemId(itemId);
      })
      .catch(() => {
        if (active) setLoadedItemId(null);
      });
    return () => {
      active = false;
    };
  }, [itemId]);

  const candidates = gear && loadedItemId === itemId ? getGearIconCandidates(gear, slot) : [];
  const candidateKey = `${itemId ?? ''}:${slot}`;
  const candidateIndex = candidateState.key === candidateKey ? candidateState.index : 0;
  const typeFallback = itemId === null
    ? undefined
    : getGearTypeFallback(getCachedCatalogItem(itemId)?.gearType, slot);
  const source = candidates[candidateIndex] ?? typeFallback ?? fallbackSrc;

  return (
    <Image
      src={source}
      alt={alt}
      width={40}
      height={40}
      className={className}
      onError={() => {
        if (candidateIndex < candidates.length) {
          setCandidateState({ key: candidateKey, index: candidateIndex + 1 });
        }
      }}
    />
  );
}
