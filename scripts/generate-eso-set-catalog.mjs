#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIRECTORY, '..');
const UESP_EXPORT_URL = 'https://esolog.uesp.net/exportJson.php';
const MAX_ID_GAP = 50;
const MAX_RANGE_WIDTH = 5000;
const MAX_RETRIES = 4;
const CONCURRENCY = 2;
const API_FIELDS = [
  'itemId', 'name', 'icon', 'type', 'equipType', 'weaponType', 'armorType', 'trait',
  'setName', 'setId', 'setBonusCount', 'setMaxEquipCount',
  ...Array.from({ length: 12 }, (_, index) => `setBonusCount${index + 1}`),
  ...Array.from({ length: 12 }, (_, index) => `setBonusDesc${index + 1}`),
];

const EQUIP_TYPES = {
  1: 'Head',
  2: 'Neck',
  3: 'Chest',
  4: 'Shoulders',
  5: 'One Hand',
  6: 'Two Hand',
  7: 'Off Hand',
  8: 'Waist',
  9: 'Legs',
  10: 'Feet',
  12: 'Ring',
  13: 'Hands',
  14: 'Main Hand',
};

const WEAPON_TYPES = {
  1: 'Axe',
  2: 'Hammer',
  3: 'Sword',
  4: 'Two Handed Sword',
  5: 'Two Handed Axe',
  6: 'Two Handed Hammer',
  8: 'Bow',
  9: 'Restoration Staff',
  11: 'Dagger',
  12: 'Fire Staff',
  13: 'Frost Staff',
  14: 'Shield',
  15: 'Lightning Staff',
};

const ARMOR_WEIGHTS = {
  1: 'light',
  2: 'medium',
  3: 'heavy',
};

const TRAITS = {
  1: 'Powered',
  2: 'Charged',
  3: 'Precise',
  4: 'Infused',
  5: 'Defending',
  6: 'Training',
  7: 'Sharpened',
  8: 'Decisive',
  9: 'Intricate',
  10: 'Ornate',
  11: 'Sturdy',
  12: 'Impenetrable',
  13: 'Reinforced',
  14: 'Well Fitted',
  15: 'Training',
  16: 'Infused',
  17: 'Invigorating',
  18: 'Divines',
  19: 'Ornate',
  20: 'Intricate',
  21: 'Healthy',
  22: 'Arcane',
  23: 'Robust',
  24: 'Ornate',
  25: 'Nirnhoned',
  26: 'Nirnhoned',
  27: 'Intricate',
  28: 'Swift',
  29: 'Harmony',
  30: 'Triune',
  31: 'Bloodthirsty',
  32: 'Protective',
  33: 'Infused',
};

const TRANSMUTABLE_TRAIT_IDS_BY_GEAR_TYPE = {
  armor: [11, 12, 13, 14, 15, 16, 17, 18, 25],
  weapon: [1, 2, 3, 4, 5, 6, 7, 8, 26],
  jewelry: [21, 22, 23, 28, 29, 30, 31, 32, 33],
};

const SET_SLOT_ALIASES = {
  head: ['Head'],
  chest: ['Chest'],
  waist: ['Waist'],
  boots: ['Feet'],
  shoulders: ['Shoulders'],
  gloves: ['Hands'],
  legs: ['Legs'],
  ring1: ['Ring'],
  ring2: ['Ring'],
  necklace: ['Neck'],
  mainBarWeapon1: ['Main Hand', 'One Hand', 'Two Hand', 'Bow', 'Fire Staff', 'Frost Staff', 'Lightning Staff', 'Restoration Staff'],
  mainBarWeapon2: ['Off Hand', 'One Hand', 'Two Hand', 'Bow', 'Fire Staff', 'Frost Staff', 'Lightning Staff', 'Restoration Staff'],
  backBarWeapon1: ['Main Hand', 'One Hand', 'Two Hand', 'Bow', 'Fire Staff', 'Frost Staff', 'Lightning Staff', 'Restoration Staff'],
  backBarWeapon2: ['Off Hand', 'One Hand', 'Two Hand', 'Bow', 'Fire Staff', 'Frost Staff', 'Lightning Staff', 'Restoration Staff'],
};

function parseArguments(argumentsList) {
  const options = {};
  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];
    if (!argument.startsWith('--')) throw new Error(`Unexpected argument: ${argument}`);
    const key = argument.slice(2);
    if (key === 'help') {
      options.help = true;
      continue;
    }
    const value = argumentsList[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for --${key}`);
    options[key] = value;
    index += 1;
  }
  return options;
}

function printHelp() {
  process.stdout.write([
    'Generate the ESO set catalog from LibSets item IDs and the UESP JSON API.',
    '',
    'Usage:',
    '  node scripts/generate-eso-set-catalog.mjs [options]',
    '',
    'Options:',
    '  --source-dir  Folder containing the two required LibSets Lua files (default: data/libsets)',
    '  --api-version UESP API version; defaults to the version recorded in the Lua files',
    '  --set-name    Case-insensitive set-name filter for a pilot run',
    '  --set-id      LibSets set ID filter for a targeted run',
    '  --output-dir  Destination folder (default: data/eso-set-catalog)',
    '  --help        Show this help',
    '',
  ].join('\n'));
}

function unescapeLuaString(value) {
  return value.replace(/\\(\\|"|'|n|r|t|\d{1,3})/g, (_match, escape) => {
    if (escape === 'n') return '\n';
    if (escape === 'r') return '\r';
    if (escape === 't') return '\t';
    if (/^\d+$/.test(escape)) return String.fromCharCode(Number(escape));
    return escape;
  });
}

async function readLuaTable(filePath, tableKey) {
  const text = await readFile(filePath, 'utf8');
  const assignment = new RegExp(
    `setDataPreloaded\\[${tableKey}\\]\\s*=\\s*(\\{[^\\r\\n]*\\})`,
  ).exec(text);
  if (!assignment) throw new Error(`Could not find ${tableKey} in ${filePath}`);
  return { text, table: assignment[1] };
}

function extractApiVersion(...texts) {
  for (const text of texts) {
    const match = /Last updated:\s*API\s+(\d+)/i.exec(text);
    if (match) return match[1];
  }
  return null;
}

function parseSetNames(tableText) {
  const setNames = new Map();
  for (const match of tableText.matchAll(/\[(\d+)\]=\{([^{}]*)\}/g)) {
    const names = {};
    for (const languageMatch of match[2].matchAll(/\["(en|fr)"\]="((?:\\.|[^"\\])*)"/g)) {
      names[languageMatch[1]] = unescapeLuaString(languageMatch[2]);
    }
    setNames.set(Number(match[1]), names);
  }
  return setNames;
}

function expandItemIds(tableText) {
  const itemsByLibSetsId = new Map();
  for (const setMatch of tableText.matchAll(/\[(\d+)\]=\{([^{}]*)\}/g)) {
    const itemIds = new Set();
    for (const itemMatch of setMatch[2].matchAll(/\[\d+\]=(?:"(\d+),(\d+)"|(\d+))/g)) {
      if (itemMatch[1] !== undefined) {
        const firstItemId = Number(itemMatch[1]);
        const additionalItems = Number(itemMatch[2]);
        for (let offset = 0; offset <= additionalItems; offset += 1) {
          itemIds.add(firstItemId + offset);
        }
      } else {
        itemIds.add(Number(itemMatch[3]));
      }
    }
    itemsByLibSetsId.set(Number(setMatch[1]), [...itemIds].sort((left, right) => left - right));
  }
  return itemsByLibSetsId;
}

function makeSetEffects(item) {
  const effects = [];
  for (let index = 1; index <= 12; index += 1) {
    const description = item[`setBonusDesc${index}`]?.trim();
    if (!description) continue;
    const numberOfPiecesRequired = Number(item[`setBonusCount${index}`]);
    if (!Number.isInteger(numberOfPiecesRequired) || numberOfPiecesRequired < 1) continue;
    effects.push({
      numberOfPiecesRequired,
      isPerfected: /\(\s*\d+\s+perfected items?\s*\)/i.test(description),
      description,
    });
  }
  return effects;
}

function normalizeItem(item) {
  const equipTypeCode = Number(item.equipType);
  const armorTypeCode = Number(item.armorType);
  const weaponTypeCode = Number(item.weaponType);
  const gearType = [2, 12].includes(equipTypeCode)
    ? 'jewelry'
    : armorTypeCode > 0
      ? 'armor'
      : weaponTypeCode > 0
        ? 'weapon'
        : null;
  const setId = Number(item.setId);
  const itemId = Number(item.itemId);
  const setName = item.setName?.trim();
  const name = item.name?.trim();

  if (!Number.isInteger(itemId) || itemId < 1) throw new Error(`Invalid itemId: ${item.itemId}`);
  if (!Number.isInteger(setId) || setId < 1 || !setName) {
    throw new Error(`Item ${itemId} has no valid setId/setName`);
  }
  if (!gearType) throw new Error(`Item ${itemId} has unsupported gear type`);

  return {
    id: itemId,
    name: name || `Item ${itemId}`,
    icon: item.icon || '',
    gearType,
    equipType: EQUIP_TYPES[equipTypeCode] ?? `Unknown (${equipTypeCode})`,
    armorWeight: armorTypeCode > 0 ? ARMOR_WEIGHTS[armorTypeCode] ?? null : null,
    weaponType: weaponTypeCode > 0 ? WEAPON_TYPES[weaponTypeCode] ?? `Unknown (${weaponTypeCode})` : '',
    trait: TRAITS[Number(item.trait)] ?? '',
  };
}

function groupIdsIntoRanges(itemIds) {
  const ranges = [];
  let start = null;
  let end = null;

  for (const itemId of itemIds) {
    if (start === null) {
      start = itemId;
      end = itemId;
      continue;
    }

    const gap = itemId - end - 1;
    if (gap > MAX_ID_GAP || itemId - start + 1 > MAX_RANGE_WIDTH) {
      ranges.push({ startId: start, endId: end });
      start = itemId;
    }
    end = itemId;
  }

  if (start !== null) ranges.push({ startId: start, endId: end });
  return ranges;
}

async function fetchRange(range, apiVersion) {
  const url = new URL(UESP_EXPORT_URL);
  url.searchParams.set('table', 'minedItemSummary');
  url.searchParams.set('startid', String(range.startId));
  url.searchParams.set('endid', String(range.endId));
  url.searchParams.set('version', apiVersion);
  url.searchParams.set('fields', API_FIELDS.join(','));

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const response = await fetch(url, { headers: { 'User-Agent': 'TTemplate ESO set catalog generator' } });
      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 403 && /permission denied/i.test(errorText)) {
          throw new Error(`UESP denied API version ${apiVersion}; verify that the version is public and available.`);
        }
        if ([403, 429, 500, 502, 503, 504].includes(response.status) && attempt < MAX_RETRIES) {
          const retryAfter = Number(response.headers.get('retry-after'));
          const delay = Number.isFinite(retryAfter) && retryAfter > 0
            ? retryAfter * 1000
            : 2000 * (2 ** attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        throw new Error(`UESP request failed (${response.status}) for range ${range.startId}-${range.endId}: ${errorText.slice(0, 200)}`);
      }
      const responseText = await response.text();
      let payload;
      try {
        payload = JSON.parse(responseText);
      } catch {
        throw new Error(`UESP returned non-JSON for range ${range.startId}-${range.endId}: ${responseText.slice(0, 200)}`);
      }
      if (payload.error?.length) throw new Error(payload.error.join('; '));
      return payload.minedItemSummary ?? [];
    } catch (error) {
      if (attempt === MAX_RETRIES) throw error;
      if (/UESP denied API version|non-JSON/.test(error.message)) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1000 * (2 ** attempt)));
    }
  }
  throw new Error(`UESP request failed for range ${range.startId}-${range.endId}`);
}

async function mapWithConcurrency(values, concurrency, callback) {
  const results = new Array(values.length);
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(concurrency, values.length) }, async () => {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= values.length) return;
      results[index] = await callback(values[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

function summarizeSet(setId, setName, items, sourceRecord) {
  return {
    id: setId,
    setName,
    items,
    effects: makeSetEffects(sourceRecord)
      .sort((left, right) => left.numberOfPiecesRequired - right.numberOfPiecesRequired),
  };
}

function getAvailableSlots(items) {
  return Object.entries(SET_SLOT_ALIASES)
    .filter(([, aliases]) => items.some((item) => (
      item.gearType === 'weapon'
        ? aliases.includes(item.weaponType) || aliases.includes(item.equipType)
        : aliases.includes(item.equipType)
    )))
    .map(([slot]) => slot);
}

function addTransmutableTraits(items) {
  const itemsByEquipment = new Map();
  for (const item of items) {
    const key = JSON.stringify([item.name, item.gearType, item.equipType, item.armorWeight, item.weaponType]);
    const variants = itemsByEquipment.get(key) ?? [];
    variants.push(item);
    itemsByEquipment.set(key, variants);
  }

  return [...itemsByEquipment.values()].flatMap((variants) => {
    const representative = variants[0];
    const traitIds = TRANSMUTABLE_TRAIT_IDS_BY_GEAR_TYPE[representative.gearType];
    const existingTraits = new Set(variants.map((item) => item.trait));
    const missingVariants = traitIds
      .map((traitId) => TRAITS[traitId])
      .filter((trait) => !existingTraits.has(trait))
      .map((trait) => ({ ...representative, trait }));
    return [...variants, ...missingVariants];
  });
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }
  const sourceDirectory = path.resolve(options['source-dir'] ?? path.join(REPO_ROOT, 'data', 'libsets'));
  const itemIdsPath = path.join(sourceDirectory, 'LibSets_Data_SetItemIds.lua');
  const setNamesPath = path.join(sourceDirectory, 'LibSets_Data_SetNames.lua');
  const [{ text: itemIdsSource, table: itemIdsTable }, { text: setNamesSource, table: setNamesTable }] = await Promise.all([
    readLuaTable(itemIdsPath, 'LIBSETS_TABLEKEY_SETITEMIDS'),
    readLuaTable(setNamesPath, 'LIBSETS_TABLEKEY_SETNAMES'),
  ]);

  const apiVersion = options['api-version'] ?? extractApiVersion(itemIdsSource, setNamesSource);
  if (!apiVersion) throw new Error('Could not infer the UESP API version; pass --api-version.');

  const namesByLibSetsId = parseSetNames(setNamesTable);
  const itemsByLibSetsId = expandItemIds(itemIdsTable);
  const setNameFilter = options['set-name']?.trim().toLocaleLowerCase();
  const sourceSets = [...itemsByLibSetsId.entries()].filter(([libSetsId]) => {
    if (options['set-id'] && libSetsId !== Number(options['set-id'])) return false;
    if (!setNameFilter) return true;
    const names = namesByLibSetsId.get(libSetsId) ?? {};
    return Object.values(names).some((name) => name.toLocaleLowerCase().includes(setNameFilter));
  });

  if (!sourceSets.length) throw new Error('No LibSets set IDs matched the requested filter.');

  const requestedItemIds = [...new Set(sourceSets.flatMap(([, itemIds]) => itemIds))]
    .sort((left, right) => left - right);
  const requestedItemIdSet = new Set(requestedItemIds);
  const ranges = groupIdsIntoRanges(requestedItemIds);
  process.stderr.write(`Querying ${requestedItemIds.length} item IDs in ${ranges.length} ID ranges (API ${apiVersion})...\n`);

  const responses = await mapWithConcurrency(ranges, CONCURRENCY, async (range, index) => {
    const records = await fetchRange(range, apiVersion);
    if ((index + 1) % 20 === 0 || index + 1 === ranges.length) {
      process.stderr.write(`Completed ${index + 1}/${ranges.length} ranges.\n`);
    }
    return records;
  });

  const apiItemsById = new Map();
  for (const record of responses.flat()) {
    if (!requestedItemIdSet.has(Number(record.itemId))) continue;
    const normalized = normalizeItem(record);
    const existing = apiItemsById.get(normalized.id);
    if (existing && (existing.setId !== Number(record.setId) || existing.name !== normalized.name)) {
      throw new Error(`Conflicting UESP records for itemId ${normalized.id}`);
    }
    apiItemsById.set(normalized.id, { ...normalized, setId: Number(record.setId), setName: record.setName.trim(), raw: record });
  }

  const missingItemIds = requestedItemIds.filter((itemId) => !apiItemsById.has(itemId));
  if (missingItemIds.length) {
    throw new Error(`UESP returned no record for ${missingItemIds.length}/${requestedItemIds.length} requested item IDs; first missing: ${missingItemIds.slice(0, 20).join(', ')}`);
  }

  const selectedApiNames = setNameFilter
    ? new Set(sourceSets.flatMap(([libSetsId]) => Object.values(namesByLibSetsId.get(libSetsId) ?? [])))
    : null;
  const apiSets = new Map();
  for (const itemId of requestedItemIds) {
    const item = apiItemsById.get(itemId);
    if (selectedApiNames && ![...selectedApiNames].some((name) => name.toLocaleLowerCase() === item.setName.toLocaleLowerCase())) {
      continue;
    }
    const existing = apiSets.get(item.setId) ?? { setName: item.setName, items: new Map() };
    if (existing.setName !== item.setName) throw new Error(`Conflicting set names for setId ${item.setId}`);
    existing.items.set(item.id, item);
    apiSets.set(item.setId, existing);
  }

  const sets = [...apiSets.entries()]
    .sort(([left], [right]) => left - right)
    .map(([setId, value]) => {
      const records = [...value.items.values()].sort((left, right) => left.id - right.id);
      const items = addTransmutableTraits(records.map(({ id, name, icon, gearType, equipType, armorWeight, weaponType, trait }) => ({
        id, name, icon, gearType, equipType, armorWeight, weaponType, trait,
      })));
      return summarizeSet(setId, value.setName, items, records[0].raw);
    });

  const outputDirectory = path.resolve(options['output-dir'] ?? path.join(REPO_ROOT, 'data', 'eso-set-catalog'));
  const setFilesDirectory = path.join(outputDirectory, 'sets');
  await mkdir(setFilesDirectory, { recursive: true });

  const itemIdToSetId = {};
  const setIndex = sets.map(({ id, setName, effects, items }) => {
    for (const item of items) {
      const existingSetId = itemIdToSetId[item.id];
      if (existingSetId !== undefined && existingSetId !== id) {
        throw new Error(`Item ID ${item.id} appears in sets ${existingSetId} and ${id}`);
      }
      itemIdToSetId[item.id] = id;
    }

    return { id, setName, itemCount: items.length, availableSlots: getAvailableSlots(items), effects };
  });

  for (const set of sets) {
    await writeFile(path.join(setFilesDirectory, `${set.id}.json`), `${JSON.stringify(set)}\n`, 'utf8');
  }

  await writeFile(
    path.join(outputDirectory, 'item-index.json'),
    `${JSON.stringify({ apiVersion, itemIdToSetId })}\n`,
    'utf8',
  );
  await writeFile(
    path.join(outputDirectory, 'index.json'),
    `${JSON.stringify({ apiVersion, sets: setIndex }, null, 2)}\n`,
    'utf8',
  );

  process.stdout.write(`Generated ${sets.length} sets and ${Object.keys(itemIdToSetId).length} items in ${outputDirectory}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exitCode = 1;
});