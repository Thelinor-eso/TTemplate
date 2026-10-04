import type { CatalogSetItem } from './esoSetCatalog';

const ARMOR_SLOTS = new Set(['head', 'shoulders', 'chest', 'gloves', 'waist', 'legs', 'boots']);

export function normalizeSetName(setName: string): string {
  return setName.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

type IconItem = Pick<CatalogSetItem, 'gearType' | 'armorWeight' | 'weaponType' | 'name' | 'icon'>;

function orderSuffixes(sourceSuffix: string | undefined, baseSuffixes: string[], preferSource = false): string[] {
  const ordered = [...new Set(baseSuffixes.filter(Boolean))];
  if (!sourceSuffix) return ordered;
  if (preferSource && ordered.includes(sourceSuffix)) {
    return [sourceSuffix, ...ordered.filter((suffix) => suffix !== sourceSuffix)];
  }
  if (ordered.includes(sourceSuffix)) return ordered;
  return [...ordered, sourceSuffix];
}

export function buildGearIconCandidates(
  itemMeta: IconItem,
  slot: string,
  exactPrefix: string | undefined,
  styleSource?: string,
): string[] {
  if (itemMeta.gearType === 'jewelry') {
    const iconFile = itemMeta.icon.split('/').pop() ?? '';
    const iconStem = iconFile.replace(/\.(dds|webp|png)$/i, '');
    if (!/^[a-z0-9_-]+$/i.test(iconStem)) return [];
    const sourceExtension = /\.(webp|png)$/i.exec(iconFile)?.[1]?.toLowerCase();
    const extensions = sourceExtension
      ? [sourceExtension, sourceExtension === 'webp' ? 'png' : 'webp']
      : ['webp', 'png'];
    return extensions.map((extension) => `/storage/icons/${iconStem}.${extension}`);
  }

  const candidates: string[] = [];
  const catalogIconFile = itemMeta.icon.split('/').pop() ?? '';
  const catalogIconStem = catalogIconFile.replace(/\.(dds|webp|png)$/i, '');
  if (/^gear_[a-z0-9_-]+$/i.test(catalogIconStem)) {
    candidates.push(`/storage/icons/${catalogIconStem}.webp`);
    candidates.push(`/storage/icons/${catalogIconStem}.png`);
  }

  if (!exactPrefix) return candidates;

  const sourceFile = styleSource?.split('/').pop() ?? '';
  const sourceExtension = /\.(webp|png)$/i.exec(sourceFile)?.[1]?.toLowerCase();
  const sourceStem = sourceFile.replace(/\.(webp|png)$/i, '');
  const sourceRemainder = sourceStem.startsWith(`gear_${exactPrefix}_`)
    ? sourceStem.slice(`gear_${exactPrefix}_`.length)
    : '';
  const sourceParts = sourceRemainder.split('_');
  const armorWeightTokens = ['light', 'medium', 'heavy', 'lgt', 'med', 'mediuam', 'hvy'];
  const sourceArmorWeightIndex = sourceParts.findIndex((part) => armorWeightTokens.includes(part));
  const sourceHasArmorWeight = sourceArmorWeightIndex !== -1;
  const sourceArmorSlot = sourceHasArmorWeight ? sourceParts[sourceArmorWeightIndex + 1] : sourceParts[0];
  const sourceArmorStyle = sourceArmorWeightIndex > 0
    ? sourceParts.slice(0, sourceArmorWeightIndex).join('_')
    : '';
  const sourceSuffix = sourceParts.at(-1);
  const genericPrefix = exactPrefix.replace(/(?:lgt|med|hvy)$/i, '');
  const extensions = sourceExtension ? [sourceExtension, sourceExtension === 'webp' ? 'png' : 'webp'] : ['webp', 'png'];
  const weaponStyleTokens = new Set([
    'sword', 'axe', 'mace', 'dagger', 'hammer', '1hsword', '1haxe', '1hmace', '1hdagger', '1hhammer',
    '2hsword', '2haxe', '2hmaul', '2hbattleaxe', '2hgreatsword', 'bow', 'firestaff', 'froststaff',
    'lightningstaff', 'shield', 'restorationstaff', 'staff',
  ]);
  const armorSlotNames: Record<string, string[]> = {
    head: ['head', 'helmet'],
    chest: /\bshirt\b/i.test(itemMeta.name)
      ? ['shirt', 'robe', 'chest', 'jerkin']
      : /\b(robes?|tunic|coat|jerkin)\b/i.test(itemMeta.name) || itemMeta.armorWeight === 'light'
        ? ['robe', 'shirt', 'chest', 'jerkin']
        : ['chest', 'robe', 'shirt', 'jerkin'],
    shoulders: ['shoulders', 'shoulder'],
    gloves: ['hands'],
    waist: ['waist'],
    legs: ['legs'],
    boots: ['feet'],
  };

  if (itemMeta.gearType === 'armor' && ARMOR_SLOTS.has(slot)) {
    const slots = armorSlotNames[slot] ?? [];
    if (sourceArmorSlot && slots.includes(sourceArmorSlot)) {
      slots.splice(slots.indexOf(sourceArmorSlot), 1);
      slots.unshift(sourceArmorSlot);
    }
    const weights = itemMeta.armorWeight
      ? [...new Set([sourceHasArmorWeight ? sourceParts[sourceArmorWeightIndex] : '', itemMeta.armorWeight, ''])]
      : [''];
    const suffixes = orderSuffixes(sourceSuffix, ['a', 'b', 'c', 'd', 'e'], slots.includes(sourceArmorSlot));
    for (const weight of weights) {
      for (const armorSlot of slots) {
        for (const suffix of suffixes) {
          for (const stylePart of [...new Set([sourceArmorStyle, ''])]) {
            for (const extension of extensions) {
              const stylePartPrefix = stylePart ? `_${stylePart}` : '';
              const weightPart = weight ? `_${weight}` : '';
              candidates.push(`/storage/icons/gear_${exactPrefix}${stylePartPrefix}${weightPart}_${armorSlot}_${suffix}.${extension}`);
            }
          }
        }
      }
    }
  } else if (itemMeta.gearType === 'weapon') {
    const weaponTypes: Record<string, string[]> = {
      'One Handed': ['1hsword', '1haxe', '1hmace', '1hdagger', '1hhammer', 'sword', 'axe', 'mace', 'dagger', 'hammer'],
      Axe: ['1haxe', 'axe'],
      Hammer: ['1hhammer', '1hmace', 'hammer', 'mace'],
      Sword: ['1hsword', 'sword'],
      Dagger: ['dagger', '1hdagger'],
      'Two Handed': ['2hsword', '2haxe', '2hmaul', '2hbattleaxe', '2hgreatsword'],
      'Two Handed Sword': ['2hsword', '2hgreatsword'],
      'Two Handed Axe': ['2haxe', '2hbattleaxe'],
      'Two Handed Hammer': ['2haxe', '2hmaul'],
      Bow: ['bow'],
      'Fire Staff': ['staff', 'firestaff'],
      'Frost Staff': ['staff', 'froststaff'],
      'Lightning Staff': ['staff', 'lightningstaff'],
      Shield: ['shield'],
      'Destruction Staff': ['staff', 'firestaff', 'lightningstaff', 'froststaff'],
      'Restoration Staff': ['staff', 'restorationstaff'],
    };
    const weaponSourceSuffix = sourceParts.some((part) => weaponStyleTokens.has(part)) ? sourceSuffix : undefined;
    const suffixes = orderSuffixes(weaponSourceSuffix, ['a', 'b', 'c', '001', 'd', 'e']);
    for (const prefix of [...new Set([exactPrefix, genericPrefix])]) {
      for (const resolvedWeaponType of weaponTypes[itemMeta.weaponType] ?? []) {
        for (const suffix of suffixes) {
          for (const extension of ['webp', 'png']) {
            candidates.push(`/storage/icons/gear_${prefix}_${resolvedWeaponType}_${suffix}.${extension}`);
          }
        }
      }
    }
  }

  return candidates;
}