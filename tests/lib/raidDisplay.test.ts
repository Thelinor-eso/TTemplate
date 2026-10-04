import { describe, expect, it } from 'vitest';
import { esoRaids } from '@/data/raidConstants';
import { getRaidBackground, getRaidTheme } from '@/lib/raidDisplay';

describe('raid color themes', () => {
  it('assigns a distinct theme to every supported raid', () => {
    const themes = esoRaids.map((raid) => getRaidTheme(raid));

    expect(themes).toEqual([
      'aetherian-archive',
      'hel-ra-citadel',
      'sanctum-ophidia',
      'maw-of-lorkhaj',
      'halls-of-fabrication',
      'asylum-sanctorium',
      'cloudrest',
      'sunspire',
      'kynes-aegis',
      'rockgrove',
      'dreadsail-reef',
      'sanitys-edge',
      'lucent-citadel',
      'ossein-cage',
      '',
    ]);
    expect(new Set(themes).size).toBe(esoRaids.length);
    expect(esoRaids).toEqual([
      'Aetherian Archive',
      'Hel Ra Citadel',
      'Sanctum Ophidia',
      'Maw of Lorkhaj',
      'Halls of Fabrication',
      'Asylum Sanctorium',
      'Cloudrest',
      'Sunspire',
      "Kyne's Aegis",
      'Rockgrove',
      'Dreadsail Reef',
      "Sanity's Edge",
      'Lucent Citadel',
      'Ossein Cage',
      'Neutral',
    ]);
  });

  it('matches normalized raid names and leaves unknown raids unthemed', () => {
    expect(getRaidTheme('  KYNE S AEGIS  ')).toBe('kynes-aegis');
    expect(getRaidTheme('Unknown Trial')).toBe('');
    expect(getRaidTheme(null)).toBe('');
    expect(getRaidTheme(undefined)).toBe('');
  });
});

describe('raid loading screen artwork', () => {
  it('returns the local loading screen for Halls of Fabrication', () => {
    expect(getRaidBackground('Halls of Fabrication')).toBe(
      '/raid-loading-screens/loadscreen_hallsoffabrication_01.png',
    );
  });

  it('returns the local loading screen for Ossein Cage', () => {
    expect(getRaidBackground('Ossein Cage')).toBe(
      '/raid-loading-screens/loadscreen_ossein_cage_01.png',
    );
  });

  it('returns the local loading screen for Maw of Lorkhaj', () => {
    expect(getRaidBackground('Maw of Lorkhaj')).toBe(
      '/raid-loading-screens/loadscreen_maw_of_lorkaj.png',
    );
    expect(getRaidTheme('Maw of Lorkhaj')).toBe('maw-of-lorkhaj');
  });

  it('leaves Neutral without a raid theme or loading screen', () => {
    expect(getRaidTheme('Neutral')).toBe('');
    expect(getRaidBackground('Neutral')).toBe('');
  });
});
