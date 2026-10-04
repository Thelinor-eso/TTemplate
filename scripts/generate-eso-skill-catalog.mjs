#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIRECTORY, '..');
const UESP_EXPORT_URL = 'https://esolog.uesp.net/exportJson.php';
const DEFAULT_UESP_VERSION = '51pts';
const MAX_RANGE_WIDTH = 5000;
const MAX_RETRIES = 4;
const CONCURRENCY = 2;
const API_FIELDS = [
  'id', 'name', 'skillLine', 'prevSkill', 'nextSkill', 'nextSkill2',
  'baseAbilityId', 'rank', 'morph', 'isPlayer', 'isPassive', 'isCrafted', 'mechanic',
];
const SKILL_LINE_ALIASES = {
  'Fighters Guild': "Fighter's Guild",
  'Mages Guild': "Mage's Guild",
  'One Hand and Shield': 'One Handed',
  'Shadow': 'Shadowy Embrace',
  'Herald of the Tome': 'Herald of the Tomes',
  'Heavy Armor': 'Armor',
  'Light Armor': 'Armor',
  'Medium Armor': 'Armor',
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
    'Generate the ESO skill catalog from UESP minedSkills data.',
    '',
    'Usage:',
    '  node scripts/generate-eso-skill-catalog.mjs [options]',
    '',
    'Options:',
    '  --max-id      Highest ID to scan for root abilities; linked ranks are followed automatically (default: 300000)',
    `  --uesp-version Version for crafted Scribing tables (default: ${DEFAULT_UESP_VERSION})`,
    '  --output-dir  Destination folder (default: data/eso-skill-catalog)',
    '  --help        Show this help',
    '',
  ].join('\n'));
}

function parseInteger(value, fieldName, { minimum = 1 } = {}) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum) {
    throw new Error(`Invalid ${fieldName}: ${value}`);
  }
  return parsed;
}

function normalizeSkillLine(skillLine) {
  return SKILL_LINE_ALIASES[skillLine] ?? skillLine;
}

function normalizeSkill(record) {
  const abilityId = parseInteger(record.id, 'abilityId');
  const rawSkillLine = typeof record.skillLine === 'string' ? record.skillLine.trim() : '';
  const skillLine = normalizeSkillLine(rawSkillLine);
  const rawName = typeof record.name === 'string' ? record.name.trim() : '';
  const name = rawName.replace(new RegExp(`^(?:${[rawSkillLine, skillLine]
    .filter(Boolean)
    .map((prefix) => prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|')}):\\s*`, 'i'), '');
  const rank = parseInteger(record.rank, `rank for ability ${abilityId}`, { minimum: -1 });
  const morph = parseInteger(record.morph, `morph for ability ${abilityId}`, { minimum: -1 });
  const baseAbilityId = parseInteger(record.baseAbilityId, `baseAbilityId for ability ${abilityId}`, { minimum: -1 });
  const previousAbilityId = Number(record.prevSkill);
  const nextAbilityId = Number(record.nextSkill);
  const nextMorphAbilityId = Number(record.nextSkill2);
  const mechanic = Number(record.mechanic);

  if (!Number.isSafeInteger(previousAbilityId) || !Number.isSafeInteger(nextAbilityId) || !Number.isSafeInteger(nextMorphAbilityId)) {
    throw new Error(`Invalid skill links for ability ${abilityId}`);
  }

  return {
    abilityId,
    name,
    skillLine,
    previousAbilityId,
    nextAbilityId,
    nextMorphAbilityId,
    baseAbilityId,
    rank,
    morph,
    isPlayer: Number(record.isPlayer) === 1,
    isPassive: Number(record.isPassive) === 1,
    isCrafted: Number(record.isCrafted) > 0,
    mechanic,
  };
}

function isActiveSkill(skill) {
  return skill.isPlayer
    && !skill.isPassive
    && !skill.isCrafted
    && skill.rank > 0
    && skill.morph >= 0
    && Boolean(skill.skillLine);
}

function isActiveRecord(record) {
  return Number(record.isPlayer) === 1
    && Number(record.isPassive) !== 1
    && Number(record.isCrafted) <= 0
    && Number(record.rank) > 0
    && Number(record.morph) >= 0
    && Boolean(typeof record.skillLine === 'string' && record.skillLine.trim());
}

function parseScriptIds(value, fieldName) {
  if (typeof value !== 'string') throw new Error(`Invalid ${fieldName}: expected a comma-separated list.`);
  const ids = value.split(',').filter(Boolean).map((id) => parseInteger(id, fieldName));
  if (new Set(ids).size !== ids.length) throw new Error(`Duplicate script ID in ${fieldName}`);
  return ids;
}

export function buildSkillCatalog(records, craftedSkillRecords = [], craftedScriptRecords = []) {
  const allById = new Map();
  for (const record of records) {
    const skill = normalizeSkill(record);
    const existing = allById.get(skill.abilityId);
    if (existing) throw new Error(`Duplicate abilityId ${skill.abilityId}`);
    allById.set(skill.abilityId, skill);
  }

  const activeById = new Map([...allById].filter(([, skill]) => isActiveSkill(skill)));
  const roots = [...activeById.values()]
    .filter((skill) => skill.nextAbilityId > 0 && skill.previousAbilityId <= 0)
    .sort((left, right) => left.abilityId - right.abilityId);
  const skills = {};
  const relations = [];
  const assignedAbilityIds = new Map();

  for (const root of roots) {
    const pending = [root.abilityId];
    const tree = new Map();
    while (pending.length) {
      const abilityId = pending.pop();
      if (tree.has(abilityId)) continue;
      const skill = allById.get(abilityId);
      if (!skill) throw new Error(`Skill tree for ${root.abilityId} references missing ability ${abilityId}`);
      if (!isActiveSkill(skill)) continue;
      tree.set(abilityId, skill);
      if (skill.nextAbilityId > 0) pending.push(skill.nextAbilityId);
      if (skill.nextMorphAbilityId > 0) pending.push(skill.nextMorphAbilityId);
    }

    const branches = new Map();
    for (const skill of tree.values()) {
      if (skill.baseAbilityId !== root.baseAbilityId) {
        throw new Error(`Skill tree for ${root.abilityId} crosses baseAbilityId at ${skill.abilityId}`);
      }
      if (skill.morph > 2) throw new Error(`Unexpected morph ${skill.morph} for ability ${skill.abilityId}`);
      const branch = branches.get(skill.morph) ?? [];
      branch.push(skill);
      branches.set(skill.morph, branch);
      const existingRoot = assignedAbilityIds.get(skill.abilityId);
      if (existingRoot !== undefined && existingRoot !== root.abilityId) {
        throw new Error(`Ability ${skill.abilityId} belongs to multiple skill trees (${existingRoot} and ${root.abilityId})`);
      }
      assignedAbilityIds.set(skill.abilityId, root.abilityId);
    }

    if (!branches.has(0)) throw new Error(`Skill tree ${root.abilityId} has no base skill`);
    const finalizedBranches = new Map();
    for (const [morph, branch] of branches) {
      const highestRank = Math.max(...branch.map((skill) => skill.rank));
      const finalists = branch.filter((skill) => skill.rank === highestRank);
      if (finalists.length !== 1) {
        throw new Error(`Skill tree ${root.abilityId} has ambiguous rank ${highestRank} for morph ${morph}`);
      }
      const finalSkill = finalists[0];
      if (!finalSkill.name) throw new Error(`Ability ${finalSkill.abilityId} has no name`);
      if (finalSkill.skillLine !== root.skillLine) {
        throw new Error(`Skill ${finalSkill.abilityId} has a different skill line from its root`);
      }
      finalizedBranches.set(morph, finalSkill);
    }

    const baseSkill = finalizedBranches.get(0);
    const isUltimate = root.mechanic === 8 || root.mechanic === 10;
    for (const [morph, skill] of finalizedBranches) {
      skills[String(skill.abilityId)] = {
        name: skill.name,
        skillLine: skill.skillLine,
        isUltimate,
        isCrafted: false,
      };
      if (morph > 0) {
        relations.push({
          parentAbilityId: baseSkill.abilityId,
          childAbilityId: skill.abilityId,
          relationType: 'morph',
        });
      }
    }
  }

  const orphanedSkills = [...activeById.values()].filter((skill) => (
    (skill.previousAbilityId > 0 || skill.nextAbilityId > 0 || skill.nextMorphAbilityId > 0)
    && !assignedAbilityIds.has(skill.abilityId)
  ));
  if (orphanedSkills.length) {
    throw new Error(
      `Found ${orphanedSkills.length} active abilities outside every skill tree; first IDs: ${orphanedSkills.slice(0, 20).map((skill) => skill.abilityId).join(', ')}`,
    );
  }

  const scriptsById = new Map();
  for (const record of craftedScriptRecords) {
    const id = parseInteger(record.id, 'crafted script ID');
    const type = parseInteger(record.slot, `slot for crafted script ${id}`);
    const name = typeof record.name === 'string' ? record.name.trim() : '';
    if (!name) throw new Error(`Crafted script ${id} has no name`);
    if (type < 1 || type > 3 || scriptsById.has(id)) {
      throw new Error(`Invalid or duplicate crafted script ${id}`);
    }
    scriptsById.set(id, { id, type, name });
  }

  const scribing = {};
  for (const record of craftedSkillRecords) {
    const abilityId = parseInteger(record.abilityId, 'crafted grimoire abilityId');
    const name = typeof record.name === 'string' ? record.name.trim() : '';
    const sourceSkill = allById.get(abilityId);
    const skillLine = sourceSkill?.skillLine;
    if (!name || !skillLine) {
      throw new Error(`Crafted grimoire ${abilityId} is missing a name or skill line`);
    }
    if (Object.hasOwn(skills, abilityId) || Object.hasOwn(scribing, abilityId)) {
      throw new Error(`Duplicate crafted grimoire abilityId ${abilityId}`);
    }
    skills[String(abilityId)] = { name, skillLine, isUltimate: false, isCrafted: true };

    const options = {};
    for (const [type, field] of [[1, 'slots1'], [2, 'slots2'], [3, 'slots3']]) {
      const scriptIds = parseScriptIds(record[field], `${field} for grimoire ${abilityId}`);
      if (scriptIds.length === 0) throw new Error(`Grimoire ${abilityId} has no scripts in ${field}`);
      options[field] = scriptIds.map((id) => {
        const script = scriptsById.get(id);
        if (!script || script.type !== type) {
          throw new Error(`Grimoire ${abilityId} references invalid script ${id} in ${field}`);
        }
        return { id: script.id, name: script.name };
      });
    }
    scribing[String(abilityId)] = {
      focus: options.slots1,
      signature: options.slots2,
      affix: options.slots3,
    };
  }

  const duplicateNames = new Map();
  for (const [abilityId, skill] of Object.entries(skills)) {
    const abilityIds = duplicateNames.get(skill.name) ?? [];
    abilityIds.push(Number(abilityId));
    duplicateNames.set(skill.name, abilityIds);
  }

  relations.sort((left, right) => left.parentAbilityId - right.parentAbilityId || left.childAbilityId - right.childAbilityId);
  return {
    skills: Object.fromEntries(Object.entries(skills).sort(([left], [right]) => Number(left) - Number(right))),
    relations,
    scribing: Object.fromEntries(Object.entries(scribing).sort(([left], [right]) => Number(left) - Number(right))),
    duplicateNames: [...duplicateNames]
      .filter(([, abilityIds]) => abilityIds.length > 1)
      .sort(([left], [right]) => left.localeCompare(right)),
  };
}

function groupIdsIntoRanges(maxId) {
  const ranges = [];
  for (let startId = 1; startId <= maxId; startId += MAX_RANGE_WIDTH) {
    ranges.push({ startId, endId: Math.min(startId + MAX_RANGE_WIDTH - 1, maxId) });
  }
  return ranges;
}

function groupReferencedIdsIntoRanges(ids) {
  const ranges = [];
  const sortedIds = [...new Set(ids)].sort((left, right) => left - right);
  let startId = null;
  let endId = null;
  for (const abilityId of sortedIds) {
    if (startId === null) {
      startId = abilityId;
      endId = abilityId;
      continue;
    }
    if (abilityId - startId >= MAX_RANGE_WIDTH) {
      ranges.push({ startId, endId });
      startId = abilityId;
    }
    endId = abilityId;
  }
  if (startId !== null) ranges.push({ startId, endId });
  return ranges;
}

async function fetchRange(range) {
  const url = new URL(UESP_EXPORT_URL);
  url.searchParams.set('table', 'minedSkills');
  url.searchParams.set('startid', String(range.startId));
  url.searchParams.set('endid', String(range.endId));
  url.searchParams.set('fields', API_FIELDS.join(','));

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const response = await fetch(url, { headers: { 'User-Agent': 'TTemplate ESO skill catalog generator' } });
      if (!response.ok) {
        const errorText = await response.text();
        if ([403, 429, 500, 502, 503, 504].includes(response.status) && attempt < MAX_RETRIES) {
          const retryAfter = Number(response.headers.get('retry-after'));
          const delay = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 1000 * (2 ** attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        throw new Error(`UESP request failed (${response.status}) for IDs ${range.startId}-${range.endId}: ${errorText.slice(0, 200)}`);
      }

      const responseText = await response.text();
      let payload;
      try {
        payload = JSON.parse(responseText);
      } catch {
        throw new Error(`UESP returned non-JSON for IDs ${range.startId}-${range.endId}: ${responseText.slice(0, 200)}`);
      }
      if (payload.error?.length) throw new Error(payload.error.join('; '));
      if (!Array.isArray(payload.minedSkills)) {
        throw new Error(`UESP response for IDs ${range.startId}-${range.endId} has no minedSkills array`);
      }
      return payload.minedSkills;
    } catch (error) {
      if (attempt === MAX_RETRIES || /non-JSON|no minedSkills array/.test(error.message)) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1000 * (2 ** attempt)));
    }
  }
  throw new Error(`UESP request failed for IDs ${range.startId}-${range.endId}`);
}

async function fetchVersionedTable(table, version) {
  const url = new URL(UESP_EXPORT_URL);
  url.searchParams.set('table', table);
  url.searchParams.set('version', version);

  const response = await fetch(url, { headers: { 'User-Agent': 'TTemplate ESO skill catalog generator' } });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`UESP request failed (${response.status}) for ${table} version ${version}: ${errorText.slice(0, 200)}`);
  }
  const payload = await response.json();
  if (payload.error?.length) throw new Error(payload.error.join('; '));
  if (!Array.isArray(payload[table])) throw new Error(`UESP response for ${table} has no ${table} array`);
  return payload[table];
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

async function fetchAllLinkedSkills(maxId) {
  const recordsById = new Map();
  const addRecords = (records) => {
    for (const record of records) {
      const abilityId = parseInteger(record.id, 'abilityId');
      recordsById.set(abilityId, record);
    }
  };
  const initialRanges = groupIdsIntoRanges(maxId);
  process.stderr.write(`Scanning UESP minedSkills IDs 1-${maxId} in ${initialRanges.length} ranges...\n`);
  const initialResponses = await mapWithConcurrency(initialRanges, CONCURRENCY, async (range, index) => {
    const records = await fetchRange(range);
    if ((index + 1) % 10 === 0 || index + 1 === initialRanges.length) {
      process.stderr.write(`Completed initial scan ${index + 1}/${initialRanges.length} ranges.\n`);
    }
    return records;
  });
  addRecords(initialResponses.flat());

  while (true) {
    const linkedIds = new Set();
    for (const record of recordsById.values()) {
      if (!isActiveRecord(record)) continue;
      for (const link of [record.nextSkill, record.nextSkill2]) {
        const linkedId = Number(link);
        if (Number.isSafeInteger(linkedId) && linkedId > 0 && !recordsById.has(linkedId)) {
          linkedIds.add(linkedId);
        }
      }
    }
    if (!linkedIds.size) break;

    const ranges = groupReferencedIdsIntoRanges(linkedIds);
    process.stderr.write(`Following ${linkedIds.size} linked ability IDs in ${ranges.length} targeted ranges...\n`);
    const responses = await mapWithConcurrency(ranges, CONCURRENCY, async (range, index) => {
      const records = await fetchRange(range);
      if ((index + 1) % 10 === 0 || index + 1 === ranges.length) {
        process.stderr.write(`Completed targeted scan ${index + 1}/${ranges.length} ranges.\n`);
      }
      return records;
    });
    addRecords(responses.flat());

    const missingIds = [...linkedIds].filter((abilityId) => !recordsById.has(abilityId));
    if (missingIds.length) {
      throw new Error(`UESP returned no minedSkills record for ${missingIds.length} linked IDs; first missing: ${missingIds.slice(0, 20).join(', ')}`);
    }
  }

  return [...recordsById.values()];
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const maxId = parseInteger(options['max-id'] ?? '300000', 'max-id');
  const uespVersion = options['uesp-version'] ?? DEFAULT_UESP_VERSION;
  const sourceRecords = await fetchAllLinkedSkills(maxId);
  const [craftedSkillRecords, craftedScriptRecords] = await Promise.all([
    fetchVersionedTable('craftedSkills', uespVersion),
    fetchVersionedTable('craftedScripts', uespVersion),
  ]);
  const catalog = buildSkillCatalog(sourceRecords, craftedSkillRecords, craftedScriptRecords);
  const outputDirectory = path.resolve(options['output-dir'] ?? path.join(REPO_ROOT, 'data', 'eso-skill-catalog'));
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(path.join(outputDirectory, 'skills.json'), `${JSON.stringify(catalog.skills, null, 2)}\n`, 'utf8');
  await writeFile(path.join(outputDirectory, 'skill-relations.json'), `${JSON.stringify(catalog.relations, null, 2)}\n`, 'utf8');
  await writeFile(path.join(outputDirectory, 'scribing.json'), `${JSON.stringify(catalog.scribing, null, 2)}\n`, 'utf8');

  for (const [name, abilityIds] of catalog.duplicateNames) {
    process.stderr.write(`Ambiguous skill name "${name}" maps to abilityIds ${abilityIds.join(', ')}.\n`);
  }
  process.stdout.write(
    `Generated ${Object.keys(catalog.skills).length} skills and ${catalog.relations.length} morph relations in ${outputDirectory}\n`,
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}
