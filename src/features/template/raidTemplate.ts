import { isSkillAbilityId } from '@/lib/esoSkills';

export const RoleType = {
  Tank: 'Tank',
  Heal: 'Heal',
  DPS: 'DPS',
} as const;
export type RoleType = typeof RoleType[keyof typeof RoleType];
export const ROLE_OPTIONS: readonly RoleType[] = Object.values(RoleType);

export const CommonSkillLine = {
  Empty: '',
  FightersGuild: "Fighter's Guild",
  MagesGuild: "Mage's Guild",
  Undaunted: 'Undaunted',
  PsijicOrder: 'Psijic Order',
  Vampire: 'Vampire',
  Werewolf: 'Werewolf',
  OneHanded: 'One Handed',
  TwoHanded: 'Two Handed',
  DualWield: 'Dual Wield',
  Bow: 'Bow',
  DestructionStaff: 'Destruction Staff',
  RestorationStaff: 'Restoration Staff',
  SoulMagic: 'Soul Magic',
  Armor: 'Armor',
  Assault: 'Assault',
  Support: 'Support',
}
export type CommonSkillLine = typeof CommonSkillLine[keyof typeof CommonSkillLine];

export const ClassName = {
  Templar: 'Templar',
  Sorcerer: 'Sorcerer',
  Nightblade: 'Nightblade',
  Dragonknight: 'Dragonknight',
  Warden: 'Warden',
  Necromancer: 'Necromancer',
  Arcanist: 'Arcanist',
} as const;
export type ClassName = typeof ClassName[keyof typeof ClassName];

export const ClassSkillLine = {
  Empty: '',
  EarthenHeart: 'Earthen Heart',
  DraconicPower: 'Draconic Power',
  ArdentFlame: 'Ardent Flame',
  AedricSpear: 'Aedric Spear',
  DawnsWrath: "Dawn's Wrath",
  RestoringLight: 'Restoring Light',
  DaedricSummoning: 'Daedric Summoning',
  DarkMagic: 'Dark Magic',
  StormCalling: 'Storm Calling',
  Assassination: 'Assassination',
  ShadowyEmbrace: 'Shadowy Embrace',
  Siphoning: 'Siphoning',
  GreenBalance: 'Green Balance',
  WintersEmbrace: "Winter's Embrace",
  AnimalCompanions: 'Animal Companions',
  GraveLord: 'Grave Lord',
  LivingDeath: 'Living Death',
  BoneTyrant: 'Bone Tyrant',
  CurativeRuneforms: 'Curative Runeforms',
  HeraldOfTheTomes: 'Herald of the Tomes',
  SoldierOfApocrypha: 'Soldier of Apocrypha',
} as const;
export type ClassSkillLine = typeof ClassSkillLine[keyof typeof ClassSkillLine];

export type SkillAbility = {
  abilityId: number;
  skillLine: string;
  skillName: string;
  /** True when this ability may be assigned to an ultimate (sixth) bar slot. */
  isUltimate: boolean;
  isCrafted: boolean;
  /** ESO abilityId of the base ability, or null for a root ability. */
  parentAbilityId: number | null;
};



export type Food = {
  id: number;
  name: string;
  imageUrl: string;
}

export type Potion = {
  id: number;
  name: string;
}

export type Race = {
  id: number;
  name: string;
}

export type Enchant = {
  id: number,
  name: string;
  gearType: GearType,
}

export const ChampionPointName = {
  AnglersInstincts: "Angler's Instincts",
  FadeAway: 'Fade Away',
  FriendsInLowPlaces: 'Friends in Low Places',
  GiftedRider: 'Gifted Rider',
  MasterGatherer: 'Master Gatherer',
  ReelTechnique: 'Reel Technique',
  Shadowstrike: 'Shadowstrike',
  SteedsBlessing: "Steed's Blessing",
  SustainingShadows: 'Sustaining Shadows',
  WarMount: 'War Mount',
  ArcaneSupremacy: 'Arcane Supremacy',
  Backstabber: 'Backstabber',
  BitingAura: 'Biting Aura',
  Bulwark: 'Bulwark',
  CleansingRevival: 'Cleansing Revival',
  CuttingDefense: 'Cutting Defense',
  DeadlyAim: 'Deadly Aim',
  DuelistsRebuff: "Duelist's Rebuff",
  EndlessEndurance: 'Endless Endurance',
  EnduringResolve: 'Enduring Resolve',
  EnliveningOverflow: 'Enlivening Overflow',
  Exploiter: 'Exploiter',
  FightingFinesse: 'Fighting Finesse',
  FocusedMending: 'Focused Mending',
  ForceOfNature: 'Force of Nature',
  Foresight: 'Foresight',
  FromTheBrink: 'From the Brink',
  HopeInfusion: 'Hope Infusion',
  Ironclad: 'Ironclad',
  LastStand: 'Last Stand',
  MasterAtArms: 'Master-at-Arms',
  OccultOverload: 'Occult Overload',
  ReavingBlows: 'Reaving Blows',
  Reinforced: 'Reinforced',
  Rejuvenator: 'Rejuvenator',
  Resilience: 'Resilience',
  Riposte: 'Riposte',
  SalveOfRenewal: 'Salve of Renewal',
  SoothingTide: 'Soothing Tide',
  SwiftRenewal: 'Swift Renewal',
  Thaumaturge: 'Thaumaturge',
  Unassailable: 'Unassailable',
  UntamedAggression: 'Untamed Aggression',
  WeaponsExpert: 'Weapons Expert',
  WrathfulStrikes: 'Wrathful Strikes',
  ArcaneAlacrity: 'Arcane Alacrity',
  Bastion: 'Bastion',
  BloodyRenewal: 'Bloody Renewal',
  BoundlessVitality: 'Boundless Vitality',
  BracingAnchor: 'Bracing Anchor',
  Celerity: 'Celerity',
  ExpertEvasion: 'Expert Evasion',
  Fortified: 'Fortified',
  Hardened: 'Hardened',
  Juggernaut: 'Juggernaut',
  OnGuard: 'On Guard',
  PainsRefuge: "Pain's Refuge",
  PeaceOfMind: 'Peace of Mind',
  RefreshingStride: 'Refreshing Stride',
  Rejuvenation: 'Rejuvenation',
  Relentlessness: 'Relentlessness',
  RousingSpeed: 'Rousing Speed',
  ShieldMaster: 'Shield Master',
  SiphoningSpells: 'Siphoning Spells',
  Slippery: 'Slippery',
  SoothingShield: 'Soothing Shield',
  SpiritMastery: 'Spirit Mastery',
  StrategicReserve: 'Strategic Reserve',
  SurvivalInstincts: 'Survival Instincts',
  SustainedBySuffering: 'Sustained by Suffering',
  ThrillOfTheHunt: 'Thrill of the Hunt',
  Unchained: 'Unchained',
  WardMaster: 'Ward Master',
} as const;
export type ChampionPointName = typeof ChampionPointName[keyof typeof ChampionPointName];

export const ChampionPointDiscipline = {
  TheThief: 'The Thief',
  TheMage: 'The Mage',
  TheWarrior: 'The Warrior',
} as const;
export type ChampionPointDiscipline = typeof ChampionPointDiscipline[keyof typeof ChampionPointDiscipline];

export const ChampionPointsByDiscipline = {
  [ChampionPointDiscipline.TheWarrior]: [
    ChampionPointName.ArcaneAlacrity,
    ChampionPointName.Bastion,
    ChampionPointName.BloodyRenewal,
    ChampionPointName.BoundlessVitality,
    ChampionPointName.BracingAnchor,
    ChampionPointName.Celerity,
    ChampionPointName.ExpertEvasion,
    ChampionPointName.Fortified,
    ChampionPointName.Hardened,
    ChampionPointName.Juggernaut,
    ChampionPointName.OnGuard,
    ChampionPointName.PainsRefuge,
    ChampionPointName.PeaceOfMind,
    ChampionPointName.RefreshingStride,
    ChampionPointName.Rejuvenation,
    ChampionPointName.Relentlessness,
    ChampionPointName.RousingSpeed,
    ChampionPointName.ShieldMaster,
    ChampionPointName.SiphoningSpells,
    ChampionPointName.Slippery,
    ChampionPointName.SoothingShield,
    ChampionPointName.SpiritMastery,
    ChampionPointName.StrategicReserve,
    ChampionPointName.SurvivalInstincts,
    ChampionPointName.SustainedBySuffering,
    ChampionPointName.ThrillOfTheHunt,
    ChampionPointName.Unchained,
    ChampionPointName.WardMaster,
  ],
  [ChampionPointDiscipline.TheThief]: [
    ChampionPointName.AnglersInstincts,
    ChampionPointName.FadeAway,
    ChampionPointName.FriendsInLowPlaces,
    ChampionPointName.GiftedRider,
    ChampionPointName.MasterGatherer,
    ChampionPointName.ReelTechnique,
    ChampionPointName.Shadowstrike,
    ChampionPointName.SteedsBlessing,
    ChampionPointName.SustainingShadows,
    ChampionPointName.WarMount,
  ],
  [ChampionPointDiscipline.TheMage]: [
    ChampionPointName.ArcaneSupremacy,
    ChampionPointName.Backstabber,
    ChampionPointName.BitingAura,
    ChampionPointName.Bulwark,
    ChampionPointName.CleansingRevival,
    ChampionPointName.CuttingDefense,
    ChampionPointName.DeadlyAim,
    ChampionPointName.DuelistsRebuff,
    ChampionPointName.EndlessEndurance,
    ChampionPointName.EnduringResolve,
    ChampionPointName.EnliveningOverflow,
    ChampionPointName.Exploiter,
    ChampionPointName.FightingFinesse,
    ChampionPointName.FocusedMending,
    ChampionPointName.ForceOfNature,
    ChampionPointName.Foresight,
    ChampionPointName.FromTheBrink,
    ChampionPointName.HopeInfusion,
    ChampionPointName.Ironclad,
    ChampionPointName.LastStand,
    ChampionPointName.MasterAtArms,
    ChampionPointName.OccultOverload,
    ChampionPointName.ReavingBlows,
    ChampionPointName.Reinforced,
    ChampionPointName.Rejuvenator,
    ChampionPointName.Resilience,
    ChampionPointName.Riposte,
    ChampionPointName.SalveOfRenewal,
    ChampionPointName.SoothingTide,
    ChampionPointName.SwiftRenewal,
    ChampionPointName.Thaumaturge,
    ChampionPointName.Unassailable,
    ChampionPointName.UntamedAggression,
    ChampionPointName.WeaponsExpert,
    ChampionPointName.WrathfulStrikes,
  ],
} as const;

export function getChampionPointDisciplineFromSlot(field: string): ChampionPointDiscipline | null {
  if (field.startsWith('Blue')) return ChampionPointDiscipline.TheMage;
  if (field.startsWith('Red')) return ChampionPointDiscipline.TheWarrior;
  if (field.startsWith('Green')) return ChampionPointDiscipline.TheThief;
  return null;
}

export function getChampionPointDisciplineFromName(name: ChampionPointName | ''): ChampionPointDiscipline | null {
  if (!name) return null;

  const disciplineEntries = Object.entries(ChampionPointsByDiscipline) as Array<
    [ChampionPointDiscipline, readonly ChampionPointName[]]
  >;

  for (const [discipline, names] of disciplineEntries) {
    if (names.includes(name)) {
      return discipline;
    }
  }

  return null;
}

export const MundusStone = {
  Empty: '',
  Apprentice: 'The Apprentice',
  Atronach: 'The Atronach',
  Lady: 'The Lady',
  Lord: 'The Lord',
  Lover: 'The Lover',
  Mage: 'The Mage',
  Ritual: 'The Ritual',
  Serpent: 'The Serpent',
  Shadow: 'The Shadow',
  Steed: 'The Steed',
  Thief: 'The Thief',
  Tower: 'The Tower',
  Warrior: 'The Warrior',
} as const;
export type MundusStone = typeof MundusStone[keyof typeof MundusStone];
export const MUNDUS_STONE_OPTIONS: readonly Exclude<MundusStone, ''>[] = Object.values(MundusStone)
  .filter((stone): stone is Exclude<MundusStone, ''> => stone !== MundusStone.Empty);

export type SkillClasses = {
  MainSkillClass: ClassSkillLine;
  SecondSkillClass: ClassSkillLine;
  ThirdSkillClass: ClassSkillLine;
}
export const SKILL_CLASS_SLOTS = ['MainSkillClass', 'SecondSkillClass', 'ThirdSkillClass'] as const satisfies readonly (keyof SkillClasses)[];

export const TemplarClassMasteries = {
  Mastery1: 'Bastion of Light',
  Mastery2: 'Devout Guardian',
  Mastery3: 'Bright Harbinger',
  Mastery4: "Judgment's Brand",
  Mastery5: 'Steadfast Candescence',
} as const;
export type TemplarClassMastery = typeof TemplarClassMasteries[keyof typeof TemplarClassMasteries];

export const SorcererClassMasteries = {
  Mastery1: 'Conservation of Energy',
  Mastery2: 'Font of Power',
  Mastery3: 'Static Reverberation',
  Mastery4: 'Calculated Defense',
  Mastery5: 'Sphere of Influence',
} as const;
export type SorcererClassMastery = typeof SorcererClassMasteries[keyof typeof SorcererClassMasteries];

export const NightbladeClassMasteries = {
  Mastery1: 'Nocturnal Inspiration',
  Mastery2: 'An Eye for Exploitation',
  Mastery3: 'Above and Beyond',
  Mastery4: "Cutthroat's Focus",
  Mastery5: 'Share the Spoils',
} as const;
export type NightbladeClassMastery = typeof NightbladeClassMasteries[keyof typeof NightbladeClassMasteries];

export const DragonknightClassMasteries = {
  Mastery1: 'Inexorable Descent',
  Mastery2: 'Booming Voice',
  Mastery3: 'Wildfire Embers',
  Mastery4: 'Resolute Defense',
  Mastery5: 'Lead from the Front',
} as const;
export type DragonknightClassMastery = typeof DragonknightClassMasteries[keyof typeof DragonknightClassMasteries];

export const WardenClassMasteries = {
  Mastery1: "Tundra's Maw",
  Mastery2: 'Wild Adaptation',
  Mastery3: 'Glacial Obstinance',
  Mastery4: "Green-Keeper's Hide",
  Mastery5: 'Bountiful Harvest',
} as const;
export type WardenClassMastery = typeof WardenClassMasteries[keyof typeof WardenClassMasteries];

export const NecromancerClassMasteries = {
  Mastery1: 'Nothing Wasted',
  Mastery2: 'Malevolent Promise',
  Mastery3: 'Cycle Unending',
  Mastery4: 'Pound of Flesh',
  Mastery5: "Veil's Forfeit",
} as const;
export type NecromancerClassMastery = typeof NecromancerClassMasteries[keyof typeof NecromancerClassMasteries];

export const ArcanistClassMasteries = {
  Mastery1: 'Abyssal Emergence',
  Mastery2: 'Fate Realigned',
  Mastery3: 'Unbound Potential',
  Mastery4: "Erudite's Rigor",
  Mastery5: "Ink-Scribe's Verve",
} as const;
export type ArcanistClassMastery = typeof ArcanistClassMasteries[keyof typeof ArcanistClassMasteries];

export const CLASS_MASTERY_OPTIONS_BY_CLASS: Record<ClassName, readonly string[]> = {
  [ClassName.Templar]: Object.values(TemplarClassMasteries),
  [ClassName.Sorcerer]: Object.values(SorcererClassMasteries),
  [ClassName.Nightblade]: Object.values(NightbladeClassMasteries),
  [ClassName.Dragonknight]: Object.values(DragonknightClassMasteries),
  [ClassName.Warden]: Object.values(WardenClassMasteries),
  [ClassName.Necromancer]: Object.values(NecromancerClassMasteries),
  [ClassName.Arcanist]: Object.values(ArcanistClassMasteries),
};

export type ClassMasteries = {
  firstClassMastery: string;
  secondClassMastery: string;
}

export const ArmorWeight = {
  light: 'light',
  medium: 'medium',
  heavy: 'heavy',
} as const;
export type ArmorWeight = typeof ArmorWeight[keyof typeof ArmorWeight];

export const GearType = {
  armor: 'armor',
  jewelry: 'jewelry',
  weapon: 'weapon',
} as const;
export type GearType = typeof GearType[keyof typeof GearType];

export type SetEffect = {
  numberOfPiecesRequired: number;
  isPerfected: boolean;
  description: string;
}

export type SetItem = {
  id: number;
  setId: number;
  setName: string;
  name: string;
  icon: string;
  gearType: GearType;
  equipType: string;
  armorWeight: ArmorWeight | null;
  weaponType: string;
  trait: string;
}

export type WeaponSetSlot = 'mainHandFrontBar' | 'offHandFrontBar' | 'mainHandBackBar' | 'offHandBackBar';
export type NonWeaponSetSlot = 'head' | 'chest' | 'waist' | 'boots' | 'shoulders' | 'gloves' | 'legs' | 'ring1' | 'ring2' | 'necklace';

export type GearPiece = {
  itemId: number | null;
  enchantment: string;
  trait?: string;
}

export type WeaponGearPiece = GearPiece & { poison: string };
export type GearSlotPiece = GearPiece | WeaponGearPiece;
export type GearDraft = GearPiece | WeaponGearPiece;
export type Gear = Record<NonWeaponSetSlot, GearPiece> & Record<WeaponSetSlot, WeaponGearPiece>;

export type Skills = {
  MainBar1: SkillAbilityId | '';
  MainBar2: SkillAbilityId | '';
  MainBar3: SkillAbilityId | '';
  MainBar4: SkillAbilityId | '';
  MainBar5: SkillAbilityId | '';
  MainBarUlt: SkillAbilityId | '';
  BackBar1: SkillAbilityId | '';
  BackBar2: SkillAbilityId | '';
  BackBar3: SkillAbilityId | '';
  BackBar4: SkillAbilityId | '';
  BackBar5: SkillAbilityId | '';
  BackBarUlt: SkillAbilityId | '';
}
export type ScribingSkillId = `scribing:${number}:${number}:${number}:${number}`;
export type SkillAbilityId = number | ScribingSkillId;
export const MAIN_BAR_SLOTS = ['MainBar1', 'MainBar2', 'MainBar3', 'MainBar4', 'MainBar5'] as const satisfies readonly (keyof Skills)[];
export const BACK_BAR_SLOTS = ['BackBar1', 'BackBar2', 'BackBar3', 'BackBar4', 'BackBar5'] as const satisfies readonly (keyof Skills)[];

export type ChampionPoints = {
  Blue1: ChampionPointName | '' | string;
  Blue2: ChampionPointName | '' | string;
  Blue3: ChampionPointName | '' | string;
  Blue4: ChampionPointName | '' | string;
  Red1: ChampionPointName | '' | string;
  Red2: ChampionPointName | '' | string;
  Red3: ChampionPointName | '' | string;
  Red4: ChampionPointName | '' | string;
  Green1: ChampionPointName | '' | string;
  Green2: ChampionPointName | '' | string;
  Green3: ChampionPointName | '' | string;
  Green4: ChampionPointName | '' | string;
}
export const CHAMPION_POINT_SLOTS = [
  'Blue1', 'Blue2', 'Blue3', 'Blue4',
  'Red1', 'Red2', 'Red3', 'Red4',
  'Green1', 'Green2', 'Green3', 'Green4',
] as const satisfies readonly (keyof ChampionPoints)[];

export type RaidPlayer = {
  id: number;
  name: string;
  race: number | null;
  role: RoleType;
  skillClasses: SkillClasses;
  classMasteries: ClassMasteries;
  mundus: MundusStone;
}

export type PlayerSetup = Pick<RaidPlayer, 'role' | 'race' | 'skillClasses' | 'classMasteries' | 'mundus'>;

export function copyPlayerSetup(player: RaidPlayer): PlayerSetup {
  return JSON.parse(JSON.stringify({
    role: player.role,
    race: player.race,
    skillClasses: player.skillClasses,
    classMasteries: player.classMasteries,
    mundus: player.mundus,
  })) as PlayerSetup;
}

export function pastePlayerSetup(player: RaidPlayer, setup: PlayerSetup): RaidPlayer {
  return {
    ...player,
    ...copyPlayerSetup({ ...player, ...setup }),
  };
}

export type SetSlot =
  | 'head'
  | 'chest'
  | 'waist'
  | 'boots'
  | 'shoulders'
  | 'gloves'
  | 'legs'
  | 'ring1'
  | 'ring2'
  | 'necklace'
  | 'mainHandFrontBar'
  | 'offHandFrontBar'
  | 'mainHandBackBar'
  | 'offHandBackBar';

export type SetSlots = Record<NonWeaponSetSlot, GearPiece> & Record<WeaponSetSlot, WeaponGearPiece>;

export function requiresTwoWeaponSlots(item: SetItem | undefined): boolean {
  return item?.gearType === GearType.weapon && item.equipType === 'Two Hand';
}

export function getPairedWeaponSlot(slot: SetSlot): SetSlot | null {
  const pairedSlots: Partial<Record<SetSlot, SetSlot>> = {
    mainHandFrontBar: 'offHandFrontBar',
    offHandFrontBar: 'mainHandFrontBar',
    mainHandBackBar: 'offHandBackBar',
    offHandBackBar: 'mainHandBackBar',
  };

  return pairedSlots[slot] ?? null;
}

// Keep two-handed weapons synchronized across both slots of a bar.
export function updateSetSlot(
  sets: SetSlots,
  slot: SetSlot,
  gear: GearSlotPiece,
  getItemById: (itemId: number) => SetItem | undefined = () => undefined,
): SetSlots {
  const pairedSlot = getPairedWeaponSlot(slot);
  const itemForId = (itemId: number | null) => itemId === null ? undefined : getItemById(itemId);
  const existingPairedGear = pairedSlot ? sets[pairedSlot] : undefined;
  const wasTwoHanded = requiresTwoWeaponSlots(itemForId(sets[slot].itemId))
    || requiresTwoWeaponSlots(itemForId(existingPairedGear?.itemId ?? null));
  const weaponSlot = pairedSlot !== null;
  const normalizedGear: GearSlotPiece = weaponSlot
    ? { ...gear, poison: 'poison' in gear ? gear.poison : '' }
    : { itemId: gear.itemId, enchantment: gear.enchantment, ...(gear.trait !== undefined ? { trait: gear.trait } : {}) };
  const poison = 'poison' in normalizedGear ? normalizedGear.poison : '';
  const shouldUpdatePair = pairedSlot && (requiresTwoWeaponSlots(itemForId(gear.itemId)) || wasTwoHanded || Boolean(poison));
  const updatedGear = poison ? { ...normalizedGear, enchantment: '' }
    : normalizedGear.enchantment ? { ...normalizedGear, ...(weaponSlot ? { poison: '' } : {}) } : normalizedGear;
  const pairedGear = shouldUpdatePair
    ? { ...updatedGear, ...(('poison' in updatedGear && updatedGear.poison) ? { enchantment: '' } : {}) }
    : pairedSlot && normalizedGear.enchantment
      ? { ...existingPairedGear!, poison: '' }
      : undefined;

  return {
    ...sets,
    [slot]: updatedGear,
    ...(pairedSlot && pairedGear ? { [pairedSlot]: pairedGear } : {}),
  } as SetSlots;
}

export function createEmptyGearPiece(): GearPiece {
  return {
    itemId: null,
    enchantment: '',
  };
}

export function createEmptyWeaponGearPiece(): WeaponGearPiece {
  return { ...createEmptyGearPiece(), poison: '' };
}

export function createEmptyGearForSlot(slot: SetSlot): GearSlotPiece {
  return getPairedWeaponSlot(slot) ? createEmptyWeaponGearPiece() : createEmptyGearPiece();
}

export const SET_SLOT_OPTIONS: readonly SetSlot[] = [
  'head', 'chest', 'waist', 'boots', 'shoulders', 'gloves', 'legs',
  'ring1', 'ring2', 'necklace', 'mainHandFrontBar', 'offHandFrontBar',
  'mainHandBackBar', 'offHandBackBar',
];

export function createEmptySetSlots(): SetSlots {
  return Object.fromEntries(SET_SLOT_OPTIONS.map((slot) => [slot, createEmptyGearForSlot(slot)])) as SetSlots;
}

export type FightPlayerStuff = {
  id: number;
  name: string;
  role: RoleType;
  sets: SetSlots;
  competencies: Skills;
  championPoints: ChampionPoints;
  food: string;
  potion: string;
  description: string;
}

export type FightPlayerSetup = Pick<
  FightPlayerStuff,
  'sets' | 'competencies' | 'championPoints' | 'food' | 'potion'
>;

// Snapshot nested setup data so later edits cannot mutate the copy.
export function copyFightPlayerSetup(playerStuff: FightPlayerStuff): FightPlayerSetup {
  return JSON.parse(JSON.stringify({
    sets: playerStuff.sets,
    competencies: playerStuff.competencies,
    championPoints: playerStuff.championPoints,
    food: playerStuff.food,
    potion: playerStuff.potion,
  })) as FightPlayerSetup;
}

// Preserve the destination player's identity and role.
export function pasteFightPlayerSetup(playerStuff: FightPlayerStuff, setup: FightPlayerSetup): FightPlayerStuff {
  return {
    ...playerStuff,
    ...copyFightPlayerSetup({ ...playerStuff, ...setup }),
  };
}

export type FightDefinition = {
  name: string;
  playersStuff: FightPlayerStuff[];
}

export type RaidTemplateDocument = {
  raid: {
    groupName: string;
    selectedRaid: string | null;
    players: RaidPlayer[];
  };

  fights: FightDefinition[];
}

export function createEmptySkillClasses(): SkillClasses {
  return {
    MainSkillClass: '',
    SecondSkillClass: '',
    ThirdSkillClass: '',
  };
}

export function createEmptyClassMasteries(): ClassMasteries {
  return {
    firstClassMastery: '',
    secondClassMastery: '',
  };
}

export function createEmptyPlayer(id: number, name = `Player ${id}`): RaidPlayer {
  return {
    id,
    name,
    race: null,
    role: 'DPS',
    skillClasses: createEmptySkillClasses(),
    classMasteries: createEmptyClassMasteries(),
    mundus: '',
  };
}

export function createEmptyFightPlayerStuff(player: RaidPlayer): FightPlayerStuff {
  return {
    id: player.id,
    name: player.name,
    role: player.role,
    sets: createEmptySetSlots(),
    competencies: {
      MainBar1: '',
      MainBar2: '',
      MainBar3: '',
      MainBar4: '',
      MainBar5: '',
      MainBarUlt: '',
      BackBar1: '',
      BackBar2: '',
      BackBar3: '',
      BackBar4: '',
      BackBar5: '',
      BackBarUlt: '',
    },
    championPoints: {
      Blue1: '',
      Blue2: '',
      Blue3: '',
      Blue4: '',
      Red1: '',
      Red2: '',
      Red3: '',
      Red4: '',
      Green1: '',
      Green2: '',
      Green3: '',
      Green4: '',
    },
    food: '',
    potion: '',
    description: '',
  };
}

export function createEmptyTemplateDocument(): RaidTemplateDocument {
  const players = [
    createEmptyPlayer(1, 'Player 1'),
    createEmptyPlayer(2, 'Player 2'),
    createEmptyPlayer(3, 'Player 3'),
    createEmptyPlayer(4, 'Player 4'),
  ];

  return {
    raid: {
      groupName: 'ESO Raid Team',
      selectedRaid: 'Neutral',
      players,
    },
    fights: [
      {
        name: 'Encounter 1',
        playersStuff: players.map((player) => createEmptyFightPlayerStuff(player)),
      },
    ],
  };
}

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const isEnumValue = <T extends string>(enumObject: Record<string, T>, value: unknown): value is T => (
  typeof value === 'string' && Object.values(enumObject).includes(value as T)
);

function normalizeSkillSlot(value: unknown, slot: keyof Skills): SkillAbilityId | '' {
  if (value === undefined || value === '') return '';
  if (isSkillAbilityId(value)) return value;
  throw new Error(`Invalid skill slot "${slot}": expected a known ESO abilityId, a complete Scribing combination, or an empty string.`);
}

export function normalizeTemplateDocument(input: unknown): RaidTemplateDocument {
  if (!isRecord(input)) throw new Error('Invalid template: expected a JSON object.');

  const base = createEmptyTemplateDocument();
  const source = input;
  const raidSource = isRecord(source.raid) ? source.raid : {};

  const raidPlayers = Array.isArray(raidSource.players) ? raidSource.players : base.raid.players;
  const fights = Array.isArray(source.fights) ? source.fights : base.fights;

  const players: RaidPlayer[] = raidPlayers.map((player, index) => ({
    id: isRecord(player) && typeof player.id === 'number' ? player.id : index + 1,
    name: isRecord(player) && typeof player.name === 'string' ? player.name : `Player ${index + 1}`,
    race: isRecord(player) && Number.isSafeInteger(player.race) && (player.race as number) > 0 ? player.race as number : null,
    role: isRecord(player) && isEnumValue(RoleType, player.role) ? player.role : RoleType.DPS,
    skillClasses: {
      MainSkillClass: isRecord(player) && isRecord(player.skillClasses) && isEnumValue(ClassSkillLine, player.skillClasses.MainSkillClass) ? player.skillClasses.MainSkillClass : ClassSkillLine.Empty,
      SecondSkillClass: isRecord(player) && isRecord(player.skillClasses) && isEnumValue(ClassSkillLine, player.skillClasses.SecondSkillClass) ? player.skillClasses.SecondSkillClass : ClassSkillLine.Empty,
      ThirdSkillClass: isRecord(player) && isRecord(player.skillClasses) && isEnumValue(ClassSkillLine, player.skillClasses.ThirdSkillClass) ? player.skillClasses.ThirdSkillClass : ClassSkillLine.Empty,
    },
    classMasteries: {
      firstClassMastery: isRecord(player) && isRecord(player.classMasteries) && typeof player.classMasteries.firstClassMastery === 'string' ? player.classMasteries.firstClassMastery : '',
      secondClassMastery: isRecord(player) && isRecord(player.classMasteries) && typeof player.classMasteries.secondClassMastery === 'string' ? player.classMasteries.secondClassMastery : '',
    },
    mundus: isRecord(player) && isEnumValue(MundusStone, player.mundus) ? player.mundus : MundusStone.Empty,
  }));

  const fightsNormalized: FightDefinition[] = fights.map((fight, fightIndex) => {
    const fightRecord = isRecord(fight) ? fight : {};
    const fightName = typeof fightRecord.name === 'string' ? fightRecord.name : `Fight ${fightIndex + 1}`;
    const fightPlayers = Array.isArray(fightRecord.playersStuff) ? fightRecord.playersStuff : [];

    return {
      name: fightName,
      playersStuff: fightPlayers.map((entry, index) => {
        const entryRecord = isRecord(entry) ? entry : {};
        const player = players[index] ?? createEmptyPlayer(index + 1);
        const playerRole = isEnumValue(RoleType, player.role) ? player.role : RoleType.DPS;
        const competencies = isRecord(entryRecord.competencies) ? entryRecord.competencies : {};
        const championPoints = isRecord(entryRecord.championPoints) ? entryRecord.championPoints : {};
        return {
          id: typeof entryRecord.id === 'number' ? entryRecord.id : player.id,
          name: typeof entryRecord.name === 'string' ? entryRecord.name : player.name,
          role: isEnumValue(RoleType, entryRecord.role) ? entryRecord.role : playerRole,
          sets: SET_SLOT_OPTIONS.reduce<SetSlots>((sets, slot) => {
            const mutableSets = sets as Record<SetSlot, GearSlotPiece>;
            const rawSet = isRecord(entryRecord.sets) ? entryRecord.sets[slot] : undefined;
            if (rawSet === undefined) {
              mutableSets[slot] = createEmptyGearForSlot(slot);
              return sets;
            }

            if (!isRecord(rawSet)
              || !Object.hasOwn(rawSet, 'itemId')
              || (rawSet.itemId !== null && (!Number.isSafeInteger(rawSet.itemId) || (rawSet.itemId as number) < 1))
              || typeof rawSet.enchantment !== 'string'
              || (getPairedWeaponSlot(slot) !== null && rawSet.poison !== undefined && typeof rawSet.poison !== 'string')
              || (rawSet.trait !== undefined && typeof rawSet.trait !== 'string')) {
              throw new Error(`Invalid gear slot "${slot}": expected itemId and enchantment, with an optional trait.`);
            }

            const normalizedGear = {
              itemId: rawSet.itemId as number | null,
              enchantment: rawSet.enchantment,
              ...(typeof rawSet.trait === 'string' ? { trait: rawSet.trait } : {}),
            };
            mutableSets[slot] = getPairedWeaponSlot(slot) !== null
              ? { ...normalizedGear, poison: typeof rawSet.poison === 'string' ? rawSet.poison : '' }
              : normalizedGear;
            return sets;
          }, createEmptySetSlots()),
          competencies: {
            MainBar1: normalizeSkillSlot(competencies.MainBar1, 'MainBar1'),
            MainBar2: normalizeSkillSlot(competencies.MainBar2, 'MainBar2'),
            MainBar3: normalizeSkillSlot(competencies.MainBar3, 'MainBar3'),
            MainBar4: normalizeSkillSlot(competencies.MainBar4, 'MainBar4'),
            MainBar5: normalizeSkillSlot(competencies.MainBar5, 'MainBar5'),
            MainBarUlt: normalizeSkillSlot(competencies.MainBarUlt, 'MainBarUlt'),
            BackBar1: normalizeSkillSlot(competencies.BackBar1, 'BackBar1'),
            BackBar2: normalizeSkillSlot(competencies.BackBar2, 'BackBar2'),
            BackBar3: normalizeSkillSlot(competencies.BackBar3, 'BackBar3'),
            BackBar4: normalizeSkillSlot(competencies.BackBar4, 'BackBar4'),
            BackBar5: normalizeSkillSlot(competencies.BackBar5, 'BackBar5'),
            BackBarUlt: normalizeSkillSlot(competencies.BackBarUlt, 'BackBarUlt'),
          },
          championPoints: {
            Blue1: typeof championPoints.Blue1 === 'string' ? championPoints.Blue1 as ChampionPointName | '' : '',
            Blue2: typeof championPoints.Blue2 === 'string' ? championPoints.Blue2 as ChampionPointName | '' : '',
            Blue3: typeof championPoints.Blue3 === 'string' ? championPoints.Blue3 as ChampionPointName | '' : '',
            Blue4: typeof championPoints.Blue4 === 'string' ? championPoints.Blue4 as ChampionPointName | '' : '',
            Red1: typeof championPoints.Red1 === 'string' ? championPoints.Red1 as ChampionPointName | '' : '',
            Red2: typeof championPoints.Red2 === 'string' ? championPoints.Red2 as ChampionPointName | '' : '',
            Red3: typeof championPoints.Red3 === 'string' ? championPoints.Red3 as ChampionPointName | '' : '',
            Red4: typeof championPoints.Red4 === 'string' ? championPoints.Red4 as ChampionPointName | '' : '',
            Green1: typeof championPoints.Green1 === 'string' ? championPoints.Green1 as ChampionPointName | '' : '',
            Green2: typeof championPoints.Green2 === 'string' ? championPoints.Green2 as ChampionPointName | '' : '',
            Green3: typeof championPoints.Green3 === 'string' ? championPoints.Green3 as ChampionPointName | '' : '',
            Green4: typeof championPoints.Green4 === 'string' ? championPoints.Green4 as ChampionPointName | '' : '',
          },
          food: typeof entryRecord.food === 'string' ? entryRecord.food : '',
          potion: typeof entryRecord.potion === 'string' ? entryRecord.potion : '',
          description: typeof entryRecord.description === 'string' ? entryRecord.description : '',
        };
      }),
    };
  });

  return {
    raid: {
      groupName: typeof raidSource.groupName === 'string' ? raidSource.groupName : base.raid.groupName,
      selectedRaid: typeof raidSource.selectedRaid === 'string' || raidSource.selectedRaid === null ? raidSource.selectedRaid : base.raid.selectedRaid,
      players,
    },
    fights: fightsNormalized,
  };
}

export function parseTemplateDocument(input: string | unknown): RaidTemplateDocument {
  const parsed = typeof input === 'string' ? JSON.parse(input) : input;
  return normalizeTemplateDocument(parsed);
}

export function exportTemplateDocument(template: RaidTemplateDocument): string {
  return JSON.stringify(normalizeTemplateDocument(template), null, 2);
}
