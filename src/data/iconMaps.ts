import { getAbilityImagePath } from '@/lib/abilityCategories';
import { getStaticAssetPath, withBasePath } from '@/lib/staticAssets';
import { ESO_FOODS } from './esoFoods';
import { ESO_POTIONS } from './esoPotions';
import { ESO_RACES } from './esoRaces';
import { ClassName, ClassSkillLine, MundusStone, RoleType } from '@/features/template/raidTemplate';

export const FOOD_ICON_MAP: Record<string, string> = Object.fromEntries(
  ESO_FOODS.map((food) => [food.name, getStaticAssetPath(food.imageUrl) ?? '']),
);

const potionIconByName: Record<string, string> = {
  'Spell Power': withBasePath('/potions/consumable_potion_002_type_005.png'),
  'Stamina': withBasePath('/potions/consumable_potion_003_type_005.png'),
  'Health': withBasePath('/potions/consumable_potion_001_type_005.png'),
  'Magicka': withBasePath('/potions/consumable_potion_002_type_005.png'),
  'Tri-Stat': withBasePath('/potions/consumable_potion_001_type_005.png'),
  'Essence of Heroism': withBasePath('/potions/consumable_potion_004_type_005.png'),
};

export const POTION_ICON_MAP: Record<string, string> = Object.fromEntries(
  ESO_POTIONS.map((potion) => [potion.name, potionIconByName[potion.name] ?? '']),
);
export const DEFAULT_FOOD_ICON = '';
export const DEFAULT_POTION_ICON = '';

export const ROLE_ICON_MAP: Record<RoleType, string> = {
  [RoleType.Tank]: withBasePath('/roles/ESO_Tank.png'),
  [RoleType.Heal]: withBasePath('/roles/ESO_Heal.png'),
  [RoleType.DPS]: withBasePath('/roles/ESO_DPS.png'),
};

const CLASS_ICON_BASE = '/storage/icons/class/gamepad';
export const CLASS_ICON_MAP: Record<ClassName, string> = {
  [ClassName.Templar]: getStaticAssetPath(`${CLASS_ICON_BASE}/gp_class_templar.png`) ?? '',
  [ClassName.Sorcerer]: getStaticAssetPath(`${CLASS_ICON_BASE}/gp_class_sorcerer.png`) ?? '',
  [ClassName.Nightblade]: getStaticAssetPath(`${CLASS_ICON_BASE}/gp_class_nightblade.png`) ?? '',
  [ClassName.Dragonknight]: getStaticAssetPath(`${CLASS_ICON_BASE}/gp_class_dragonknight.png`) ?? '',
  [ClassName.Warden]: getStaticAssetPath(`${CLASS_ICON_BASE}/gp_class_warden.png`) ?? '',
  [ClassName.Necromancer]: getStaticAssetPath(`${CLASS_ICON_BASE}/gp_class_necromancer.png`) ?? '',
  [ClassName.Arcanist]: getStaticAssetPath(`${CLASS_ICON_BASE}/gp_class_arcanist.png`) ?? '',
};

const raceLogoFiles: Record<string, string> = {
  Altmer: 'race_altmer_01.png',
  Argonian: 'race_argonian_01.png',
  Bosmer: 'race_bosmer_01.png',
  Breton: 'race_breton_01.png',
  Dunmer: 'race_dunmer_01.png',
  Imperial: 'race_imperial_01.png',
  Khajiit: 'race_khajiit_01.png',
  Nord: 'race_nord_01.png',
  Orc: 'race_orc_01.png',
  Redguard: 'race_redguard_01.png',
};
export const RACE_ICON_MAP: Record<number, string> = Object.fromEntries(
  ESO_RACES.map((race) => [race.id, raceLogoFiles[race.name] ? withBasePath(`/races/${raceLogoFiles[race.name]}`) : '']),
);

const skillLineImage = (category: Parameters<typeof getAbilityImagePath>[0], skill: string) => (
  getAbilityImagePath(category, skill)
);

export const SKILL_LINE_ICON_MAP: Record<string, string> = {
  [ClassSkillLine.EarthenHeart]: skillLineImage(ClassSkillLine.EarthenHeart, 'Earthshield Mantle'),
  [ClassSkillLine.DraconicPower]: skillLineImage(ClassSkillLine.DraconicPower, 'Ferocious Leap'),
  [ClassSkillLine.ArdentFlame]: skillLineImage(ClassSkillLine.ArdentFlame, 'Molten Whip'),
  [ClassSkillLine.AedricSpear]: skillLineImage(ClassSkillLine.AedricSpear, 'Blazing Spear'),
  [ClassSkillLine.DawnsWrath]: skillLineImage(ClassSkillLine.DawnsWrath, 'Radiant Glory'),
  [ClassSkillLine.RestoringLight]: skillLineImage(ClassSkillLine.RestoringLight, 'Cleansing Ritual'),
  [ClassSkillLine.DaedricSummoning]: skillLineImage(ClassSkillLine.DaedricSummoning, 'Daedric Prey'),
  [ClassSkillLine.DarkMagic]: skillLineImage(ClassSkillLine.DarkMagic, 'Crystal Fragments'),
  [ClassSkillLine.StormCalling]: skillLineImage(ClassSkillLine.StormCalling, 'Energy Overload'),
  [ClassSkillLine.Assassination]: skillLineImage(ClassSkillLine.Assassination, 'Incapacitating Strike'),
  [ClassSkillLine.ShadowyEmbrace]: skillLineImage(ClassSkillLine.ShadowyEmbrace, 'Dark Shade'),
  [ClassSkillLine.Siphoning]: skillLineImage(ClassSkillLine.Siphoning, 'Siphoning Attacks'),
  [ClassSkillLine.GreenBalance]: skillLineImage(ClassSkillLine.GreenBalance, 'Budding Seeds'),
  [ClassSkillLine.WintersEmbrace]: skillLineImage(ClassSkillLine.WintersEmbrace, 'Crystallized Shield'),
  [ClassSkillLine.AnimalCompanions]: skillLineImage(ClassSkillLine.AnimalCompanions, 'Feral Guardian'),
  [ClassSkillLine.GraveLord]: skillLineImage(ClassSkillLine.GraveLord, 'Blighted Blastbones'),
  [ClassSkillLine.LivingDeath]: skillLineImage(ClassSkillLine.LivingDeath, 'Render Flesh'),
  [ClassSkillLine.BoneTyrant]: skillLineImage(ClassSkillLine.BoneTyrant, "Summoner's Armor"),
  [ClassSkillLine.CurativeRuneforms]: skillLineImage(ClassSkillLine.CurativeRuneforms, 'Runemend'),
  [ClassSkillLine.HeraldOfTheTomes]: skillLineImage(ClassSkillLine.HeraldOfTheTomes, "Fatecarver"),
  [ClassSkillLine.SoldierOfApocrypha]: skillLineImage(ClassSkillLine.SoldierOfApocrypha, 'Gibbering Shield'),
};

const mundusSlugs: Record<Exclude<MundusStone, ''>, string> = {
  [MundusStone.Apprentice]: 'the-apprentice',
  [MundusStone.Atronach]: 'the-atronach',
  [MundusStone.Lady]: 'the-lady',
  [MundusStone.Lord]: 'the-lord',
  [MundusStone.Lover]: 'the-lover',
  [MundusStone.Mage]: 'the-mage',
  [MundusStone.Ritual]: 'the-ritual',
  [MundusStone.Serpent]: 'the-serpent',
  [MundusStone.Shadow]: 'the-shadow',
  [MundusStone.Steed]: 'the-steed',
  [MundusStone.Thief]: 'the-thief',
  [MundusStone.Tower]: 'the-tower',
  [MundusStone.Warrior]: 'the-warrior',
};

export const MUNDUS_ICON_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(mundusSlugs).map(([name, slug]) => [
    name,
    getStaticAssetPath(`/en/mundus-stones/${slug}`) ?? '',
  ]),
);

export const ICON_MAP = SKILL_LINE_ICON_MAP;
