import { describe, expect, it } from 'vitest';
import { ensureCatalogItemsLoaded, fetchSetById, fetchSetCatalogIndex, getCachedCatalogItem, getItemLabel, getSetMaxPiecesRequired, getSlotItemOptions, findCatalogItemVariant, findCompatibleSlotItem, groupCatalogItems, sortSetsBySelectedPieceCount, type CatalogSetSummary } from '@/lib/esoSetCatalog';
import { createEmptySetSlots, updateSetSlot, type GearPiece } from '@/features/template/raidTemplate';

describe('local ESO set catalog', () => {
  it('prioritizes sets with more already-selected pieces without mutating catalog order', () => {
    const sets: CatalogSetSummary[] = [
      { id: 1, setName: 'First', itemCount: 0, availableSlots: [], effects: [] },
      { id: 2, setName: 'Second', itemCount: 0, availableSlots: [], effects: [] },
      { id: 3, setName: 'Third', itemCount: 0, availableSlots: [], effects: [] },
    ];

    const sortedSets = sortSetsBySelectedPieceCount(sets, new Map([[2, 1], [3, 2]]));

    expect(sortedSets.map((set) => set.id)).toEqual([3, 2, 1]);
    expect(sets.map((set) => set.id)).toEqual([1, 2, 3]);
  });

  it('keeps Mantle of Siroria items, traits, slot compatibility, and ordered text bonuses', async () => {
    const catalog = await fetchSetCatalogIndex();
    const siroria = catalog.sets.find((set) => set.setName === 'Mantle of Siroria');
    expect(siroria).toMatchObject({ id: 390 });
    expect(siroria?.availableSlots).toContain('head');
    expect(siroria!.itemCount).toBeGreaterThan(132);

    await ensureCatalogItemsLoaded([137149]);
    expect(getCachedCatalogItem(137149)).toMatchObject({ setId: siroria!.id, setName: siroria!.setName });

    const entry = await fetchSetById(siroria!.id);
    expect(entry?.effects.map((effect) => effect.numberOfPiecesRequired)).toEqual([2, 3, 4, 5, 5]);
    expect(entry?.effects.every((effect) => typeof effect.description === 'string' && !('id' in effect))).toBe(true);

    const headItems = await getSlotItemOptions('head', siroria!.id);
    expect(headItems).toHaveLength(9);
    expect(headItems.every((item) => item.gearType === 'armor' && item.equipType === 'Head')).toBe(true);
    expect(headItems.every((item) => item.setId === siroria!.id && item.setName === siroria!.setName)).toBe(true);
    const headChoices = groupCatalogItems(headItems);
    expect(headChoices).toHaveLength(1);
    expect(headChoices[0].variants).toHaveLength(9);
    expect(getItemLabel(headChoices[0].representative)).not.toContain(headItems[0].trait);
    expect(getItemLabel(headItems[0])).toContain('light armor');
    expect(getItemLabel(headItems[0])).not.toContain(String(headItems[0].id));
    expect(findCatalogItemVariant(headChoices[0], 'Infused')?.id).toBe(137149);

    const necklaceItems = await getSlotItemOptions('necklace', siroria!.id);
    const necklaceChoice = groupCatalogItems(necklaceItems)[0];
    expect(necklaceChoice.variants.map((item) => item.trait).sort()).toEqual([
      'Arcane', 'Bloodthirsty', 'Harmony', 'Healthy', 'Infused', 'Protective', 'Robust', 'Swift', 'Triune',
    ].sort());
    expect(findCatalogItemVariant(necklaceChoice, 'Bloodthirsty')?.id).toBe(137132);
    expect(getCachedCatalogItem(137132, 'Bloodthirsty')?.trait).toBe('Bloodthirsty');

    const weapons = await getSlotItemOptions('mainHandFrontBar', siroria!.id);
    expect(weapons.length).toBeGreaterThan(0);
    expect(weapons.every((item) => item.gearType === 'weapon')).toBe(true);

    const twoHanded = weapons.find((item) => item.equipType === 'Two Hand');
    expect(twoHanded).toBeTruthy();
    const twoHandedChoice = groupCatalogItems(weapons).find((choice) => choice.representative.equipType === 'Two Hand');
    expect(twoHandedChoice?.variants.map((item) => item.trait)).toEqual(expect.arrayContaining([
      'Charged', 'Decisive', 'Defending', 'Infused', 'Nirnhoned',
      'Powered', 'Precise', 'Sharpened', 'Training',
    ]));
    const gear: GearPiece = { itemId: twoHanded!.id, enchantment: '18' };
    const synchronized = updateSetSlot(
      createEmptySetSlots(),
      'mainHandFrontBar',
      gear,
      (itemId) => getCachedCatalogItem(itemId) ?? undefined,
    );
    expect(synchronized.mainHandFrontBar).toEqual(gear);
    expect(synchronized.offHandFrontBar).toEqual(gear);
    expect(synchronized.offHandFrontBar).not.toBe(gear);

    const oneHanded = weapons.find((item) => item.equipType === 'One Hand');
    expect(oneHanded).toBeTruthy();
    const unsynchronized = updateSetSlot(
      createEmptySetSlots(),
      'mainHandFrontBar',
      { ...gear, itemId: oneHanded!.id },
      (itemId) => getCachedCatalogItem(itemId) ?? undefined,
    );
    expect(unsynchronized.offHandFrontBar.itemId).toBeNull();
  });

  it('uses five pieces as the maximum threshold for Perfected Arms of Relequen', async () => {
    const catalog = await fetchSetCatalogIndex();
    const relequen = catalog.sets.find((set) => set.setName === 'Perfected Arms of Relequen');

    expect(relequen).toBeDefined();
    expect(relequen?.effects.map((effect) => effect.numberOfPiecesRequired)).toEqual([2, 3, 4, 5, 5]);
    expect(getSetMaxPiecesRequired(relequen!.effects)).toBe(5);
  });

  it('only marks slots that contain an item in the set index', async () => {
    const catalog = await fetchSetCatalogIndex();
    const monsterSet = catalog.sets.find((set) => set.setName === 'Mylenne Moon-Caller');

    expect(monsterSet?.availableSlots).toEqual(expect.arrayContaining(['head', 'shoulders']));
    expect(monsterSet?.availableSlots).not.toContain('chest');
    expect(monsterSet?.availableSlots).not.toContain('necklace');
  });

  it('finds the equivalent set item for armor, jewelry, and weapon slots', async () => {
    const catalog = await fetchSetCatalogIndex();
    const relequen = catalog.sets.find((set) => set.setName === 'Perfected Arms of Relequen');
    expect(relequen).toBeDefined();

    const armorTarget = await getSlotItemOptions('shoulders', relequen!.id);
    const armorSource = (await getSlotItemOptions('head', relequen!.id))
      .find((item) => armorTarget.some((target) => (
        target.armorWeight === item.armorWeight && target.trait === item.trait
      )));
    expect(armorSource).toBeDefined();
    expect(findCompatibleSlotItem(armorSource!, armorTarget)).toMatchObject({
      setId: armorSource!.setId,
      gearType: 'armor',
      armorWeight: armorSource!.armorWeight,
      trait: armorSource!.trait,
      equipType: 'Shoulders',
    });

    const jewelryTarget = await getSlotItemOptions('necklace', relequen!.id);
    const jewelrySource = (await getSlotItemOptions('ring1', relequen!.id))
      .find((item) => jewelryTarget.some((target) => target.trait === item.trait));
    expect(jewelrySource).toBeDefined();
    expect(findCompatibleSlotItem(jewelrySource!, jewelryTarget)).toMatchObject({
      gearType: 'jewelry',
      trait: jewelrySource!.trait,
      equipType: 'Neck',
    });

    const mainHandItems = await getSlotItemOptions('mainHandFrontBar', relequen!.id);
    const offHandItems = await getSlotItemOptions('offHandFrontBar', relequen!.id);
    const weaponSource = mainHandItems.find((item) => offHandItems.some((candidate) => candidate.trait === item.trait));
    expect(weaponSource).toBeDefined();
    expect(findCompatibleSlotItem(weaponSource!, offHandItems)).toMatchObject({
      gearType: 'weapon',
      weaponType: weaponSource!.weaponType,
      trait: weaponSource!.trait,
    });
  });
});