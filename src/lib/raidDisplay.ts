import { withBasePath } from './staticAssets';

const RAID_LOADSCREEN_BASE_PATH = '/raid-loading-screens';

const RAID_LOADSCREEN_BY_NAME: Record<string, string> = {
  "Hel Ra Citadel": withBasePath(`${RAID_LOADSCREEN_BASE_PATH}/loadscreen_helracitadel_01.png`),
  "Aetherian Archive": withBasePath(`${RAID_LOADSCREEN_BASE_PATH}/loadscreen_aetherianarchive_01.png`),
  "Sanctum Ophidia": withBasePath(`${RAID_LOADSCREEN_BASE_PATH}/loadscreen_sanctumophidia_01.png`),
  "Maw of Lorkhaj": withBasePath(`${RAID_LOADSCREEN_BASE_PATH}/loadscreen_maw_of_lorkaj.png`),
  "Cloudrest": withBasePath(`${RAID_LOADSCREEN_BASE_PATH}/loadscreen_cloudrest_01.png`),
  "Rockgrove": withBasePath(`${RAID_LOADSCREEN_BASE_PATH}/loadscreen_rockgrove_01.png`),
  "Halls of Fabrication": withBasePath(`${RAID_LOADSCREEN_BASE_PATH}/loadscreen_hallsoffabrication_01.png`),
  "Sunspire": withBasePath(`${RAID_LOADSCREEN_BASE_PATH}/loadscreen_sunspire_01.png`),
  "Asylum Sanctorium": withBasePath(`${RAID_LOADSCREEN_BASE_PATH}/loadscreen_asylumsanctorium_01.png`),
  "Kyne's Aegis": withBasePath(`${RAID_LOADSCREEN_BASE_PATH}/loadscreen_kynesaegis_01.png`),
  "Dreadsail Reef": withBasePath(`${RAID_LOADSCREEN_BASE_PATH}/loadscreen_dreadsail_reef_trial_01.png`),
  "Sanity's Edge": withBasePath(`${RAID_LOADSCREEN_BASE_PATH}/loadscreen_sanitysedge_01.png`),
  "Lucent Citadel": withBasePath(`${RAID_LOADSCREEN_BASE_PATH}/loadscreen_lucentcitadel_01.png`),
  "Ossein Cage": withBasePath(`${RAID_LOADSCREEN_BASE_PATH}/loadscreen_ossein_cage_01.png`),
};

const RAID_LOADSCREEN_BY_NORMALIZED_NAME = Object.fromEntries(
  Object.entries(RAID_LOADSCREEN_BY_NAME).map(([raidName, path]) => [normalizeRaidName(raidName), path])
);

const RAID_THEME_BY_NORMALIZED_NAME: Record<string, string> = {
  helracitadel: 'hel-ra-citadel',
  aetherianarchive: 'aetherian-archive',
  sanctumophidia: 'sanctum-ophidia',
  mawoflorkhaj: 'maw-of-lorkhaj',
  hallsoffabrication: 'halls-of-fabrication',
  sunspire: 'sunspire',
  asylumsanctorium: 'asylum-sanctorium',
  cloudrest: 'cloudrest',
  rockgrove: 'rockgrove',
  kynesaegis: 'kynes-aegis',
  dreadsailreef: 'dreadsail-reef',
  sanitysedge: 'sanitys-edge',
  lucentcitadel: 'lucent-citadel',
  osseincage: 'ossein-cage',
};

function normalizeRaidName(raidName: string): string {
  return raidName.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export const getRaidTheme = (raidName: string | null | undefined): string => {
  if (!raidName) return '';
  return RAID_THEME_BY_NORMALIZED_NAME[normalizeRaidName(raidName)] ?? '';
};

export const getRaidBackground = (raidName: string | null | undefined): string => {
  if (!raidName) return '';

  const exactMatch = RAID_LOADSCREEN_BY_NAME[raidName];
  if (exactMatch) return exactMatch;

  return RAID_LOADSCREEN_BY_NORMALIZED_NAME[normalizeRaidName(raidName)] ?? '';
};
