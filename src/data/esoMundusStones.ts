export const ESO_MUNDUS_STONE_DESCRIPTIONS: Readonly<Record<string, string>> = {
  'The Apprentice': 'Increases Spell Damage by 238. With 7 Divines armor pieces: 389.',
  'The Atronach': 'Increases Magicka recovery by 310. With 7 Divines armor pieces: 507.',
  'The Lady': 'Increases Physical and Spell Resistance by 2744. With 7 Divines armor pieces: 4489.',
  'The Lord': 'Increases Maximum Health by 2225. With 7 Divines armor pieces: 3639.',
  'The Lover': 'Increases Physical and Spell Penetration by 2744. With 7 Divines armor pieces: 4489.',
  'The Mage': 'Increases Maximum Magicka by 2023. With 7 Divines armor pieces: 3309.',
  'The Ritual': 'Increases healing effectiveness by 8%. With 7 Divines armor pieces: 13%.',
  'The Serpent': 'Increases Stamina recovery by 310. With 7 Divines armor pieces: 507.',
  'The Shadow': 'Increases Critical Damage and Healing by 11%. With 7 Divines armor pieces: 17%.',
  'The Steed': 'Increases run speed by 10% and Health recovery by 238. With 7 Divines armor pieces: run speed by 16% and Health recovery by 389.',
  'The Thief': 'Increases the Critical Strike rating by 1333. With 7 Divines armor pieces: 2167.',
  'The Tower': 'Increases Maximum Stamina by 2023. With 7 Divines armor pieces: 3309.',
  'The Warrior': 'Increases Weapon Damage by 238. With 7 Divines armor pieces: 389.',
};

export function getESOMundusStoneDescription(stoneName: string): string {
  return ESO_MUNDUS_STONE_DESCRIPTIONS[stoneName] ?? '';
}
