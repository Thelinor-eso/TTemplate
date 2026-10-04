import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildSkillCatalog } from '../../scripts/generate-eso-skill-catalog.mjs';

const skill = (id, name, options = {}) => ({
  id: String(id),
  name,
  skillLine: 'Destruction Staff',
  prevSkill: '-1',
  nextSkill: '0',
  nextSkill2: '0',
  baseAbilityId: '100',
  rank: '1',
  morph: '0',
  isPlayer: '1',
  isPassive: '0',
  isCrafted: '0',
  mechanic: '1',
  ...options,
});

describe('buildSkillCatalog', () => {
  it('uses highest-rank ESO abilityIds and reconstructs morph relationships', () => {
    const catalog = buildSkillCatalog([
      skill(100, 'Force Shock', { nextSkill: '101' }),
      skill(101, 'Force Shock II', { prevSkill: '100', nextSkill: '102', rank: '2' }),
      skill(102, 'Force Shock', { prevSkill: '101', nextSkill: '110', nextSkill2: '120', rank: '3' }),
      skill(110, 'Crushing Shock', { prevSkill: '102', nextSkill: '111', morph: '1', baseAbilityId: '100' }),
      skill(111, 'Crushing Shock', { prevSkill: '110', rank: '2', morph: '1', baseAbilityId: '100' }),
      skill(120, 'Force Pulse', { prevSkill: '102', nextSkill: '121', rank: '1', morph: '2', baseAbilityId: '100' }),
      skill(121, 'Force Pulse', { prevSkill: '120', rank: '2', morph: '2', baseAbilityId: '100' }),
      skill(999, 'Not a player skill', { isPlayer: '0' }),
    ]);

    assert.deepEqual(catalog.skills, {
      102: { name: 'Force Shock', skillLine: 'Destruction Staff', isUltimate: false, isCrafted: false },
      111: { name: 'Crushing Shock', skillLine: 'Destruction Staff', isUltimate: false, isCrafted: false },
      121: { name: 'Force Pulse', skillLine: 'Destruction Staff', isUltimate: false, isCrafted: false },
    });
    assert.deepEqual(catalog.relations, [
      { parentAbilityId: 102, childAbilityId: 111, relationType: 'morph' },
      { parentAbilityId: 102, childAbilityId: 121, relationType: 'morph' },
    ]);
  });

  it('marks ultimate trees and reports repeated names without confusing their IDs', () => {
    const catalog = buildSkillCatalog([
      skill(200, 'War Horn', { nextSkill: '201', mechanic: '10', baseAbilityId: '200' }),
      skill(201, 'War Horn', { prevSkill: '200', rank: '2', mechanic: '10', baseAbilityId: '200' }),
      skill(300, 'War Horn', { nextSkill: '301', baseAbilityId: '300' }),
      skill(301, 'War Horn', { prevSkill: '300', rank: '2', baseAbilityId: '300' }),
    ]);

    assert.equal(catalog.skills[201].isUltimate, true);
    assert.equal(catalog.skills[301].isUltimate, false);
    assert.deepEqual(catalog.duplicateNames, [['War Horn', [201, 301]]]);
  });

  it('normalizes UESP line labels and removes line prefixes from display names', () => {
    const catalog = buildSkillCatalog([
      skill(600, 'Fighters Guild: Dawnbreaker', {
        skillLine: 'Fighters Guild',
        nextSkill: '601',
        mechanic: '10',
        baseAbilityId: '600',
      }),
      skill(601, 'Fighters Guild: Dawnbreaker', {
        skillLine: 'Fighters Guild',
        prevSkill: '600',
        rank: '2',
        mechanic: '10',
        baseAbilityId: '600',
      }),
    ]);

    assert.deepEqual(catalog.skills[601], {
      name: 'Dawnbreaker',
      skillLine: "Fighter's Guild",
      isUltimate: true,
      isCrafted: false,
    });
  });

  it('keeps the curated grimoire abilityId and only its compatible script options', () => {
    const catalog = buildSkillCatalog([
      skill(217472, 'Soul Burst', {
        skillLine: 'Soul Magic',
        rank: '1',
        morph: '0',
        isCrafted: '1',
        baseAbilityId: '-1',
      }),
      skill(217511, 'Healing Burst', {
        skillLine: 'Soul Magic',
        rank: '-1',
        morph: '0',
        isCrafted: '1',
        baseAbilityId: '-1',
      }),
    ], [{
      abilityId: '217472',
      name: 'Soul Burst',
      slots1: '1,2',
      slots2: '3',
      slots3: '4',
    }], [
      { id: '1', name: 'Physical Damage', slot: '1' },
      { id: '2', name: 'Poison Damage', slot: '1' },
      { id: '3', name: 'Lingering Torment', slot: '2' },
      { id: '4', name: 'Berserk', slot: '3' },
    ]);

    assert.deepEqual(catalog.skills, {
      217472: { name: 'Soul Burst', skillLine: 'Soul Magic', isUltimate: false, isCrafted: true },
    });
    assert.deepEqual(catalog.relations, []);
    assert.deepEqual(catalog.scribing, {
      217472: {
        focus: [{ id: 1, name: 'Physical Damage' }, { id: 2, name: 'Poison Damage' }],
        signature: [{ id: 3, name: 'Lingering Torment' }],
        affix: [{ id: 4, name: 'Berserk' }],
      },
    });
  });

  it('rejects crafted grimoire options that reference a script from the wrong slot', () => {
    assert.throws(() => buildSkillCatalog([
      skill(217472, 'Soul Burst', { isCrafted: '1' }),
    ], [{
      abilityId: '217472',
      name: 'Soul Burst',
      slots1: '1',
      slots2: '2',
      slots3: '3',
    }], [
      { id: '1', name: 'Physical Damage', slot: '1' },
      { id: '2', name: 'Lingering Torment', slot: '2' },
      { id: '3', name: 'Berserk', slot: '2' },
    ]), /references invalid script 3 in slots3/);
  });

  it('rejects a skill tree with an unresolved child ability', () => {
    assert.throws(
      () => buildSkillCatalog([skill(400, 'Broken Skill', { nextSkill: '401', baseAbilityId: '400' })]),
      /references missing ability 401/,
    );
  });

  it('rejects a morph that has no reconstructed parent skill', () => {
    assert.throws(
      () => buildSkillCatalog([skill(450, 'Orphan Morph', { prevSkill: '499', morph: '1', baseAbilityId: '499' })]),
      /outside every skill tree/,
    );
  });
});
