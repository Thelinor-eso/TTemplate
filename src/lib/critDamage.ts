import { ESO_RACES } from '@/data/esoRaces';
import {
  ChampionPointName,
  ClassSkillLine,
  MAIN_BAR_SLOTS,
  BACK_BAR_SLOTS,
  MundusStone,
  type FightPlayerStuff,
  type GearPiece,
  type RaidPlayer,
  type SetSlot,
  type Skills,
} from '@/features/template/raidTemplate';
import {
  getCachedCatalogItem,
  getSetMaxPiecesRequired,
  type CatalogSetSummary,
} from '@/lib/esoSetCatalog';
import { getSkillAbilityById } from '@/lib/esoSkills';

export type PlayerSetSummary = {
  id: number;
  setName: string;
  pieceCount: number;
  requiredPieces: number | null;
};

/** Uses the encounter's existing set counting rules, including two slots for two-handed weapons. */
export function getSetSummary(
  sets: Record<string, GearPiece>,
  catalogSets: CatalogSetSummary[],
): PlayerSetSummary[] {
  const counts = new Map<number, {
    setName: string;
    nonWeaponPieceCount: number;
    frontBarWeaponCount: number;
    backBarWeaponCount: number;
  }>();

  Object.entries(sets).forEach(([slot, gear]) => {
    const item = getCachedCatalogItem(gear.itemId, gear.trait);
    if (!item?.setName) return;

    const current = counts.get(item.setId) ?? {
      setName: item.setName,
      nonWeaponPieceCount: 0,
      frontBarWeaponCount: 0,
      backBarWeaponCount: 0,
    };
    if (slot === 'mainHandFrontBar' || slot === 'offHandFrontBar') {
      current.frontBarWeaponCount += 1;
    } else if (slot === 'mainHandBackBar' || slot === 'offHandBackBar') {
      current.backBarWeaponCount += 1;
    } else {
      current.nonWeaponPieceCount += 1;
    }
    counts.set(item.setId, current);
  });

  return Array.from(counts, ([id, count]) => ({
    id,
    setName: count.setName,
    pieceCount: count.nonWeaponPieceCount + Math.max(count.frontBarWeaponCount, count.backBarWeaponCount),
    requiredPieces: getSetMaxPiecesRequired(catalogSets.find((set) => set.id === id)?.effects ?? []),
  }));
}

const ARMOR_SLOTS = ['head', 'chest', 'waist', 'boots', 'shoulders', 'gloves', 'legs'] as const;
const FRONT_WEAPON_SLOTS = ['mainHandFrontBar', 'offHandFrontBar'] as const satisfies readonly SetSlot[];
const BACK_WEAPON_SLOTS = ['mainHandBackBar', 'offHandBackBar'] as const satisfies readonly SetSlot[];
const MINOR_FORCE_SET_NAMES = [
  'Grave Inevitability', "Gryphon's Ferocity", 'Medusa', 'Oakensoul Ring',
  'Phoenix Moth Theurge', 'The Blind', 'Twilight Remedy', "Tzogvin's Warband",
  "Velothi Ur-Mage's Amulet",
];
const MINOR_FORCE_SKILLS = [
  'Barbed Trap', 'Lightweight Beast Trap', 'Trap Beast',
  'Accelerate', 'Channeled Acceleration', 'Race Against Time', 'Stalwart Guard',
];
const ROAR_SKILLS = ['Deafening Roar', 'Roar', 'Ferocious Roar'];

function normalizeSetName(name: string): string {
  return name.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]/g, '');
}

function hasSetAtMaxPieces(
  playerStuff: FightPlayerStuff,
  setNames: readonly string[],
  catalogSets: CatalogSetSummary[],
): boolean {
  const wantedNames = new Set(setNames.map(normalizeSetName));
  return getSetSummary(playerStuff.sets, catalogSets).some((summary) => {
    if (!wantedNames.has(normalizeSetName(summary.setName))) return false;
    return summary.requiredPieces !== null && summary.pieceCount >= summary.requiredPieces;
  });
}

function equippedSkillNames(skills: Skills): Set<string> {
  return new Set(Object.values(skills)
    .map((abilityId) => getSkillAbilityById(abilityId)?.skillName.toLowerCase())
    .filter((name): name is string => Boolean(name)));
}

function hasAnySkill(skills: Skills, skillNames: readonly string[]): boolean {
  const equipped = equippedSkillNames(skills);
  return skillNames.some((name) => equipped.has(name.toLowerCase()));
}

function hasAnyPlayerSetAtMaxPieces(
  encounterPlayerStuff: FightPlayerStuff[],
  setNames: readonly string[],
  catalogSets: CatalogSetSummary[],
): boolean {
  return encounterPlayerStuff.some((stuff) => hasSetAtMaxPieces(stuff, setNames, catalogSets));
}

function hasAnyPlayerSkill(encounterPlayerStuff: FightPlayerStuff[], skillNames: readonly string[]): boolean {
  return encounterPlayerStuff.some((stuff) => hasAnySkill(stuff.competencies, skillNames));
}

function hasAnyPlayerMastery(encounterPlayers: RaidPlayer[], masteryName: string): boolean {
  return encounterPlayers.some((player) => [
    player.classMasteries.firstClassMastery,
    player.classMasteries.secondClassMastery,
  ].includes(masteryName));
}

function hasSelectedChampionPoint(playerStuff: FightPlayerStuff, championPoint: ChampionPointName): boolean {
  return Object.values(playerStuff.championPoints).includes(championPoint);
}

function countMediumArmorPieces(playerStuff: FightPlayerStuff): number {
  return ARMOR_SLOTS.filter((slot) =>
    getCachedCatalogItem(playerStuff.sets[slot].itemId, playerStuff.sets[slot].trait)?.armorWeight === 'medium').length;
}

function countDivinesArmorPieces(playerStuff: FightPlayerStuff): number {
  return ARMOR_SLOTS.filter((slot) =>
    getCachedCatalogItem(playerStuff.sets[slot].itemId, playerStuff.sets[slot].trait)?.trait === 'Divines').length;
}

function countAxeSlotsOnBar(playerStuff: FightPlayerStuff, slots: readonly SetSlot[]): number {
  return slots.filter((slot) => {
    const gear = playerStuff.sets[slot];
    const weaponType = getCachedCatalogItem(gear.itemId, gear.trait)?.weaponType.toLowerCase() ?? '';
    return weaponType.includes('axe');
  }).length;
}

function countAnimalCompanionSkillsOnBar(playerStuff: FightPlayerStuff, slots: readonly (keyof Skills)[]): number {
  return slots.filter((slot) => getSkillAbilityById(playerStuff.competencies[slot])?.skillLine.toLowerCase()
    === ClassSkillLine.AnimalCompanions.toLowerCase()).length;
}

export type CritDamageContribution = { source: string; value: number };
export type CritDamageBreakdown = {
  total: number;
  calculatedTotal: number;
  cap: number;
  contributions: CritDamageContribution[];
};

export function getCritDamageBreakdown(
  player: RaidPlayer,
  playerStuff: FightPlayerStuff,
  encounterPlayers: RaidPlayer[],
  encounterPlayerStuff: FightPlayerStuff[],
  catalogSets: CatalogSetSummary[],
): CritDamageBreakdown {
  const selectedClassLines = Object.values(player.skillClasses);
  const hasEarthenHeartLine = selectedClassLines.includes(ClassSkillLine.EarthenHeart);
  const hasHeraldOfTheTomesLine = selectedClassLines.includes(ClassSkillLine.HeraldOfTheTomes);
  const hasAssassinationLine = selectedClassLines.includes(ClassSkillLine.Assassination);
  const hasAedricSpearSkill = Object.values(playerStuff.competencies).some((abilityId) =>
    getSkillAbilityById(abilityId)?.skillLine.toLowerCase() === ClassSkillLine.AedricSpear.toLowerCase());

  const hasMinorForceSkill = hasAnySkill(playerStuff.competencies, MINOR_FORCE_SKILLS);
  const hasRoarSkillInEncounter = hasAnyPlayerSkill(encounterPlayerStuff, ROAR_SKILLS);
  const hasMinorForceSetInEncounter = hasAnyPlayerSetAtMaxPieces(
    encounterPlayerStuff, MINOR_FORCE_SET_NAMES, catalogSets,
  );
  const hasMinorForce = hasMinorForceSkill || hasRoarSkillInEncounter || hasMinorForceSetInEncounter;

  const hasInkScribesVerveInEncounter = hasAnyPlayerMastery(encounterPlayers, "Ink-Scribe's Verve");
  const hasOwnGraveInevitability = hasSetAtMaxPieces(playerStuff, ['Grave Inevitability'], catalogSets);
  const hasOwnMonomythReforged = hasSetAtMaxPieces(playerStuff, ['Monomyth Reforged'], catalogSets);
  const hasSaxhleelInEncounter = hasAnyPlayerSetAtMaxPieces(
    encounterPlayerStuff, ['Saxhleel Champion', 'Perfected Saxhleel Champion'], catalogSets,
  );
  const hasOwnTheRuckus = hasSetAtMaxPieces(playerStuff, ['The Ruckus'], catalogSets);
  const hasMajorForce = hasInkScribesVerveInEncounter
    || hasOwnGraveInevitability || hasOwnMonomythReforged || hasSaxhleelInEncounter || hasOwnTheRuckus;

  const hasNunatakInEncounter = hasAnyPlayerSetAtMaxPieces(encounterPlayerStuff, ['Nunatak'], catalogSets);
  const hasTundrasMawInEncounter = hasAnyPlayerMastery(encounterPlayers, "Tundra's Maw");
  const hasMajorBrittle = hasNunatakInEncounter || hasTundrasMawInEncounter;
  const hasMinorBrittle = true;

  const hasKhajiitRace = ESO_RACES.find((race) => race.id === player.race)?.name === 'Khajiit';
  const mediumArmorPieceCount = countMediumArmorPieces(playerStuff);
  const divineArmorPieceCount = countDivinesArmorPieces(playerStuff);
  const hasShadowMundus = player.mundus === MundusStone.Shadow;
  const shadowMundusBonus = hasShadowMundus ? 10 + divineArmorPieceCount : 0;

  const maxAxeSlotsOnOneBar = Math.max(
    countAxeSlotsOnBar(playerStuff, FRONT_WEAPON_SLOTS),
    countAxeSlotsOnBar(playerStuff, BACK_WEAPON_SLOTS),
  );
  const axeBonus = maxAxeSlotsOnOneBar * 6;
  const maxAnimalCompanionSkillsOnOneBar = Math.max(
    countAnimalCompanionSkillsOnBar(playerStuff, MAIN_BAR_SLOTS),
    countAnimalCompanionSkillsOnBar(playerStuff, BACK_BAR_SLOTS),
  );
  const animalCompanionBonus = maxAnimalCompanionSkillsOnOneBar * 5;

  const hasLucentEchoesInEncounter = hasAnyPlayerSetAtMaxPieces(
    encounterPlayerStuff, ['Lucent Echoes', 'Perfected Lucent Echoes'], catalogSets,
  );
  const hasElementalCatalystInEncounter = hasAnyPlayerSetAtMaxPieces(
    encounterPlayerStuff, ['Elemental Catalyst'], catalogSets,
  );
  const hasOwnHarpoonersWadingKilt = hasSetAtMaxPieces(playerStuff, ["Harpooner's Wading Kilt"], catalogSets);
  const hasOwnMorasWhispers = hasSetAtMaxPieces(playerStuff, ["Mora's Whispers"], catalogSets);
  const hasOwnSulXansTorment = hasSetAtMaxPieces(
    playerStuff, ["Sul-Xan's Torment", "Perfected Sul-Xan's Torment"], catalogSets,
  );
  const hasOwnOrdersWrath = hasSetAtMaxPieces(playerStuff, ["Order's Wrath"], catalogSets);
  const hasAboveAndBeyond = [player.classMasteries.firstClassMastery, player.classMasteries.secondClassMastery]
    .includes('Above and Beyond');

  const contributions: CritDamageContribution[] = [
    { source: 'Base', value: 50 },
    ...(hasMinorForce ? [{ source: 'Minor Force', value: 10 }] : []),
    ...(hasMajorForce ? [{ source: 'Major Force', value: 20 }] : []),
    ...(hasEarthenHeartLine ? [{ source: 'Earthen Heart skill line', value: 10 }] : []),
    ...(hasHeraldOfTheTomesLine ? [{ source: 'Herald of the Tomes skill line', value: 12 }] : []),
    ...(hasAssassinationLine ? [{ source: 'Assassination skill line', value: 10 }] : []),
    ...(hasAedricSpearSkill ? [{ source: 'Aedric Spear skill', value: 12 }] : []),
    ...(hasSelectedChampionPoint(playerStuff, ChampionPointName.FightingFinesse) ? [{ source: 'Fighting Finesse', value: 8 }] : []),
    ...(hasSelectedChampionPoint(playerStuff, ChampionPointName.Backstabber) ? [{ source: 'Backstabber', value: 10 }] : []),
    ...(hasMinorBrittle ? [{ source: 'Minor Brittle', value: 10 }] : []),
    ...(hasMajorBrittle ? [{ source: 'Major Brittle', value: 20 }] : []),
    ...(hasKhajiitRace ? [{ source: 'Khajiit', value: 12 }] : []),
    ...(mediumArmorPieceCount ? [{ source: `Medium armor (${mediumArmorPieceCount} pieces)`, value: mediumArmorPieceCount * 2 }] : []),
    ...(hasLucentEchoesInEncounter ? [{ source: 'Lucent Echoes', value: 11 }] : []),
    ...(hasElementalCatalystInEncounter ? [{ source: 'Elemental Catalyst', value: 15 }] : []),
    ...(shadowMundusBonus ? [{ source: `The Shadow (${divineArmorPieceCount} Divines pieces)`, value: shadowMundusBonus }] : []),
    ...(axeBonus ? [{ source: `Axe weapon${maxAxeSlotsOnOneBar > 1 ? 's' : ''} (${maxAxeSlotsOnOneBar} on one bar)`, value: axeBonus }] : []),
    ...(hasOwnHarpoonersWadingKilt ? [{ source: "Harpooner's Wading Kilt", value: 10 }] : []),
    ...(hasOwnMorasWhispers ? [{ source: "Mora's Whispers", value: 12 }] : []),
    ...(hasOwnSulXansTorment ? [{ source: "Sul-Xan's Torment", value: 12 }] : []),
    ...(hasOwnOrdersWrath ? [{ source: "Order's Wrath", value: 8 }] : []),
    ...(animalCompanionBonus ? [{ source: `Animal Companion skills (${maxAnimalCompanionSkillsOnOneBar} on one bar)`, value: animalCompanionBonus }] : []),
    ...(hasAboveAndBeyond ? [{ source: 'Above and Beyond', value: 25 }] : []),
  ];

  const calculatedCritDamage = contributions.reduce((total, contribution) => total + contribution.value, 0);

  const critDamageCap = hasAboveAndBeyond ? 155 : 125;
  return {
    total: Math.min(critDamageCap, calculatedCritDamage),
    calculatedTotal: calculatedCritDamage,
    cap: critDamageCap,
    contributions,
  };
}

export function calculateCritDamage(
  player: RaidPlayer,
  playerStuff: FightPlayerStuff,
  encounterPlayers: RaidPlayer[],
  encounterPlayerStuff: FightPlayerStuff[],
  catalogSets: CatalogSetSummary[],
): number {
  return getCritDamageBreakdown(player, playerStuff, encounterPlayers, encounterPlayerStuff, catalogSets).total;
}
