import { describe, expect, it } from 'vitest';
import {
  GearType,
  copyPlayerSetup,
  copyFightPlayerSetup,
  createEmptyGearPiece,
  createEmptyWeaponGearPiece,
  createEmptyTemplateDocument,
  exportTemplateDocument,
  parseTemplateDocument,
  pastePlayerSetup,
  pasteFightPlayerSetup,
  updateSetSlot,
  type FightPlayerStuff,
  type SetItem,
  type GearPiece,
  type WeaponGearPiece,
  type RaidPlayer,
  type SetSlots,
} from '@/features/template/raidTemplate';

const twoHandedItem: SetItem = {
  id: 1001,
  setId: 1,
  setName: 'Test set',
  name: 'Test Bow',
  icon: '',
  gearType: GearType.weapon,
  equipType: 'Two Hand',
  armorWeight: null,
  weaponType: 'Bow',
  trait: 'Infused',
};
const oneHandedItem: SetItem = { ...twoHandedItem, id: 1002, name: 'Test Sword', equipType: 'One Hand', weaponType: 'Sword' };
const itemById = (itemId: number) => new Map([
  [twoHandedItem.id, twoHandedItem],
  [oneHandedItem.id, oneHandedItem],
]).get(itemId);

const weapon = (itemId: number): WeaponGearPiece => ({ itemId, enchantment: '18', poison: '' });

const emptySlots = (): SetSlots => ({
  head: createEmptyGearPiece(), chest: createEmptyGearPiece(), waist: createEmptyGearPiece(),
  boots: createEmptyGearPiece(), shoulders: createEmptyGearPiece(), gloves: createEmptyGearPiece(), legs: createEmptyGearPiece(),
  ring1: createEmptyGearPiece(), ring2: createEmptyGearPiece(), necklace: createEmptyGearPiece(),
  mainHandFrontBar: createEmptyWeaponGearPiece(), offHandFrontBar: createEmptyWeaponGearPiece(),
  mainHandBackBar: createEmptyWeaponGearPiece(), offHandBackBar: createEmptyWeaponGearPiece(),
});

describe('updateSetSlot', () => {
  it('uses both weapon slots for a two-handed item resolved from its itemId', () => {
      const gear = weapon(twoHandedItem.id);
      const slots = updateSetSlot(emptySlots(), 'mainHandFrontBar', gear, itemById);

      expect(slots.mainHandFrontBar).toEqual(gear);
      expect(slots.offHandFrontBar).toEqual(gear);
      expect(slots.offHandFrontBar).not.toBe(gear);
  });

  it('keeps both slots synchronized when editing an existing two-handed weapon', () => {
    const initial = updateSetSlot(emptySlots(), 'mainHandBackBar', weapon(twoHandedItem.id), itemById);
    const updated = weapon(oneHandedItem.id);
    const slots = updateSetSlot(initial, 'offHandBackBar', updated, itemById);

    expect(slots.mainHandBackBar).toEqual(updated);
    expect(slots.offHandBackBar).toEqual(updated);
  });

  it('does not link one-handed weapon slots', () => {
    const slots = updateSetSlot(emptySlots(), 'mainHandFrontBar', weapon(oneHandedItem.id), itemById);

    expect(slots.offHandFrontBar.itemId).toBeNull();
  });
});

describe('fight player setup copy and paste', () => {
  const player = (id: number, name: string): FightPlayerStuff => ({
    id,
    name,
    role: 'DPS' as const,
    sets: emptySlots(),
    competencies: {
      MainBar1: '', MainBar2: '', MainBar3: '', MainBar4: '', MainBar5: '', MainBarUlt: '',
      BackBar1: '', BackBar2: '', BackBar3: '', BackBar4: '', BackBar5: '', BackBarUlt: '',
    },
    championPoints: {
      Blue1: '', Blue2: '', Blue3: '', Blue4: '', Red1: '', Red2: '', Red3: '', Red4: '',
      Green1: '', Green2: '', Green3: '', Green4: '',
    },
    food: '',
    potion: '',
    description: '',
  });

  it('copies all setup values without sharing nested JSON objects', () => {
    const source = player(1, 'Source');
    source.sets.head.itemId = 390;
    source.competencies.MainBar1 = 48991;
    source.championPoints.Blue1 = 'Biting Aura';
    source.food = 'Test food';
    source.potion = 'Test potion';

    const copied = copyFightPlayerSetup(source);
    source.sets.head.itemId = 394;

    expect(copied).toMatchObject({
      sets: { head: { itemId: 390 } },
      competencies: { MainBar1: 48991 },
      championPoints: { Blue1: 'Biting Aura' },
      food: 'Test food',
      potion: 'Test potion',
    });
  });

  it('pastes the copied setup while keeping the target player identity', () => {
    const source = player(1, 'Source');
    source.sets.head.itemId = 390;
    source.food = 'Test food';
    const target = { ...player(2, 'Target'), role: 'Tank' as const };

    const pasted = pasteFightPlayerSetup(target, copyFightPlayerSetup(source));

    expect(pasted).toMatchObject({
      id: 2,
      name: 'Target',
      role: 'Tank',
      sets: { head: { itemId: 390 } },
      food: 'Test food',
    });
    expect(pasted.sets).not.toBe(source.sets);
  });
});

describe('player setup copy and paste', () => {
  const player = (id: number, name: string): RaidPlayer => ({
    id,
    name,
    race: null,
    role: 'DPS',
    skillClasses: { MainSkillClass: '', SecondSkillClass: '', ThirdSkillClass: '' },
    classMasteries: { firstClassMastery: '', secondClassMastery: '' },
    mundus: '',
  });

  it('copies all player setup values without sharing nested JSON objects', () => {
    const source = player(1, 'Source');
    source.role = 'Tank';
    source.race = 5;
    source.skillClasses.MainSkillClass = 'Aedric Spear';
    source.classMasteries.firstClassMastery = 'Bastion of Light';
    source.mundus = 'The Atronach';

    const copied = copyPlayerSetup(source);
    source.skillClasses.MainSkillClass = 'Dark Magic';
    source.classMasteries.firstClassMastery = 'Changed';

    expect(copied).toEqual({
      role: 'Tank',
      race: 5,
      skillClasses: { MainSkillClass: 'Aedric Spear', SecondSkillClass: '', ThirdSkillClass: '' },
      classMasteries: { firstClassMastery: 'Bastion of Light', secondClassMastery: '' },
      mundus: 'The Atronach',
    });
  });

  it('pastes setup values while keeping the target player identity', () => {
    const source = player(1, 'Source');
    source.role = 'Tank';
    source.race = 5;
    source.skillClasses.MainSkillClass = 'Aedric Spear';
    source.classMasteries.firstClassMastery = 'Bastion of Light';
    source.mundus = 'The Atronach';
    const target = player(2, 'Target');

    const pasted = pastePlayerSetup(target, copyPlayerSetup(source));

    expect(pasted).toEqual({
      id: 2,
      name: 'Target',
      role: 'Tank',
      race: 5,
      skillClasses: { MainSkillClass: 'Aedric Spear', SecondSkillClass: '', ThirdSkillClass: '' },
      classMasteries: { firstClassMastery: 'Bastion of Light', secondClassMastery: '' },
      mundus: 'The Atronach',
    });
    expect(pasted.skillClasses).not.toBe(source.skillClasses);
    expect(pasted.classMasteries).not.toBe(source.classMasteries);
  });
});

describe('template gear and skill schema', () => {
  it('creates a neutral empty template with four players and one encounter', () => {
    const template = createEmptyTemplateDocument();

    expect(template.raid.selectedRaid).toBe('Neutral');
    expect(template.raid.players).toHaveLength(4);
    expect(template.fights).toHaveLength(1);
    expect(template.fights[0].name).toBe('Encounter 1');
    expect(template.fights[0].playersStuff).toHaveLength(4);
  });

  it('round-trips every player and encounter in the saved template', () => {
    const template = createEmptyTemplateDocument();
    const fifthPlayer = { ...template.raid.players[0], id: 5, name: 'Player 5' };
    const fifthPlayerSetup = {
      ...structuredClone(template.fights[0].playersStuff[0]),
      id: fifthPlayer.id,
      name: fifthPlayer.name,
      food: 'Longfin Pasty',
    };
    template.raid.players.push(fifthPlayer);
    template.fights[0].playersStuff.push(fifthPlayerSetup);
    template.fights.push({
      name: 'Tideborn Taleria',
      playersStuff: structuredClone(template.fights[0].playersStuff),
    });
    template.fights[1].playersStuff[4].potion = 'Heroism Potion';

    const restored = parseTemplateDocument(exportTemplateDocument(template));

    expect(restored.raid.players).toHaveLength(5);
    expect(restored.fights.map((fight) => fight.name)).toEqual(['Encounter 1', 'Tideborn Taleria']);
    expect(restored.fights[0].playersStuff[4].food).toBe('Longfin Pasty');
    expect(restored.fights[1].playersStuff[4].potion).toBe('Heroism Potion');
  });

  it('creates empty slots with itemId null and the existing enchantment field', () => {
    const template = createEmptyTemplateDocument();

    expect(template).not.toHaveProperty('version');
    expect(template.fights[0].playersStuff[0].sets.head).toEqual({ itemId: null, enchantment: '' });
  });

  it('exports only the template document fields', () => {
    const exported = JSON.parse(exportTemplateDocument(createEmptyTemplateDocument())) as Record<string, unknown>;

    expect(Object.keys(exported)).toEqual(['raid', 'fights']);
    expect(exported).not.toHaveProperty('version');
  });

  it('round-trips ESO abilityIds in skill slots', () => {
    const template = createEmptyTemplateDocument();
    template.fights[0].playersStuff[0].competencies.MainBar1 = 48991;

    const parsed = parseTemplateDocument(JSON.stringify(template));

    expect(parsed.fights[0].playersStuff[0].competencies.MainBar1).toBe(48991);
  });

  it('round-trips a complete Scribing combination as a single slot ID', () => {
    const template = createEmptyTemplateDocument();
    template.fights[0].playersStuff[0].competencies.MainBar1 = 'scribing:217872:1:24:44';

    const parsed = parseTemplateDocument(JSON.stringify(template));

    expect(parsed.fights[0].playersStuff[0].competencies.MainBar1).toBe('scribing:217872:1:24:44');
  });

  it('rejects skill names and unknown abilityIds without legacy conversion', () => {
    const oldSkillName = createEmptyTemplateDocument();
    (oldSkillName.fights[0].playersStuff[0].competencies as unknown as Record<string, unknown>).MainBar1 = 'Force Pulse';
    expect(() => parseTemplateDocument(oldSkillName)).toThrow(/Invalid skill slot "MainBar1"/);

    const unknownAbilityId = createEmptyTemplateDocument();
    (unknownAbilityId.fights[0].playersStuff[0].competencies as unknown as Record<string, unknown>).MainBar1 = 1;
    expect(() => parseTemplateDocument(unknownAbilityId)).toThrow(/Invalid skill slot "MainBar1"/);

    const incompleteScribingId = createEmptyTemplateDocument();
    (incompleteScribingId.fights[0].playersStuff[0].competencies as unknown as Record<string, unknown>).MainBar1 = 'scribing:217872:1:24:';
    expect(() => parseTemplateDocument(incompleteScribingId)).toThrow(/Invalid skill slot "MainBar1"/);

    const missingScripts = createEmptyTemplateDocument();
    (missingScripts.fights[0].playersStuff[0].competencies as unknown as Record<string, unknown>).MainBar1 = 217872;
    expect(() => parseTemplateDocument(missingScripts)).toThrow(/Invalid skill slot "MainBar1"/);
  });

  it('round-trips itemId, trait, and enchantment', () => {
    const template = createEmptyTemplateDocument();
    template.fights[0].playersStuff[0].sets.mainHandFrontBar = { itemId: 1001, trait: 'Bloodthirsty', enchantment: '18', poison: '' };

    const parsed = parseTemplateDocument(JSON.stringify(template));

    expect(parsed.fights[0].playersStuff[0].sets.mainHandFrontBar).toEqual({ itemId: 1001, trait: 'Bloodthirsty', enchantment: '18', poison: '' });
  });

  it('accepts existing gear records that do not store a trait', () => {
    const template = createEmptyTemplateDocument();
    (template.fights[0].playersStuff[0].sets as unknown as Record<string, unknown>).mainHandFrontBar = { itemId: 1001, enchantment: '18' };

    const parsed = parseTemplateDocument(JSON.stringify(template));

    expect(parsed.fights[0].playersStuff[0].sets.mainHandFrontBar).toEqual({ itemId: 1001, enchantment: '18', poison: '' });
  });

  it('rejects legacy string gear values', () => {
    const invalidTemplate = createEmptyTemplateDocument();
    (invalidTemplate.fights[0].playersStuff[0].sets as unknown as Record<string, unknown>).head = 'Legacy set name';
    expect(() => parseTemplateDocument(invalidTemplate)).toThrow(/Invalid gear slot "head"/);
  });
});
