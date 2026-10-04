export type CatalogSetSummary = {
  id: number;
  setName: string;
  itemCount: number;
  availableSlots: string[];
  effects: Array<{
    numberOfPiecesRequired: number;
    isPerfected: boolean;
    description: string;
  }>;
};

export function getSetMaxPiecesRequired(effects: CatalogSetSummary['effects']): number | null {
  if (effects.length === 0) return null;
  return Math.max(...effects.map((effect) => effect.numberOfPiecesRequired));
}

export function sortSetsBySelectedPieceCount(
  sets: CatalogSetSummary[],
  selectedPieceCounts: ReadonlyMap<number, number>,
): CatalogSetSummary[] {
  return [...sets].sort((firstSet, secondSet) =>
    (selectedPieceCounts.get(secondSet.id) ?? 0) - (selectedPieceCounts.get(firstSet.id) ?? 0),
  );
}

export type CatalogSetItem = {
  id: number;
  name: string;
  icon: string;
  gearType: 'armor' | 'jewelry' | 'weapon';
  equipType: string;
  armorWeight: 'light' | 'medium' | 'heavy' | null;
  weaponType: string;
  trait: string;
  setId: number;
  setName: string;
};

export type CatalogSetEntry = {
  id: number;
  setName: string;
  items: CatalogSetItem[];
  effects: CatalogSetSummary['effects'];
};

export type CatalogItemChoice = {
  key: string;
  representative: CatalogSetItem;
  variants: CatalogSetItem[];
};

export function getCatalogItemChoiceKey(item: CatalogSetItem): string {
  return JSON.stringify([item.name, item.gearType, item.equipType, item.armorWeight, item.weaponType]);
}

export function groupCatalogItems(items: CatalogSetItem[]): CatalogItemChoice[] {
  const choices = new Map<string, CatalogItemChoice>();
  for (const item of items) {
    const key = getCatalogItemChoiceKey(item);
    const choice = choices.get(key);
    if (choice) {
      choice.variants.push(item);
    } else {
      choices.set(key, { key, representative: item, variants: [item] });
    }
  }
  return [...choices.values()];
}

export function findCatalogItemVariant(choice: CatalogItemChoice | undefined, trait: string): CatalogSetItem | null {
  return choice?.variants.find((item) => item.trait === trait) ?? null;
}

export function findCompatibleSlotItem(
  source: Pick<CatalogSetItem, 'setId' | 'gearType' | 'armorWeight' | 'weaponType' | 'trait'>,
  slotItems: CatalogSetItem[],
): CatalogSetItem | null {
  return slotItems.find((item) => (
    item.setId === source.setId
    && item.gearType === source.gearType
    && item.trait === source.trait
    && (
      source.gearType === 'armor'
        ? item.armorWeight === source.armorWeight
        : source.gearType === 'weapon'
          ? item.weaponType === source.weaponType
          : true
    )
  )) ?? null;
}

const CATALOG_BASE_PATH = '/eso-set-catalog';

async function readCatalogJson<T>(relativePath: string): Promise<T> {
  const catalogPrefix = `${CATALOG_BASE_PATH}/`;
  if (!relativePath.startsWith(catalogPrefix)) {
    throw new Error(`Invalid ESO set catalog path: ${relativePath}`);
  }
  const resourcePath = relativePath.slice(catalogPrefix.length);

  if (typeof window !== 'undefined') {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
    const response = await fetch(`${basePath}${relativePath}`);
    if (!response.ok) {
      throw new Error(`Unable to load ESO set catalog resource ${relativePath}: ${response.status}`);
    }
    return response.json() as Promise<T>;
  }

  const nodePath = await import('node:path');
  const nodeFs = await import('node:fs/promises');
  const resolvedPath = nodePath.join(process.cwd(), 'data', 'eso-set-catalog', resourcePath);
  const text = await nodeFs.readFile(resolvedPath, 'utf8');
  return JSON.parse(text) as T;
}

const SET_SLOT_ALIASES: Record<string, string[]> = {
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
  mainHandFrontBar: ['Main Hand', 'One Hand', 'Two Hand', 'Bow', 'Fire Staff', 'Frost Staff', 'Lightning Staff', 'Restoration Staff'],
  offHandFrontBar: ['Off Hand', 'One Hand', 'Two Hand', 'Bow', 'Fire Staff', 'Frost Staff', 'Lightning Staff', 'Restoration Staff'],
  mainHandBackBar: ['Main Hand', 'One Hand', 'Two Hand', 'Bow', 'Fire Staff', 'Frost Staff', 'Lightning Staff', 'Restoration Staff'],
  offHandBackBar: ['Off Hand', 'One Hand', 'Two Hand', 'Bow', 'Fire Staff', 'Frost Staff', 'Lightning Staff', 'Restoration Staff'],
};

const itemCache = new Map<number, CatalogSetItem[]>();
const setCache = new Map<number, CatalogSetEntry>();
const setLoadPromises = new Map<number, Promise<CatalogSetEntry | null>>();
let itemIndexCache: Record<string, number> | null = null;
let itemIndexPromise: Promise<Record<string, number>> | null = null;

async function getItemIndex(): Promise<Record<string, number>> {
  if (itemIndexCache) return itemIndexCache;
  if (!itemIndexPromise) {
    itemIndexPromise = readCatalogJson<{ itemIdToSetId?: Record<string, number> }>(`${CATALOG_BASE_PATH}/item-index.json`)
      .then((itemIndex) => {
        itemIndexCache = itemIndex.itemIdToSetId ?? {};
        return itemIndexCache;
      })
      .finally(() => {
        itemIndexPromise = null;
      });
  }
  return itemIndexPromise;
}

export async function fetchSetCatalogIndex(): Promise<{ sets: CatalogSetSummary[] }> {
  return readCatalogJson<{ sets: CatalogSetSummary[] }>(`${CATALOG_BASE_PATH}/index.json`);
}

export async function fetchSetItemIndex(): Promise<Record<string, number>> {
  return getItemIndex();
}

export async function fetchSetById(setId: number): Promise<CatalogSetEntry | null> {
  if (setCache.has(setId)) return setCache.get(setId) ?? null;
  const pendingLoad = setLoadPromises.get(setId);
  if (pendingLoad) return pendingLoad;

  const loadPromise = (async () => {
    try {
      const rawEntry = await readCatalogJson<CatalogSetEntry>(`${CATALOG_BASE_PATH}/sets/${setId}.json`);
      const entry = {
        ...rawEntry,
        items: rawEntry.items.map((item) => ({
          ...item,
          setId: rawEntry.id,
          setName: rawEntry.setName,
        })),
      };
      setCache.set(setId, entry);
      for (const item of entry.items) {
        const variants = itemCache.get(item.id) ?? [];
        variants.push(item);
        itemCache.set(item.id, variants);
      }
      return entry;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('404') || message.includes('ENOENT')) return null;
      throw new Error(`Unable to load ESO set ${setId}: ${message}`);
    }
  })();
  setLoadPromises.set(setId, loadPromise);
  try {
    return await loadPromise;
  } finally {
    setLoadPromises.delete(setId);
  }
}

export async function ensureCatalogItemsLoaded(itemIds: number[]): Promise<void> {
  const uncachedIds = [...new Set(itemIds)].filter((itemId) => !itemCache.has(itemId));
  if (!uncachedIds.length) return;

  const itemIndex = await getItemIndex();
  const setIds = [...new Set(uncachedIds.map((itemId) => itemIndex[String(itemId)]).filter((setId): setId is number => Boolean(setId)))];
  await Promise.all(setIds.map((setId) => fetchSetById(setId)));
}

export async function ensureCatalogItemLoaded(itemId: number, trait?: string): Promise<CatalogSetItem | null> {
  const cached = itemCache.get(itemId);
  const cachedVariant = trait ? cached?.find((item) => item.trait === trait) : cached?.[0];
  if (cachedVariant) return cachedVariant;

  await ensureCatalogItemsLoaded([itemId]);
  return getCachedCatalogItem(itemId, trait);
}

export function getCachedCatalogItem(itemId: number | null | undefined, trait?: string): CatalogSetItem | null {
  if (typeof itemId !== 'number') return null;
  const variants = itemCache.get(itemId);
  if (!variants?.length) return null;
  return trait ? variants.find((item) => item.trait === trait) ?? variants[0] : variants[0];
}

export function itemMatchesSlot(
  slot: string,
  item: Pick<CatalogSetItem, 'gearType' | 'equipType' | 'weaponType'>,
): boolean {
  const slotAliases = SET_SLOT_ALIASES[slot] ?? [];
  if (item.gearType === 'armor') return slotAliases.includes(item.equipType);
  if (item.gearType === 'jewelry') return slotAliases.includes(item.equipType);
  if (item.gearType === 'weapon') {
    const weaponTypeSet = new Set([item.weaponType, item.equipType]);
    return slotAliases.some((alias) => weaponTypeSet.has(alias));
  }
  return false;
}

export function getSlotItemOptions(slot: string, setId: number): Promise<CatalogSetItem[]> {
  return fetchSetById(setId).then((entry) => {
    if (!entry) return [];
    return entry.items.filter((item) => itemMatchesSlot(slot, item));
  });
}

export function getItemLabel(item: CatalogSetItem | null | undefined): string {
  if (!item) return '';
  const equipment = item.gearType === 'armor'
    ? item.armorWeight ? `${item.armorWeight} armor` : 'armor'
    : item.gearType === 'weapon'
      ? item.weaponType
      : item.equipType;
  return [item.name, equipment].filter(Boolean).join(' • ');
}
