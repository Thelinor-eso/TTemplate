import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { defaultTemplateAssetByRaid } from '@/data/raidConstants';
import { parseTemplateDocument } from '@/features/template/raidTemplate';

describe('default raid templates', () => {
  const expectedEncountersByRaid: Record<string, string[]> = {
    'Hel Ra Citadel': ['Trashs', 'Ra Kotu', "Yokeda Kai / Yokeda Rok'dun", 'The Warrior'],
    'Aetherian Archive': ['Trashs', 'Lightning Storm Atronach', 'Foundation Stone Atronach', 'Varlariel', 'The Celestial Mage'],
    'Sanctum Ophidia': ['Trashs', 'Possessed Mantikora', 'Stonebreaker', 'Ozara', 'The Serpent'],
    'Maw of Lorkhaj': ['Trashs', "Zhaj'hassa the Forgotten", "Vashai & S'kinrai", 'Rakkhat'],
    Cloudrest: ['Trashs', 'Shade of Siroria', 'Shade of Relequen', 'Shade of Galenwe', "Z'Maja"],
    Rockgrove: ['Trashs', 'Basks-in-Snakes', 'Oaxiltso', 'Flame-Herald Bahsei', 'Ash Titan', 'Xalvakka'],
    'Halls of Fabrication': ['Trashs', 'Hunter-Killers', 'Pinnacle Factotum', 'Archcustodian', 'Refabrication Committee', 'Assembly General'],
    Sunspire: ['Trashs', 'Lokkestiiz', 'Yolnahkriin', 'Nahviintaas'],
    'Asylum Sanctorium': ['Trashs', 'Saint Llothis the Pious', 'Saint Felms the Bold', 'Saint Olms the Just'],
    "Kyne's Aegis": ['Trashs', 'Yandir the Butcher', 'Captain Vrol', 'Lord Falgravn'],
    'Dreadsail Reef': ['Trashs', 'Lylanar & Turlassil', 'Reef Guardian', 'Bow Breaker', 'Sail Ripper', 'Tideborn Taleria'],
    "Sanity's Edge": ['Trashs', 'Exarchanic Yaseyla', 'Archwizard Twelvane', 'Chimera', 'Ansuul the Tormentor'],
    'Lucent Citadel': ['Trashs', 'Count Ryelaz & Zilyesset', 'Cavot Agnan', 'Orphic Shattered Shard', 'Xoryn'],
    'Ossein Cage': ['Trashs', 'Shapers of Flesh', 'Red Witch Gedna Relvel', 'Tortured Trio', 'Jynorah & Skorkhif', 'Blood Drinker Thisa', 'Overfiend Kazpian'],
  };

  it('does not configure Neutral as a bundled raid template', () => {
    expect(defaultTemplateAssetByRaid).not.toHaveProperty('Neutral');
  });

  it('loads every configured default template using the current template schema', () => {
    for (const [raid, asset] of Object.entries(defaultTemplateAssetByRaid)) {
      const filePath = join(process.cwd(), 'public', 'default-templates', asset);
      const contents = readFileSync(filePath, 'utf8');
      const sourceTemplate = JSON.parse(contents) as Record<string, unknown>;
      expect(sourceTemplate, asset).not.toHaveProperty('version');
      const template = parseTemplateDocument(contents);

      expect(template.raid.selectedRaid, asset).toBe(raid);
    }
  });

  it('uses encounter names that belong to each selected raid', () => {
    for (const [raid, asset] of Object.entries(defaultTemplateAssetByRaid)) {
      const filePath = join(process.cwd(), 'public', 'default-templates', asset);
      const template = parseTemplateDocument(readFileSync(filePath, 'utf8'));

      expect(template.fights.map((fight) => fight.name), asset).toEqual(expectedEncountersByRaid[raid]);
    }
  });

  it('lists two tanks, two healers, then eight damage dealers in every default roster', () => {
    const expectedRoles = [
      'Tank', 'Tank', 'Heal', 'Heal',
      'DPS', 'DPS', 'DPS', 'DPS', 'DPS', 'DPS', 'DPS', 'DPS',
    ];

    for (const asset of Object.values(defaultTemplateAssetByRaid)) {
      const filePath = join(process.cwd(), 'public', 'default-templates', asset);
      const template = parseTemplateDocument(readFileSync(filePath, 'utf8'));

      expect(template.raid.players.map((player) => player.role), asset).toEqual(expectedRoles);
      for (const fight of template.fights) {
        expect(fight.playersStuff.map((player) => player.role), `${asset}: ${fight.name}`).toEqual(expectedRoles);
      }
    }
  });
});
