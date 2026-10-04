import { describe, expect, it } from 'vitest';
import { getAbilityCategoryForId, getAbilityDisplayName, getAbilitySkillTree, getArmorWeightForAbility } from '@/lib/abilityCategories';
import {
  decodeScribingSkillId,
  encodeScribingSkillId,
  getScribingOptions,
  getSkillAbilityFamilyId,
  isSkillAbilityId,
} from '@/lib/esoSkills';
import { CommonSkillLine } from '@/features/template/raidTemplate';

describe('ESO skill ability IDs', () => {
  it('resolves an abilityId to its unchanged display name and category', () => {
    expect(getAbilityDisplayName(48991)).toBe('Force Pulse');
    expect(getAbilityCategoryForId(48991)).toBe(CommonSkillLine.DestructionStaff);
  });

  it('includes the Soul Burst Scribing grimoire under Soul Magic', () => {
    expect(getAbilityDisplayName(217462)).toBe('Soul Burst');
    expect(getAbilityCategoryForId(217462)).toBe(CommonSkillLine.SoulMagic);
    expect(getAbilitySkillTree(CommonSkillLine.SoulMagic).some(({ parent }) => parent.abilityId === 217462)).toBe(true);
  });

  it('splits armor abilities into their ESO armor weights', () => {
    expect(getArmorWeightForAbility('Annulment')).toBe('light-armor');
    expect(getArmorWeightForAbility('Evasion')).toBe('medium-armor');
    expect(getArmorWeightForAbility('Unstoppable')).toBe('heavy-armor');
    expect(getArmorWeightForAbility('Force Pulse')).toBeNull();
  });

  it('keeps base skills and morphs grouped by their ESO abilityIds', () => {
    const forceShock = getAbilitySkillTree(CommonSkillLine.DestructionStaff)
      .find(({ parent }) => parent.skillName === 'Force Shock');

    expect(forceShock?.parent.abilityId).toBe(48956);
    expect(forceShock?.morphs.map(({ abilityId, skillName }) => [abilityId, skillName])).toEqual([
      [48971, 'Crushing Shock'],
      [48991, 'Force Pulse'],
    ]);
  });

  it('resolves a base skill and its morphs to the same family', () => {
    expect(getSkillAbilityFamilyId(48956)).toBe(48956);
    expect(getSkillAbilityFamilyId(48971)).toBe(48956);
    expect(getSkillAbilityFamilyId(48991)).toBe(48956);
  });

  it('resolves a Scribing combination through its grimoire and required scripts', () => {
    const scribingId = encodeScribingSkillId(217872, 1, 24, 44);

    expect(scribingId).toBe('scribing:217872:1:24:44');
    expect(decodeScribingSkillId(scribingId)).toEqual({
      grimoireAbilityId: 217872,
      focusScriptId: 1,
      signatureScriptId: 24,
      affixScriptId: 44,
    });
    expect(getAbilityDisplayName(scribingId)).toBe('Traveling Knife');
    expect(getAbilityCategoryForId(scribingId)).toBe('Dual Wield');
    expect(getSkillAbilityFamilyId(scribingId)).toBe(217872);
    expect(isSkillAbilityId(scribingId)).toBe(true);
    expect(isSkillAbilityId(217872)).toBe(false);
  });

  it('exposes only scripts allowed by the selected grimoire', () => {
    const options = getScribingOptions(217872);

    expect(options?.focus.some((option) => option.id === 1)).toBe(true);
    expect(options?.signature.some((option) => option.id === 24)).toBe(true);
    expect(options?.affix.some((option) => option.id === 44)).toBe(true);
    expect(decodeScribingSkillId('scribing:217872:24:1:44')).toBeUndefined();
    expect(decodeScribingSkillId('scribing:217872:1:24:')).toBeUndefined();
  });
});
