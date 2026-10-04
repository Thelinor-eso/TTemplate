import skillCatalog from '@data/eso-skill-catalog/skills.json';
import skillRelations from '@data/eso-skill-catalog/skill-relations.json';
import scribingCatalog from '@data/eso-skill-catalog/scribing.json';
import type { SkillAbility, SkillAbilityId, ScribingSkillId } from '@/features/template/raidTemplate';

const parentAbilityById = new Map<number, number>();

export type ScribingScriptOption = { id: number; name: string };
export type ScribingGrimoireOptions = {
  focus: ScribingScriptOption[];
  signature: ScribingScriptOption[];
  affix: ScribingScriptOption[];
};

const scribingOptionsById = new Map<number, ScribingGrimoireOptions>(
  Object.entries(scribingCatalog).map(([abilityId, options]) => [Number(abilityId), options]),
);

for (const relation of skillRelations) {
  if (relation.relationType !== 'morph'
    || !Object.hasOwn(skillCatalog, relation.parentAbilityId)
    || !Object.hasOwn(skillCatalog, relation.childAbilityId)
    || relation.parentAbilityId === relation.childAbilityId
    || parentAbilityById.has(relation.childAbilityId)) {
    throw new Error(`Invalid skill relation ${relation.parentAbilityId} -> ${relation.childAbilityId}`);
  }
  parentAbilityById.set(relation.childAbilityId, relation.parentAbilityId);
}

export const ESO_SKILLS: SkillAbility[] = Object.entries(skillCatalog)
  .map(([abilityId, skill]) => ({
    abilityId: Number(abilityId),
    skillLine: skill.skillLine,
    skillName: skill.name,
    isUltimate: skill.isUltimate,
    isCrafted: skill.isCrafted,
    parentAbilityId: parentAbilityById.get(Number(abilityId)) ?? null,
  }));

export const ESO_SKILLS_BY_ID = new Map(ESO_SKILLS.map((skill) => [skill.abilityId, skill]));

export function getScribingOptions(abilityId: number): ScribingGrimoireOptions | undefined {
  return scribingOptionsById.get(abilityId);
}

function hasOption(options: readonly ScribingScriptOption[], id: number): boolean {
  return options.some((option) => option.id === id);
}

export function decodeScribingSkillId(value: unknown): {
  grimoireAbilityId: number;
  focusScriptId: number;
  signatureScriptId: number;
  affixScriptId: number;
} | undefined {
  if (typeof value !== 'string') return undefined;
  const match = /^scribing:(\d+):(\d+):(\d+):(\d+)$/.exec(value);
  if (!match) return undefined;
  const [, grimoireId, focusId, signatureId, affixId] = match;
  const [grimoireAbilityId, focusScriptId, signatureScriptId, affixScriptId] = [
    grimoireId, focusId, signatureId, affixId,
  ].map(Number);
  if (![grimoireAbilityId, focusScriptId, signatureScriptId, affixScriptId]
    .every((id) => Number.isSafeInteger(id) && id > 0)) return undefined;
  const options = getScribingOptions(grimoireAbilityId);
  if (!ESO_SKILLS_BY_ID.get(grimoireAbilityId)?.isCrafted
    || !options
    || !hasOption(options.focus, focusScriptId)
    || !hasOption(options.signature, signatureScriptId)
    || !hasOption(options.affix, affixScriptId)) return undefined;
  return { grimoireAbilityId, focusScriptId, signatureScriptId, affixScriptId };
}

export function encodeScribingSkillId(
  grimoireAbilityId: number,
  focusScriptId: number,
  signatureScriptId: number,
  affixScriptId: number,
): ScribingSkillId {
  const value: ScribingSkillId = `scribing:${grimoireAbilityId}:${focusScriptId}:${signatureScriptId}:${affixScriptId}`;
  if (!decodeScribingSkillId(value)) throw new Error(`Invalid Scribing combination: ${value}`);
  return value;
}

export function isSkillAbilityId(value: unknown): value is SkillAbilityId {
  if (typeof value === 'number') {
    const skill = ESO_SKILLS_BY_ID.get(value);
    return Number.isSafeInteger(value) && value > 0 && Boolean(skill) && !skill?.isCrafted;
  }
  return decodeScribingSkillId(value) !== undefined;
}

export function getSkillAbilityById(abilityId: SkillAbilityId | ''): SkillAbility | undefined {
  if (abilityId === '') return undefined;
  const decoded = decodeScribingSkillId(abilityId);
  const resolvedId = decoded?.grimoireAbilityId ?? (typeof abilityId === 'number' ? abilityId : undefined);
  return resolvedId === undefined ? undefined : ESO_SKILLS_BY_ID.get(resolvedId);
}

export function getSkillAbilityFamilyId(abilityId: SkillAbilityId | ''): number | undefined {
  const ability = getSkillAbilityById(abilityId);
  return ability ? ability.parentAbilityId ?? ability.abilityId : undefined;
}
