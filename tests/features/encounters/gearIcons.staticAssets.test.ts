import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { FOOD_ICON_MAP, CLASS_ICON_MAP, MUNDUS_ICON_MAP } from '@/data/iconMaps';
import staticAssetMap from '@/data/staticAssetMap.json';
import { ESO_SKILLS } from '@/lib/esoSkills';
import { getAbilityImagePath } from '@/lib/abilityCategories';
import { getStaticAssetPath, withBasePath } from '@/lib/staticAssets';
import { fetchSetById, fetchSetCatalogIndex, itemMatchesSlot, type CatalogSetItem } from '@/lib/esoSetCatalog';
import { getGearIconCandidatesForItem, getGearTypeFallback, SET_ICON_PREFIXES, SET_ICON_SOURCES } from '@/lib/gearIcons';
import { SET_SLOT_OPTIONS } from '@/features/template/raidTemplate';

const jewelryItem = (icon: string): CatalogSetItem => ({
  id: 1,
  name: 'Test jewelry',
  icon,
  gearType: 'jewelry',
  equipType: 'Ring',
  armorWeight: null,
  weaponType: '',
  trait: 'Robust',
  setId: 1,
  setName: 'Test set',
});

describe('local static game assets', () => {
  it('uses static fallback icons for unsupported equipment', () => {
    expect(getGearTypeFallback('armor', 'head')).toBe(withBasePath('/gear-fallback-armor.svg'));
    expect(getGearTypeFallback('weapon', 'mainHandFrontBar')).toBe(withBasePath('/gear-fallback-weapon.svg'));
    expect(getGearTypeFallback('jewelry', 'ring1')).toBeUndefined();
  });

  it('contains a local icon for every ESO skill', () => {
    for (const skill of ESO_SKILLS) {
      expect(getAbilityImagePath(skill.skillLine, skill.skillName), skill.skillName).not.toBe('');
    }
  });

  it('contains local images for food, classes, Mundus stones, and set styles', () => {
    for (const source of [
      ...Object.values(FOOD_ICON_MAP),
      ...Object.values(CLASS_ICON_MAP),
      ...Object.values(MUNDUS_ICON_MAP),
      ...Object.values(SET_ICON_SOURCES),
    ]) {
      expect(source.startsWith(withBasePath('/game-assets/'))).toBe(true);
    }
  });

  it('maps every static asset to an existing local file', () => {
    const localPaths = new Set(Object.values(staticAssetMap));
    expect(Object.keys(staticAssetMap).every((key) => !/^https?:\/\//i.test(key))).toBe(true);
    expect([...localPaths].every((asset) => (
      asset.startsWith('/game-assets/')
      && existsSync(path.join(process.cwd(), 'public', asset))
    ))).toBe(true);
  });

  it('uses local files for catalog jewelry icons', () => {
    expect(getGearIconCandidatesForItem(jewelryItem('/esoui/art/icons/gear_breton_ring_a.dds'), 'ring1'))
      .toEqual([withBasePath('/game-assets/storage/icons/gear_breton_ring_a.webp')]);
    expect(getGearIconCandidatesForItem(jewelryItem('/esoui/art/icons/gear_breton_neck_a.dds'), 'necklace'))
      .toEqual([withBasePath('/game-assets/storage/icons/gear_breton_neck_a.webp')]);
  });

  it('has a local icon for every unique set-item image', async () => {
    const catalog = await fetchSetCatalogIndex();
    const iconStems = new Set<string>();

    for (const set of catalog.sets) {
      const entry = await fetchSetById(set.id);
      expect(entry, `${set.setName} has a local catalog shard`).toBeTruthy();
      expect(SET_ICON_PREFIXES[set.setName], `${set.setName} has a style mapping`).toBeTruthy();

      for (const item of entry!.items) {
        const iconFile = item.icon.split('/').pop() ?? '';
        const stem = iconFile.replace(/\.(?:dds|webp|png)$/i, '');
        if (/^gear_[a-z0-9_-]+$/i.test(stem)) iconStems.add(stem);
      }
    }

    expect(iconStems.size).toBeGreaterThan(0);
    for (const stem of iconStems) {
      expect(
        getStaticAssetPath(`/storage/icons/${stem}.webp`),
        stem,
      ).toBeTruthy();
    }
  }, 30_000);

  it('resolves static paths for every armor, weapon, and jewelry catalog item', async () => {
    const catalog = await fetchSetCatalogIndex();
    const samples: CatalogSetItem[] = [];

    for (const set of catalog.sets) {
      const entry = await fetchSetById(set.id);
      if (!entry) continue;
      for (const item of entry.items) {
        const slot = SET_SLOT_OPTIONS.find((candidate) => itemMatchesSlot(candidate, item));
        if (slot) samples.push(item);
      }
    }

    expect(samples.length).toBeGreaterThan(0);
    for (const item of samples) {
      const slot = SET_SLOT_OPTIONS.find((candidate) => itemMatchesSlot(candidate, item));
      const candidates = getGearIconCandidatesForItem(item, slot!);
      expect(candidates.length, `${item.setName}: ${item.name}`).toBeGreaterThan(0);
      expect(candidates[0]).toContain('/game-assets/');
    }
  }, 30_000);
});
