import { CommonSkillLine, ClassSkillLine } from '@/features/template/raidTemplate';
import type { SkillAbilityId } from '@/features/template/raidTemplate';
import { ESO_SKILLS, getSkillAbilityById } from './esoSkills';
import type { SkillAbility } from '@/features/template/raidTemplate';
import { getStaticAssetPath } from './staticAssets';

export type AbilityCategory = CommonSkillLine | ClassSkillLine;

const skillLines = ESO_SKILLS.reduce<Record<string, string[]>>((acc, skill) => {
  const list = acc[skill.skillLine] ?? [];
  list.push(skill.skillName);
  acc[skill.skillLine] = list;
  return acc;
}, {});

const allSkillLineCategories = [
  ...Object.values(CommonSkillLine),
  ...Object.values(ClassSkillLine),
].filter((line): line is string => Boolean(line) && line !== CommonSkillLine.Empty && line !== ClassSkillLine.Empty);

export const abilityCategories: Record<AbilityCategory, string[]> = Object.fromEntries(
  allSkillLineCategories.map((line) => [line, [...(skillLines[line] ?? [])]]),
) as Record<AbilityCategory, string[]>;

export type AbilitySkillTree = {
  parent: SkillAbility;
  morphs: SkillAbility[];
};

export function getAbilitySkillTree(
  category: AbilityCategory,
  ultimateFilter: 'all' | 'only' | 'exclude' = 'all',
): AbilitySkillTree[] {
  const skills = ESO_SKILLS.filter((skill) => (
    skill.skillLine === category
    && (ultimateFilter === 'all' || skill.isUltimate === (ultimateFilter === 'only'))
  ));
  const skillsById = new Map(skills.map((skill) => [skill.abilityId, skill]));
  const morphsByParent = new Map<number, SkillAbility[]>();

  skills.forEach((skill) => {
    if (skill.parentAbilityId === null || !skillsById.has(skill.parentAbilityId)) return;
    const morphs = morphsByParent.get(skill.parentAbilityId) ?? [];
    morphs.push(skill);
    morphsByParent.set(skill.parentAbilityId, morphs);
  });

  return skills
    .filter((skill) => skill.parentAbilityId === null)
    .map((parent) => ({ parent, morphs: morphsByParent.get(parent.abilityId) ?? [] }));
}

const lineSlugs: Record<string, string> = {
  [CommonSkillLine.FightersGuild]: 'guild/fighters-guild',
  [CommonSkillLine.MagesGuild]: 'guild/mages-guild',
  [CommonSkillLine.Undaunted]: 'guild/undaunted',
  [CommonSkillLine.PsijicOrder]: 'guild/psijic-order',
  [CommonSkillLine.Vampire]: 'world/vampire',
  [CommonSkillLine.Werewolf]: 'world/werewolf',
  [CommonSkillLine.OneHanded]: 'weapon/one-hand-and-shield',
  [CommonSkillLine.TwoHanded]: 'weapon/two-handed',
  [CommonSkillLine.DualWield]: 'weapon/dual-wield',
  [CommonSkillLine.Bow]: 'weapon/bow',
  [CommonSkillLine.DestructionStaff]: 'weapon/destruction-staff',
  [CommonSkillLine.RestorationStaff]: 'weapon/restoration-staff',
  [CommonSkillLine.SoulMagic]: 'world/soul-magic',
  [CommonSkillLine.Armor]: 'armor',
  [CommonSkillLine.Assault]: 'alliance-war/assault',
  [CommonSkillLine.Support]: 'alliance-war/support',
  [ClassSkillLine.EarthenHeart]: 'dragonknight/earthen-heart',
  [ClassSkillLine.DraconicPower]: 'dragonknight/draconic-power',
  [ClassSkillLine.ArdentFlame]: 'dragonknight/ardent-flame',
  [ClassSkillLine.AedricSpear]: 'templar/aedric-spear',
  [ClassSkillLine.DawnsWrath]: 'templar/dawns-wrath',
  [ClassSkillLine.RestoringLight]: 'templar/restoring-light',
  [ClassSkillLine.DaedricSummoning]: 'sorcerer/daedric-summoning',
  [ClassSkillLine.DarkMagic]: 'sorcerer/dark-magic',
  [ClassSkillLine.StormCalling]: 'sorcerer/storm-calling',
  [ClassSkillLine.Assassination]: 'nightblade/assassination',
  [ClassSkillLine.ShadowyEmbrace]: 'nightblade/shadow',
  [ClassSkillLine.Siphoning]: 'nightblade/siphoning',
  [ClassSkillLine.GreenBalance]: 'warden/green-balance',
  [ClassSkillLine.WintersEmbrace]: 'warden/winters-embrace',
  [ClassSkillLine.AnimalCompanions]: 'warden/animal-companions',
  [ClassSkillLine.GraveLord]: 'necromancer/grave-lord',
  [ClassSkillLine.LivingDeath]: 'necromancer/living-death',
  [ClassSkillLine.BoneTyrant]: 'necromancer/bone-tyrant',
  [ClassSkillLine.CurativeRuneforms]: 'arcanist/curative-runeforms',
  [ClassSkillLine.HeraldOfTheTomes]: 'arcanist/herald-of-the-tome',
  [ClassSkillLine.SoldierOfApocrypha]: 'arcanist/soldier-of-apocrypha',
};

const slugify = (value: string): string => value
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[\u2019']/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');

const skillPagePaths = new Map<string, string>();
const armorLineBySkill: Record<string, ArmorWeight> = {
  Unstoppable: 'heavy-armor', 'Immovable': 'heavy-armor', 'Unstoppable Brute': 'heavy-armor', 'Heavy Armor Penalties': 'heavy-armor',
  'Heavy Armor Bonuses': 'heavy-armor', Resolve: 'heavy-armor', Constitution: 'heavy-armor', Juggernaut: 'heavy-armor', Revitalize: 'heavy-armor', 'Rapid Mending': 'heavy-armor',
  Annulment: 'light-armor', 'Dampen Magic': 'light-armor', 'Harness Magicka': 'light-armor', 'Light Armor Bonuses': 'light-armor', 'Light Armor Penalties': 'light-armor',
  Grace: 'light-armor', Evocation: 'light-armor', 'Spell Warding': 'light-armor', Prodigy: 'light-armor', Concentration: 'light-armor',
  Evasion: 'medium-armor', Elude: 'medium-armor', Shuffle: 'medium-armor', 'Medium Armor Bonuses': 'medium-armor', Dexterity: 'medium-armor',
  'Wind Walker': 'medium-armor', 'Improved Sneak': 'medium-armor', Agility: 'medium-armor', Athletics: 'medium-armor',
};

export type ArmorWeight = 'light-armor' | 'medium-armor' | 'heavy-armor';

export function getArmorWeightForAbility(ability: string): ArmorWeight | null {
  return armorLineBySkill[ability] ?? null;
}

for (const [line, skills] of Object.entries(skillLines)) {
  const lineSlug = lineSlugs[line];
  if (!lineSlug) continue;
  for (const skill of skills) {
    const resolvedLineSlug = line === CommonSkillLine.Armor
      ? `armor/${armorLineBySkill[skill] ?? 'heavy-armor'}`
      : lineSlug;
    skillPagePaths.set(skill, `${resolvedLineSlug}/${slugify(skill)}`);
  }
}

export function getAbilityDisplayName(abilityId: SkillAbilityId | ''): string {
  return getSkillAbilityById(abilityId)?.skillName ?? '';
}

export function getAbilityCategoryForId(abilityId: SkillAbilityId | ''): AbilityCategory | null {
  const skillLine = getSkillAbilityById(abilityId)?.skillLine;
  if (!skillLine) return null;
  return getAllAbilityCategories().find((category) => category === skillLine) ?? null;
}

function getAbilityPagePath(ability: string): string | null {
  const path = skillPagePaths.get(ability);
  return path ? `/en/skills/${path}` : null;
}

export function getAbilityImagePath(_category: AbilityCategory, ability: string): string {
  const pagePath = getAbilityPagePath(ability);
  return pagePath ? getStaticAssetPath(pagePath) ?? '' : '';
}

export function getAllAbilityCategories(): AbilityCategory[] {
  return Object.keys(abilityCategories) as AbilityCategory[];
}
const commonSkillLines = new Set<string>(Object.values(CommonSkillLine).filter(Boolean));

export function getAbilityCategoriesForSkillLines(skillLines: readonly string[]): AbilityCategory[] {
  const selectedClassLines = new Set(
    skillLines.filter((line) => Boolean(line) && !commonSkillLines.has(line)),
  );

  return getAllAbilityCategories().filter((category) => {
    return commonSkillLines.has(category) || selectedClassLines.has(category);
  });
}
