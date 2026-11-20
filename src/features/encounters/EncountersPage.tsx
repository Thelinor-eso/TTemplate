'use client';

import Image from 'next/image';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, type DragEvent, type FormEvent, type ReactNode } from 'react';
import { useRaid } from '@/features/template/RaidContext';
import EditModeToggle from '@/components/layout/EditModeToggle';
import PortalTooltip from '@/components/ui/PortalTooltip';
import EncounterMechanicsView from '@/features/encounters/EncounterMechanicsView';
import { CLASS_ICON_MAP, DEFAULT_FOOD_ICON, DEFAULT_POTION_ICON, FOOD_ICON_MAP, POTION_ICON_MAP, MUNDUS_ICON_MAP, ROLE_ICON_MAP, SKILL_LINE_ICON_MAP } from '@/data/iconMaps';
import { ESO_CLASS_SKILL_LINES, getClassForSkillLine } from '@/data/esoClasses';
import { ESO_FOODS } from '@/data/esoFoods';
import { ESO_POTIONS } from '@/data/esoPotions';
import { getESOMundusStoneDescription } from '@/data/esoMundusStones';
import { getRaidBackground, getRaidTheme } from '@/lib/raidDisplay';
import {
  AbilityCategory,
  getAbilityCategoryForId,
  getAbilityDisplayName,
  getAbilityImagePath,
  getAbilitySkillTree,
  getArmorWeightForAbility,
  type ArmorWeight,
} from '@/lib/abilityCategories';
import { fetchSetCatalogIndex, fetchSetById, getItemLabel, getSlotItemOptions, getCachedCatalogItem, ensureCatalogItemLoaded, ensureCatalogItemsLoaded, findCatalogItemVariant, findCompatibleSlotItem, getCatalogItemChoiceKey, getSetMaxPiecesRequired, groupCatalogItems, matchesCatalogSetSearch, sortSetsBySelectedPieceCount, type CatalogSetItem, type CatalogSetSummary } from '@/lib/esoSetCatalog';
import { ESO_ENCHANTS } from '@/data/esoEnchants';
import { ESO_POISONS } from '@/data/esoPoisons';
import { getCritDamageBreakdown, getSetSummary, type CritDamageBreakdown } from '@/lib/critDamage';
import useOutsideClick from '@/hooks/useOutsideClick';
import {
  decodeScribingSkillId,
  encodeScribingSkillId,
  ESO_SKILLS_BY_ID,
  getScribingOptions,
  getSkillAbilityDescription,
  getSkillAbilityFamilyId,
} from '@/lib/esoSkills';
import {
  BACK_BAR_SLOTS,
  ChampionPointDiscipline,
  CHAMPION_POINT_SLOTS,
  ChampionPointsByDiscipline,
  ClassName,
  CLASS_MASTERY_OPTIONS_BY_CLASS,
  ROLE_OPTIONS,
  RoleType,
  SKILL_CLASS_SLOTS,
  CommonSkillLine,
  ClassSkillLine,
  createEmptyGearPiece,
  createEmptyGearForSlot,
  createEmptyFightPlayerStuff,
  isMechanicsDirection,
  isMechanicsNumber,
  isMechanicsPosition,
  getPairedWeaponSlot,
  getChampionPointDisciplineFromSlot,
  requiresTwoWeaponSlots,
  MAIN_BAR_SLOTS,
  copyFightPlayerSetup,
  MUNDUS_STONE_OPTIONS,
  type FightPlayerStuff,
  type FightPlayerSetup,
  type MechanicsSide,
  type MechanicsNumber,
  type MechanicsNumberField,
  type MechanicsPosition,
  type MechanicsDirection,
  type MechanicsMirrorField,
  type GearPiece,
  type GearDraft,
  type GearSlotPiece,
  type SkillAbilityId,
  type Skills,
  type ClassMasteries,
  type ChampionPoints,
  type SetSlot,
} from '@/features/template/raidTemplate';
import { getESOClassMasteryDescription, getESOClassMasteryImage } from '@/data/esoClassMasteries';
import { GearIcon, normalizeSetName, SET_ICON_SOURCES } from '@/lib/gearIcons';
import { withBasePath } from '@/lib/staticAssets';
import {
  CHAMPION_CATEGORY_FRAME,
  CHAMPION_CATEGORY_STYLE,
  CHAMPION_DISCIPLINE_BACKGROUND,
  CHAMPION_DISCIPLINE_GROUPS,
  CHAMPION_DISCIPLINE_ICON,
  FREQUENT_CHAMPION_POINTS_BY_DISCIPLINE,
  FREQUENT_MAGE_CHAMPION_POINTS_BY_ROLE,
  FREQUENT_SITUATIONAL_CHAMPION_POINTS,
  SET_LAYOUT_ROWS,
  SET_SLOT_PLACEHOLDER_IMAGES,
} from '@/lib/encounterDisplay';

type SkillEditorState = { playerId: number; field: string; ultimateOnly: boolean };
type ScribingDraft = {
  grimoireAbilityId: number;
  focusScriptId: number | '';
  signatureScriptId: number | '';
  affixScriptId: number | '';
};
type SetEditorState = { playerId: number; slot: SetSlot };
type QuickGearSlotPreset = 'body' | 'jewelry' | 'head-shoulders' | 'front-bar' | 'back-bar';
type QuickGearArmorWeight = Exclude<CatalogSetItem['armorWeight'], null>;
type QuickGearSetupState = {
  playerId: number;
  replaceSetIds: number[];
  selectedSetId: number | null;
  isReplaceSetPickerOpen: boolean;
  selectedSlots: SetSlot[];
  draggedItems: Partial<Record<SetSlot, GearSlotPiece>>;
  bodyArmorWeight: QuickGearArmorWeight | '';
  bodyEnchantment: string;
  jewelryEnchantment: string;
  bodyTrait: string;
  jewelryTrait: string;
};
type QuickGearDefaults = Pick<QuickGearSetupState, 'bodyEnchantment' | 'jewelryEnchantment' | 'bodyTrait' | 'jewelryTrait'>;
type BulkEnchantmentCategory = 'body' | 'jewelry';
type GearDetailsState = {
  playerId: number;
  slot: SetSlot;
  label: string;
  itemId: number;
  trait?: string;
  item: CatalogSetItem | null;
};
type ConsumableEditorState = { playerId: number; type: 'food' | 'potion' };
type ChampionPointEditorState = { playerId: number; field: string };
type CopyCategory = 'sets' | 'skills' | 'championPoints';

const sortChampionPointSlots = (
  slots: readonly string[],
  championPoints: ChampionPoints,
): (keyof ChampionPoints)[] =>
  slots.filter(isChampionPointSlot).sort((left, right) => {
    const leftName = championPoints[left] ?? '';
    const rightName = championPoints[right] ?? '';
    if (!leftName && rightName) return 1;
    if (leftName && !rightName) return -1;
    return leftName.localeCompare(rightName, 'en', { sensitivity: 'base' });
  });

const REQUIRED_SET_PROPOSALS = [
  { key: 'war-machine-master-architect', label: 'War Machine / Master Architect', setIds: [331, 332], defaultPlayers: 2 },
  { key: 'pillager', label: "Pillager's Profit", setIds: [649, 650] },
  { key: 'pearlescent', label: 'Pearlescent Ward', setIds: [648, 651] },
  { key: 'serpents-disdain', label: "Serpent's Disdain", setIds: [641] },
  { key: 'alkosh', label: 'Roar of Alkosh', setIds: [232] },
  { key: 'jorvuld', label: "Jorvuld's Guidance", setIds: [346] },
  { key: 'zen', label: "Z'en's Redress", setIds: [455] },
  { key: 'martial-knowledge', label: 'Way of Martial Knowledge', setIds: [147] },
  { key: 'morag-tong', label: 'The Morag Tong', setIds: [50] },
  { key: 'nazaray', label: 'Nazaray', setIds: [633] },
  { key: 'ozezan', label: 'Ozezan the Inferno', setIds: [687] },
  { key: 'powerful-assault', label: 'Powerful Assault', setIds: [180] },
  { key: 'spell-power-cure', label: 'Spell Power Cure', setIds: [185] },
  { key: 'encratis', label: "Encratis's Behemoth", setIds: [577] },
  { key: 'saxhleel', label: 'Saxhleel Champion', setIds: [585, 589] },
  { key: 'cryptcanon', label: 'Cryptcanon Vestments', setIds: [691] },
  { key: 'spaulder-of-ruin', label: 'Spaulder of Ruin', setIds: [627] },
].map((proposal) => ({ ...proposal, defaultPlayers: proposal.defaultPlayers ?? 1 }));
type CopiedSetupState = {
  fightName: string;
  playerId: number;
  playerName: string;
  category: CopyCategory;
  setup: FightPlayerSetup;
};

const COPY_CATEGORY_LABELS: Record<CopyCategory, string> = {
  sets: 'Sets',
  skills: 'Skills, potion and food',
  championPoints: 'Champion Points',
};
const NO_TRAIT_VALUE = '__no_trait__';
type SetSlotCategory = CatalogSetItem['gearType'];
type DraggedSetSlot = {
  playerId: number;
  slot: SetSlot;
  itemId: number;
  category: SetSlotCategory;
  sourceGear?: GearSlotPiece;
};

const QUICK_GEAR_BODY_SLOTS: readonly SetSlot[] = ['chest', 'waist', 'boots', 'gloves', 'legs'];
const QUICK_GEAR_HEAD_SHOULDER_SLOTS: readonly SetSlot[] = ['head', 'shoulders'];
const QUICK_GEAR_JEWEL_SLOTS: readonly SetSlot[] = ['necklace', 'ring1', 'ring2'];
const QUICK_GEAR_FRONT_BAR_SLOTS: readonly SetSlot[] = ['mainHandFrontBar', 'offHandFrontBar'];
const QUICK_GEAR_BACK_BAR_SLOTS: readonly SetSlot[] = ['mainHandBackBar', 'offHandBackBar'];
const QUICK_GEAR_WEAPON_SLOTS: readonly SetSlot[] = [...QUICK_GEAR_FRONT_BAR_SLOTS, ...QUICK_GEAR_BACK_BAR_SLOTS];
const QUICK_GEAR_SLOT_ORDER: readonly SetSlot[] = [
  ...QUICK_GEAR_BODY_SLOTS,
  ...QUICK_GEAR_WEAPON_SLOTS,
  ...QUICK_GEAR_JEWEL_SLOTS,
  'head', 'shoulders',
];
const NORMALIZED_SET_ICON_SOURCES = new Map(
  Object.entries(SET_ICON_SOURCES).map(([setName, source]) => [normalizeSetName(setName), source]),
);

function getDefaultSetItemSelection(
  choice: ReturnType<typeof groupCatalogItems>[number] | undefined,
  slot: SetSlot,
  role: RoleType,
  preferences?: QuickGearDefaults,
) {
  if (!choice) return { trait: null, item: undefined, enchantment: '', poison: '' };

  const representative = choice.representative;
  let trait: string | null = null;
  let enchantment = '';
  let poison = '';
  if (representative.weaponType === 'Shield') {
    trait = choice.variants.some((item) => item.trait === 'Charged') ? 'Charged' : null;
    enchantment = role === RoleType.Tank ? '1' : role === RoleType.Heal ? '2' : '4';
  } else if (representative.gearType === 'armor') {
    trait = choice.variants.some((item) => item.trait === 'Divines') ? 'Divines' : null;
    const enchantId = representative.armorWeight === 'light' ? 2
      : representative.armorWeight === 'medium' ? 4
        : representative.armorWeight === 'heavy' ? 1 : null;
    enchantment = enchantId === null ? '' : String(enchantId);
  } else if (representative.gearType === 'jewelry') {
    const preferredTrait = role === RoleType.DPS ? 'Bloodthirsty' : 'Infused';
    trait = choice.variants.some((item) => item.trait === preferredTrait) ? preferredTrait : null;
    enchantment = role === RoleType.DPS ? '28' : '35';
  } else if (role === RoleType.DPS && representative.gearType === 'weapon') {
    trait = representative.equipType === 'Two Hand'
      ? slot === 'mainHandFrontBar' || slot === 'offHandFrontBar' ? 'Precise' : 'Infused'
      : slot === 'mainHandFrontBar' || slot === 'mainHandBackBar' ? 'Nirnhoned' : 'Charged';
    if (slot === 'mainHandFrontBar' || slot === 'offHandFrontBar') {
      enchantment = '10';
    } else {
      poison = 'Damage Health Poison IX';
    }
  } else if (representative.equipType === 'Two Hand') {
    trait = slot === 'mainHandFrontBar' || slot === 'offHandFrontBar' ? 'Precise' : 'Infused';
    enchantment = '18';
  } else {
    trait = slot === 'mainHandFrontBar' || slot === 'mainHandBackBar' ? 'Nirnhoned' : 'Charged';
    if (slot === 'mainHandFrontBar' || slot === 'mainHandBackBar') {
      enchantment = '10';
    } else {
      poison = 'Damage Health Poison IX';
    }
  }

  if (representative.gearType === 'armor' || representative.gearType === 'jewelry') {
    const preferredTrait = representative.gearType === 'armor'
      ? preferences?.bodyTrait
      : preferences?.jewelryTrait;
    const preferredTraitValue = preferredTrait === NO_TRAIT_VALUE ? '' : preferredTrait;
    if (
      preferredTrait
      && choice.variants.some((item) => item.trait === preferredTraitValue)
    ) {
      trait = preferredTraitValue ?? '';
    }

    const preferredEnchantment = representative.gearType === 'armor'
      ? preferences?.bodyEnchantment
      : preferences?.jewelryEnchantment;
    if (
      preferredEnchantment
      && ESO_ENCHANTS.some((enchant) => (
        String(enchant.id) === preferredEnchantment && enchant.gearType === representative.gearType
      ))
    ) {
      enchantment = preferredEnchantment;
    }
  }

  if (trait && !choice.variants.some((item) => item.trait === trait)) trait = null;
  const item = findCatalogItemVariant(choice, trait ?? '');

  return { trait, item, enchantment, poison };
}

type QuickGearAutomaticDefault = {
  armorWeight: CatalogSetItem['armorWeight'];
  trait: string | null;
  enchantmentName: string;
};

function getQuickGearArmorWeights(items: CatalogSetItem[]): QuickGearArmorWeight[] {
  return (['light', 'medium', 'heavy'] as const).filter((weight) => (
    items.some((item) => item.gearType === 'armor' && item.armorWeight === weight)
  ));
}

function getQuickGearDefaultArmorWeight(
  role: RoleType,
  availableWeights: QuickGearArmorWeight[],
): QuickGearArmorWeight | '' {
  const preferredWeight = role === RoleType.Tank ? 'heavy'
    : role === RoleType.Heal ? 'light' : 'medium';
  return availableWeights.includes(preferredWeight)
    ? preferredWeight
    : availableWeights[0] ?? '';
}

function getQuickGearAutomaticDefaults(
  items: CatalogSetItem[],
  gearType: 'armor' | 'jewelry',
  role: RoleType,
): QuickGearAutomaticDefault[] {
  const choices = groupCatalogItems(items.filter((item) => item.gearType === gearType));
  const defaults = choices.flatMap((choice) => {
    const selection = getDefaultSetItemSelection(choice, gearType === 'armor' ? 'chest' : 'necklace', role);
    const enchantment = ESO_ENCHANTS.find((entry) => String(entry.id) === selection.enchantment);
    if (!selection.item || !enchantment) return [];
    return [{
      armorWeight: gearType === 'armor' ? choice.representative.armorWeight : null,
      trait: selection.trait,
      enchantmentName: enchantment.name,
    }];
  });
  const uniqueDefaults = new Map(
    defaults.map((entry) => [
      `${entry.armorWeight ?? ''}:${entry.trait ?? ''}:${entry.enchantmentName}`,
      entry,
    ]),
  );
  return [...uniqueDefaults.values()];
}

const SET_CATALOG_SLOT_ALIASES: Partial<Record<SetSlot, string[]>> = {
  mainHandFrontBar: ['mainBarWeapon1'],
  offHandFrontBar: ['mainBarWeapon2'],
  mainHandBackBar: ['backBarWeapon1'],
  offHandBackBar: ['backBarWeapon2'],
};

function setSupportsSlot(set: CatalogSetSummary, slot: SetSlot): boolean {
  return set.availableSlots.includes(slot)
    || (SET_CATALOG_SLOT_ALIASES[slot] ?? []).some((alias) => set.availableSlots.includes(alias));
}

function getQuickGearPresetSlots(
  placement: QuickGearSlotPreset,
): SetSlot[] {
  if (placement === 'body') {
    return [...QUICK_GEAR_BODY_SLOTS];
  }
  if (placement === 'jewelry') {
    return [...QUICK_GEAR_JEWEL_SLOTS];
  }
  if (placement === 'head-shoulders') {
    return [...QUICK_GEAR_HEAD_SHOULDER_SLOTS];
  }
  return placement === 'front-bar' ? [...QUICK_GEAR_FRONT_BAR_SLOTS] : [...QUICK_GEAR_BACK_BAR_SLOTS];
}
const SKILL_BAR_SLOTS = [
  ...MAIN_BAR_SLOTS,
  'MainBarUlt',
  ...BACK_BAR_SLOTS,
  'BackBarUlt',
] as const satisfies readonly (keyof Skills)[];
type AbilityPickerEntry = {
  id: string;
  label: string;
  category: AbilityCategory;
  armorWeight?: ArmorWeight;
};
type AbilityPickerGroup = {
  label: string;
  icon: string;
  entries: AbilityPickerEntry[];
};

function getSetSlotLabel(slot: SetSlot): string {
  const labels: Record<SetSlot, string> = {
    head: 'head',
    chest: 'chest',
    waist: 'waist',
    boots: 'boots',
    shoulders: 'shoulders',
    gloves: 'gloves',
    legs: 'legs',
    necklace: 'necklace',
    ring1: 'ring',
    ring2: 'ring',
    mainHandFrontBar: 'main-hand weapon (front bar)',
    offHandFrontBar: 'off-hand weapon (front bar)',
    mainHandBackBar: 'main-hand weapon (back bar)',
    offHandBackBar: 'off-hand weapon (back bar)',
  };
  return labels[slot];
}

function getEnchantmentColorClass(enchantmentName: string | undefined): string {
  const normalizedName = enchantmentName?.toLowerCase() ?? '';
  if (normalizedName.includes('magicka')) return 'text-blue-300';
  if (normalizedName.includes('stamina')) return 'text-green-300';
  if (normalizedName.includes('health')) return 'text-red-300';
  return 'text-[#f8f7f2]';
}

function getEnchantmentIndicatorClass(enchantmentName: string | undefined): string | null {
  const normalizedName = enchantmentName?.toLowerCase() ?? '';
  if (normalizedName.includes('magicka')) return 'bg-blue-400';
  if (normalizedName.includes('stamina')) return 'bg-green-400';
  if (normalizedName.includes('health')) return 'bg-red-400';
  return null;
}

function EnchantmentIndicator({ gear }: { gear: GearSlotPiece | undefined }) {
  const enchantment = ESO_ENCHANTS.find((entry) => String(entry.id) === gear?.enchantment);
  const colorClass = getEnchantmentIndicatorClass(enchantment?.name);
  if (!enchantment || !colorClass) return null;

  return (
    <span
      role="img"
      aria-label={`${enchantment.name} enchantment`}
      className={`h-1.5 w-1.5 shrink-0 rounded-full ${colorClass}`}
      title={enchantment.name}
    />
  );
}

function getArmorWeightTextClass(weight: CatalogSetItem['armorWeight']): string {
  if (weight === 'light') return 'text-blue-300';
  if (weight === 'medium') return 'text-green-300';
  if (weight === 'heavy') return 'text-red-300';
  return 'text-[#f8f7f2]';
}

function getItemTypeLabel(item: CatalogSetItem): string {
  if (item.gearType === 'armor') {
    return item.armorWeight
      ? `${item.armorWeight[0].toUpperCase()}${item.armorWeight.slice(1)} armor`
      : 'Armor';
  }
  if (item.gearType === 'weapon') return item.weaponType;
  return `Jewelry • ${item.equipType}`;
}

function CatalogSetTooltip({ set, children }: { set: CatalogSetSummary; children: ReactNode }) {
  return (
    <PortalTooltip content={
      <>
        <span className="mb-2 block font-bold text-[#f7e7ba]">{set.setName}</span>
        {set.effects.length > 0 ? set.effects.map((effect) => (
          <span key={`${effect.numberOfPiecesRequired}-${effect.description}`} className="mt-1 block">
            {effect.description.replace(/\|c[0-9a-fA-F]{6}|\|r/g, '')}
          </span>
        )) : (
          <span className="text-white/60">No set bonuses available.</span>
        )}
      </>
    }>
      {children}
    </PortalTooltip>
  );
}

function CatalogSetSlotItems({ setId, slot }: { setId: number; slot: SetSlot }) {
  const [items, setItems] = useState<CatalogSetItem[]>([]);

  useEffect(() => {
    let active = true;
    void getSlotItemOptions(slot, setId).then((slotItems) => {
      if (active) setItems([...new Map(slotItems.map((item) => [item.name, item])).values()]);
    }).catch((error) => {
      console.error(`Unable to load slot items for ESO set ${setId}:`, error);
      if (active) setItems([]);
    });
    return () => { active = false; };
  }, [setId, slot]);

  return (
    <span className="flex h-16 min-h-16 flex-wrap content-start gap-x-3 gap-y-1 overflow-y-auto">
      {items.map((item) => (
        <span key={item.name} className="inline-flex min-w-0 items-center gap-1.5">
          <GearIcon
            gear={{ itemId: item.id, enchantment: '', trait: item.trait }}
            slot={slot}
            fallbackSrc={SET_SLOT_PLACEHOLDER_IMAGES[slot]}
            alt=""
            className="h-7 w-7 shrink-0 object-contain"
          />
          <span className="text-xs text-[#f7e7ba]/90">{item.name}</span>
        </span>
      ))}
    </span>
  );
}

type QuickGearSetResultsProps = {
  catalogSets: CatalogSetSummary[];
  isApplying: boolean;
  onSelectSet: (setId: number) => void;
  selectedSetId: number | null;
  search: string;
};

const QuickGearSetResults = memo(function QuickGearSetResults({
  catalogSets,
  isApplying,
  onSelectSet,
  selectedSetId,
  search,
}: QuickGearSetResultsProps) {
  const filteredSets = useMemo(() => (
    catalogSets
      .filter((set) => Boolean(search.trim()) && matchesCatalogSetSearch(set, search))
      .sort((first, second) => first.setName.localeCompare(second.setName))
  ), [catalogSets, search]);

  return (
    <div
      className="min-h-0 flex-1 overflow-y-auto border border-[#d6b46b]/50 p-2"
      style={{ minHeight: 0, flex: '1 1 0%' }}
    >
      {filteredSets.length ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {filteredSets.map((set) => {
            return (
              <CatalogSetTooltip key={set.id} set={set}>
                <button
                  type="button"
                  disabled={isApplying}
                  aria-pressed={selectedSetId === set.id}
                  onClick={() => onSelectSet(set.id)}
                  className={`flex min-h-20 min-w-0 items-center gap-3 rounded px-3 py-2 text-left text-sm text-[#f8f7f2] transition disabled:cursor-wait disabled:opacity-50 ${
                    selectedSetId === set.id
                      ? 'border-2 border-[#f7e7ba] bg-[#d6b46b]/15 ring-1 ring-[#d6b46b]/40'
                      : 'border border-[#d6b46b] bg-[#171717] hover:border-[#f8f7f2] hover:bg-[#242424]'
                  }`}
                >
                  <SetHeadIcon
                    setId={set.id}
                    setName={set.setName}
                    className="flex h-12 w-12 shrink-0 items-center justify-center border border-[#d6b46b]/70 bg-black/40 p-1"
                  />
                  <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">
                    <span className="block font-semibold [overflow-wrap:anywhere]">{set.setName}</span>
                  </span>
                </button>
              </CatalogSetTooltip>
            );
          })}
        </div>
      ) : (
        <p className="p-3 text-sm text-[#f8f7f2]/70">
          {search.trim() ? 'No sets found.' : 'Enter a set or item name to search.'}
        </p>
      )}
    </div>
  );
});

type QuickGearSearchResultsProps = {
  catalogSets: CatalogSetSummary[];
  hasError: boolean;
  isApplying: boolean;
  onSelectSet: (setId: number) => void;
  onSearchChange: () => void;
  selectedSetId: number | null;
};

const QuickGearSearchResults = memo(function QuickGearSearchResults({
  catalogSets,
  hasError,
  isApplying,
  onSelectSet,
  onSearchChange,
  selectedSetId,
}: QuickGearSearchResultsProps) {
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <label className="mb-3 block shrink-0 text-sm text-[#f8f7f2]">
        Search sets
        <input
          type="search"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            if (hasError) onSearchChange();
          }}
          placeholder="Search by set or item name"
          className="mt-1 w-full border border-[#d6b46b] bg-[#171717] p-2"
        />
      </label>

      <div className="mb-2 min-h-5 shrink-0">
        {search !== deferredSearch && (
          <p className="text-xs text-[#d6b46b]" role="status">Updating search results…</p>
        )}
      </div>

      <QuickGearSetResults
        catalogSets={catalogSets}
        isApplying={isApplying}
        onSelectSet={onSelectSet}
        selectedSetId={selectedSetId}
        search={deferredSearch}
      />
    </div>
  );
});

type QuickGearSlotChoiceProps = {
  slot: SetSlot;
  gear: GearSlotPiece;
  isSelected: boolean;
  isReplacedSet: boolean;
  supportsSet: boolean;
  draggable: boolean;
  onChange: (slot: SetSlot, checked: boolean) => void;
  onDragStart: (event: DragEvent<HTMLButtonElement>) => void;
  onDragEnd: () => void;
  onDragOver: (event: DragEvent<HTMLButtonElement>) => void;
  onDrop: (event: DragEvent<HTMLButtonElement>) => void;
};

const QuickGearSlotChoice = memo(function QuickGearSlotChoice({
  slot,
  gear,
  isSelected,
  isReplacedSet,
  supportsSet,
  draggable,
  onChange,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: QuickGearSlotChoiceProps) {
  const isOccupied = gear.itemId !== null;
  const occupyingItem = isOccupied ? getCachedCatalogItem(gear.itemId, gear.trait) : null;
  const occupiedBy = occupyingItem?.setName ?? '';
  const status = isOccupied ? occupiedBy : isSelected ? 'Selected' : 'Free';

  return (
    <button
      type="button"
      aria-label={`Select ${getSetSlotLabel(slot)} slot${occupiedBy ? `, ${occupiedBy}` : isOccupied ? ', occupied' : ', free'}`}
      aria-pressed={isSelected}
      aria-disabled={isReplacedSet}
      draggable={draggable}
      onClick={() => { if (!isReplacedSet) onChange(slot, !isSelected); }}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`flex w-[clamp(3rem,5vw,4.75rem)] shrink-0 flex-col items-center gap-1 rounded-lg p-1 text-center transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f7e7ba] ${
      isSelected ? 'bg-[#d6b46b]/10 ring-1 ring-[#d6b46b]/50' : 'hover:bg-white/[0.04]'
    } ${draggable ? 'cursor-grab active:cursor-grabbing' : isReplacedSet ? 'cursor-copy opacity-70' : 'cursor-pointer'}`}>
      <span className="block">
        <span className={`block h-[clamp(2rem,4vw,3rem)] w-[clamp(2rem,4vw,3rem)] overflow-hidden rounded border-2 bg-black/60 p-0.5 ${
          isSelected ? 'border-[#f7e7ba]' : isOccupied ? 'border-white/35' : 'border-dashed border-yellow-700'
        }`}>
          <GearIcon
            gear={gear}
            slot={slot}
            fallbackSrc={SET_SLOT_PLACEHOLDER_IMAGES[slot]}
            alt={getSetSlotLabel(slot)}
            className={`h-full w-full object-cover ${isOccupied ? '' : 'opacity-50'}`}
          />
        </span>
      </span>
      <span className="flex w-full items-center justify-center gap-1 text-[9px] font-semibold capitalize leading-tight text-[#f8f7f2]">
        <span className="break-words">{slot === 'ring1' ? 'Ring 1' : slot === 'ring2' ? 'Ring 2' : getSetSlotLabel(slot)}</span>
        <EnchantmentIndicator gear={gear} />
      </span>
      <span className={`w-full break-words text-[8px] leading-tight ${
        !supportsSet ? 'text-white/35' : isReplacedSet || isSelected ? 'text-amber-200' : isOccupied ? 'text-orange-200/80' : 'text-emerald-200/70'
      }`}>
        {!supportsSet ? 'Unsupported' : status}
      </span>
    </button>
  );
});

type SetEditorSearchResultsProps = {
  catalogSets: CatalogSetSummary[];
  selectedPieceCounts: ReadonlyMap<number, number>;
  slot: SetSlot;
  onSelectSet: (setId: number) => void;
};

type SetEditorSetListProps = SetEditorSearchResultsProps & { search: string };

const SetEditorSetList = memo(function SetEditorSetList({
  catalogSets,
  selectedPieceCounts,
  slot,
  onSelectSet,
  search,
}: SetEditorSetListProps) {
  const filteredSets = useMemo(() => sortSetsBySelectedPieceCount(
    catalogSets.filter((set) => (
      Boolean(search.trim())
      && matchesCatalogSetSearch(set, search)
      && (setSupportsSlot(set, slot) || Boolean(search.trim()))
    )),
    selectedPieceCounts,
  ), [catalogSets, search, selectedPieceCounts, slot]);
  const equippedSets = filteredSets.filter((set) => (selectedPieceCounts.get(set.id) ?? 0) > 0);
  const otherSets = filteredSets.filter((set) => (selectedPieceCounts.get(set.id) ?? 0) === 0);

  return (
    <div className="min-h-0 flex-1 space-y-5 overflow-y-auto pr-1">
      {[
        { title: 'Sets already equipped on this player', sets: equippedSets },
        { title: 'Other sets', sets: otherSets },
      ].map(({ title, sets }) => sets.length > 0 && (
        <section key={title}>
          <h3 className="mb-2 text-sm font-semibold text-[#d6b46b]">{title}</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            {sets.map((set) => {
              const supportsSelectedSlot = setSupportsSlot(set, slot);
              return (
                <CatalogSetTooltip key={set.id} set={set}>
                  <button
                    type="button"
                    disabled={!supportsSelectedSlot}
                    onClick={() => onSelectSet(set.id)}
                    title={!supportsSelectedSlot ? 'This set cannot be equipped in the selected slot.' : undefined}
                    className="flex h-full min-h-32 min-w-0 flex-col rounded border border-[#d6b46b] bg-[#171717] px-3 py-2 text-left text-sm [overflow-wrap:anywhere] text-[#f8f7f2] transition hover:border-[#f8f7f2] hover:bg-[#242424] disabled:opacity-45 disabled:hover:border-[#d6b46b] disabled:hover:bg-[#171717]"
                  >
                    <span className="line-clamp-2 min-h-10 font-semibold">{set.setName}</span>
                    <span aria-hidden="true" className="my-2 block border-t border-[#d6b46b]/50" />
                    <CatalogSetSlotItems setId={set.id} slot={slot} />
                    {!supportsSelectedSlot && (
                      <span className="mt-1 block text-xs font-medium text-amber-200/80">
                        Cannot equip in {getSetSlotLabel(slot)}
                      </span>
                    )}
                  </button>
                </CatalogSetTooltip>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
});

const SetEditorSearchResults = memo(function SetEditorSearchResults({
  catalogSets,
  selectedPieceCounts,
  slot,
  onSelectSet,
}: SetEditorSearchResultsProps) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState(search);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedSearch(search), 200);
    return () => window.clearTimeout(timeoutId);
  }, [search]);

  return (
    <>
      <div className="relative mb-4 shrink-0">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by set or item name..."
          aria-label="Search a set"
          className="w-full border border-[#d6b46b] bg-[#171717] px-3 py-2 text-[#f8f7f2] outline-none placeholder:text-[#b7b5aa]/80 focus:border-[#f8f7f2]"
        />
      </div>

      <div className="mb-2 min-h-5 shrink-0" aria-live="polite">
        {search !== debouncedSearch && (
          <p className="text-xs text-[#d6b46b]">Updating search results…</p>
        )}
      </div>

      <SetEditorSetList
        catalogSets={catalogSets}
        selectedPieceCounts={selectedPieceCounts}
        slot={slot}
        onSelectSet={onSelectSet}
        search={debouncedSearch}
      />
    </>
  );
});


function getAbilityTooltipContent(value: SkillAbilityId | '') {
  const abilityName = getAbilityDisplayName(value);
  const abilityDescription = getSkillAbilityDescription(value);
  const decoded = decodeScribingSkillId(value);
  const options = decoded ? getScribingOptions(decoded.grimoireAbilityId) : undefined;

  return (
    <>
      <span className="mb-1 block font-bold text-[#f7e7ba]">{abilityName}</span>
      {abilityDescription && (
        <span className="mb-1 block whitespace-pre-line leading-relaxed">{abilityDescription}</span>
      )}
      {decoded && options ? (
        <span className="space-y-1">
          {(['focus', 'signature', 'affix'] as const).map((kind) => (
            <span key={kind} className="block">
              <span className="text-[#d6b46b]">{kind[0].toUpperCase() + kind.slice(1)}: </span>
              {options[kind].find((option) => option.id === decoded[`${kind}ScriptId` as 'focusScriptId' | 'signatureScriptId' | 'affixScriptId'])?.name ?? '—'}
            </span>
          ))}
        </span>
      ) : null}
    </>
  );
}

function CritDamageValue({ breakdown, children }: { breakdown: CritDamageBreakdown; children: ReactNode }) {
  return (
    <PortalTooltip content={<>
      <span className="mb-2 block font-bold text-[#f7e7ba]">Crit Damage: {breakdown.total}%</span>
      <span className="mb-1 block text-white/60">Calculation sources</span>
      {breakdown.contributions.map(({ source, value }) => (
        <span key={source} className="flex justify-between gap-4 border-b border-white/10 py-0.5 last:border-0">
          <span>{source}</span><span className="shrink-0 text-[#f7e7ba]">+{value}%</span>
        </span>
      ))}
      <span className="mt-2 block border-t border-[#d6b46b]/50 pt-2 text-white/70">
        Total before cap: {breakdown.calculatedTotal}% · Cap: {breakdown.cap}%
      </span>
    </>}>
      {children}
    </PortalTooltip>
  );
}

function SetHeadIcon({
  setId,
  setName,
  className = 'mb-2 flex h-12 w-12 items-center justify-center border border-[#d6b46b] bg-black/40 p-1',
}: {
  setId: number;
  setName: string;
  className?: string;
}) {
  const [headItem, setHeadItem] = useState<CatalogSetItem | null>(null);
  const staticIcon = SET_ICON_SOURCES[setName]
    ?? NORMALIZED_SET_ICON_SOURCES.get(normalizeSetName(setName));

  useEffect(() => {
    if (staticIcon) return;
    let active = true;
    void fetchSetById(setId).then((set) => {
      if (active) setHeadItem(set?.items.find((item) => item.equipType === 'Head') ?? set?.items[0] ?? null);
    }).catch(() => {
      if (active) setHeadItem(null);
    });
    return () => { active = false; };
  }, [setId, staticIcon]);

  if (staticIcon) {
    return (
      <span className={className}>
        <Image src={staticIcon} alt={`${setName} icon`} width={40} height={40} className="h-full w-full object-cover" />
      </span>
    );
  }
  if (!headItem) return null;
  return (
    <span className={className}>
      <GearIcon gear={{ itemId: headItem.id, enchantment: '', trait: headItem.trait }} slot="head" fallbackSrc={SET_SLOT_PLACEHOLDER_IMAGES.head} alt={`${setName} head`} className="h-full w-full object-cover" />
    </span>
  );
}

function withoutWeaponPoison(draft: GearDraft): GearPiece {
  return {
    itemId: draft.itemId,
    enchantment: draft.enchantment,
    ...(draft.trait !== undefined ? { trait: draft.trait } : {}),
  };
}

function GearDetailsTooltip({ itemId, gear, slot }: { itemId: number; gear: GearSlotPiece | undefined; slot: SetSlot }) {
  const [item, setItem] = useState<CatalogSetItem | null>(() => getCachedCatalogItem(itemId, gear?.trait));

  useEffect(() => {
    let active = true;
    void ensureCatalogItemLoaded(itemId, gear?.trait).then((loadedItem) => {
      if (!active) return;
      setItem(loadedItem);
    }).catch(() => {
      if (active) setItem(null);
    });
    return () => { active = false; };
  }, [itemId, gear?.trait]);

  const enchantment = ESO_ENCHANTS.find((entry) => String(entry.id) === gear?.enchantment);
  const poison = gear && 'poison' in gear ? gear.poison : null;
  const thirdDetailLabel = item?.gearType === 'weapon' && poison ? 'Poison' : 'Enchantment';
  const thirdDetailValue = thirdDetailLabel === 'Poison'
    ? poison
    : enchantment?.name ?? (gear?.enchantment ? `Unknown enchantment (${gear.enchantment})` : 'None');
  const itemType = item ? getItemTypeLabel(item) : 'Loading...';

  return (
    <div className="w-full">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-bold text-[#f7e7ba]">{item?.name ?? 'Loading item...'}</h3>
        <GearIcon gear={gear} slot={slot} fallbackSrc={SET_SLOT_PLACEHOLDER_IMAGES[slot]} alt={item ? getItemLabel(item) : 'Selected item'} className="h-12 w-12 shrink-0 border border-[#d6b46b] bg-black/40 p-1 object-cover" />
      </div>
      <div className="my-2 border-t border-[#d6b46b]" />
      <dl className="space-y-1">
        <div><dt className="inline text-[#d6b46b]">Item type: </dt><dd className={`inline ${item?.gearType === 'armor' ? getArmorWeightTextClass(item.armorWeight) : ''}`}>{itemType}</dd></div>
        <div><dt className="inline text-[#d6b46b]">Trait: </dt><dd className="inline">{gear?.trait || item?.trait || 'No trait'}</dd></div>
        <div>
          <dt className="inline text-[#d6b46b]">{thirdDetailLabel}: </dt>
          <dd className={`inline ${thirdDetailLabel === 'Enchantment' ? getEnchantmentColorClass(enchantment?.name) : ''}`}>{thirdDetailValue}</dd>
        </div>
      </dl>
    </div>
  );
}

const ARMOR_WEIGHT_LABELS: Record<ArmorWeight, string> = {
  'light-armor': 'Light Armor',
  'medium-armor': 'Medium Armor',
  'heavy-armor': 'Heavy Armor',
};
const ARMOR_WEIGHT_ICONS: Record<ArmorWeight, string> = {
  'light-armor': 'Annulment',
  'medium-armor': 'Evasion',
  'heavy-armor': 'Unstoppable',
};
const ABILITY_GROUP_ICONS = {
  weapons: withBasePath('/roles/ESO_Tank.png'),
  armor: withBasePath('/game-assets/storage/menu/IGgoadTlLaThNn5S1F6JN3RGFymHsXY0FUMiMg5C.webp'),
  guild: withBasePath('/skill-lines/gp_guild_rankicon_misc10_large.png'),
  allianceWar: withBasePath('/game-assets/storage/menu/nvQJZZ0uBduAbh9Zjgh4KiQhdwNtGjvHT1SKsm2w.webp'),
  world: withBasePath('/skill-lines/skills_announce_world.png'),
} as const;
const COMMON_ABILITY_GROUPS: Array<{
  label: string;
  icon?: string;
  categories: Array<{ category: AbilityCategory; label?: string; armorWeight?: ArmorWeight }>;
}> = [
  {
    label: 'Weapons',
    icon: ABILITY_GROUP_ICONS.weapons,
    categories: [
      { category: CommonSkillLine.TwoHanded },
      { category: CommonSkillLine.OneHanded, label: 'One Hand and Shield' },
      { category: CommonSkillLine.DualWield },
      { category: CommonSkillLine.Bow },
      { category: CommonSkillLine.DestructionStaff },
      { category: CommonSkillLine.RestorationStaff },
    ],
  },
  {
    label: 'Armure',
    icon: ABILITY_GROUP_ICONS.armor,
    categories: (['light-armor', 'medium-armor', 'heavy-armor'] as const).map((armorWeight) => ({
      category: CommonSkillLine.Armor,
      label: ARMOR_WEIGHT_LABELS[armorWeight],
      armorWeight,
    })),
  },
  {
    label: 'World',
    icon: ABILITY_GROUP_ICONS.world,
    categories: [
      { category: CommonSkillLine.Vampire },
      { category: CommonSkillLine.Werewolf },
      { category: CommonSkillLine.SoulMagic },
    ],
  },
  {
    label: 'Guild',
    icon: ABILITY_GROUP_ICONS.guild,
    categories: [
      { category: CommonSkillLine.FightersGuild },
      { category: CommonSkillLine.MagesGuild },
      { category: CommonSkillLine.Undaunted },
      { category: CommonSkillLine.PsijicOrder },
    ],
  },
  {
    label: 'Alliance War',
    icon: ABILITY_GROUP_ICONS.allianceWar,
    categories: [
      { category: CommonSkillLine.Assault },
      { category: CommonSkillLine.Support },
    ],
  },
];

function getAbilityPickerIcon(category: AbilityCategory, armorWeight?: ArmorWeight): string {
  const representativeAbility = armorWeight
    ? ARMOR_WEIGHT_ICONS[armorWeight]
    : getAbilitySkillTree(category)[0]?.parent.skillName;
  return representativeAbility ? getAbilityImagePath(category, representativeAbility) : '';
}

function isSkillBarSlot(field: string): field is keyof Skills {
  return SKILL_BAR_SLOTS.some((slot) => slot === field);
}

function isUltimateSkillSlot(field: keyof Skills): boolean {
  return field === 'MainBarUlt' || field === 'BackBarUlt';
}

function isChampionPointSlot(field: string): field is keyof ChampionPoints {
  return CHAMPION_POINT_SLOTS.some((slot) => slot === field);
}

function getSetSlotCategory(slot: SetSlot): SetSlotCategory {
  if (['head', 'chest', 'waist', 'boots', 'shoulders', 'gloves', 'legs'].includes(slot)) return 'armor';
  if (['ring1', 'ring2', 'necklace'].includes(slot)) return 'jewelry';
  return 'weapon';
}

function CopyIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <rect x="8" y="8" width="12" height="12" rx="1.5" />
      <path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8" />
    </svg>
  );
}

function PasteIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M8 5H6.5A1.5 1.5 0 0 0 5 6.5v13A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V6.5A1.5 1.5 0 0 0 17.5 5H16" />
      <rect x="8" y="3" width="8" height="4" rx="1" />
    </svg>
  );
}

function ClearIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4">
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

function findAbilityCategory(abilityId: SkillAbilityId | ''): AbilityCategory | null {
  return getAbilityCategoryForId(abilityId);
}

function countPlayersWithCompleteRequiredSet(
  fight: { playersStuff: FightPlayerStuff[] },
  setIds: number[],
  catalogSets: CatalogSetSummary[],
): number {
  return fight.playersStuff.filter((playerStuff) => {
    const summary = getSetSummary(playerStuff.sets, catalogSets);
    return setIds.some((id) => {
      const requiredPieces = getSetMaxPiecesRequired(catalogSets.find((set) => set.id === id)?.effects ?? []);
      return requiredPieces !== null
        && (summary.find((entry) => entry.id === id)?.pieceCount ?? 0) >= requiredPieces;
    });
  }).length;
}

export default function EncountersPage() {
  const { template, players, updatePlayerClasses, updatePlayerClassMasteries, updatePlayerRole, updateFightPlayerStuff, updateFightPlayerMechanics, updatePlayerMundus, pasteFightPlayerSetup, pasteFightSetup, addFight, duplicateFight, renameFight, removeFight, swapFights, updateFightRequiredSets, isEditMode } = useRaid();
  const [selectedFightName, setSelectedFightName] = useState(template.fights[0]?.name ?? '');
  const requiredSetSearchRef = useRef<HTMLDivElement>(null);
  const playerSetupEditorRef = useRef<HTMLDivElement>(null);
  const [activeView, setActiveView] = useState<'table' | 'overview' | 'mechanics'>('table');
  const [isDeleteFightConfirmationOpen, setIsDeleteFightConfirmationOpen] = useState(false);
  const [selectedSetupPlayerId, setSelectedSetupPlayerId] = useState<number | null>(null);
  const [skillEditor, setSkillEditor] = useState<SkillEditorState | null>(null);
  const [scribingDraft, setScribingDraft] = useState<ScribingDraft | null>(null);
  const [viewChampionDiscipline, setViewChampionDiscipline] = useState<{ playerId: number; playerName: string; discipline: ChampionPointDiscipline } | null>(null);
  const [overviewSetPlayerId, setOverviewSetPlayerId] = useState<number | null>(null);
  const [mundusEditorPlayerId, setMundusEditorPlayerId] = useState<number | null>(null);
  const [setEditor, setSetEditor] = useState<SetEditorState | null>(null);
  const [quickGearSetup, setQuickGearSetup] = useState<QuickGearSetupState | null>(null);
  const [quickGearError, setQuickGearError] = useState<string | null>(null);
  const [quickGearTraitOptions, setQuickGearTraitOptions] = useState<{ body: string[]; jewelry: string[]; items: CatalogSetItem[] }>({ body: [], jewelry: [], items: [] });
  const [isApplyingQuickGear, setIsApplyingQuickGear] = useState(false);
  const [bulkEnchantmentPlayerId, setBulkEnchantmentPlayerId] = useState<number | null>(null);
  const [bulkEnchantmentEditor, setBulkEnchantmentEditor] = useState<{ playerId: number; category: BulkEnchantmentCategory } | null>(null);
  const [gearDetails, setGearDetails] = useState<GearDetailsState | null>(null);
  const [gearDetailsError, setGearDetailsError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setQuickGearTraitOptions({ body: [], jewelry: [], items: [] });
    const setId = quickGearSetup?.selectedSetId;
    if (setId === null || setId === undefined) return () => { cancelled = true; };

    void fetchSetById(setId).then((entry) => {
      if (!entry) throw new Error('Unable to load trait options for the selected set.');
      const getTraits = (gearType: 'armor' | 'jewelry') => [...new Set(
        entry.items.filter((item) => item.gearType === gearType).map((item) => item.trait),
      )].sort((first, second) => first.localeCompare(second));
      if (!cancelled) {
        setQuickGearTraitOptions({
          body: getTraits('armor'),
          jewelry: getTraits('jewelry'),
          items: entry.items,
        });
      }
    }).catch((error: unknown) => {
      if (!cancelled) {
        setQuickGearError(error instanceof Error ? error.message : String(error));
      }
    });

    return () => { cancelled = true; };
  }, [quickGearSetup?.selectedSetId]);

  const [setTransferError, setSetTransferError] = useState<string | null>(null);
  const [gearDraft, setGearDraft] = useState<GearDraft | null>(null);
  const [catalogSets, setCatalogSets] = useState<CatalogSetSummary[]>([]);
  const [requiredSetSearch, setRequiredSetSearch] = useState('');
  const [isRequiredSetSearchOpen, setIsRequiredSetSearchOpen] = useState(false);
  const [isRequiredSetsExpanded, setIsRequiredSetsExpanded] = useState(true);
  const [setItemOptions, setSetItemOptions] = useState<CatalogSetItem[]>([]);
  const [selectedSetId, setSelectedSetId] = useState<number | null>(null);
  const [selectedItemChoiceKey, setSelectedItemChoiceKey] = useState('');
  const [selectedTrait, setSelectedTrait] = useState<string | null>(null);
  const [foodSearch, setFoodSearch] = useState('');
  const [potionSearch, setPotionSearch] = useState('');
  const [consumableEditor, setConsumableEditor] = useState<ConsumableEditorState | null>(null);
  const [championPointEditor, setChampionPointEditor] = useState<ChampionPointEditorState | null>(null);
  const [currentAbilityEntryId, setCurrentAbilityEntryId] = useState<string>(ClassSkillLine.EarthenHeart);
  const [showSetDetailsByPlayer, setShowSetDetailsByPlayer] = useState<Record<number, boolean>>({});
  const [copiedSetup, setCopiedSetup] = useState<CopiedSetupState | null>(null);
  const [copiedEncounterName, setCopiedEncounterName] = useState<string | null>(null);
  const [isAddingFight, setIsAddingFight] = useState(false);
  const [newFightName, setNewFightName] = useState('New Encounter');
  const [isRenamingFight, setIsRenamingFight] = useState(false);
  const [renamedFightName, setRenamedFightName] = useState('');
  const [renameFightError, setRenameFightError] = useState<string | null>(null);
  const [draggedFightName, setDraggedFightName] = useState<string | null>(null);
  const [dropTargetFightName, setDropTargetFightName] = useState<string | null>(null);
  const [playerSetupEditor, setPlayerSetupEditor] = useState<{ playerId: number; type: 'skill'; index: number } | { playerId: number; type: 'mastery' } | { playerId: number; type: 'role' } | null>(null);

  const closePlayerSetupEditor = useCallback(() => setPlayerSetupEditor(null), []);
  const closeRequiredSetSearch = useCallback(() => setIsRequiredSetSearchOpen(false), []);
  useOutsideClick(playerSetupEditorRef, playerSetupEditor !== null, closePlayerSetupEditor);
  useOutsideClick(requiredSetSearchRef, isRequiredSetSearchOpen && Boolean(requiredSetSearch.trim()), closeRequiredSetSearch);

  const hasOpenSelection = Boolean(
    isDeleteFightConfirmationOpen || skillEditor || viewChampionDiscipline
    || overviewSetPlayerId !== null || mundusEditorPlayerId !== null || setEditor || gearDetails
    || consumableEditor || championPointEditor || playerSetupEditor || isRequiredSetSearchOpen
    || quickGearSetup || bulkEnchantmentPlayerId !== null,
  );

  useEffect(() => {
    if (!hasOpenSelection) return;

    const root = document.documentElement;
    const body = document.body;
    const scrollY = window.scrollY;
    const previousBodyStyles = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      width: body.style.width,
    };

    root.classList.add('encounter-selection-open');
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.left = '0';
    body.style.width = '100%';

    return () => {
      root.classList.remove('encounter-selection-open');
      body.style.position = previousBodyStyles.position;
      body.style.top = previousBodyStyles.top;
      body.style.left = previousBodyStyles.left;
      body.style.width = previousBodyStyles.width;
      window.scrollTo(0, scrollY);
    };
  }, [hasOpenSelection]);

  const selectPlayerSkillLine = (playerId: number, index: number, skillLine: ClassSkillLine) => {
    if (!isEditMode) return;
    const player = players.find((entry) => entry.id === playerId);
    if (!player) return;
    const current = SKILL_CLASS_SLOTS.map((slot) => player.skillClasses[slot]);
    if (current.some((line, slotIndex) => line === skillLine && slotIndex !== index)) return;
    const next = { ...player.skillClasses, [SKILL_CLASS_SLOTS[index]]: skillLine };
    updatePlayerClasses(playerId, next);
    const lines = SKILL_CLASS_SLOTS.map((slot) => next[slot]);
    const className = getClassForSkillLine(lines[0]);
    if (!className || lines.some((line) => !line || getClassForSkillLine(line) !== className)) {
      updatePlayerClassMasteries(playerId, { firstClassMastery: '', secondClassMastery: '' });
    }
    setPlayerSetupEditor(null);
  };

  const togglePlayerMastery = (playerId: number, className: ClassName, mastery: string) => {
    if (!isEditMode) return;
    const player = players.find((entry) => entry.id === playerId);
    if (!player) return;
    const current = player.classMasteries;
    const selected = current.firstClassMastery === mastery || current.secondClassMastery === mastery;
    const next: ClassMasteries = { ...current };
    if (selected) {
      if (next.firstClassMastery === mastery) next.firstClassMastery = '';
      if (next.secondClassMastery === mastery) next.secondClassMastery = '';
    } else if (!next.firstClassMastery) next.firstClassMastery = mastery;
    else if (!next.secondClassMastery) next.secondClassMastery = mastery;
    else next.secondClassMastery = mastery;
    updatePlayerClassMasteries(playerId, next);
  };

  const toggleMasteryMenu = (playerId: number) => {
    setPlayerSetupEditor(playerSetupEditor?.playerId === playerId && playerSetupEditor.type === 'mastery'
      ? null
      : { playerId, type: 'mastery' });
  };

  const hasCompletePlayerClass = (player: (typeof players)[number]) => {
    const lines = SKILL_CLASS_SLOTS.map((slot) => player.skillClasses[slot]);
    const className = getClassForSkillLine(lines.find(Boolean));
    return !!className && lines.every((line) => !!line && getClassForSkillLine(line) === className);
  };

  const renderPlayerSetupEditors = (player: (typeof players)[number]) => {
    const className = getClassForSkillLine(player.skillClasses.MainSkillClass);
    const completeClass = hasCompletePlayerClass(player);
    if (!isEditMode) return <span className="font-semibold text-white/50">Class Masteries</span>;
    return <div className="relative">
        <button type="button" disabled={!completeClass} aria-expanded={playerSetupEditor?.playerId === player.id && playerSetupEditor.type === 'mastery'} onClick={() => toggleMasteryMenu(player.id)} className="font-semibold text-white/50 hover:text-yellow-200 hover:underline disabled:cursor-default">Class Masteries</button>
        {playerSetupEditor?.playerId === player.id && playerSetupEditor.type === 'mastery' && className && completeClass && <div className="absolute left-0 top-full z-50 mt-1 max-h-80 w-72 overflow-y-auto rounded border-2 border-yellow-500 bg-gray-800 shadow-2xl">{CLASS_MASTERY_OPTIONS_BY_CLASS[className].map((mastery) => { const selected = player.classMasteries.firstClassMastery === mastery || player.classMasteries.secondClassMastery === mastery; const full = !!player.classMasteries.firstClassMastery && !!player.classMasteries.secondClassMastery; const image = getESOClassMasteryImage(mastery); return <button key={mastery} type="button" disabled={!selected && full} onClick={() => togglePlayerMastery(player.id, className, mastery)} className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition ${selected ? 'bg-yellow-700 font-semibold text-yellow-50' : 'text-yellow-200 hover:bg-yellow-700 disabled:opacity-40'}`}><PortalTooltip content={<><span className="block font-bold text-[#f7e7ba]">{mastery}</span><span className="mt-1 block leading-relaxed">{getESOClassMasteryDescription(mastery)}</span></>}><span className="flex min-w-0 flex-1 items-center gap-2">{image && <Image src={image} alt="" width={40} height={40} className="h-10 w-10 shrink-0 object-contain" />}<span className="min-w-0 flex-1 font-semibold">{mastery}</span>{selected && <span className="ml-auto font-bold text-yellow-200">✓</span>}</span></PortalTooltip></button>; })}</div>}
      </div>;
  };

  const renderRoleIcon = (player: (typeof players)[number]) => {
    const open = playerSetupEditor?.playerId === player.id && playerSetupEditor.type === 'role';
    return <PortalTooltip content={<span className="block font-bold text-[#f7e7ba]">{player.role}</span>}><div ref={open ? playerSetupEditorRef : null} className="relative inline-block">
      <button type="button" disabled={!isEditMode} aria-label={`${player.name} role: ${player.role}`} aria-expanded={isEditMode ? open : undefined} onClick={() => isEditMode && setPlayerSetupEditor(open ? null : { playerId: player.id, type: 'role' })} className={`raid-interactive-tile ${isEditMode ? 'cursor-pointer rounded hover:ring-2 hover:ring-yellow-300' : 'cursor-default'}`}>
        <Image src={ROLE_ICON_MAP[player.role] || ''} alt={player.role} width={40} height={40} className="h-10 w-10" />
      </button>
      {open && <div className="absolute left-1/2 top-full z-50 mt-1 w-40 -translate-x-1/2 rounded border-2 border-yellow-500 bg-gray-800 shadow-2xl">{ROLE_OPTIONS.map((role: RoleType) => <button key={role} type="button" onClick={() => { updatePlayerRole(player.id, role); setPlayerSetupEditor(null); }} className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition ${player.role === role ? 'bg-yellow-700 text-yellow-50' : 'text-yellow-200 hover:bg-yellow-700'}`}><Image src={ROLE_ICON_MAP[role]} alt="" width={24} height={24} className="h-6 w-6" />{role}</button>)}</div>}
    </div></PortalTooltip>;
  };

  const renderSkillLineIcons = (player: (typeof players)[number], size: 'small' | 'large') => (
    <div className="flex items-center justify-center gap-2">
      {SKILL_CLASS_SLOTS.map((slot, index) => {
        const line = player.skillClasses[slot];
        if (!isEditMode && !line) return null;
        const icon = line ? SKILL_LINE_ICON_MAP[line] : undefined;
        const open = playerSetupEditor?.playerId === player.id && playerSetupEditor.type === 'skill' && playerSetupEditor.index === index;
        const iconSize = size === 'small' ? 24 : 32;
        const tile = (
          <div key={slot} ref={open ? playerSetupEditorRef : null} className="relative">
            <button type="button" disabled={!isEditMode} aria-label={`${player.name} skill line ${index + 1}${line ? `: ${line}` : ': empty'}`} aria-expanded={isEditMode ? open : undefined} onClick={() => isEditMode && setPlayerSetupEditor(open ? null : { playerId: player.id, type: 'skill', index })} className={`${line ? 'raid-interactive-tile' : ''} ${size === 'small' ? 'h-6 w-6' : 'h-8 w-8'} flex items-center justify-center rounded-full border ${line ? 'border-yellow-500 bg-black/30 p-1' : 'border-dashed border-yellow-600 bg-black/20'} ${isEditMode ? `cursor-pointer ${line ? 'hover:border-yellow-300' : ''}` : 'cursor-default'}`}>
              {icon ? <Image src={icon} alt="" width={iconSize} height={iconSize} className="h-full w-full rounded-full object-cover" /> : isEditMode ? <span className="text-sm leading-none text-yellow-300">+</span> : null}
            </button>
            {open && <div className={`absolute top-full z-50 mt-1 max-h-64 w-56 overflow-auto rounded border border-yellow-500 bg-gray-900 p-1 shadow-xl ${size === 'small' && index === 2 ? 'right-0' : 'left-0'}`}>{Object.entries(ESO_CLASS_SKILL_LINES).map(([name, options]) => <div key={name}><div className="sticky top-0 bg-gray-950 px-2 py-1 text-[10px] font-bold text-yellow-300">{name}</div>{options.map((option) => <button key={option} type="button" disabled={SKILL_CLASS_SLOTS.some((otherSlot, otherIndex) => otherIndex !== index && player.skillClasses[otherSlot] === option)} onClick={() => selectPlayerSkillLine(player.id, index, option)} className="flex w-full items-center gap-2 px-2 py-1 text-left text-xs text-yellow-100 hover:bg-yellow-800 disabled:opacity-40">{SKILL_LINE_ICON_MAP[option] && <Image src={SKILL_LINE_ICON_MAP[option]} alt="" width={24} height={24} className="h-6 w-6" />}<span>{option}</span></button>)}</div>)}</div>}
          </div>
        );
        return line ? (
          <PortalTooltip key={slot} content={<span className="block font-bold text-[#f7e7ba]">{line}</span>}>
            {tile}
          </PortalTooltip>
        ) : tile;
      })}
    </div>
  );

  useEffect(() => {
    const hasOpenMenu = Boolean(
      isDeleteFightConfirmationOpen || skillEditor || viewChampionDiscipline
      || overviewSetPlayerId !== null || mundusEditorPlayerId !== null || setEditor || gearDetails
      || consumableEditor || championPointEditor || playerSetupEditor || isRequiredSetSearchOpen || quickGearSetup,
    );
    if (!hasOpenMenu) return;

    const closeMenusOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (isApplyingQuickGear) return;
      event.preventDefault();
      setIsDeleteFightConfirmationOpen(false);
      setSkillEditor(null);
      setScribingDraft(null);
      setViewChampionDiscipline(null);
      setOverviewSetPlayerId(null);
      setMundusEditorPlayerId(null);
      setSetEditor(null);
      setGearDetails(null);
      setConsumableEditor(null);
      setChampionPointEditor(null);
      setPlayerSetupEditor(null);
      setIsRequiredSetSearchOpen(false);
      setQuickGearSetup(null);
      setQuickGearError(null);
    };

    window.addEventListener('keydown', closeMenusOnEscape);
    return () => window.removeEventListener('keydown', closeMenusOnEscape);
  }, [isDeleteFightConfirmationOpen, skillEditor, viewChampionDiscipline, overviewSetPlayerId, mundusEditorPlayerId, setEditor, gearDetails, consumableEditor, championPointEditor, playerSetupEditor, isRequiredSetSearchOpen, quickGearSetup, isApplyingQuickGear]);

  const draggedAbilitySlot = useRef<{ playerId: number; field: keyof Skills } | null>(null);
  const draggedChampionPointSlot = useRef<{ playerId: number; field: keyof ChampionPoints } | null>(null);
  const draggedSetSlot = useRef<DraggedSetSlot | null>(null);
  const autoSelectFirstItemForSetId = useRef<number | null>(null);

  const raidBackground = getRaidBackground(template.raid.selectedRaid);
  const raidTheme = getRaidTheme(template.raid.selectedRaid);

  const activeFightName = template.fights.some((entry) => entry.name === selectedFightName)
    ? selectedFightName
    : template.fights[0]?.name ?? '';
  const fight = template.fights.find((entry) => entry.name === activeFightName) ?? template.fights[0];
  const updatePlayerMechanicsAssignment = (
    playerId: number,
    field: 'side' | 'slayerStack' | 'position' | MechanicsNumberField,
    value: MechanicsSide | MechanicsPosition | MechanicsNumber | null,
  ) => {
    const currentMechanics = fight.playersStuff.find((entry) => entry.id === playerId)?.mechanics ?? {};
    const mechanics = { ...currentMechanics };
    if (field === 'position') {
      if (value === null) delete mechanics.position;
      else if (isMechanicsPosition(value)) mechanics.position = value;
      else throw new Error('Invalid position assignment: expected an integer from 1 to 6.');
    } else if (field === 'current' || field === 'knot') {
      if (value === null) delete mechanics[field];
      else if (isMechanicsNumber(value)) {
        const isNumberAlreadyAssigned = fight.playersStuff.some((entry) => (
          entry.id !== playerId && entry.mechanics[field] === value
        ));
        if (isNumberAlreadyAssigned) {
          throw new Error(`Invalid ${field} assignment: number ${value} is already assigned.`);
        }
        mechanics[field] = value;
      } else throw new Error(`Invalid ${field} assignment: expected an integer from 1 to 12.`);
    } else if (value === null) delete mechanics[field];
    else if (value === 'left' || value === 'right') mechanics[field] = value;
    else throw new Error(`Invalid ${field} assignment: expected left or right.`);
    if (field === 'side' && value !== currentMechanics.side) delete mechanics.position;
    updateFightPlayerMechanics(fight.name, playerId, mechanics);
  };
  const updatePlayerMirrorMechanicsAssignment = (
    playerId: number,
    field: MechanicsMirrorField,
    directions: MechanicsDirection[] | null,
  ) => {
    const currentMechanics = fight.playersStuff.find((entry) => entry.id === playerId)?.mechanics ?? {};
    const mirrors = { ...currentMechanics.mirrors };
    if (directions === null) delete mirrors[field];
    else if (
      directions.length <= 1
      && directions.every(isMechanicsDirection)
      && new Set(directions).size === directions.length
    ) mirrors[field] = directions;
    else throw new Error('Invalid mirror assignment: each player can have at most one direction per mechanic.');
    const mechanics = { ...currentMechanics };
    if (Object.keys(mirrors).length > 0) mechanics.mirrors = mirrors;
    else delete mechanics.mirrors;
    updateFightPlayerMechanics(fight.name, playerId, mechanics);
  };
  const assignPlayerToMechanicsPosition = (playerId: number, side: MechanicsSide, position: MechanicsPosition) => {
    const currentMechanics = fight.playersStuff.find((entry) => entry.id === playerId)?.mechanics ?? {};
    updateFightPlayerMechanics(fight.name, playerId, { ...currentMechanics, side, position });
  };
  useEffect(() => {
    setIsRequiredSetsExpanded(true);
  }, [activeFightName]);
  useEffect(() => {
    const handleEncounterClipboard = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
      const key = event.key.toLowerCase();
      if (key !== 'c' && key !== 'v') return;
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
      if (key === 'c') {
        const currentFight = template.fights.find((entry) => entry.name === activeFightName);
        if (!currentFight) return;
        try {
          window.localStorage.setItem('ttemplate:encounter-clipboard', JSON.stringify({
            playersStuff: currentFight.playersStuff.map((playerStuff) => ({
              playerId: playerStuff.id,
              setup: copyFightPlayerSetup(playerStuff),
            })),
          }));
        } catch { return; }
        event.preventDefault();
        setCopiedEncounterName(currentFight.name);
        return;
      }
      let clipboard: { playersStuff?: Array<{ playerId: number; setup: FightPlayerSetup }> };
      try {
        const stored = window.localStorage.getItem('ttemplate:encounter-clipboard');
        if (!stored) return;
        clipboard = JSON.parse(stored);
      } catch { return; }
      if (!Array.isArray(clipboard.playersStuff)) return;
      event.preventDefault();
      pasteFightSetup(activeFightName, clipboard.playersStuff.filter((entry) => (
        Number.isInteger(entry?.playerId) && entry.setup && typeof entry.setup === 'object'
      )));
    };
    window.addEventListener('keydown', handleEncounterClipboard);
    return () => window.removeEventListener('keydown', handleEncounterClipboard);
  }, [activeFightName, pasteFightSetup, template.fights]);
  const visibleSetupPlayerId = players.some((player) => player.id === selectedSetupPlayerId)
    ? selectedSetupPlayerId
    : null;
  const visiblePlayers = visibleSetupPlayerId === null
    ? players
    : players.filter((player) => player.id === visibleSetupPlayerId);
  const allEncounterPlayerStuff = players.map((player) =>
    fight?.playersStuff.find((entry) => entry.id === player.id) ?? createEmptyFightPlayerStuff(player));
  const availableSetItems = setItemOptions.filter((item) => item.setId === selectedSetId);
  const itemChoices = groupCatalogItems(availableSetItems);
  const selectedItemChoice = itemChoices.find((choice) => choice.key === selectedItemChoiceKey);
  const selectedSetItem = selectedTrait === null
    ? null
    : findCatalogItemVariant(selectedItemChoice, selectedTrait === NO_TRAIT_VALUE ? '' : selectedTrait);
  const availableTraits = selectedItemChoice
    ? [...new Set(selectedItemChoice.variants.map((item) => item.trait))]
    : [];
  const isShieldItem = selectedSetItem?.weaponType === 'Shield';
  const enchantmentOptions = selectedSetItem
    ? ESO_ENCHANTS.filter((enchant) => enchant.gearType === (isShieldItem ? 'armor' : selectedSetItem.gearType))
    : [];
  const validEnchantment = Boolean(
    selectedSetItem
    && gearDraft?.enchantment
    && enchantmentOptions.some((enchant) => String(enchant.id) === gearDraft.enchantment),
  );
  const poisonOptions = selectedSetItem?.gearType === 'weapon' && !isShieldItem ? ESO_POISONS : [];
  const validPoison = Boolean(gearDraft && 'poison' in gearDraft && gearDraft.poison && poisonOptions.some((poison) => poison === gearDraft.poison));
  const canValidateSet = Boolean(selectedSetId !== null && selectedItemChoice && selectedTrait !== null && selectedSetItem && (validEnchantment || validPoison));
  const previewItem = selectedItemChoice?.representative;

  const editingPlayer = skillEditor
    ? players.find((player) => player.id === skillEditor.playerId)
    : undefined;
  const editingPlayerStuff = skillEditor
    ? fight?.playersStuff.find((entry) => entry.id === skillEditor.playerId)
    : undefined;
  const editingBarSlots = skillEditor?.field.startsWith('MainBar')
    ? [...MAIN_BAR_SLOTS, 'MainBarUlt'] as const
    : [...BACK_BAR_SLOTS, 'BackBarUlt'] as const;
  const occupiedAbilityFamilies = new Set(
    skillEditor && editingPlayerStuff
      ? editingBarSlots.flatMap((slot) => {
        if (slot === skillEditor.field) return [];
        const familyId = getSkillAbilityFamilyId(editingPlayerStuff.competencies[slot]);
        return familyId === undefined ? [] : [familyId];
      })
      : [],
  );
  const selectedClassSkillLines = editingPlayer
    ? [
      editingPlayer.skillClasses.MainSkillClass,
      editingPlayer.skillClasses.SecondSkillClass,
      editingPlayer.skillClasses.ThirdSkillClass,
    ].filter(Boolean)
    : Object.values(ESO_CLASS_SKILL_LINES).flat();
  const selectedClassNames = Array.from(new Set(
    selectedClassSkillLines
      .map((skillLine) => getClassForSkillLine(skillLine))
      .filter((className): className is ClassName => className !== null),
  ));
  const classAbilityGroups: AbilityPickerGroup[] = selectedClassNames.map((className) => {
    const selectedLinesForClass = new Set(
      selectedClassSkillLines.filter((skillLine) => getClassForSkillLine(skillLine) === className),
    );
    const entries = ESO_CLASS_SKILL_LINES[className]
      .filter((skillLine) => selectedLinesForClass.has(skillLine))
      .map((skillLine) => ({
        id: skillLine,
        label: skillLine,
        category: skillLine,
      }));

    return { label: className, icon: CLASS_ICON_MAP[className], entries };
  });
  const commonAbilityGroups: AbilityPickerGroup[] = COMMON_ABILITY_GROUPS.map(({ label, icon, categories }) => ({
    label,
    icon: icon ?? getAbilityPickerIcon(categories[0].category, categories[0].armorWeight),
    entries: categories.map(({ category, label: entryLabel, armorWeight }) => ({
      id: armorWeight ? `${category}:${armorWeight}` : category,
      label: entryLabel ?? category,
      category,
      ...(armorWeight ? { armorWeight } : {}),
    })),
  }));
  const abilityPickerGroups = [...classAbilityGroups, ...commonAbilityGroups];
  const availableAbilityEntries = abilityPickerGroups.flatMap(({ entries }) => entries);
  const activeAbilityEntry = availableAbilityEntries.find(({ id }) => id === currentAbilityEntryId)
    ?? availableAbilityEntries[0];
  const activeSkillCategory = activeAbilityEntry?.category ?? ClassSkillLine.EarthenHeart;
  const selectedScribingGrimoire = scribingDraft
    ? ESO_SKILLS_BY_ID.get(scribingDraft.grimoireAbilityId)
    : undefined;
  const selectedScribingOptions = scribingDraft
    ? getScribingOptions(scribingDraft.grimoireAbilityId)
    : undefined;
  const scribingChoices = [
    { field: 'focusScriptId', label: 'Focus Script', options: selectedScribingOptions?.focus ?? [] },
    { field: 'signatureScriptId', label: 'Signature Script', options: selectedScribingOptions?.signature ?? [] },
    { field: 'affixScriptId', label: 'Affix Script', options: selectedScribingOptions?.affix ?? [] },
  ] as const;
  const selectedSetPieceCounts = setEditor
    ? new Map(
      getSetSummary(
        fight?.playersStuff.find((entry) => entry.id === setEditor.playerId)?.sets ?? {},
        catalogSets,
      ).map(({ id, pieceCount }) => [id, pieceCount]),
    )
    : new Map<number, number>();
  const filteredFoods = ESO_FOODS.filter((food) => food.name.toLowerCase().includes(foodSearch.trim().toLowerCase()));
  const filteredPotions = ESO_POTIONS.filter((potion) => potion.name.toLowerCase().includes(potionSearch.trim().toLowerCase()));
  const foodGroups = [
    { label: 'Mono-stat', foods: filteredFoods.filter((food) => [261, 351, 153].includes(food.id)) },
    { label: 'Bi-stat', foods: filteredFoods.filter((food) => [341, 62, 538].includes(food.id)) },
    { label: 'Stat + recovery', foods: filteredFoods.filter((food) => [119, 257, 175, 75, 120764, 71059].includes(food.id)) },
    { label: 'Full recovery', foods: filteredFoods.filter((food) => food.id === 41) },
    { label: 'Tri-stat', foods: filteredFoods.filter((food) => food.id === 537) },
  ].filter((group) => group.foods.length > 0);
  const potionEffects: Record<string, string> = {
    'Spell Power': 'Restores Magicka; increases Spell Damage and Spell Critical.',
    Stamina: 'Restores Stamina; increases Weapon Damage and Weapon Critical.',
    Health: 'Restores Health.',
    Magicka: 'Restores Magicka.',
    'Tri-Stat': 'Restores Health, Magicka, and Stamina.',
    'Essence of Heroism': 'Grants Ultimate while active.',
  };

  useEffect(() => {
    void fetchSetCatalogIndex().then((catalog) => {
      setCatalogSets(catalog.sets);
    });
  }, []);

  useEffect(() => {
    const itemIds = [...new Set(template.fights.flatMap((fight) =>
      fight.playersStuff.flatMap((playerStuff) =>
        Object.values(playerStuff.sets).map((gear) => gear.itemId),
      ),
    ).filter((itemId): itemId is number => itemId !== null))];
    if (!itemIds.length) return;

    let active = true;
    void ensureCatalogItemsLoaded(itemIds).then(() => {
      if (active) setCatalogSets((current) => [...current]);
    });
    return () => {
      active = false;
    };
  }, [template.fights]);

  useEffect(() => {
    if (!setEditor || selectedSetId !== null || gearDraft?.itemId == null) return;
    let active = true;
    void ensureCatalogItemLoaded(gearDraft.itemId).then((item) => {
      if (!active || !item) return;
      setSelectedSetId(item.setId);
      setSelectedItemChoiceKey(getCatalogItemChoiceKey(item));
      setSelectedTrait(gearDraft.trait || item.trait || NO_TRAIT_VALUE);
    });
    return () => {
      active = false;
    };
  }, [gearDraft?.itemId, gearDraft?.trait, selectedSetId, setEditor]);

  useEffect(() => {
    if (!setEditor || !selectedSetId) {
      return;
    }

    let active = true;
    void getSlotItemOptions(setEditor.slot, selectedSetId).then((items) => {
      if (active) setSetItemOptions(items);
    });
    return () => {
      active = false;
    };
  }, [selectedSetId, setEditor]);

  useEffect(() => {
    if (
      !setEditor
      || selectedSetId === null
      || autoSelectFirstItemForSetId.current !== selectedSetId
      || itemChoices.length === 0
    ) {
      return;
    }

    const firstChoice = itemChoices[0];
    const role = fight?.playersStuff.find((player) => player.id === setEditor.playerId)?.role ?? RoleType.DPS;
    const defaults = getDefaultSetItemSelection(firstChoice, setEditor.slot, role);

    setSelectedItemChoiceKey(firstChoice.key);
    setSelectedTrait(defaults.trait);
    setGearDraft((current) => {
      const draft = current ? withoutWeaponPoison(current) : createEmptyGearPiece();
      return {
      ...draft,
      itemId: defaults.item?.id ?? null,
      trait: defaults.trait ?? '',
      enchantment: defaults.enchantment,
      ...(defaults.item?.gearType === 'weapon' ? { poison: defaults.poison } : {}),
      };
    });
    autoSelectFirstItemForSetId.current = null;
  }, [fight?.playersStuff, itemChoices, selectedSetId, setEditor]);

  useEffect(() => {
    if (!gearDetails || gearDetails.item) return;

    let active = true;
    void ensureCatalogItemLoaded(gearDetails.itemId, gearDetails.trait).then((item) => {
      if (!active) return;
      if (!item) {
        setGearDetailsError('Unable to load this set item.');
        return;
      }
      setGearDetails((current) => (
        current
        && current.playerId === gearDetails.playerId
        && current.slot === gearDetails.slot
        && current.itemId === gearDetails.itemId
        && current.trait === gearDetails.trait
          ? { ...current, item }
          : current
      ));
    }).catch((error: unknown) => {
      if (active) {
        setGearDetailsError(error instanceof Error ? error.message : String(error));
      }
    });
    return () => {
      active = false;
    };
  }, [gearDetails]);

  if (!fight) {
    return (
      <div className="app-page encounters-page flex items-center justify-center bg-[#050506] p-8 text-white">
        No encounter table available.
      </div>
    );
  }

  const handleAddFight = () => {
    setIsRenamingFight(false);
    setNewFightName('New Encounter');
    setIsAddingFight(true);
  };

  const handleStartRenameFight = () => {
    setIsAddingFight(false);
    setRenamedFightName(fight.name);
    setRenameFightError(null);
    setIsRenamingFight(true);
  };

  const handleRenameFight = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextName = renamedFightName.trim();
    if (!nextName) {
      setRenameFightError('Encounter name cannot be empty.');
      return;
    }
    if (template.fights.some((entry) => entry.name === nextName && entry.name !== fight.name)) {
      setRenameFightError('An encounter with this name already exists.');
      return;
    }

    const renamed = renameFight(fight.name, nextName);
    if (!renamed) {
      setRenameFightError('Unable to rename this encounter.');
      return;
    }

    setSelectedFightName(renamed);
    setCopiedSetup((current) => (
      current?.fightName === fight.name ? { ...current, fightName: renamed } : current
    ));
    setIsRenamingFight(false);
    setRenameFightError(null);
  };

  const handleCreateFight = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextName = addFight(newFightName.trim() || 'New Encounter');
    setSelectedFightName(nextName);
    setIsAddingFight(false);
  };

  const handleDuplicateFight = () => {
    const nextName = duplicateFight(fight.name);
    if (nextName) {
      setSelectedFightName(nextName);
      setIsAddingFight(false);
    }
  };

  const handleRemoveFight = () => {
    setIsDeleteFightConfirmationOpen(true);
  };

  const confirmRemoveFight = () => {
    const currentFightIndex = template.fights.findIndex((entry) => entry.name === fight.name);
    const previousFightName = currentFightIndex > 0 ? template.fights[currentFightIndex - 1]?.name : null;
    const nextName = removeFight(fight.name);
    const selectedName = previousFightName ?? nextName;
    if (selectedName) {
      setSelectedFightName(selectedName);
    }
    setIsDeleteFightConfirmationOpen(false);
  };

  const renderCopyPasteControls = (
    category: CopyCategory,
    playerId: number,
    playerName: string,
    playerStuff: FightPlayerStuff,
    emptyPlayerStuff: FightPlayerStuff,
  ) => {
    const canPaste = copiedSetup
      && (copiedSetup.fightName !== fight.name || copiedSetup.playerId !== playerId)
      && copiedSetup.category === category;

    return isEditMode ? (
      <div className="encounter-setup-actions flex justify-center gap-1">
        <button
          type="button"
          aria-label={`Copy ${COPY_CATEGORY_LABELS[category]}`}
          onClick={() => setCopiedSetup({
            fightName: fight.name,
            playerId,
            playerName,
            category,
            setup: copyFightPlayerSetup(playerStuff),
          })}
          className="flex h-7 w-7 items-center justify-center rounded border border-[#d6b46b] bg-[#1c1c1f] text-white transition hover:bg-[#333] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#f8f7f2]"
        >
          <CopyIcon />
        </button>
        <button
          type="button"
          disabled={!canPaste}
          aria-label={`Paste ${COPY_CATEGORY_LABELS[category]}`}
          onClick={() => {
            if (!canPaste || !copiedSetup) return;
            const setup = copyFightPlayerSetup(playerStuff);
            if (category === 'sets') setup.sets = copiedSetup.setup.sets;
            if (category === 'skills') {
              setup.competencies = copiedSetup.setup.competencies;
              setup.potion = copiedSetup.setup.potion;
              setup.food = copiedSetup.setup.food;
            }
            if (category === 'championPoints') setup.championPoints = copiedSetup.setup.championPoints;
            pasteFightPlayerSetup(fight.name, playerId, setup);
          }}
          className="paste-setup-button flex h-7 w-7 items-center justify-center rounded border border-[#d6b46b] bg-[#d6b46b] text-black transition hover:bg-[#f7e7ba] disabled:cursor-not-allowed disabled:border-yellow-900 disabled:bg-[#29251a] disabled:text-yellow-800"
        >
          <PasteIcon />
        </button>
        <button
          type="button"
          aria-label={`Clear ${COPY_CATEGORY_LABELS[category]}`}
          onClick={() => {
            const setup = copyFightPlayerSetup(playerStuff);
            const emptySetup = copyFightPlayerSetup(emptyPlayerStuff);
            if (category === 'sets') setup.sets = emptySetup.sets;
            if (category === 'skills') {
              setup.competencies = emptySetup.competencies;
              setup.potion = emptySetup.potion;
              setup.food = emptySetup.food;
            }
            if (category === 'championPoints') setup.championPoints = emptySetup.championPoints;
            pasteFightPlayerSetup(fight.name, playerId, setup);
          }}
          className="ml-0.5 flex h-7 w-7 translate-x-0.5 items-center justify-center rounded border border-red-700 bg-[#1c1c1f] text-red-300 transition hover:border-red-400 hover:bg-red-950 hover:text-red-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#f8f7f2]"
        >
          <ClearIcon />
        </button>
      </div>
    ) : null;
  };

  const renderAbilityButton = (playerId: number, field: keyof Skills, value: SkillAbilityId | '', compact = false) => {
    const slotLabel = field === 'MainBarUlt'
      ? 'Main bar ultimate'
      : field === 'BackBarUlt'
        ? 'Back bar ultimate'
        : field.startsWith('MainBar')
          ? `Main bar slot ${field.slice('MainBar'.length)}`
          : `Back bar slot ${field.slice('BackBar'.length)}`;
    const category = findAbilityCategory(value) ?? activeSkillCategory;
    const hasValue = Boolean(value);
    const abilityName = getAbilityDisplayName(value);
    const decodedScribingId = decodeScribingSkillId(value);

    const button = (
      <button
        type="button"
        aria-label={`${slotLabel}: ${abilityName || 'empty'}`}
        draggable
        onDragStart={(event) => {
          draggedAbilitySlot.current = { playerId, field };
          event.dataTransfer.setData('text/plain', `${playerId}:${field}`);
          event.dataTransfer.effectAllowed = 'copyMove';
        }}
        onDragEnd={() => {
          draggedAbilitySlot.current = null;
        }}
        onDragOver={(event) => {
          const source = draggedAbilitySlot.current;
          if (!source || !isSkillBarSlot(field)) return;
          if (
            isUltimateSkillSlot(source.field) !== isUltimateSkillSlot(field)
          ) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = source.playerId === playerId ? 'move' : 'copy';
        }}
        onDrop={(event) => {
          event.preventDefault();
          if (draggedChampionPointSlot.current) return;
          event.stopPropagation();
          const match = /^(\d+):([A-Za-z0-9]+)$/.exec(event.dataTransfer.getData('text/plain'));
          const sourceField = match && isSkillBarSlot(match[2])
            ? match[2]
            : draggedAbilitySlot.current?.field;
          if (!sourceField || !isSkillBarSlot(field)) return;
          const sourcePlayerId = match ? Number(match[1]) : draggedAbilitySlot.current?.playerId;
          if (sourcePlayerId === undefined || (sourcePlayerId === playerId && sourceField === field)) return;
          if (isUltimateSkillSlot(sourceField) !== isUltimateSkillSlot(field)) return;

          const sourceStuff = fight.playersStuff.find((player) => player.id === sourcePlayerId);
          const targetStuff = fight.playersStuff.find((player) => player.id === playerId);
          if (!sourceStuff || !targetStuff) return;
          const sourceAbility = sourceStuff.competencies[sourceField];
          if (sourcePlayerId === playerId) {
            const targetAbility = targetStuff.competencies[field];
            updateFightPlayerStuff(fight.name, sourcePlayerId, sourceField, targetAbility);
          }
          updateFightPlayerStuff(fight.name, playerId, field, sourceAbility);
        }}
        onClick={() => {
          const selectedArmorWeight = hasValue
            ? getArmorWeightForAbility(getAbilityDisplayName(value))
            : null;
          const selectedEntry = hasValue && category
            ? availableAbilityEntries.find((entry) => (
              entry.category === category
              && (category !== CommonSkillLine.Armor || entry.armorWeight === selectedArmorWeight)
            ))
            : null;
          const currentEntry = availableAbilityEntries.find(({ id }) => id === currentAbilityEntryId);
          const initialEntry = selectedEntry ?? currentEntry ?? availableAbilityEntries[0];

          if (initialEntry) setCurrentAbilityEntryId(initialEntry.id);
          setScribingDraft(decodedScribingId ? {
            grimoireAbilityId: decodedScribingId.grimoireAbilityId,
            focusScriptId: decodedScribingId.focusScriptId,
            signatureScriptId: decodedScribingId.signatureScriptId,
            affixScriptId: decodedScribingId.affixScriptId,
          } : null);
          setSkillEditor({ playerId, field, ultimateOnly: field === 'MainBarUlt' || field === 'BackBarUlt' });
        }}
        className={`raid-interactive-tile flex ${compact ? 'h-auto max-h-9 w-full max-w-9 aspect-square' : 'h-12 w-12'} shrink-0 items-center justify-center border-2 bg-black/60 p-0.5 transition ${
          hasValue ? 'border-yellow-600' : 'border-dashed border-yellow-700'
        } cursor-grab active:cursor-grabbing`}
      >
        {hasValue && category && abilityName ? (
          <Image src={getAbilityImagePath(category, abilityName)} alt="" width={40} height={40} className="h-full w-full object-cover" />
        ) : null}
      </button>
    );

    return hasValue && abilityName ? (
      <PortalTooltip content={getAbilityTooltipContent(value)}>{button}</PortalTooltip>
    ) : button;
  };

  const renderViewAbilityIcon = (value: SkillAbilityId | '', category?: AbilityCategory, compact = false) => {
    const abilityName = getAbilityDisplayName(value);
    if (!value || !category || !abilityName) {
      return <div className={`${compact ? 'h-auto max-h-9 w-full max-w-9 aspect-square' : 'h-12 w-12'} shrink-0 border border-dashed border-yellow-700 bg-black/40`} />;
    }
    return (
      <PortalTooltip content={getAbilityTooltipContent(value)}>
        <div
          role="img"
          aria-label={`${abilityName}: ${getSkillAbilityDescription(value)}`}
          className={`raid-interactive-tile relative flex ${compact ? 'h-auto max-h-9 w-full max-w-9 aspect-square' : 'h-12 w-12'} shrink-0 items-center justify-center border-2 border-yellow-600 bg-black/40 p-0.5 transition`}
        >
          <Image src={getAbilityImagePath(category, abilityName)} alt="" width={40} height={40} className="h-full w-full object-cover" />
        </div>
      </PortalTooltip>
    );
  };

  const renderConsumableSlot = (
    playerId: number,
    type: 'food' | 'potion',
    value: string,
    compact = false,
  ) => {
    const iconMap = type === 'food' ? FOOD_ICON_MAP : POTION_ICON_MAP;
    const defaultIcon = type === 'food' ? DEFAULT_FOOD_ICON : DEFAULT_POTION_ICON;
    const iconSrc = value ? iconMap[value] ?? defaultIcon : null;
    const itemName = type === 'food'
      ? ESO_FOODS.find((item) => String(item.id) === value || item.name === value)?.name ?? value
      : ESO_POTIONS.find((item) => String(item.id) === value || item.name === value)?.name ?? value;
    const foodEffect = type === 'food'
      ? ESO_FOODS.find((item) => String(item.id) === value || item.name === value)?.effect
      : undefined;
    const consumableEffect = foodEffect ?? (type === 'potion' ? potionEffects[itemName] : undefined);
    const tooltipContent = <><span className="mb-1 block font-bold text-[#f7e7ba]">{itemName}</span>{consumableEffect ? <span className="block">{consumableEffect}</span> : null}</>;

    if (isEditMode) {
      const button = (
        <button
          type="button"
          onClick={() => setConsumableEditor({ playerId, type })}
          className={`raid-interactive-tile flex ${compact ? 'h-8 w-8' : 'h-12 w-12'} shrink-0 cursor-pointer items-center justify-center self-center border-2 bg-black/60 p-0.5 transition ${
            value ? 'border-yellow-600' : 'border-dashed border-yellow-700'
          }`}
        >
          {iconSrc ? (
            <Image src={iconSrc} alt="" width={40} height={40} className="h-full w-full object-cover" />
          ) : null}
        </button>
      );
      return value ? <PortalTooltip content={tooltipContent}>{button}</PortalTooltip> : button;
    }

    if (!iconSrc) {
      return <div className={`${compact ? 'h-8 w-8' : 'h-12 w-12'} shrink-0 self-center border border-dashed border-yellow-700 bg-black/40`} />;
    }

    const slot = (
      <div aria-label={itemName} className={`raid-interactive-tile flex ${compact ? 'h-8 w-8' : 'h-12 w-12'} shrink-0 items-center justify-center self-center border-2 border-yellow-600 bg-black/40 p-0.5 transition`}>
        <Image src={iconSrc} alt="" width={40} height={40} className="h-full w-full object-cover" />
      </div>
    );

    return value ? (
      <PortalTooltip content={tooltipContent}>
        {slot}
      </PortalTooltip>
    ) : slot;
  };

  const renderActionBar = (
    playerId: number,
    competencies: typeof fight.playersStuff[number]['competencies'],
    food: string,
    potion: string,
    compact = false,
  ) => {
    const renderSlot = (field: keyof Skills, value: SkillAbilityId | '') => {
      const abilityCategory = findAbilityCategory(value) ?? undefined;

      return (
        <div key={`${playerId}-${field}`} className={compact ? 'min-w-0' : undefined}>
          {isEditMode ? renderAbilityButton(playerId, field, value, compact) : renderViewAbilityIcon(value, abilityCategory, compact)}
        </div>
      );
    };

    if (compact) {
      return (
        <div className="flex w-full min-w-0 flex-col gap-1">
          <div className="grid w-full grid-cols-6 gap-0.5">{MAIN_BAR_SLOTS.map((slot) => renderSlot(slot, competencies[slot]))}{renderSlot('MainBarUlt', competencies.MainBarUlt)}</div>
          <div className="grid w-full grid-cols-6 gap-0.5">{BACK_BAR_SLOTS.map((slot) => renderSlot(slot, competencies[slot]))}{renderSlot('BackBarUlt', competencies.BackBarUlt)}</div>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center gap-2">
        <div className="inline-flex items-center gap-2">
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-yellow-300">
              Potion
            </span>
            {renderConsumableSlot(playerId, 'potion', potion)}
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1">
              {MAIN_BAR_SLOTS.map((slot) => renderSlot(slot, competencies[slot]))}
              <div className="ml-10">
                {renderSlot('MainBarUlt', competencies.MainBarUlt)}
              </div>
            </div>

            <div className="flex items-center gap-1">
              {BACK_BAR_SLOTS.map((slot) => renderSlot(slot, competencies[slot]))}
              <div className="ml-10">
                {renderSlot('BackBarUlt', competencies.BackBarUlt)}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-yellow-300">
            Food
          </span>
          {renderConsumableSlot(playerId, 'food', food)}
        </div>
      </div>
    );
  };

  const renderChampionPointSlot = (playerId: number, field: string, value: string) => {
    const normalizedValue = value || '–';
    const colorClass = field.startsWith('Blue')
      ? 'border-blue-500 bg-blue-950/60'
      : field.startsWith('Red')
        ? 'border-red-500 bg-red-950/60'
        : 'border-green-500 bg-green-950/60';

    if (isEditMode) {
      return (
        <button
          key={`${playerId}-${field}`}
          type="button"
          draggable
          onDragStart={(event) => {
            if (!isChampionPointSlot(field)) return;
            draggedChampionPointSlot.current = { playerId, field };
            event.dataTransfer.setData('text/plain', `${playerId}:${field}`);
            event.dataTransfer.effectAllowed = 'move';
          }}
          onDragEnd={() => {
            draggedChampionPointSlot.current = null;
          }}
          onDragOver={(event) => {
            const source = draggedChampionPointSlot.current;
            if (!source || !isChampionPointSlot(field)) return;
            if (
              source.playerId !== playerId ||
              getChampionPointDisciplineFromSlot(source.field) !== getChampionPointDisciplineFromSlot(field)
            ) return;
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
          }}
          onDrop={(event) => {
            const source = draggedChampionPointSlot.current;
            if (!source) {
              if (draggedAbilitySlot.current) {
                event.preventDefault();
                return;
              }
              event.preventDefault();
              event.stopPropagation();
              return;
            }

            event.preventDefault();
            event.stopPropagation();
            if (!isChampionPointSlot(field) || source.playerId !== playerId || source.field === field) return;
            if (getChampionPointDisciplineFromSlot(source.field) !== getChampionPointDisciplineFromSlot(field)) return;

            const playerStuff = fight.playersStuff.find((player) => player.id === playerId);
            if (!playerStuff) return;
            const sourceValue = playerStuff.championPoints[source.field];
            const targetValue = playerStuff.championPoints[field];
            updateFightPlayerStuff(fight.name, playerId, source.field, targetValue);
            updateFightPlayerStuff(fight.name, playerId, field, sourceValue);
          }}
          onClick={() => setChampionPointEditor({ playerId, field })}
          className={`flex h-8 w-28 shrink-0 items-center justify-center overflow-hidden whitespace-nowrap rounded border px-1 text-[11px] font-bold text-white transition hover:border-yellow-300 ${
            value ? colorClass : 'border-dashed border-yellow-700 bg-black/40 text-white/60'
          } cursor-grab active:cursor-grabbing`}
        >
          {normalizedValue}
        </button>
      );
    }

    return (
      <div
        key={`${playerId}-${field}`}
        className={`flex h-8 w-28 shrink-0 items-center justify-center overflow-hidden whitespace-nowrap rounded border px-1 text-[11px] font-bold text-white ${
          value ? colorClass : 'border-dashed border-yellow-700 bg-black/40 text-white/60'
        }`}
      >
        {normalizedValue}
      </div>
    );
  };

  const renderChampionPoints = (
    playerId: number,
    championPoints: typeof fight.playersStuff[number]['championPoints'],
  ) => {
    return (
      <div className="encounter-table__champion-points grid min-w-0 grid-cols-3 items-start gap-2">
        {CHAMPION_DISCIPLINE_GROUPS.map((group) => (
          <div key={group.discipline} className={`flex shrink-0 flex-col items-center rounded-lg border px-2 py-1 ${CHAMPION_CATEGORY_FRAME[group.discipline]}`}>
            <Image
              src={CHAMPION_DISCIPLINE_ICON[group.discipline]}
              alt={group.label}
              width={32}
              height={32}
              className="mb-1 h-8 w-8 object-contain"
            />
            <ul className="mt-1 flex flex-col gap-1">
              {sortChampionPointSlots(group.slots, championPoints).map((slot) => (
                <li key={`${playerId}-${slot}`}>
                  {renderChampionPointSlot(playerId, slot, championPoints[slot])}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    );
  };

  const handleSetSlotDrop = async (
    event: DragEvent<HTMLButtonElement>,
    playerId: number,
    targetSlot: SetSlot,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    const source = draggedSetSlot.current;
    if (
      !isEditMode
      || !source
      || source.playerId !== playerId
      || source.slot === targetSlot
      || source.category !== getSetSlotCategory(targetSlot)
    ) return;

    const playerStuff = fight.playersStuff.find((entry) => entry.id === playerId);
    const sourceGear = playerStuff?.sets[source.slot];
    if (!playerStuff || sourceGear?.itemId !== source.itemId) return;

    try {
      const sourceItem = await ensureCatalogItemLoaded(source.itemId, sourceGear.trait);
      if (!sourceItem || sourceItem.gearType !== source.category) {
        throw new Error('Unable to identify the dragged set item.');
      }

      const targetItems = await getSlotItemOptions(targetSlot, sourceItem.setId);
      const targetItem = findCompatibleSlotItem(sourceItem, targetItems);
      if (!targetItem) {
        setSetTransferError('No matching set item for this slot with the same trait and type.');
        return;
      }

      setSetTransferError(null);
      updateFightPlayerStuff(fight.name, playerId, targetSlot, {
        itemId: targetItem.id,
        trait: targetItem.trait,
        enchantment: sourceGear.enchantment,
        ...(getPairedWeaponSlot(targetSlot) !== null ? { poison: 'poison' in sourceGear ? sourceGear.poison : '' } : {}),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setSetTransferError(`Unable to transfer set item: ${message}`);
    }
  };

  const handleQuickGearSlotDrop = async (
    event: DragEvent<HTMLButtonElement>,
    targetSlot: SetSlot,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    const source = draggedSetSlot.current;
    const setup = quickGearSetup;
    if (!isEditMode || !source || !setup || source.playerId !== setup.playerId) return;

    const playerStuff = fight.playersStuff.find((entry) => entry.id === setup.playerId);
    const equippedSourceGear = playerStuff?.sets[source.slot];
    const sourceGear = source.sourceGear ?? equippedSourceGear;
    if (
      !playerStuff
      || sourceGear?.itemId !== source.itemId
      || (!source.sourceGear && equippedSourceGear?.itemId !== source.itemId)
    ) return;

    try {
      const sourceItem = await ensureCatalogItemLoaded(source.itemId, sourceGear.trait);
      if (!sourceItem || sourceItem.gearType !== source.category) {
        throw new Error('Unable to identify the dragged set item.');
      }

      const targetItems = await getSlotItemOptions(targetSlot, sourceItem.setId);
      const choices = groupCatalogItems(targetItems);
      const role = playerStuff.role ?? RoleType.DPS;
      const sameSetPreferences = setup.selectedSetId === sourceItem.setId ? setup : undefined;
      const targetChoice = choices.find((choice) => getDefaultSetItemSelection(
        choice,
        targetSlot,
        role,
        sameSetPreferences,
      ).item) ?? choices[0];
      const defaults = getDefaultSetItemSelection(targetChoice, targetSlot, role, sameSetPreferences);
      const compatibleItem = findCompatibleSlotItem(sourceItem, targetItems);
      const targetItem = compatibleItem ?? defaults.item ?? targetChoice?.variants[0];
      if (!targetItem) {
        setQuickGearError(`This set has no item available for the ${getSetSlotLabel(targetSlot)} slot.`);
        return;
      }

      const selectedItemDefaults = getDefaultSetItemSelection(
        choices.find((choice) => choice.variants.some((item) => item.id === targetItem.id && item.trait === targetItem.trait)),
        targetSlot,
        role,
        sameSetPreferences,
      );
      const preserveSourceDetails = compatibleItem !== null;
      const shouldPairWeapon = targetItem.gearType === 'weapon'
        && (targetItem.equipType === 'Two Hand' || Boolean(
          preserveSourceDetails && 'poison' in sourceGear ? sourceGear.poison : selectedItemDefaults.poison,
        ));
      const pairSlot = shouldPairWeapon ? getPairedWeaponSlot(targetSlot) : null;
      const pairItem = pairSlot
        ? findCompatibleSlotItem(targetItem, await getSlotItemOptions(pairSlot, sourceItem.setId))
        : null;
      const targetGear: GearSlotPiece = {
        itemId: targetItem.id,
        trait: targetItem.trait,
        enchantment: preserveSourceDetails ? sourceGear.enchantment : selectedItemDefaults.enchantment,
        ...(getPairedWeaponSlot(targetSlot) !== null
          ? {
            poison: preserveSourceDetails && 'poison' in sourceGear
              ? sourceGear.poison
              : selectedItemDefaults.poison,
          }
          : {}),
      };
      const pairedGear: GearSlotPiece | null = pairSlot && pairItem
        ? { ...targetGear, itemId: pairItem.id, trait: pairItem.trait }
        : null;

      setQuickGearSetup((current) => {
        if (!current || current.playerId !== setup.playerId) return current;
        const isChangingSet = current.selectedSetId !== sourceItem.setId;
        const draggedItems = isChangingSet ? {} : current.draggedItems;
        const slotsToSelect = pairSlot && pairedGear ? [targetSlot, pairSlot] : [targetSlot];
        return {
          ...current,
          selectedSetId: sourceItem.setId,
          selectedSlots: [...new Set([...current.selectedSlots, ...slotsToSelect])],
          draggedItems: {
            ...draggedItems,
            [targetSlot]: targetGear,
            ...(pairSlot && pairedGear ? { [pairSlot]: pairedGear } : {}),
          },
          bodyArmorWeight: targetItem.gearType === 'armor'
            ? targetItem.armorWeight ?? ''
            : isChangingSet ? '' : current.bodyArmorWeight,
          bodyEnchantment: isChangingSet ? '' : current.bodyEnchantment,
          jewelryEnchantment: isChangingSet ? '' : current.jewelryEnchantment,
          bodyTrait: isChangingSet ? '' : current.bodyTrait,
          jewelryTrait: isChangingSet ? '' : current.jewelryTrait,
        };
      });
      setQuickGearError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setQuickGearError(`Unable to transfer set item: ${message}`);
    }
  };

  const applyQuickGearSet = async (setId: number, selectedSlots: SetSlot[]) => {
    if (!quickGearSetup || !fight || isApplyingQuickGear) return;

    setIsApplyingQuickGear(true);
    setQuickGearError(null);
    try {
      const playerStuff = fight.playersStuff.find((entry) => entry.id === quickGearSetup.playerId);
      if (!playerStuff) throw new Error('Unable to find this player in the selected encounter.');
      await ensureCatalogItemsLoaded(
        Object.values(playerStuff.sets)
          .map((gear) => gear.itemId)
          .filter((itemId): itemId is number => itemId !== null),
      );

      const setEntry = await fetchSetById(setId);
      if (!setEntry) throw new Error('Unable to load the selected set.');
      const role = playerStuff.role ?? RoleType.DPS;
      const availableArmorWeights = getQuickGearArmorWeights(setEntry.items);
      const armorWeight = quickGearSetup.bodyArmorWeight
        || getQuickGearDefaultArmorWeight(role, availableArmorWeights);

      const replacedSlots = QUICK_GEAR_SLOT_ORDER.filter((slot) => {
        const equippedSetId = getCachedCatalogItem(
          playerStuff.sets[slot].itemId,
          playerStuff.sets[slot].trait,
        )?.setId;
        return equippedSetId !== undefined && quickGearSetup.replaceSetIds.includes(equippedSetId);
      });

      const targetSlots = QUICK_GEAR_SLOT_ORDER.filter((slot) => (
        selectedSlots.includes(slot) || replacedSlots.includes(slot)
      ));
      const plannedGear = new Map<SetSlot, GearSlotPiece>();

      for (const slot of targetSlots) {
        if (plannedGear.has(slot)) continue;

        const slotItems = await getSlotItemOptions(slot, setId);
        const choices = groupCatalogItems(slotItems);
        const draggedGear = quickGearSetup.draggedItems[slot];
        const draggedItem = draggedGear
          ? slotItems.find((item) => item.id === draggedGear.itemId && item.trait === draggedGear.trait)
          : undefined;
        const isUsableChoice = (itemChoice: ReturnType<typeof groupCatalogItems>[number]) => (
          (!armorWeight
            || itemChoice.representative.gearType !== 'armor'
            || itemChoice.representative.armorWeight === armorWeight)
          && getDefaultSetItemSelection(itemChoice, slot, role, quickGearSetup).item
        );
        const isPreferredWeaponChoice = (itemChoice: ReturnType<typeof groupCatalogItems>[number]) => (
          itemChoice.representative.gearType === 'weapon'
          && (
            (itemChoice.representative.equipType === 'One Hand'
              && itemChoice.representative.weaponType === 'Dagger')
            || (itemChoice.representative.equipType === 'Two Hand'
              && itemChoice.representative.weaponType === 'Two Handed Sword')
          )
        );
        const choice = draggedItem
          ? choices.find((itemChoice) => itemChoice.variants.some((item) => (
            item.id === draggedItem.id && item.trait === draggedItem.trait
          )))
          : choices.find((itemChoice) => (
            isPreferredWeaponChoice(itemChoice) && isUsableChoice(itemChoice)
          )) ?? choices.find(isUsableChoice);
        if (!choice) continue;

        const defaults = getDefaultSetItemSelection(choice, slot, role, quickGearSetup);
        const selectedItem = draggedItem ?? defaults.item;
        if (!selectedItem) continue;
        const enchantment = draggedItem && draggedGear ? draggedGear.enchantment : defaults.enchantment;
        const poison = draggedItem && draggedGear && 'poison' in draggedGear
          ? draggedGear.poison
          : defaults.poison;

        const pairSlot = selectedItem.gearType === 'weapon'
          && (selectedItem.equipType === 'Two Hand' || Boolean(poison))
          ? getPairedWeaponSlot(slot)
          : null;
        if (
          pairSlot
          && (
            !targetSlots.includes(pairSlot)
            || plannedGear.has(pairSlot)
          )
        ) continue;

        const gear: GearSlotPiece = {
          itemId: selectedItem.id,
          trait: selectedItem.trait,
          enchantment: poison ? '' : enchantment,
          ...(getPairedWeaponSlot(slot) !== null ? { poison } : {}),
        };
        plannedGear.set(slot, gear);

        if (pairSlot) {
          const pairedGear = quickGearSetup.draggedItems[pairSlot] ?? { ...gear, poison };
          plannedGear.set(pairSlot, pairedGear);
        }
      }

      for (const slot of replacedSlots) {
        updateFightPlayerStuff(fight.name, quickGearSetup.playerId, slot, createEmptyGearForSlot(slot));
      }
      for (const [slot, gear] of plannedGear) {
        updateFightPlayerStuff(fight.name, quickGearSetup.playerId, slot, gear);
      }

      setQuickGearSetup((current) => current
        ? {
          ...current,
          replaceSetIds: [],
          selectedSetId: null,
          isReplaceSetPickerOpen: false,
          selectedSlots: [],
          draggedItems: {},
          bodyArmorWeight: '',
          bodyEnchantment: '',
          jewelryEnchantment: '',
          bodyTrait: '',
          jewelryTrait: '',
        }
        : current);
      setQuickGearError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setQuickGearError(message);
    } finally {
      setIsApplyingQuickGear(false);
    }
  };

  const applyBulkEnchantments = (
    playerId: number,
    category: BulkEnchantmentCategory,
    enchantment: string,
  ) => {
    if (!fight) return;
    const playerStuff = fight.playersStuff.find((entry) => entry.id === playerId);
    if (!playerStuff) return;

    const slots: readonly SetSlot[] = category === 'body'
      ? ['head', 'chest', 'waist', 'boots', 'shoulders', 'gloves', 'legs']
      : QUICK_GEAR_JEWEL_SLOTS;
    for (const slot of slots) {
      const gear = playerStuff.sets[slot];
      if (gear.itemId === null) continue;
      updateFightPlayerStuff(fight.name, playerId, slot, { ...gear, enchantment });
    }
  };

  const renderSetSlot = (playerId: number, slot: SetSlot, label: string, showSlotLabel = true, detailPreview = false, compact = false) => {
    const playerStuff = fight.playersStuff.find((entry) => entry.id === playerId);
    const gear = playerStuff?.sets[slot as keyof typeof playerStuff.sets];
    const gearItemId = gear?.itemId;
    const itemMeta = gear?.itemId !== null ? getCachedCatalogItem(gear?.itemId ?? null, gear?.trait) : null;
    const value = itemMeta?.setName ?? '';
    const placeholderImage = SET_SLOT_PLACEHOLDER_IMAGES[slot];
    const armorWeightTextClass = itemMeta?.gearType === 'armor'
      ? getArmorWeightTextClass(itemMeta.armorWeight)
      : 'text-yellow-300';
    const tileBorderClass = gearItemId == null
      ? 'border-dashed border-yellow-700'
      : 'border-yellow-600';
    const compactLabel = slot === 'necklace' ? 'Neck'
      : slot === 'ring1' ? 'Ring 1'
        : slot === 'ring2' ? 'Ring 2'
          : slot === 'mainHandFrontBar' ? 'Front MH'
            : slot === 'offHandFrontBar' ? 'Front OH'
              : slot === 'mainHandBackBar' ? 'Back MH'
                : slot === 'offHandBackBar' ? 'Back OH'
                  : label;

    return (
      <div className={`flex min-w-0 flex-col items-center gap-1 ${detailPreview ? 'w-16' : compact ? 'w-9' : 'w-12'}`}>
        {showSlotLabel && (
          <span className={`inline-flex w-full min-w-0 items-center justify-center gap-1 text-center ${compact ? 'text-[8px]' : 'text-[clamp(8px,2.2cqw,10px)]'} font-semibold uppercase tracking-wide ${armorWeightTextClass}`}>
            <span className="min-w-0 truncate">{compact ? compactLabel : label}</span>
            <EnchantmentIndicator gear={gear} />
          </span>
        )}
        {isEditMode ? (
          <PortalTooltip content={gearItemId !== null && gearItemId !== undefined ? <GearDetailsTooltip itemId={gearItemId} gear={gear} slot={slot} /> : null}>
          <button
            type="button"
            draggable={isEditMode && gearItemId != null && Boolean(itemMeta)}
            onClick={() => {
              setGearDraft(gear ?? createEmptyGearPiece());
              autoSelectFirstItemForSetId.current = null;
              setSelectedSetId(itemMeta?.setId ?? null);
              setSelectedItemChoiceKey(itemMeta ? getCatalogItemChoiceKey(itemMeta) : '');
              setSelectedTrait(itemMeta ? gear?.trait || itemMeta.trait || NO_TRAIT_VALUE : null);
              setSetItemOptions([]);
              setSetEditor({ playerId, slot });
            }}
            onDragStart={(event) => {
              if (!isEditMode || gearItemId == null || !itemMeta) return;
              const draggedSlot = {
                playerId,
                slot,
                itemId: gearItemId,
                category: itemMeta.gearType,
              } satisfies DraggedSetSlot;
              draggedSetSlot.current = draggedSlot;
              setSetTransferError(null);
              event.dataTransfer.setData('text/plain', JSON.stringify({
                playerId,
                slot,
                itemId: gearItemId,
              }));
              event.dataTransfer.effectAllowed = 'copyMove';
            }}
            onDragEnd={() => {
              draggedSetSlot.current = null;
            }}
            onDragOver={(event) => {
              const source = draggedSetSlot.current;
              if (
                !isEditMode
                || !source
                || source.playerId !== playerId
                || source.slot === slot
                || source.category !== getSetSlotCategory(slot)
              ) return;
              event.preventDefault();
              event.dataTransfer.dropEffect = 'copy';
            }}
            onDrop={(event) => {
              void handleSetSlotDrop(event, playerId, slot);
            }}
            className={`raid-interactive-tile group relative flex shrink-0 items-center justify-center overflow-visible border-2 bg-black/60 transition ${detailPreview ? 'h-16 w-16 p-1' : compact ? 'h-8 w-8 p-0.5' : 'h-12 w-12 p-0.5'} ${tileBorderClass} cursor-grab active:cursor-grabbing`}
          >
            <GearIcon key={`${gear?.itemId ?? ''}-${slot}`} gear={gear} slot={slot} fallbackSrc={placeholderImage} alt={value} className="h-full w-full object-cover opacity-90" />
            {!value && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/35 text-sm text-yellow-300">
                +
              </span>
            )}
          </button>
          </PortalTooltip>
        ) : (
          gearItemId != null ? (
            <PortalTooltip content={<GearDetailsTooltip itemId={gearItemId} gear={gear} slot={slot} />}>
            <button
              type="button"
              onClick={() => {
                setGearDetailsError(null);
                setGearDetails({
                  playerId,
                  slot,
                  label,
                  itemId: gearItemId,
                  trait: gear?.trait,
                  item: itemMeta,
                });
              }}
              aria-label={`Show details for ${value || label}`}
              className={`raid-interactive-tile group relative flex shrink-0 cursor-pointer items-center justify-center overflow-visible border-2 border-yellow-600 bg-black/60 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-300 ${detailPreview ? 'h-16 w-16 p-1' : compact ? 'h-8 w-8 p-0.5' : 'h-12 w-12 p-0.5'}`}
            >
              <GearIcon key={`${gearItemId}-${slot}`} gear={gear} slot={slot} fallbackSrc={placeholderImage} alt={value} className="h-full w-full object-cover" />
            </button>
            </PortalTooltip>
          ) : (
            <div
                className={`flex shrink-0 items-center justify-center overflow-hidden border-2 border-dashed border-yellow-700 bg-black/60 ${detailPreview ? 'h-16 w-16 p-1' : compact ? 'h-8 w-8 p-0.5' : 'h-12 w-12 p-0.5'}`}
            >
              <GearIcon key={`${gear?.itemId ?? ''}-${slot}`} gear={gear} slot={slot} fallbackSrc={placeholderImage} alt={value} className="h-full w-full object-cover opacity-40" />
            </div>
          )
        )}
      </div>
    );
  };

  const renderWeaponSlots = (
    playerId: number,
    firstSlot: SetSlot,
    secondSlot: SetSlot,
    barLabel: string,
    showSlotLabel = true,
    detailPreview = false,
    compact = false,
  ) => {
    const playerStuff = fight.playersStuff.find((entry) => entry.id === playerId);
    const firstItem = getCachedCatalogItem(playerStuff?.sets[firstSlot].itemId ?? null);
    const secondItem = getCachedCatalogItem(playerStuff?.sets[secondSlot].itemId ?? null);
    const twoHandedSlot = requiresTwoWeaponSlots(firstItem ?? undefined)
      ? firstSlot
      : requiresTwoWeaponSlots(secondItem ?? undefined)
        ? secondSlot
        : null;

    if (twoHandedSlot) {
      return renderSetSlot(playerId, twoHandedSlot, barLabel, showSlotLabel, detailPreview, compact);
    }

    return (
      <>
        {renderSetSlot(playerId, firstSlot, `${barLabel} Main Hand`, showSlotLabel, detailPreview, compact)}
        {renderSetSlot(playerId, secondSlot, `${barLabel} Off Hand`, showSlotLabel, detailPreview, compact)}
      </>
    );
  };

  const renderSetSummary = (sets: ReturnType<typeof getSetSummary>) => (
    <section className="rounded-xl border border-[#d6b46b]/50 bg-black/25 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#d6b46b]">Equipped sets</h3>
        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-white/60">
          {sets.length} {sets.length === 1 ? 'set' : 'sets'}
        </span>
      </div>
      {sets.length ? (
        <ul className="grid gap-2 sm:grid-cols-2">
          {sets.map(({ id, setName, pieceCount, requiredPieces }) => {
            const set = catalogSets.find((entry) => entry.id === id);
            const isComplete = requiredPieces !== null && pieceCount >= requiredPieces;
            return (
              <li key={id} className="min-w-0">
                <PortalTooltip content={<><SetHeadIcon setId={id} setName={setName} /><span className="mb-1 block font-bold text-[#f7e7ba]">{setName}</span>{set?.effects.map((effect) => <span key={`${effect.numberOfPiecesRequired}-${effect.description}`} className="mt-1 block">{effect.description.replace(/\|c[0-9a-fA-F]{6}|\|r/g, '')}</span>)}</>}>
                  <span className="flex min-w-0 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-2 py-1.5 text-left transition hover:border-[#d6b46b]/60 hover:bg-[#d6b46b]/[0.07]">
                    <SetHeadIcon setId={id} setName={setName} className="h-7 w-7 shrink-0 rounded border border-[#d6b46b]/40 bg-black/40 p-0.5" />
                    <span className="min-w-0 flex-1 whitespace-normal break-words [overflow-wrap:anywhere] text-xs font-medium leading-snug text-[#f8f7f2]">{setName}</span>
                    <span className={`shrink-0 rounded-md border px-2 py-1 text-[11px] font-bold tabular-nums ${
                      isComplete
                        ? 'border-emerald-400/30 bg-emerald-500/15 text-emerald-300'
                        : 'border-orange-400/30 bg-orange-500/15 text-orange-300'
                    }`}>
                      {pieceCount}{requiredPieces !== null ? `/${requiredPieces}` : ' pcs'}
                    </span>
                  </span>
                </PortalTooltip>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-lg border border-dashed border-white/15 px-3 py-4 text-center text-xs text-white/45">
          No sets equipped yet. Add one with Quick Gear Setup.
        </p>
      )}
    </section>
  );

  const renderCompactSetDetails = (playerId: number) => {
    return (
      <section
        id={`setup-details-${playerId}`}
        aria-label="Equipped setup details"
        className="@container/set-details rounded-lg border border-white/10 bg-[#111111]/70 p-2"
      >
        <div className="grid w-full min-w-0 grid-cols-[minmax(0,0.7fr)_minmax(0,2fr)_minmax(0,1fr)] items-start gap-[2cqw]">
          <div className="flex min-w-0 flex-col items-center gap-[2cqw] pt-5">
            {renderSetSlot(playerId, 'necklace', 'Necklace', true, false, true)}
            {renderSetSlot(playerId, 'ring1', 'Ring 1', true, false, true)}
            {renderSetSlot(playerId, 'ring2', 'Ring 2', true, false, true)}
          </div>
          <div className="flex min-w-0 flex-col items-center gap-0.5">
            {SET_LAYOUT_ROWS.map((row, rowIndex) => (
              <div key={`compact-set-row-${rowIndex}`} className="flex items-end justify-center gap-[2cqw]">
                {row.map((item) => (
                  <div key={`${playerId}-compact-set-${item.slot}`} className={'colSpan' in item && item.colSpan ? 'mx-auto' : ''}>
                    {renderSetSlot(playerId, item.slot, item.label, true, false, true)}
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div className="flex min-w-0 flex-col items-center gap-[3cqw] pt-9">
            <div className="flex gap-[2cqw]">
              {renderWeaponSlots(playerId, 'mainHandFrontBar', 'offHandFrontBar', 'Front bar', true, false, true)}
            </div>
            <div className="flex gap-[2cqw]">
              {renderWeaponSlots(playerId, 'mainHandBackBar', 'offHandBackBar', 'Back bar', true, false, true)}
            </div>
          </div>
        </div>
      </section>
    );
  };

  return (
    <div
      className="app-page encounters-page bg-cover bg-center bg-fixed p-5 sm:p-8"
      data-raid-theme={raidTheme || undefined}
      data-neutral-template={template.raid.selectedRaid === 'Neutral' ? '' : undefined}
      onDragOver={(event) => {
        if (
          !isEditMode
          || (!draggedAbilitySlot.current && !draggedChampionPointSlot.current && !draggedSetSlot.current)
        ) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
      }}
      onDrop={(event) => {
        const abilitySource = draggedAbilitySlot.current;
        const championPointSource = draggedChampionPointSlot.current;
        const setSource = draggedSetSlot.current;
        if (!isEditMode || (!abilitySource && !championPointSource && !setSource)) return;
        event.preventDefault();
        if (championPointSource) {
          updateFightPlayerStuff(fight.name, championPointSource.playerId, championPointSource.field, '');
        } else if (abilitySource) {
          updateFightPlayerStuff(fight.name, abilitySource.playerId, abilitySource.field, '');
        } else if (setSource) {
          const playerStuff = fight.playersStuff.find((player) => player.id === setSource.playerId);
          if (playerStuff?.sets[setSource.slot].itemId === setSource.itemId) {
            updateFightPlayerStuff(fight.name, setSource.playerId, setSource.slot, createEmptyGearPiece());
          }
        }
      }}
      style={{
        backgroundImage: raidBackground
          ? `url(${raidBackground})`
          : template.raid.selectedRaid === 'Neutral'
            ? 'none'
            : 'linear-gradient(to bottom right, #050506, #111111, #050506)',
      }}
    >
      <div className="app-page__scrim" />

      <div className="app-page__content mx-auto flex max-w-[96rem] flex-col">
        <div className="encounters-page__heading mx-auto mb-4 flex w-full max-w-[96rem] shrink-0 items-start gap-4">
          <div className="min-w-0">
            <div className="page-heading !mb-0">
              <h1 className="page-heading__title">Encounters</h1>
              <p className="page-heading__description min-h-[4.95em]">
                Plan player setups and review encounter-specific mechanics for each boss.
              </p>
            </div>
          </div>
        </div>

        <div className="app-page__sticky-toolbar encounters-page__sticky-toolbar">
          <div className="encounters-page__toolbar">
            <div className="encounters-page__fight-picker flex min-w-0 flex-1 shrink-0 flex-wrap items-center gap-2">
            {template.fights.map((entry) => (
              <div key={entry.name} className="contents">
                {isEditMode && dropTargetFightName === entry.name && draggedFightName !== entry.name && (
                  <span aria-hidden="true" className="encounter-drop-preview" />
                )}
                <button
                  type="button"
                  draggable={isEditMode}
                  onClick={() => {
                    setSelectedFightName(entry.name);
                    setIsRenamingFight(false);
                    setRenameFightError(null);
                  }}
                  onDragStart={(event) => {
                    if (!isEditMode) return;
                    setDraggedFightName(entry.name);
                    setDropTargetFightName(null);
                    event.dataTransfer.setData('text/plain', entry.name);
                    event.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragEnd={() => {
                    setDraggedFightName(null);
                    setDropTargetFightName(null);
                  }}
                  onDragOver={(event) => {
                    if (!isEditMode) return;
                    event.preventDefault();
                    setDropTargetFightName(entry.name);
                    event.dataTransfer.dropEffect = 'move';
                  }}
                  onDragLeave={(event) => {
                    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
                    setDropTargetFightName((current) => current === entry.name ? null : current);
                  }}
                  onDrop={(event) => {
                    if (!isEditMode) return;
                    event.preventDefault();
                    const sourceFightName = event.dataTransfer.getData('text/plain');
                    if (sourceFightName) swapFights(sourceFightName, entry.name);
                    setDraggedFightName(null);
                    setDropTargetFightName(null);
                  }}
                  className={`px-3 py-2 rounded-lg border font-bold transition ${
                    draggedFightName === entry.name ? 'opacity-40 scale-95' : ''
                  } ${dropTargetFightName === entry.name && draggedFightName !== entry.name ? 'ring-2 ring-sky-300 ring-offset-2 ring-offset-[#111720] -translate-y-0.5' : ''} ${
                    entry.name === fight.name
                      ? `raid-selected-control ${isEditMode ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}`
                      : `bg-[#141414] border-[#d6b46b] text-white hover:border-[#f8f7f2] ${isEditMode ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}`
                  }`}
                >
                  {entry.name}
                </button>
                {isEditMode && entry.name === fight.name && (
                  <button
                    type="button"
                    onClick={handleStartRenameFight}
                    aria-label="Rename Encounter"
                    className="-ml-2 inline-flex items-center justify-center rounded-lg border-2 border-dashed border-sky-600 bg-[#101a20] p-2 font-bold text-sky-200 shadow-2xl transition hover:border-sky-400 hover:bg-[#182b33] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
                  >
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" />
                    </svg>
                  </button>
                )}
                {isEditMode && entry.name === fight.name && (
                  <button
                    type="button"
                    onClick={handleDuplicateFight}
                    aria-label="Duplicate Encounter"
                    className="-ml-2 inline-flex items-center justify-center rounded-lg border-2 border-dashed border-violet-600 bg-[#1a1020] p-2 font-bold text-violet-200 shadow-2xl transition hover:border-violet-400 hover:bg-[#2a1833] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300"
                  >
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-7 w-7">
                      <rect x="8" y="8" width="12" height="12" rx="2" />
                      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
                    </svg>
                  </button>
                )}
                {isEditMode && entry.name === fight.name && template.fights.length > 1 && (
                  <button
                    type="button"
                    onClick={handleRemoveFight}
                    aria-label="Delete Encounter"
                    className="-ml-2 inline-flex items-center justify-center rounded-lg border-2 border-dashed border-red-600 bg-[#201010] p-2 font-bold text-red-200 shadow-2xl transition hover:border-red-400 hover:bg-[#331818] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-300"
                  >
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-7 w-7">
                      <path d="m6 6 12 12M18 6 6 18" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
            {isEditMode && (
              <button
                type="button"
                onClick={handleAddFight}
                aria-label="New Encounter"
                className="inline-flex h-12 w-12 items-center justify-center rounded-xl border-2 border-dashed border-green-600 bg-[#102016] p-0 font-bold text-green-200 shadow-2xl transition hover:border-green-400 hover:bg-[#183322] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-300"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-6 w-6">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
            )}
            </div>
            <div className="app-page__actions flex shrink-0 flex-wrap items-center justify-end gap-2">
              <Link href="/players" className="raid-action-control inline-flex shrink-0 items-center gap-2 border px-4 py-2.5 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f8f7f2]">
                <span aria-hidden="true">←</span>Back to Players
              </Link>
              <EditModeToggle className="raid-action-control" />
              <div role="group" aria-label="Encounter view" className="flex flex-wrap gap-1">
                {([
                  ['table', 'Table'],
                  ['overview', 'Overview'],
                  ['mechanics', 'Mechanics'],
                ] as const).map(([view, label]) => (
                  <button
                    key={view}
                    type="button"
                    aria-pressed={activeView === view}
                    onClick={() => setActiveView(view)}
                    className={`raid-action-control inline-flex items-center border px-3 py-2.5 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f8f7f2] ${activeView === view ? 'raid-selected-control' : ''}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {activeView !== 'mechanics' && (
                <label className="shrink-0">
                  <select aria-label="Show setup for player" value={visibleSetupPlayerId ?? ''} onChange={(event) => setSelectedSetupPlayerId(event.target.value ? Number(event.target.value) : null)} className="raid-action-control max-w-56 border px-4 py-2.5 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f8f7f2]">
                    <option value="">All players</option>
                    {players.map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}
                  </select>
                </label>
              )}
            </div>
          </div>
        </div>

        {isEditMode && isAddingFight && (
          <form
            onSubmit={handleCreateFight}
            className="encounter-surface mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-[#d6b46b] bg-[#111111] p-4"
          >
            <label className="flex min-w-64 flex-col gap-2 text-sm font-bold text-[#f8f7f2]">
              Encounter name
              <input
                autoFocus
                value={newFightName}
                onChange={(event) => setNewFightName(event.target.value)}
                className="border border-[#d6b46b] bg-black px-3 py-2 text-white outline-none focus:ring-2 focus:ring-[#d6b46b]"
              />
            </label>
            <button
              type="submit"
              className="rounded-lg bg-[#d6b46b] px-4 py-2 font-bold text-black transition hover:bg-[#f7e7ba]"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => setIsAddingFight(false)}
              className="rounded-lg border border-[#d6b46b] bg-[#1c1c1f] px-4 py-2 font-bold text-white transition hover:bg-[#333]"
            >
              Cancel
            </button>
          </form>
        )}

        {activeView !== 'mechanics' && (
        <section
          aria-label="Encounter required sets"
          className="encounter-surface mb-4 rounded-lg border border-[#d6b46b] bg-[#111111]/95 p-4 text-[#f8f7f2] shadow-lg shadow-black/20"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-sm font-bold tracking-wide text-[#f7e7ba]">
                Required sets <span className="font-normal text-white/50">(optional)</span>
              </h2>
              <p className="mt-1 text-xs text-white/50">Track set completion across your players.</p>
            </div>
            <button
              type="button"
              aria-label={isRequiredSetsExpanded ? 'Collapse required sets' : 'Expand required sets'}
              title={isRequiredSetsExpanded ? 'Collapse required sets' : 'Expand required sets'}
              aria-expanded={isRequiredSetsExpanded}
              onClick={() => setIsRequiredSetsExpanded((expanded) => !expanded)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/20 text-white/80 transition hover:border-[#d6b46b] hover:bg-white/5 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f8f7f2]"
            >
              <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <path d={isRequiredSetsExpanded ? 'm5 12 5-5 5 5' : 'm5 8 5 5 5-5'} />
              </svg>
            </button>
          </div>

          {isRequiredSetsExpanded && (
            <div className="mt-4 space-y-4 border-t border-white/10 pt-4">
              <p className="max-w-3xl text-xs leading-relaxed text-white/60">
                A player qualifies when they have the maximum number of pieces required by the set. The check passes when the required number of players qualifies.
              </p>

              {(fight.requiredSetChecks ?? []).length > 0 && (
                <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {fight.requiredSetChecks.map((check) => {
                    const proposal = REQUIRED_SET_PROPOSALS.find((entry) => entry.key === check.key);
                    const label = proposal?.label ?? check.setIds.map((id) => catalogSets.find((set) => set.id === id)?.setName ?? `Set ${id}`).join(' / ');
                    const qualifyingPlayers = countPlayersWithCompleteRequiredSet(fight, check.setIds, catalogSets);
                    const statusColor = qualifyingPlayers >= check.requiredPlayers ? 'text-green-400' : 'text-red-400';

                    return (
                      <li key={check.key} className="flex min-w-0 items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-2 text-xs">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium text-white/90">{label}</span>
                          <span className={`mt-0.5 block text-[11px] ${statusColor}`}>{qualifyingPlayers}/{check.requiredPlayers} players</span>
                        </span>
                        {isEditMode && (
                          <label className="flex shrink-0 items-center gap-1.5 text-[11px] text-white/60">
                            Players
                            <input
                              aria-label={`Number of players for ${label}`}
                              type="number"
                              min={1}
                              max={players.length || 1}
                              value={check.requiredPlayers}
                              onChange={(event) => updateFightRequiredSets(fight.name, fight.requiredSetChecks.map((entry) => entry.key === check.key ? { ...entry, requiredPlayers: Math.max(1, Number(event.target.value) || 1) } : entry))}
                              className="w-12 rounded border border-white/20 bg-black px-1 py-1 text-center text-white"
                            />
                          </label>
                        )}
                        {isEditMode && (
                          <button
                            type="button"
                            aria-label={`Remove ${label}`}
                            onClick={() => updateFightRequiredSets(fight.name, fight.requiredSetChecks.filter((entry) => entry.key !== check.key))}
                            className="rounded px-1 text-base leading-none text-red-300 transition hover:bg-red-950 hover:text-red-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-300"
                          >×</button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}

              {isEditMode && (
                <div className="space-y-3 border-t border-white/10 pt-4">
                  <div>
                    <label htmlFor="required-set-search" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#f7e7ba]/80">
                      Add a set
                    </label>
                    <div ref={requiredSetSearchRef} className="relative max-w-md">
                      <input
                        id="required-set-search"
                        aria-label="Search all sets"
                        value={requiredSetSearch}
                        onFocus={() => setIsRequiredSetSearchOpen(true)}
                        onChange={(event) => {
                          setRequiredSetSearch(event.target.value);
                          setIsRequiredSetSearchOpen(true);
                        }}
                        placeholder="Search any set…"
                        className="w-full rounded-md border border-white/20 bg-black/70 px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-[#d6b46b] focus:outline-none focus:ring-1 focus:ring-[#d6b46b]/50"
                      />
                      {isRequiredSetSearchOpen && requiredSetSearch.trim() && (
                        <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-52 overflow-y-auto rounded-md border border-[#d6b46b]/70 bg-[#111111] shadow-xl">
                          {catalogSets.filter((set) => matchesCatalogSetSearch(set, requiredSetSearch) && !(fight.requiredSetChecks ?? []).some((check) => check.setIds.includes(set.id))).slice(0, 30).map((set) => (
                            <button
                              key={set.id}
                              type="button"
                              onClick={() => {
                                const proposal = REQUIRED_SET_PROPOSALS.find((entry) => entry.setIds.includes(set.id));
                                updateFightRequiredSets(fight.name, [...(fight.requiredSetChecks ?? []), proposal ? { key: proposal.key, setIds: proposal.setIds, requiredPlayers: proposal.defaultPlayers } : { key: `set:${set.id}`, setIds: [set.id], requiredPlayers: 1 }]);
                                setRequiredSetSearch('');
                                setIsRequiredSetSearchOpen(false);
                              }}
                              className="block w-full px-3 py-2 text-left text-sm text-white transition hover:bg-white/10"
                            >{set.setName}</button>
                          ))}
                          {!catalogSets.some((set) => matchesCatalogSetSearch(set, requiredSetSearch) && !(fight.requiredSetChecks ?? []).some((check) => check.setIds.includes(set.id))) && (
                            <p className="px-3 py-2 text-sm text-white/60">No matching sets.</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#f7e7ba]/80">Suggested sets</p>
                    <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                      {REQUIRED_SET_PROPOSALS.map((proposal) => {
                        const check = (fight.requiredSetChecks ?? []).find((entry) => entry.key === proposal.key);
                        return (
                          <li key={proposal.key}>
                            <label className="flex min-h-9 cursor-pointer items-center gap-2 rounded-md border border-white/10 px-2.5 py-2 text-xs text-white/75 transition hover:border-white/20 hover:bg-white/[0.04]">
                              <input
                                aria-label={`Require ${proposal.label}`}
                                type="checkbox"
                                checked={Boolean(check)}
                                onChange={(event) => updateFightRequiredSets(fight.name, event.target.checked
                                  ? [...(fight.requiredSetChecks ?? []), { key: proposal.key, setIds: proposal.setIds, requiredPlayers: proposal.defaultPlayers }]
                                  : (fight.requiredSetChecks ?? []).filter((entry) => entry.key !== proposal.key))}
                                className="encounter-required-set-checkbox accent-[#d6b46b]"
                              />
                              <span>{proposal.label}</span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
        )}

        {activeView !== 'mechanics' && setTransferError && (
          <div role="alert" className="mb-3 flex shrink-0 items-center justify-between gap-3 rounded border border-red-700 bg-red-950/80 px-3 py-2 text-sm text-red-200">
            <span>{setTransferError}</span>
            <button type="button" onClick={() => setSetTransferError(null)} aria-label="Dismiss set transfer message">×</button>
          </div>
        )}

        {isEditMode && isRenamingFight && (
          <form
            onSubmit={handleRenameFight}
            className="encounter-surface mb-6 flex flex-wrap items-end gap-3 rounded-lg border border-sky-600 bg-[#111111] p-4"
          >
            <label className="flex min-w-64 flex-col gap-2 text-sm font-bold text-[#f8f7f2]">
              Encounter name
              <input
                autoFocus
                value={renamedFightName}
                onChange={(event) => {
                  setRenamedFightName(event.target.value);
                  setRenameFightError(null);
                }}
                aria-invalid={Boolean(renameFightError)}
                aria-describedby={renameFightError ? 'rename-encounter-error' : undefined}
                className="border border-sky-600 bg-black px-3 py-2 text-white outline-none focus:ring-2 focus:ring-sky-400"
              />
            </label>
            <button
              type="submit"
              className="rounded-lg bg-[#d6b46b] px-4 py-2 font-bold text-black transition hover:bg-[#f7e7ba]"
            >
              Rename
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRenamingFight(false);
                setRenameFightError(null);
              }}
              className="rounded-lg border border-[#d6b46b] bg-[#1c1c1f] px-4 py-2 font-bold text-white transition hover:bg-[#333]"
            >
              Cancel
            </button>
            {renameFightError && (
              <p id="rename-encounter-error" role="alert" className="w-full text-sm text-red-300">
                {renameFightError}
              </p>
            )}
          </form>
        )}

        {activeView !== 'mechanics' && <div className="mb-4 h-1 shrink-0 bg-gradient-to-r from-transparent via-[#d6b46b] to-transparent" />}

        {activeView !== 'mechanics' && isEditMode && copiedSetup && (
          <div className="encounter-surface mb-4 shrink-0 rounded-lg border border-[#d6b46b] bg-black/65 px-4 py-2 text-sm text-yellow-100">
            Copied to clipboard: <span className="font-bold text-[#f7e7ba]">{COPY_CATEGORY_LABELS[copiedSetup.category]}</span> from <span className="font-bold text-[#f7e7ba]">{copiedSetup.playerName}</span> in <span className="font-bold text-[#f7e7ba]">{copiedSetup.fightName}</span>. Use the paste icon in the same column on another player or encounter to apply only this category.
          </div>
        )}
        {activeView !== 'mechanics' && copiedEncounterName && (
          <div className="encounter-surface mb-4 shrink-0 rounded-lg border border-[#d6b46b] bg-black/65 px-4 py-2 text-sm text-yellow-100">
            Encounter <span className="font-bold text-[#f7e7ba]">{copiedEncounterName}</span> copied. Use Ctrl+V on another Encounter page to paste the players’ setups.
          </div>
        )}

        {activeView === 'mechanics' ? (
          <EncounterMechanicsView
            raidName={template.raid.selectedRaid}
            fightName={fight.name}
            players={players}
            playersStuff={fight.playersStuff}
            isEditMode={isEditMode}
            onPlayerMechanicsChange={updatePlayerMechanicsAssignment}
            onPlayerMirrorMechanicsChange={updatePlayerMirrorMechanicsAssignment}
            onAssignPlayerToPosition={assignPlayerToMechanicsPosition}
          />
        ) : activeView === 'overview' ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
            {visiblePlayers.map((player) => {
              const playerStuff = fight.playersStuff.find((entry) => entry.id === player.id) ?? createEmptyFightPlayerStuff(player);
              const skillLines = [player.skillClasses.MainSkillClass, player.skillClasses.SecondSkillClass, player.skillClasses.ThirdSkillClass].filter(Boolean);
              const className = getClassForSkillLine(skillLines[0]);
              const sets = getSetSummary(playerStuff.sets, catalogSets);
              const critDamage = getCritDamageBreakdown(player, playerStuff, players, allEncounterPlayerStuff, catalogSets);
              const food = ESO_FOODS.find((item) => String(item.id) === playerStuff.food || item.name === playerStuff.food)?.name ?? playerStuff.food ?? 'None';
              const foodEffect = ESO_FOODS.find((item) => String(item.id) === playerStuff.food || item.name === playerStuff.food)?.effect;
              const potion = ESO_POTIONS.find((item) => String(item.id) === playerStuff.potion || item.name === playerStuff.potion)?.name ?? playerStuff.potion ?? 'None';
              const foodTooltipContent = <><span className="mb-1 block font-bold text-[#f7e7ba]">{food}</span>{foodEffect ? <span className="block">{foodEffect}</span> : null}</>;
              const potionEffect = potionEffects[potion];
              const potionTooltipContent = <><span className="mb-1 block font-bold text-[#f7e7ba]">{potion}</span>{potionEffect ? <span className="block">{potionEffect}</span> : null}</>;
              const foodSummary = isEditMode
                ? <button type="button" onClick={() => setConsumableEditor({ playerId: player.id, type: 'food' })} className="flex w-full items-center gap-1 truncate text-left hover:text-yellow-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-300"><span className="text-white/50">Food</span>{playerStuff.food && <Image src={FOOD_ICON_MAP[playerStuff.food] ?? DEFAULT_FOOD_ICON} alt="" width={18} height={18} className="h-[18px] w-[18px] shrink-0 rounded" />}<span className="truncate">{food || 'None'}</span></button>
                : <div className="flex min-w-0 items-center gap-1 truncate"><span className="text-white/50">Food</span>{playerStuff.food && <Image src={FOOD_ICON_MAP[playerStuff.food] ?? DEFAULT_FOOD_ICON} alt="" width={18} height={18} className="h-[18px] w-[18px] shrink-0 rounded" />}<span className="truncate">{food || 'None'}</span></div>;
              const potionSummary = isEditMode
                ? <button type="button" onClick={() => setConsumableEditor({ playerId: player.id, type: 'potion' })} className="flex w-full items-center gap-1 truncate text-left hover:text-yellow-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-300"><span className="text-white/50">Potion</span>{playerStuff.potion && <Image src={POTION_ICON_MAP[playerStuff.potion] ?? DEFAULT_POTION_ICON} alt="" width={18} height={18} className="h-[18px] w-[18px] shrink-0 rounded" />}<span className="truncate">{potion || 'None'}</span></button>
                : <div className="flex min-w-0 items-center gap-1 truncate"><span className="text-white/50">Potion</span>{playerStuff.potion && <Image src={POTION_ICON_MAP[playerStuff.potion] ?? DEFAULT_POTION_ICON} alt="" width={18} height={18} className="h-[18px] w-[18px] shrink-0 rounded" />}<span className="truncate">{potion || 'None'}</span></div>;
              const classMasteries = [player.classMasteries.firstClassMastery, player.classMasteries.secondClassMastery].filter(Boolean);
              const descriptionLineCount = Math.max(1, ...visiblePlayers.map((visiblePlayer) => {
                const description = fight.playersStuff.find((entry) => entry.id === visiblePlayer.id)?.description ?? '';
                return description.split('\n').reduce((lines, line) => lines + Math.max(1, Math.ceil(line.length / 22)), 0);
              }));
              return (
                <article key={player.id} className="group/player-card relative min-w-0 rounded-lg border border-white/10 bg-[#111111]/95 p-3 text-[#f8f7f2] shadow-xl transition hover:z-20 focus-within:z-20">
                  {className && <Image src={CLASS_ICON_MAP[className]} alt={className} width={30} height={30} className="absolute left-3 top-3 h-7 w-7 object-contain" />}
                  <div className="mb-2 flex min-w-0 items-center justify-between gap-1">
                    <h2 className="min-w-0 truncate pl-9 text-sm font-bold">{player.name}</h2>
                    {renderSkillLineIcons(player, 'small')}
                  </div>
                  <CritDamageValue breakdown={critDamage}>
                    <p className="mb-2 cursor-help text-center text-xs font-semibold text-[#f7e7ba] underline decoration-dotted underline-offset-2">Crit Damage: {critDamage.total}%</p>
                  </CritDamageValue>
                  <p style={{ height: `${descriptionLineCount * 1.25}em` }} className="mb-4 mt-1 overflow-hidden whitespace-pre-wrap break-words text-left text-sm leading-[1.25em] text-white/70">{playerStuff.description}</p>
                  <div className="mb-3 flex w-full justify-center">
                    {renderActionBar(player.id, playerStuff.competencies, playerStuff.food, playerStuff.potion, true)}
                  </div>
                  <div ref={playerSetupEditor?.playerId === player.id && playerSetupEditor.type === 'mastery' ? playerSetupEditorRef : null} className="mb-2 flex flex-col items-center gap-1 text-xs text-yellow-200">{renderPlayerSetupEditors(player)}<div className="flex items-center justify-center gap-2">{classMasteries.map((mastery) => {
                    const masteryImage = getESOClassMasteryImage(mastery);
                    const tooltip = <>{masteryImage && <Image src={masteryImage} alt="" width={56} height={56} className="float-left mr-2 h-14 w-14 object-contain" />}<span className="block font-bold text-[#f7e7ba]">{mastery}</span><span className="mt-1 block leading-relaxed">{getESOClassMasteryDescription(mastery)}</span></>;
                    return isEditMode
                      ? <PortalTooltip key={mastery} content={tooltip}><button type="button" disabled={!hasCompletePlayerClass(player)} aria-label={mastery} aria-expanded={playerSetupEditor?.playerId === player.id && playerSetupEditor.type === 'mastery'} onClick={() => toggleMasteryMenu(player.id)} className="rounded border border-yellow-500 bg-black/30 p-1 text-yellow-200 transition hover:border-yellow-300 hover:bg-yellow-700/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-300">{masteryImage && <Image src={masteryImage} alt={mastery} width={40} height={40} className="h-10 w-10 object-contain" />}</button></PortalTooltip>
                      : <PortalTooltip key={mastery} content={tooltip}>{masteryImage ? <Image src={masteryImage} alt={mastery} width={40} height={40} className="h-10 w-10 rounded border border-yellow-500 bg-black/30 object-contain p-1" /> : null}</PortalTooltip>;
                  })}</div></div>
                  <div className="space-y-1 border-y border-white/10 py-2 text-[11px]">
                    {playerStuff.food ? <PortalTooltip content={foodTooltipContent}>{foodSummary}</PortalTooltip> : foodSummary}
                    {playerStuff.potion ? <PortalTooltip content={potionTooltipContent}>{potionSummary}</PortalTooltip> : potionSummary}
                    {isEditMode ? (
                      <PortalTooltip content={player.mundus ? <><span className="block font-bold text-[#f7e7ba]">{player.mundus}</span><span className="mt-1 block leading-relaxed">{getESOMundusStoneDescription(player.mundus)}</span></> : null}>
                        <button type="button" onClick={() => setMundusEditorPlayerId(player.id)} aria-label={`Change ${player.name} Mundus stone`} className="flex w-full min-w-0 cursor-pointer items-center gap-1 truncate text-left hover:text-yellow-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-300">
                          <span className="shrink-0 text-white/50">Mundus</span>
                          {player.mundus && MUNDUS_ICON_MAP[player.mundus] ? <Image src={MUNDUS_ICON_MAP[player.mundus]} alt={player.mundus} width={24} height={24} className="h-6 w-6 shrink-0 rounded" /> : <span className="h-6 w-6 shrink-0 rounded border border-yellow-500/60" />}
                          <span className="truncate">{player.mundus || 'None'}</span>
                        </button>
                      </PortalTooltip>
                    ) : (
                      <div className="flex min-w-0 items-center gap-1 truncate"><span className="shrink-0 text-white/50">Mundus</span>{player.mundus ? <PortalTooltip content={<><span className="block font-bold text-[#f7e7ba]">{player.mundus}</span><span className="mt-1 block leading-relaxed">{getESOMundusStoneDescription(player.mundus)}</span></>}><span className="flex min-w-0 items-center gap-1"><Image src={MUNDUS_ICON_MAP[player.mundus] ?? ''} alt={player.mundus} width={24} height={24} className="h-6 w-6 shrink-0 rounded" /><span className="truncate">{player.mundus}</span></span></PortalTooltip> : <span className="text-white/50">None</span>}</div>
                    )}
                  </div>
                  <div role="button" tabIndex={0} onClick={() => setOverviewSetPlayerId(player.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setOverviewSetPlayerId(player.id); } }} aria-label={`Show ${player.name} set slots`} className="mt-2 block w-full cursor-pointer border-t border-white/10 pt-2 text-left text-[11px] hover:bg-white/[0.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-300">
                    <div className="mb-1 flex justify-between text-white/50"><span>Sets</span><span>Pcs</span></div>
                    <ul className="space-y-1">{sets.length ? sets.map(({ id, setName, pieceCount }) => { const set = catalogSets.find((entry) => entry.id === id); return <li key={id} className="flex justify-between gap-2"><PortalTooltip content={<><SetHeadIcon setId={id} setName={setName} /><span className="mb-1 block font-bold text-[#f7e7ba]">{setName}</span>{set?.effects.map((effect) => <span key={`${effect.numberOfPiecesRequired}-${effect.description}`} className="mt-1 block">{effect.description.replace(/\|c[0-9a-fA-F]{6}|\|r/g, '')}</span>)}</>}><span>{setName}</span></PortalTooltip><span>{pieceCount}</span></li>; }) : <li className="text-white/50">No sets selected</li>}</ul>
                  </div>
                  <div className="mt-2 flex justify-center gap-3 border-t border-white/10 pt-2">
                    {CHAMPION_DISCIPLINE_GROUPS.map((group) => (
                      <button key={group.discipline} type="button" aria-label={`${player.name}: ${group.label} Champion Points`} onClick={() => setViewChampionDiscipline({ playerId: player.id, playerName: player.name, discipline: group.discipline })} className="encounter-overview__cp-button group/cp relative rounded p-1 transition hover:z-30 hover:scale-110 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-300">
                        <Image src={CHAMPION_DISCIPLINE_ICON[group.discipline]} alt={group.label} width={28} height={28} className="h-7 w-7 object-contain" />
                        <span className="cp-tooltip pointer-events-none absolute bottom-full left-1/2 z-40 mb-2 hidden w-52 -translate-x-1/2 rounded-lg border border-[#d6b46b] bg-[#111111] p-2 text-left text-xs text-white shadow-2xl group-hover/cp:block group-focus-visible/cp:block">
                          <span className="mb-1 flex justify-center">
                            <Image src={CHAMPION_DISCIPLINE_ICON[group.discipline]} alt={`${group.label} CP`} width={28} height={28} className="h-7 w-7 object-contain" />
                          </span>
                          {sortChampionPointSlots(group.slots, playerStuff.championPoints).map((slot) => <span key={slot} className="block">{playerStuff.championPoints[slot] || 'Empty'}</span>)}
                        </span>
                      </button>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        ) : <div className="encounters-page__table-shell encounter-surface encounter-table-shell overflow-x-auto rounded-lg border-2 border-[#d6b46b] bg-[#111111] shadow-2xl">
            <table className="encounter-table w-full min-w-[1280px] table-fixed">
            <colgroup>
              <col className="w-[12%]" />
              <col className="w-[29%]" />
              <col className="w-[28%]" />
              <col className="w-[31%]" />
            </colgroup>
            <thead>
              <tr className="encounter-table__header border-b-2 border-[#d6b46b] bg-[#191919]">
                <th className="sticky top-0 z-10 bg-[#191919] px-4 py-3 text-center font-bold text-[#f8f7f2]">Player</th>
                <th className="sticky top-0 z-10 bg-[#191919] px-4 py-3 text-center font-bold text-[#f8f7f2]">Sets</th>
                <th className="sticky top-0 z-10 bg-[#191919] px-4 py-3 text-center font-bold text-[#f8f7f2]">Skills</th>
                <th className="sticky top-0 z-10 bg-[#191919] px-4 py-3 text-center font-bold text-[#f8f7f2]">Champion Points</th>
              </tr>
            </thead>
            <tbody>
              {visiblePlayers.map((player) => {
                const playerStuff = fight.playersStuff.find((entry) => entry.id === player.id) ?? createEmptyFightPlayerStuff(player);
                const emptyPlayerStuff = createEmptyFightPlayerStuff(player);
                const setSummary = getSetSummary(playerStuff.sets, catalogSets);
                const critDamage = getCritDamageBreakdown(player, playerStuff, players, allEncounterPlayerStuff, catalogSets);
                const classMasteries = [player.classMasteries.firstClassMastery, player.classMasteries.secondClassMastery].filter(Boolean);
                const descriptionLineCount = Math.max(1, ...visiblePlayers.map((visiblePlayer) => {
                  const description = fight.playersStuff.find((entry) => entry.id === visiblePlayer.id)?.description ?? '';
                  return description.split('\n').reduce((lines, line) => lines + Math.max(1, Math.ceil(line.length / 22)), 0);
                }));

                return (
                  <tr key={player.id} className="encounter-table__row border-b border-yellow-700 align-top">
                    <td className={`relative px-4 py-6 text-yellow-100 font-semibold ${playerSetupEditor?.playerId === player.id ? 'z-[60]' : 'z-0 hover:z-20'}`}>
                      <div className="flex flex-col items-center gap-2">
                        <span>{player.name}</span>
                        <div className="relative group inline-block">
                          {renderRoleIcon(player)}
                        </div>
                        {isEditMode ? (
                          <textarea
                            aria-label={`${player.name} description`}
                            value={playerStuff.description}
                            onChange={(event) => updateFightPlayerStuff(fight.name, player.id, 'description', event.target.value)}
                            placeholder="Description"
                            rows={descriptionLineCount}
                            style={{ height: `${descriptionLineCount * 1.25}em` }}
                            className="box-border w-full resize-none overflow-hidden rounded border border-yellow-700 bg-black/40 p-2 text-center text-xs font-normal leading-[1.25em] text-yellow-100 placeholder:text-yellow-200/60 focus:border-yellow-400 focus:outline-none"
                          />
                        ) : (
                          <p style={{ height: `${descriptionLineCount * 1.25}em` }} className="max-w-full overflow-hidden whitespace-pre-wrap break-words text-center text-xs font-normal leading-[1.25em] text-yellow-200">
                            {playerStuff.description}
                          </p>
                        )}

                        {renderSkillLineIcons(player, 'large')}

                        <div ref={playerSetupEditor?.playerId === player.id && playerSetupEditor.type === 'mastery' ? playerSetupEditorRef : null} className="flex flex-col items-center gap-1 text-xs text-yellow-200">
                          {renderPlayerSetupEditors(player)}
                          <div className="flex items-center justify-center gap-2">
                          {classMasteries.map((mastery) => isEditMode ? (
                            <PortalTooltip key={`${player.id}-${mastery}`} content={(() => { const image = getESOClassMasteryImage(mastery); return <>{image && <Image src={image} alt="" width={56} height={56} className="float-left mr-2 h-14 w-14 object-contain" />}<span className="block font-bold text-[#f7e7ba]">{mastery}</span><span className="mt-1 block leading-relaxed">{getESOClassMasteryDescription(mastery)}</span></>; })()}>
                              <button type="button" disabled={!hasCompletePlayerClass(player)} aria-label={mastery} aria-expanded={playerSetupEditor?.playerId === player.id && playerSetupEditor.type === 'mastery'} onClick={() => toggleMasteryMenu(player.id)} className="rounded border border-yellow-500 bg-black/30 p-1 text-yellow-200 transition hover:border-yellow-300 hover:bg-yellow-700/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-300">
                                {getESOClassMasteryImage(mastery) && (
                                  <Image src={getESOClassMasteryImage(mastery)!} alt={mastery} width={40} height={40} className="h-10 w-10 object-contain" />
                                )}
                              </button>
                            </PortalTooltip>
                          ) : (
                            <PortalTooltip key={`${player.id}-${mastery}`} content={(() => { const image = getESOClassMasteryImage(mastery); return <>{image && <Image src={image} alt="" width={56} height={56} className="float-left mr-2 h-14 w-14 object-contain" />}<span className="block font-bold text-[#f7e7ba]">{mastery}</span><span className="mt-1 block leading-relaxed">{getESOClassMasteryDescription(mastery)}</span></>; })()}>
                              {getESOClassMasteryImage(mastery) ? (
                                <Image src={getESOClassMasteryImage(mastery)!} alt={mastery} width={40} height={40} className="h-10 w-10 rounded border border-yellow-500 bg-black/30 object-contain p-1" />
                              ) : null}
                            </PortalTooltip>
                          ))}
                          </div>
                          {player.mundus ? (
                            <PortalTooltip content={<><span className="block font-bold text-[#f7e7ba]">{player.mundus}</span><span className="mt-1 block leading-relaxed">{getESOMundusStoneDescription(player.mundus)}</span></>}>
                              <span className="relative mt-2 flex items-center gap-1">
                                <Image
                                  src={MUNDUS_ICON_MAP[player.mundus] ?? ''}
                                  alt={player.mundus}
                                  width={40}
                                  height={40}
                                  className="h-10 w-10 rounded-full border border-yellow-500 bg-black/30 p-0.5"
                                />
                                <span className="text-[11px] text-yellow-200">{player.mundus}</span>
                              </span>
                            </PortalTooltip>
                          ) : null}
                        </div>

                        <div className="mt-1 w-full border-t border-double border-[#d6b46b] pt-2">
                          <div className="rounded-md border border-[#d6b46b]/60 bg-[#d6b46b]/10 px-3 py-2 text-center">
                            <span className="block text-[10px] font-medium uppercase tracking-wide text-yellow-100/70">Crit Damage</span>
                            <CritDamageValue breakdown={critDamage}>
                              <span className="block cursor-help text-sm font-bold text-[#f7e7ba] underline decoration-dotted underline-offset-2">{critDamage.total}%</span>
                            </CritDamageValue>
                          </div>
                        </div>

                      </div>
                    </td>
                    <td className="relative z-0 px-4 py-6 text-sm text-yellow-100 align-top hover:z-20">
                      <div className="mx-auto flex w-full max-w-[48rem] min-w-0 flex-col gap-3">
                        {isEditMode && (
                        <section className="rounded-2xl border border-[#d6b46b]/50 bg-gradient-to-br from-[#1a1916] via-[#111111] to-[#111111] p-3 shadow-lg shadow-black/20">
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#d6b46b]">Gear setup</p>
                              <p className="mt-0.5 text-xs text-white/55">
                                {setSummary.length ? `${setSummary.length} active ${setSummary.length === 1 ? 'set' : 'sets'}` : 'Build this player’s set setup'}
                              </p>
                            </div>
                            {renderCopyPasteControls('sets', player.id, player.name, playerStuff, emptyPlayerStuff)}
                          </div>

                          <div className={`mt-3 grid gap-2 ${isEditMode ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-1'}`}>
                            {isEditMode && (
                              <button
                                type="button"
                                onClick={() => {
                                  setQuickGearSetup({
                                    playerId: player.id,
                                    replaceSetIds: [],
                                    selectedSetId: null,
                                    isReplaceSetPickerOpen: false,
                                    selectedSlots: [],
                                    draggedItems: {},
                                    bodyArmorWeight: '',
                                    bodyEnchantment: '',
                                    jewelryEnchantment: '',
                                    bodyTrait: '',
                                    jewelryTrait: '',
                                  });
                                  setQuickGearError(null);
                                }}
                                className="group flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#d6b46b] bg-[#d6b46b] px-3 py-2 text-xs font-bold text-[#17130b] shadow-md shadow-[#d6b46b]/10 transition hover:border-[#f7e7ba] hover:bg-[#f0d99f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f7e7ba]"
                              >
                                <span aria-hidden="true" className="text-lg leading-none">+</span>
                                Quick gear
                              </button>
                            )}
                            <button
                              type="button"
                              aria-expanded={showSetDetailsByPlayer[player.id] ?? false}
                              onClick={() => setShowSetDetailsByPlayer((current) => ({
                                ...current,
                                [player.id]: !(current[player.id] ?? false),
                              }))}
                              className={`flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f7e7ba] ${
                                showSetDetailsByPlayer[player.id]
                                  ? 'border-[#d6b46b] bg-[#d6b46b]/15 text-[#f7e7ba]'
                                  : 'border-white/10 bg-white/[0.04] text-white/80 hover:border-[#d6b46b]/70 hover:bg-white/[0.08]'
                              }`}
                            >
                              <span aria-hidden="true">▦</span>
                              {showSetDetailsByPlayer[player.id] ? 'Hide slots' : 'View slots'}
                            </button>
                            {isEditMode && (
                              <button
                                type="button"
                                aria-expanded={bulkEnchantmentPlayerId === player.id}
                                onClick={() => {
                                  setBulkEnchantmentPlayerId((current) => current === player.id ? null : player.id);
                                  setBulkEnchantmentEditor(null);
                                }}
                                className={`col-span-2 flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f7e7ba] sm:col-span-1 ${
                                  bulkEnchantmentPlayerId === player.id
                                    ? 'border-[#d6b46b] bg-[#d6b46b]/15 text-[#f7e7ba]'
                                    : 'border-white/10 bg-white/[0.04] text-white/80 hover:border-[#d6b46b]/70 hover:bg-white/[0.08]'
                                }`}
                              >
                                <span aria-hidden="true">✦</span>
                                Edit enchants
                              </button>
                            )}
                          </div>

                          {isEditMode && bulkEnchantmentPlayerId === player.id && (
                            <div className="mt-3 rounded-xl border border-[#d6b46b]/30 bg-black/30 p-3">
                              <div className="mb-3">
                                <h3 className="text-xs font-semibold text-[#f8f7f2]">Bulk enchantment editor</h3>
                                <p className="mt-1 text-[11px] leading-relaxed text-white/55">
                                  Choose a gear group, then apply one glyph to every equipped piece in that group.
                                </p>
                              </div>
                              <div className="grid grid-cols-2 gap-2 rounded-lg bg-black/30 p-1">
                                {(['body', 'jewelry'] as const).map((category) => {
                                  const isSelected = bulkEnchantmentEditor?.playerId === player.id
                                    && bulkEnchantmentEditor.category === category;
                                  return (
                                    <button
                                      key={category}
                                      type="button"
                                      aria-pressed={isSelected}
                                      onClick={() => setBulkEnchantmentEditor((current) => (
                                        current?.playerId === player.id && current.category === category
                                          ? null
                                          : { playerId: player.id, category }
                                      ))}
                                      className={`rounded-md px-3 py-2 text-xs font-semibold transition ${
                                        isSelected
                                          ? 'bg-[#d6b46b] text-[#17130b] shadow'
                                          : 'text-white/65 hover:bg-white/5 hover:text-white'
                                      }`}
                                    >
                                      {category === 'body' ? 'Body armor' : 'Jewelry'}
                                    </button>
                                  );
                                })}
                              </div>
                              {bulkEnchantmentEditor?.playerId === player.id && (
                                <label className="mt-3 block text-xs font-medium text-white/75">
                                  Apply to all equipped {bulkEnchantmentEditor.category === 'body' ? 'body armor' : 'jewelry'}
                                  <select
                                    aria-label={`Bulk ${bulkEnchantmentEditor.category} enchantment`}
                                    value=""
                                    onChange={(event) => applyBulkEnchantments(
                                      player.id,
                                      bulkEnchantmentEditor.category,
                                      event.target.value === '__clear__' ? '' : event.target.value,
                                    )}
                                    className="mt-1.5 w-full rounded-lg border border-white/10 bg-[#181818] px-3 py-2.5 text-sm text-white outline-none transition focus:border-[#d6b46b] focus:ring-2 focus:ring-[#d6b46b]/20"
                                  >
                                    <option value="" disabled>Choose an enchantment…</option>
                                    <option value="__clear__">Clear enchantments</option>
                                    {ESO_ENCHANTS
                                      .filter((enchant) => enchant.gearType === (bulkEnchantmentEditor.category === 'body' ? 'armor' : 'jewelry'))
                                      .map((enchant) => <option key={enchant.id} value={String(enchant.id)}>{enchant.name}</option>)}
                                  </select>
                                </label>
                              )}
                            </div>
                          )}
                        </section>
                        )}

                        {renderSetSummary(setSummary)}

                        {!isEditMode && (
                          <button
                            type="button"
                            aria-expanded={showSetDetailsByPlayer[player.id] ?? false}
                            onClick={() => setShowSetDetailsByPlayer((current) => ({
                              ...current,
                              [player.id]: !(current[player.id] ?? false),
                            }))}
                            className={`flex min-h-8 w-full items-center justify-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f7e7ba] ${
                              showSetDetailsByPlayer[player.id]
                                ? 'border-[#d6b46b] bg-[#d6b46b]/15 text-[#f7e7ba]'
                                : 'border-white/10 bg-white/[0.03] text-white/70 hover:border-[#d6b46b]/70 hover:bg-white/[0.07]'
                            }`}
                          >
                            <span aria-hidden="true">▦</span>
                            {showSetDetailsByPlayer[player.id] ? 'Hide setup details' : 'View setup details'}
                          </button>
                        )}
                        {!isEditMode && showSetDetailsByPlayer[player.id] && renderCompactSetDetails(player.id)}

                        {isEditMode && showSetDetailsByPlayer[player.id] && (
                          <section className="@container/set-details rounded-2xl border border-white/10 bg-[#111111]/70 p-3 shadow-inner shadow-black/20">
                            <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-2">
                              <h3 className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/65">Equipped slots</h3>
                              <span className="text-[10px] text-white/40">Select a slot to edit</span>
                            </div>
                            <div className="grid w-full min-w-0 grid-cols-[minmax(0,0.7fr)_minmax(0,2fr)_minmax(0,1fr)] items-start gap-[2cqw]">
                              <div className="flex min-w-0 flex-col items-center gap-[2cqw] pt-8">
                                {renderSetSlot(player.id, 'necklace', 'Necklace')}
                                {renderSetSlot(player.id, 'ring1', 'Ring1')}
                                {renderSetSlot(player.id, 'ring2', 'Ring2')}
                              </div>

                              <div className="flex min-w-0 flex-col items-center gap-0.5">
                                {SET_LAYOUT_ROWS.map((row, rowIndex) => (
                                  <div
                                    key={`set-row-${rowIndex}`}
                                    className="flex items-end justify-center gap-[2cqw]"
                                  >
                                    {row.map((item) => (
                                      <div
                                        key={`${player.id}-set-${item.slot}`}
                                        className={'colSpan' in item && item.colSpan ? 'mx-auto' : ''}
                                      >
                                        {renderSetSlot(player.id, item.slot, item.label)}
                                      </div>
                                    ))}
                                  </div>
                                ))}
                              </div>

                              <div className="flex min-w-0 flex-col items-center gap-[3cqw] pt-14">
                                <div className="flex gap-[2cqw]">
                                  {renderWeaponSlots(player.id, 'mainHandFrontBar', 'offHandFrontBar', 'Front bar')}
                                </div>
                                <div className="flex gap-[2cqw]">
                                  {renderWeaponSlots(player.id, 'mainHandBackBar', 'offHandBackBar', 'Back bar')}
                                </div>
                              </div>
                            </div>
                          </section>
                        )}
                      </div>
                    </td>
                    <td className="relative z-0 px-4 py-6 align-top text-sm text-yellow-100 hover:z-20">
                      <div className="flex flex-col items-center gap-2">
                        <div className="flex flex-wrap justify-center gap-2">
                          {renderCopyPasteControls('skills', player.id, player.name, playerStuff, emptyPlayerStuff)}
                        </div>
                        {renderActionBar(player.id, playerStuff.competencies, playerStuff.food, playerStuff.potion)}
                      </div>
                    </td>
                    <td className="relative z-0 px-4 py-6 align-top text-sm text-yellow-100 hover:z-20">
                      <div className="flex flex-col items-center gap-2">
                        {renderCopyPasteControls('championPoints', player.id, player.name, playerStuff, emptyPlayerStuff)}
                        {renderChampionPoints(player.id, playerStuff.championPoints)}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            </table>
          </div>}
      </div>

      {isEditMode && isDeleteFightConfirmationOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" onClick={(event) => {
          if (event.target === event.currentTarget) setIsDeleteFightConfirmationOpen(false);
        }}>
          <section role="alertdialog" aria-modal="true" aria-labelledby="delete-encounter-title" aria-describedby="delete-encounter-description" className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111720] p-6 shadow-2xl">
            <h2 id="delete-encounter-title" className="text-lg font-bold text-white">Delete encounter?</h2>
            <p id="delete-encounter-description" className="mt-3 text-sm leading-6 text-slate-300">Are you sure you want to delete {fight.name}? This action cannot be undone.</p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setIsDeleteFightConfirmationOpen(false)} className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/5">Cancel</button>
              <button type="button" onClick={confirmRemoveFight} className="rounded-xl bg-[#d3b475] px-4 py-2.5 text-sm font-semibold text-[#10141b] transition hover:bg-[#f0d69c]">Delete encounter</button>
            </div>
          </section>
        </div>
      )}

      {viewChampionDiscipline && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={(event) => { if (event.target === event.currentTarget) setViewChampionDiscipline(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="overview-cp-title" className="w-full max-w-md rounded-lg border-2 border-[#d6b46b] bg-[#111111] p-6">
            <div className="mb-4 flex items-center gap-3">
              <Image src={CHAMPION_DISCIPLINE_ICON[viewChampionDiscipline.discipline]} alt="" width={36} height={36} className="h-9 w-9 object-contain" />
              <h2 id="overview-cp-title" className="text-lg font-bold text-[#f8f7f2]">{viewChampionDiscipline.playerName} — {CHAMPION_DISCIPLINE_GROUPS.find(({ discipline }) => discipline === viewChampionDiscipline.discipline)?.label} CP</h2>
              <button type="button" aria-label="Close Champion Points" onClick={() => setViewChampionDiscipline(null)} className="ml-auto text-2xl leading-none text-[#d6b46b]">×</button>
            </div>
            <ul className="flex flex-col items-center gap-2">{(() => {
              const championPoints = fight.playersStuff.find((entry) => entry.id === viewChampionDiscipline.playerId)?.championPoints;
              const slots = CHAMPION_DISCIPLINE_GROUPS.find(({ discipline }) => discipline === viewChampionDiscipline.discipline)?.slots ?? [];
              return championPoints ? sortChampionPointSlots(slots, championPoints).map((slot) => <li key={slot}>{renderChampionPointSlot(viewChampionDiscipline.playerId, slot, championPoints[slot] ?? '')}</li>) : null;
            })()}</ul>
          </section>
        </div>
      )}

      {mundusEditorPlayerId !== null && (() => {
        const player = players.find(({ id }) => id === mundusEditorPlayerId);
        if (!player) return null;
        return (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" onClick={(event) => { if (event.target === event.currentTarget) setMundusEditorPlayerId(null); }}>
            <section role="dialog" aria-modal="true" aria-labelledby="overview-mundus-title" className="w-full max-w-sm rounded-xl border-2 border-[#d6b46b] bg-[#111111] p-4 shadow-2xl">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 id="overview-mundus-title" className="text-lg font-bold text-[#f8f7f2]">{player.name} — Mundus</h2>
                <button type="button" aria-label="Close Mundus selector" onClick={() => setMundusEditorPlayerId(null)} className="text-2xl leading-none text-[#d6b46b]">×</button>
              </div>
              <div className="max-h-[60vh] space-y-1 overflow-y-auto">
                {MUNDUS_STONE_OPTIONS.map((stone) => (
                  <button key={stone} type="button" disabled={player.mundus === stone} onClick={() => { updatePlayerMundus(player.id, stone); setMundusEditorPlayerId(null); }} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition ${player.mundus === stone ? 'cursor-not-allowed bg-white/10 text-white/40 grayscale' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}>
                    <PortalTooltip content={<><span className="block font-bold text-[#f7e7ba]">{stone}</span><span className="mt-1 block leading-relaxed">{getESOMundusStoneDescription(stone)}</span></>}>
                      <span className="flex min-w-0 flex-1 items-center gap-3">
                        {MUNDUS_ICON_MAP[stone] && <Image src={MUNDUS_ICON_MAP[stone]} alt="" width={24} height={24} className="h-6 w-6 shrink-0 rounded" />}
                        <span>{stone}</span>
                      </span>
                    </PortalTooltip>
                  </button>
                ))}
              </div>
            </section>
          </div>
        );
      })()}

      {overviewSetPlayerId !== null && (() => {
        const player = players.find(({ id }) => id === overviewSetPlayerId);
        if (!player) return null;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3" onClick={(event) => { if (event.target === event.currentTarget) setOverviewSetPlayerId(null); }}>
            <section role="dialog" aria-modal="true" aria-labelledby="overview-sets-title" className="@container/set-details w-full max-w-5xl rounded-xl border-2 border-[#d6b46b] bg-[#111111] p-4 sm:p-6">
              <div className="mb-4 flex items-center justify-between gap-4">
                <h2 id="overview-sets-title" className="text-lg font-bold text-[#f8f7f2]">{player.name} — Sets</h2>
                <button type="button" aria-label="Close set details" onClick={() => setOverviewSetPlayerId(null)} className="text-2xl leading-none text-[#d6b46b]">×</button>
              </div>
              <div className="grid min-w-0 grid-cols-[minmax(0,0.7fr)_minmax(0,2fr)_minmax(0,1fr)] items-start gap-[2cqw]">
                <div className="flex min-w-0 flex-col items-center gap-[2cqw] pt-8">{renderSetSlot(player.id, 'necklace', 'Necklace', true, true)}{renderSetSlot(player.id, 'ring1', 'Ring1', true, true)}{renderSetSlot(player.id, 'ring2', 'Ring2', true, true)}</div>
                <div className="flex min-w-0 flex-col items-center gap-0.5">{SET_LAYOUT_ROWS.map((row, rowIndex) => <div key={`overview-set-row-${rowIndex}`} className="flex items-end justify-center gap-[2cqw]">{row.map((item) => <div key={`${player.id}-overview-set-${item.slot}`} className={'colSpan' in item && item.colSpan ? 'mx-auto' : ''}>{renderSetSlot(player.id, item.slot, item.label, true, true)}</div>)}</div>)}</div>
                <div className="flex min-w-0 flex-col items-center gap-[3cqw] pt-14"><div className="flex gap-[2cqw]">{renderWeaponSlots(player.id, 'mainHandFrontBar', 'offHandFrontBar', 'Front bar', true, true)}</div><div className="flex gap-[2cqw]">{renderWeaponSlots(player.id, 'mainHandBackBar', 'offHandBackBar', 'Back bar', true, true)}</div></div>
              </div>
            </section>
          </div>
        );
      })()}

      {skillEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-lg border-2 border-[#d6b46b] bg-[#111111] p-6">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-2xl font-bold text-[#f8f7f2]">
                {scribingDraft ? 'Choose the required Scribing scripts' : 'Select an ability'}
              </h2>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    updateFightPlayerStuff(fight.name, skillEditor.playerId, skillEditor.field, '');
                    setScribingDraft(null);
                    setSkillEditor(null);
                  }}
                  className="rounded border border-[#d6b46b] bg-[#171717] px-3 py-1 text-sm font-semibold text-[#f8f7f2] transition hover:border-[#f8f7f2] hover:bg-[#242424]"
                >
                  Clear slot
                </button>
                <button type="button" onClick={() => { setScribingDraft(null); setSkillEditor(null); }} className="text-2xl text-[#d6b46b] hover:text-[#f7e7ba]">×</button>
              </div>
            </div>

            <div className={scribingDraft ? '' : 'grid gap-4 sm:grid-cols-[11rem_minmax(0,1fr)]'}>
              {!scribingDraft && (
                <aside className="sm:max-h-[60vh] sm:overflow-y-auto">
                  <div className="grid max-h-[20vh] grid-cols-2 gap-x-3 gap-y-2 overflow-y-auto pr-1 sm:max-h-none sm:grid-cols-1 sm:overflow-visible">
                    {abilityPickerGroups.map(({ label, icon, entries }) => (
                      <section key={label} className="min-w-0">
                        <h3 className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[#d6b46b]">
                          {icon && <Image src={icon} alt="" aria-hidden="true" width={22} height={22} className="h-5 w-5 shrink-0 object-contain" />}
                          <span>{label}</span>
                        </h3>
                        <div className="grid gap-1">
                          {entries.map((entry) => {
                            const iconSrc = SKILL_LINE_ICON_MAP[entry.category]
                              || getAbilityPickerIcon(entry.category, entry.armorWeight);
                            return (
                              <button
                                key={entry.id}
                                type="button"
                                aria-pressed={entry.id === activeAbilityEntry?.id}
                                onClick={() => setCurrentAbilityEntryId(entry.id)}
                                className={`flex min-w-0 items-center gap-2 rounded border px-2 py-1.5 text-left text-[11px] font-semibold leading-tight ${
                                  entry.id === activeAbilityEntry?.id
                                    ? 'border-[#f8f7f2] bg-[#d6b46b] text-black'
                                    : 'border-[#d6b46b]/70 bg-[#171717] text-[#f8f7f2] hover:border-[#f8f7f2]'
                                }`}
                              >
                                {iconSrc && <Image src={iconSrc} alt="" aria-hidden="true" width={24} height={24} className="h-6 w-6 shrink-0 object-contain" />}
                                <span>{entry.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </section>
                    ))}
                  </div>
                </aside>
              )}

              <div className="min-w-0">
              <h3 className="mb-3 text-lg font-bold text-[#f8f7f2]">
                {scribingDraft ? selectedScribingGrimoire?.skillName : 'Ability'}
              </h3>
              {scribingDraft && selectedScribingOptions ? (
                <div className="space-y-4">
                  {scribingChoices.map(({ field, label, options }) => (
                    <label key={field} className="flex flex-col gap-2 text-sm font-semibold text-[#f8f7f2]">
                      {label}
                      <select
                        required
                        value={scribingDraft[field]}
                        onChange={(event) => setScribingDraft((current) => current
                          ? { ...current, [field]: event.target.value === '' ? '' : Number(event.target.value) }
                          : null)}
                        className="rounded border border-[#8c7645] bg-[#171717] px-3 py-2 text-[#f8f7f2]"
                      >
                        <option value="">Select {label.toLowerCase()}...</option>
                        {options.map((option) => (
                          <option key={option.id} value={option.id}>{option.name}</option>
                        ))}
                      </select>
                    </label>
                  ))}
                  <div className="flex justify-between gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setScribingDraft(null)}
                      className="rounded border border-[#8c7645] px-4 py-2 text-sm font-semibold text-[#f8f7f2] hover:border-[#f8f7f2]"
                    >
                      Back to abilities
                    </button>
                    <button
                      type="button"
                      disabled={!scribingDraft.focusScriptId || !scribingDraft.signatureScriptId || !scribingDraft.affixScriptId}
                      onClick={() => {
                        const {
                          grimoireAbilityId,
                          focusScriptId,
                          signatureScriptId,
                          affixScriptId,
                        } = scribingDraft;
                        if (!focusScriptId || !signatureScriptId || !affixScriptId) return;
                        updateFightPlayerStuff(
                          fight.name,
                          skillEditor.playerId,
                          skillEditor.field,
                          encodeScribingSkillId(
                            grimoireAbilityId,
                            focusScriptId,
                            signatureScriptId,
                            affixScriptId,
                          ),
                        );
                        setScribingDraft(null);
                        setSkillEditor(null);
                      }}
                      className="rounded border border-[#d6b46b] bg-[#d6b46b] px-4 py-2 text-sm font-bold text-black hover:bg-[#f7e7ba] disabled:opacity-40"
                    >
                      Confirm ability
                    </button>
                  </div>
                </div>
              ) : !scribingDraft ? (
                <div className="max-h-[52vh] space-y-3 overflow-y-auto pr-1">
                  {getAbilitySkillTree(activeSkillCategory, skillEditor.ultimateOnly ? 'only' : 'exclude')
                    .filter(({ parent }) => (
                      !activeAbilityEntry?.armorWeight
                      || getArmorWeightForAbility(parent.skillName) === activeAbilityEntry.armorWeight
                    ))
                    .map(({ parent, morphs }) => {
                  const familyIsOccupied = occupiedAbilityFamilies.has(parent.abilityId);

                  return (
                    <div key={parent.abilityId} className="rounded border border-[#d6b46b]/70 bg-[#171717] p-2">
                      <button
                        type="button"
                        disabled={familyIsOccupied}
                        onClick={() => {
                          if (parent.isCrafted) {
                            setScribingDraft({
                              grimoireAbilityId: parent.abilityId,
                              focusScriptId: '',
                              signatureScriptId: '',
                              affixScriptId: '',
                            });
                            return;
                          }
                          updateFightPlayerStuff(fight.name, skillEditor.playerId, skillEditor.field, parent.abilityId);
                          setSkillEditor(null);
                        }}
                        className="group relative flex w-full items-start gap-3 rounded border border-[#d6b46b] bg-[#202020] p-2 text-left transition hover:border-[#f8f7f2] disabled:opacity-40 disabled:hover:border-[#d6b46b]"
                      >
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center">
                          <Image src={getAbilityImagePath(activeSkillCategory, parent.skillName)} alt={parent.skillName} width={40} height={40} className="h-10 w-10 object-cover" />
                        </div>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-bold text-[#f8f7f2]">{parent.skillName}</span>
                          <span className="mt-1 block whitespace-pre-line text-xs leading-relaxed text-white/70">
                            {getSkillAbilityDescription(parent.abilityId)}
                          </span>
                        </span>
                      </button>
                      {morphs.length > 0 && (
                        <div className="ml-6 mt-2 grid gap-2 border-l border-[#d6b46b] pl-3 sm:grid-cols-2">
                          {morphs.map((morph) => (
                            <button
                              key={morph.abilityId}
                              type="button"
                              disabled={familyIsOccupied}
                              onClick={() => {
                                updateFightPlayerStuff(fight.name, skillEditor.playerId, skillEditor.field, morph.abilityId);
                                setSkillEditor(null);
                              }}
                              className="group relative flex items-start gap-2 rounded border border-[#8c7645] bg-[#111111] p-2 text-left transition hover:border-[#f8f7f2] disabled:opacity-40 disabled:hover:border-[#8c7645]"
                            >
                              <Image src={getAbilityImagePath(activeSkillCategory, morph.skillName)} alt={morph.skillName} width={36} height={36} className="h-9 w-9 shrink-0 object-cover" />
                              <span className="min-w-0 flex-1">
                                <span className="block text-xs font-semibold text-[#f8f7f2]">{morph.skillName}</span>
                                <span className="mt-1 block whitespace-pre-line text-xs leading-relaxed text-white/70">
                                  {getSkillAbilityDescription(morph.abilityId)}
                                </span>
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                  })}
                </div>
              ) : null}
            </div>
            </div>
          </div>
        </div>
      )}

      {consumableEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg border-2 border-[#d6b46b] bg-[#111111] p-6">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-2xl font-bold text-[#f8f7f2]">
                {consumableEditor.type === 'food' ? 'Choose food' : 'Choose potion'}
              </h2>
              <button type="button" onClick={() => { setConsumableEditor(null); setFoodSearch(''); setPotionSearch(''); }} className="text-2xl text-[#d6b46b] hover:text-[#f7e7ba]">×</button>
            </div>

            {consumableEditor.type === 'food' && (
              <input
                type="search"
                value={foodSearch}
                onChange={(event) => setFoodSearch(event.target.value)}
                placeholder="Search a food..."
                aria-label="Search a food"
                className="mb-4 w-full border border-[#d6b46b] bg-[#171717] px-3 py-2 text-[#f8f7f2] outline-none placeholder:text-[#b7b5aa]/80 focus:border-[#f8f7f2]"
              />
            )}

            {consumableEditor.type === 'potion' && (
              <input
                type="search"
                value={potionSearch}
                onChange={(event) => setPotionSearch(event.target.value)}
                placeholder="Search a potion..."
                aria-label="Search a potion"
                className="mb-4 w-full border border-[#d6b46b] bg-[#171717] px-3 py-2 text-[#f8f7f2] outline-none placeholder:text-[#b7b5aa]/80 focus:border-[#f8f7f2]"
              />
            )}

            {consumableEditor.type === 'food' ? (
              <div className="space-y-5">
                {foodGroups.map((group) => (
                  <section key={group.label}>
                    <h3 className="mb-2 border-b border-[#d6b46b]/40 pb-1 text-sm font-semibold uppercase tracking-wide text-[#d6b46b]">{group.label}</h3>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {group.foods.map((food) => (
                        <button key={food.id} type="button" onClick={() => {
                          updateFightPlayerStuff(fight.name, consumableEditor.playerId, 'food', food.name);
                          setConsumableEditor(null); setFoodSearch(''); setPotionSearch('');
                        }} className="flex min-w-0 items-center gap-3 border border-[#d6b46b]/60 bg-[#171717] p-2 text-left transition hover:border-[#f8f7f2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f8f7f2]">
                          <Image src={FOOD_ICON_MAP[food.name] ?? DEFAULT_FOOD_ICON} alt="" width={40} height={40} className="h-10 w-10 shrink-0 object-cover" />
                          <span className="min-w-0"><span className="block font-medium text-[#f8f7f2]">{food.name}</span><span className="mt-1 block text-xs leading-relaxed text-white/65">{food.effect}</span></span>
                        </button>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {filteredPotions.map((potion) => (
                  <button key={potion.id} type="button" onClick={() => {
                    updateFightPlayerStuff(fight.name, consumableEditor.playerId, 'potion', potion.name);
                    setConsumableEditor(null); setFoodSearch(''); setPotionSearch('');
                  }} className="flex items-center gap-3 border border-[#d6b46b]/60 bg-[#171717] p-3 text-left transition hover:border-[#f8f7f2]">
                    <Image src={POTION_ICON_MAP[potion.name] ?? DEFAULT_POTION_ICON} alt="" width={44} height={44} className="h-11 w-11 shrink-0 object-cover" />
                    <span><span className="block font-medium text-[#f8f7f2]">{potion.name}</span><span className="mt-1 block text-sm text-white/65">{potionEffects[potion.name]}</span></span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {championPointEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div
            className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-lg border-2 border-[#d6b46b] bg-[#111111] p-6"
            style={{
              backgroundImage: `linear-gradient(rgba(17, 17, 17, 0.82), rgba(17, 17, 17, 0.92)), url("${CHAMPION_DISCIPLINE_BACKGROUND[getChampionPointDisciplineFromSlot(championPointEditor.field) ?? ChampionPointDiscipline.TheThief]}")`,
              backgroundPosition: 'center',
              backgroundSize: 'cover',
            }}
          >
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-2xl font-bold text-[#f8f7f2]">Choose up to 4 champion points</h2>
              <button type="button" onClick={() => setChampionPointEditor(null)} className="text-2xl text-[#d6b46b] hover:text-[#f7e7ba]">×</button>
            </div>

            <div>
              <div className="mb-4 flex items-center justify-between">
                {(() => {
                  const slotDiscipline = getChampionPointDisciplineFromSlot(championPointEditor.field);
                  const discipline = slotDiscipline ?? ChampionPointDiscipline.TheThief;
                  return (
                    <div className="flex items-center gap-3">
                      <Image
                        src={CHAMPION_DISCIPLINE_ICON[discipline]}
                        alt={discipline}
                        width={40}
                        height={40}
                        className={`h-10 w-10 rounded border p-1 object-contain ${CHAMPION_CATEGORY_STYLE[discipline]}`}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          updateFightPlayerStuff(fight.name, championPointEditor.playerId, championPointEditor.field, '');
                          setChampionPointEditor(null);
                        }}
                        className="rounded border border-[#d6b46b] bg-[#171717] px-3 py-1 text-sm font-semibold text-[#f8f7f2] transition hover:border-[#f8f7f2] hover:bg-[#242424]"
                      >
                        Clear slot
                      </button>
                    </div>
                  );
                })()}
              </div>
              <div className="min-w-0">
                {(() => {
                  const slotDiscipline = getChampionPointDisciplineFromSlot(championPointEditor.field);
                  const discipline = slotDiscipline ?? ChampionPointDiscipline.TheThief;
                  const selectedCategory = championPointEditor.field.startsWith('Blue') ? 'Blue'
                    : championPointEditor.field.startsWith('Red') ? 'Red'
                      : championPointEditor.field.startsWith('Green') ? 'Green'
                        : '';
                  const playerChampionPoints = fight.playersStuff.find((entry) => entry.id === championPointEditor.playerId)?.championPoints;
                  const selectedChampionPoints = Object.entries(playerChampionPoints ?? {})
                    .filter(([slot, value]) => slot.startsWith(selectedCategory) && Boolean(value))
                    .map(([, value]) => value as string);
                  const categorySlots = [1, 2, 3, 4].map((index) => `${selectedCategory}${index}` as keyof ChampionPoints);
                  const availableChampionPoints = ChampionPointsByDiscipline[discipline];
                  const frequentGroups = discipline === ChampionPointDiscipline.TheMage
                    ? Object.entries(FREQUENT_MAGE_CHAMPION_POINTS_BY_ROLE).map(([role, championPoints]) => ({
                      label: `Frequently used — ${role}`,
                      championPoints: championPoints.filter((championPoint) => availableChampionPoints.some((availableChampionPoint) => availableChampionPoint === championPoint)),
                    }))
                    : [
                      {
                        label: 'Frequently used',
                        championPoints: FREQUENT_CHAMPION_POINTS_BY_DISCIPLINE[discipline]
                          .filter((championPoint) => availableChampionPoints.some((availableChampionPoint) => availableChampionPoint === championPoint)),
                      },
                      ...(discipline === ChampionPointDiscipline.TheWarrior
                        ? [{
                          label: 'Situationnal',
                          championPoints: FREQUENT_SITUATIONAL_CHAMPION_POINTS
                            .filter((championPoint) => availableChampionPoints.some((availableChampionPoint) => availableChampionPoint === championPoint)),
                        }]
                        : []),
                    ];
                  const frequentChampionPoints = frequentGroups.flatMap(({ championPoints }) => championPoints);
                  const otherChampionPoints = availableChampionPoints
                    .filter((championPoint) => !frequentChampionPoints.includes(championPoint));

                  const renderChampionPointOption = (championPoint: typeof availableChampionPoints[number]) => (
                    <button
                      key={championPoint}
                      type="button"
                      onClick={() => {
                        const current = fight.playersStuff.find((entry) => entry.id === championPointEditor.playerId)?.championPoints;
                        if (!current) return;
                        if (selectedChampionPoints.includes(championPoint)) {
                          const selectedSlot = categorySlots.find((slot) => current[slot] === championPoint);
                          if (selectedSlot) updateFightPlayerStuff(fight.name, championPointEditor.playerId, selectedSlot, '');
                          return;
                        }
                        if (selectedChampionPoints.length >= 4) return;
                        const emptySlot = categorySlots.find((slot) => !current[slot]);
                        if (emptySlot) updateFightPlayerStuff(fight.name, championPointEditor.playerId, emptySlot, championPoint);
                      }}
                      aria-pressed={selectedChampionPoints.includes(championPoint)}
                      disabled={!selectedChampionPoints.includes(championPoint) && selectedChampionPoints.length >= 4}
                      className={`rounded border px-3 py-2 text-left text-sm font-semibold transition hover:border-[#f8f7f2] hover:bg-[#242424] disabled:opacity-40 ${selectedChampionPoints.includes(championPoint) ? 'ring-2 ring-yellow-300 ring-offset-2 ring-offset-black' : ''}`}
                      style={{
                        borderColor: discipline === ChampionPointDiscipline.TheMage
                          ? '#60a5fa'
                          : discipline === ChampionPointDiscipline.TheWarrior
                            ? '#f87171'
                            : '#86efac',
                        backgroundColor: discipline === ChampionPointDiscipline.TheMage
                          ? '#172554'
                          : discipline === ChampionPointDiscipline.TheWarrior
                            ? '#451a1a'
                            : '#052e16',
                        color: '#ffffff',
                      }}
                    >
                      {championPoint}
                    </button>
                  );

                  return (
                    <>
                    <div className="mb-3 flex items-center justify-between text-sm font-semibold text-[#f8f7f2]">
                      <span>{selectedChampionPoints.length}/4 selected</span>
                      <span className="text-yellow-300">Click a champion point to select or deselect it</span>
                    </div>
                    <div className="max-h-[50vh] space-y-4 overflow-y-auto">
                      {frequentGroups.map(({ label, championPoints }) => (
                        <section key={label}>
                          <h4 className="mb-2 text-sm font-bold text-yellow-300">{label}</h4>
                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                            {championPoints.map(renderChampionPointOption)}
                          </div>
                        </section>
                      ))}
                      <section>
                        <h4 className="mb-2 text-sm font-bold text-yellow-300">Other champion points</h4>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                          {otherChampionPoints.map(renderChampionPointOption)}
                        </div>
                      </section>
                    </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {setEditor && createPortal(
        <div data-raid-theme={raidTheme || undefined} className="raid-theme-portal encounters-page fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4">
          <div
            className="flex w-full max-w-3xl flex-col overflow-hidden rounded-lg border-2 border-[#d6b46b] bg-[#111111] p-6"
            style={{
              height: 'min(90vh, 900px)',
              minHeight: 'min(90vh, 900px)',
              maxHeight: 'min(90vh, 900px)',
              flex: '0 0 min(90vh, 900px)',
            }}
          >
            <div className="mb-4 flex shrink-0 items-start justify-between gap-4 border-b border-[#d6b46b] pb-4">
              <h2 className="text-2xl font-bold text-[#f8f7f2]">
                Choose a {getSetSlotLabel(setEditor.slot)}
              </h2>
              <div className="flex shrink-0 items-start gap-3">
                <button
                  type="button"
                  onClick={() => {
                    updateFightPlayerStuff(fight.name, setEditor.playerId, setEditor.slot, createEmptyGearPiece());
                    setSetEditor(null);
                    setGearDraft(null);
                    setSelectedSetId(null);
                    setSelectedItemChoiceKey('');
                    setSelectedTrait(null);
                    setSetItemOptions([]);
                  }}
                  className="rounded border border-[#d6b46b] bg-[#171717] px-3 py-1 text-sm font-semibold text-[#f8f7f2] transition hover:border-[#f8f7f2] hover:bg-[#242424]"
                >
                  Clear slot
                </button>
                <div className="h-16 w-16 overflow-hidden border border-[#d6b46b] bg-black/60 p-1" aria-label="Selected item preview">
                  <GearIcon
                    key={`${selectedItemChoice?.key ?? 'empty'}-${setEditor.slot}`}
                    gear={previewItem ? { itemId: previewItem.id, enchantment: '' } : undefined}
                    slot={setEditor.slot}
                    fallbackSrc={SET_SLOT_PLACEHOLDER_IMAGES[setEditor.slot as SetSlot]}
                    alt={previewItem ? getItemLabel(previewItem) : 'Selected item preview'}
                    className="h-full w-full object-cover"
                  />
                </div>
                <button type="button" onClick={() => { setSetEditor(null); setGearDraft(null); setSelectedSetId(null); setSelectedItemChoiceKey(''); setSelectedTrait(null); setSetItemOptions([]); }} className="text-2xl text-[#d6b46b] hover:text-[#f7e7ba]">×</button>
              </div>
            </div>

            {gearDraft && (
              <div className="mb-5 grid max-h-[42%] shrink-0 grid-cols-2 gap-3 overflow-y-auto border border-[#d6b46b] bg-[#171717] p-4">
                <div className="col-span-2 text-sm text-[#f8f7f2]">
                  <span className="text-[#d6b46b]">Selected set:</span> {selectedSetId ? catalogSets.find((set) => set.id === selectedSetId)?.setName ?? 'selected' : 'none'}
                </div>
                <label className="col-span-2 text-sm text-[#f8f7f2]">
                  Item
                  <select
                    value={selectedItemChoiceKey}
                    disabled={selectedSetId === null}
                    onChange={(event) => {
                      const choiceKey = event.target.value;
                      const choice = itemChoices.find((item) => item.key === choiceKey);
                      const role = fight.playersStuff.find((player) => player.id === setEditor.playerId)?.role ?? RoleType.DPS;
                      const defaults = getDefaultSetItemSelection(choice, setEditor.slot, role);
                      setSelectedItemChoiceKey(choiceKey);
                      setSelectedTrait(defaults.trait);
                      setGearDraft((current) => {
                        const draft = current ? withoutWeaponPoison(current) : createEmptyGearPiece();
                        return {
                        ...draft,
                        itemId: defaults.item?.id ?? null,
                        trait: defaults.trait ?? '',
                        enchantment: defaults.enchantment,
                        ...(defaults.item?.gearType === 'weapon' ? { poison: defaults.poison } : {}),
                        };
                      });
                    }}
                    className="mt-1 w-full border border-[#d6b46b] bg-[#171717] p-2 disabled:opacity-50"
                  >
                    <option value="">Choose an item</option>
                    {itemChoices.map((choice) => (
                      <option key={choice.key} value={choice.key}>{getItemLabel(choice.representative)}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm text-[#f8f7f2] col-span-2">Trait<select value={selectedTrait ?? ''} disabled={!selectedItemChoice} onChange={(event) => { const trait = event.target.value; setSelectedTrait(trait); const item = findCatalogItemVariant(selectedItemChoice, trait === NO_TRAIT_VALUE ? '' : trait); setGearDraft((current) => ({ ...(current ?? createEmptyGearPiece()), itemId: item?.id ?? null, trait: trait === NO_TRAIT_VALUE ? '' : trait })); }} className="mt-1 w-full border border-[#d6b46b] bg-[#171717] p-2 disabled:opacity-50"><option value="">Choose a trait</option>{availableTraits.map((trait) => <option key={trait || NO_TRAIT_VALUE} value={trait || NO_TRAIT_VALUE}>{trait || 'No trait'}</option>)}</select></label>
                <label className="text-sm text-[#f8f7f2]">Enchantment<select value={gearDraft.enchantment} disabled={!selectedSetItem} onChange={(event) => { const nextDraft = selectedSetItem?.gearType === 'weapon' ? { ...gearDraft, enchantment: event.target.value, poison: '' } : { ...withoutWeaponPoison(gearDraft), enchantment: event.target.value }; setGearDraft(nextDraft); }} className="mt-1 w-full border border-[#d6b46b] bg-[#171717] p-2 disabled:opacity-50"><option value="">Choose an enchantment</option>{enchantmentOptions.map((enchant) => <option key={enchant.id} value={String(enchant.id)}>{enchant.name}</option>)}</select></label>
                {selectedSetItem?.gearType === 'weapon' && !isShieldItem && <label className="text-sm text-[#f8f7f2]">Poison<select value={gearDraft && 'poison' in gearDraft ? gearDraft.poison : ''} onChange={(event) => setGearDraft({ ...gearDraft, poison: event.target.value, enchantment: '' })} className="mt-1 w-full border border-[#d6b46b] bg-[#171717] p-2"><option value="">Choose a poison</option>{ESO_POISONS.map((poison) => <option key={poison} value={poison}>{poison}</option>)}</select></label>}
                <button type="button" disabled={!canValidateSet} onClick={() => { if (!canValidateSet || !selectedSetItem) return; const draftHasPoison = 'poison' in gearDraft; updateFightPlayerStuff(fight.name, setEditor.playerId, setEditor.slot, { itemId: selectedSetItem.id, trait: selectedSetItem.trait, enchantment: draftHasPoison && gearDraft.poison ? '' : gearDraft.enchantment, ...(selectedSetItem.gearType === 'weapon' && !isShieldItem && draftHasPoison ? { poison: gearDraft.poison } : {}) }); setSetEditor(null); setGearDraft(null); setSelectedSetId(null); setSelectedItemChoiceKey(''); setSelectedTrait(null); setSetItemOptions([]); }} className="col-span-2 border border-[#f8f7f2] bg-[#d6b46b] px-3 py-2 font-bold text-black disabled:opacity-50">Validate</button>
              </div>
            )}

            <SetEditorSearchResults
              key={`${setEditor.playerId}:${setEditor.slot}`}
              catalogSets={catalogSets}
              selectedPieceCounts={selectedSetPieceCounts}
              slot={setEditor.slot}
              onSelectSet={(setId) => {
                autoSelectFirstItemForSetId.current = setId;
                setSelectedSetId(setId);
                setSelectedItemChoiceKey('');
                setSelectedTrait(null);
                setGearDraft({ itemId: null, enchantment: '' });
              }}
            />
          </div>
        </div>,
        document.body,
      )}

      {quickGearSetup && createPortal(
        <div
          data-raid-theme={raidTheme || undefined}
          className="raid-theme-portal encounters-page fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/70 p-2 sm:p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isApplyingQuickGear) {
              setQuickGearSetup(null);
              setQuickGearError(null);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="quick-gear-setup-title"
            className="quick-gear-dialog flex w-full max-w-[96rem] flex-col overflow-y-auto rounded-lg border-2 border-[#d6b46b] bg-[#111111] p-3 sm:p-5"
            style={{
              height: 'calc(100dvh - 2rem)',
              minHeight: 0,
              maxHeight: '1080px',
              flex: '0 1 auto',
            }}
          >
            {(() => {
              const quickPlayer = players.find((player) => player.id === quickGearSetup.playerId);
              const quickPlayerStuff = fight?.playersStuff.find((entry) => entry.id === quickGearSetup.playerId);
              const quickRole = quickPlayerStuff?.role ?? RoleType.DPS;
              const equippedSets = quickPlayerStuff
                ? getSetSummary(quickPlayerStuff.sets, catalogSets)
                : [];
              const selectedQuickSet = catalogSets.find((set) => set.id === quickGearSetup.selectedSetId);
              const automaticBodyDefaults = getQuickGearAutomaticDefaults(quickGearTraitOptions.items, 'armor', quickRole);
              const automaticJewelryDefaults = getQuickGearAutomaticDefaults(quickGearTraitOptions.items, 'jewelry', quickRole);
              const availableArmorWeights = getQuickGearArmorWeights(quickGearTraitOptions.items);
              const defaultArmorWeight = getQuickGearDefaultArmorWeight(quickRole, availableArmorWeights);
              const selectedArmorWeight = quickGearSetup.bodyArmorWeight || defaultArmorWeight;
              const slotPresets: { preset: QuickGearSlotPreset; label: string; description: string }[] = [
                { preset: 'body', label: 'Body', description: 'Select or clear the five body slots' },
                { preset: 'jewelry', label: 'Jewelry', description: 'Select or clear the three jewelry slots' },
                { preset: 'head-shoulders', label: 'Head + shoulders', description: 'Select or clear head and shoulders' },
                { preset: 'front-bar', label: 'Front bar', description: 'Select or clear front-bar weapons' },
                { preset: 'back-bar', label: 'Back bar', description: 'Select or clear back-bar weapons' },
              ];
              const isPresetSelected = (preset: QuickGearSlotPreset) => {
                const slots = getQuickGearPresetSlots(preset);
                return slots.every((slot) => quickGearSetup.selectedSlots.includes(slot));
              };
              const togglePreset = (preset: QuickGearSlotPreset) => setQuickGearSetup((current) => {
                if (!current) return current;
                const slots = getQuickGearPresetSlots(preset);
                const isSelected = slots.every((slot) => current.selectedSlots.includes(slot));
                return {
                  ...current,
                  selectedSlots: isSelected
                    ? current.selectedSlots.filter((slot) => !slots.includes(slot))
                    : [...new Set([...current.selectedSlots, ...slots])],
                };
              });
              const selectedSlotCount = QUICK_GEAR_SLOT_ORDER.filter((slot) => {
                if (quickGearSetup.selectedSlots.includes(slot)) return true;
                const gear = quickPlayerStuff?.sets[slot];
                const equippedSetId = getCachedCatalogItem(gear?.itemId, gear?.trait)?.setId;
                return equippedSetId !== undefined && quickGearSetup.replaceSetIds.includes(equippedSetId);
              }).length;
              const renderQuickGearSlotChoice = (slot: SetSlot) => {
                const currentGear = quickPlayerStuff?.sets[slot] ?? createEmptyGearForSlot(slot);
                const gear = quickGearSetup.draggedItems[slot] ?? currentGear;
                const equippedSetId = getCachedCatalogItem(currentGear.itemId, currentGear.trait)?.setId;
                const isReplacedSet = equippedSetId !== undefined && quickGearSetup.replaceSetIds.includes(equippedSetId);
                const isSelected = quickGearSetup.selectedSlots.includes(slot) || isReplacedSet;
                return (
                  <QuickGearSlotChoice
                    key={slot}
                    slot={slot}
                    gear={gear}
                    isSelected={isSelected}
                    isReplacedSet={isReplacedSet}
                    supportsSet={!selectedQuickSet || setSupportsSlot(selectedQuickSet, slot)}
                    draggable={isEditMode && gear.itemId !== null && getCachedCatalogItem(gear.itemId, gear.trait) !== null}
                    onChange={(changedSlot, checked) => setQuickGearSetup((current) => {
                      if (!current) return current;
                      const selectedSlots = checked
                        ? current.selectedSlots.includes(changedSlot)
                          ? current.selectedSlots
                          : [...current.selectedSlots, changedSlot]
                        : current.selectedSlots.filter((selectedSlot) => selectedSlot !== changedSlot);
                      const draggedItems = { ...current.draggedItems };
                      if (!checked) delete draggedItems[changedSlot];
                      return { ...current, selectedSlots, draggedItems };
                    })}
                    onDragStart={(event) => {
                      const itemId = gear.itemId;
                      const itemMeta = getCachedCatalogItem(itemId, gear.trait);
                      if (!isEditMode || itemId === null || !itemMeta) return;
                      draggedSetSlot.current = {
                        playerId: quickGearSetup.playerId,
                        slot,
                        itemId,
                        category: itemMeta.gearType,
                        sourceGear: gear,
                      };
                      event.dataTransfer.setData('text/plain', JSON.stringify({
                        playerId: quickGearSetup.playerId,
                        slot,
                        itemId,
                      }));
                      event.dataTransfer.effectAllowed = 'copy';
                      setQuickGearError(null);
                    }}
                    onDragEnd={() => { draggedSetSlot.current = null; }}
                    onDragOver={(event) => {
                      const source = draggedSetSlot.current;
                      if (!isEditMode || !source || source.playerId !== quickGearSetup.playerId) return;
                      event.preventDefault();
                      event.stopPropagation();
                      event.dataTransfer.dropEffect = 'copy';
                    }}
                    onDrop={(event) => { void handleQuickGearSlotDrop(event, slot); }}
                  />
                );
              };

              return (
                <>
                  <div className="mb-4 flex shrink-0 items-start justify-between gap-4 border-b border-[#d6b46b] pb-4">
                    <div>
                      <h2 id="quick-gear-setup-title" className="text-2xl font-bold text-[#f8f7f2]">
                        Quick Gear Setup
                      </h2>
                      <p className="mt-1 text-sm text-[#d6b46b]">
                        {quickPlayer ? `Choose a set for ${quickPlayer.name}.` : 'Choose a set.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={isApplyingQuickGear}
                      onClick={() => {
                        setQuickGearSetup(null);
                        setQuickGearError(null);
                      }}
                      aria-label="Close quick gear setup"
                      className="text-2xl text-[#d6b46b] hover:text-[#f7e7ba] disabled:opacity-50"
                    >
                      ×
                    </button>
                  </div>

                  <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto pb-3 xl:grid-cols-[minmax(0,1.4fr)_minmax(20rem,0.8fr)] xl:grid-rows-1 xl:overflow-hidden">
                    <div className="flex min-w-0 flex-col gap-3 xl:min-h-0 xl:overflow-y-auto xl:pb-2 xl:pr-2">
                    <section className="flex h-[min(36vh,28rem)] min-h-[14rem] min-w-0 shrink-0 flex-col border border-[#d6b46b]/70 bg-[#171717] p-3 xl:min-h-0">
                      <h3 className="mb-2 shrink-0 text-sm font-semibold text-[#d6b46b]">1. Choose a set</h3>
                      <QuickGearSearchResults
                        catalogSets={catalogSets}
                        hasError={quickGearError !== null}
                        isApplying={isApplyingQuickGear}
                        selectedSetId={quickGearSetup.selectedSetId}
                        onSelectSet={(setId) => {
                          setQuickGearSetup((current) => current
                            ? {
                              ...current,
                              selectedSetId: setId,
                              draggedItems: {},
                              bodyArmorWeight: '',
                              bodyEnchantment: '',
                              jewelryEnchantment: '',
                              bodyTrait: '',
                              jewelryTrait: '',
                            }
                            : current);
                          setQuickGearError(null);
                        }}
                        onSearchChange={() => setQuickGearError(null)}
                      />
                    </section>
                    <section className="min-w-0 border border-[#d6b46b]/70 bg-[#171717] p-3">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-semibold text-[#f8f7f2]">2. Choose slots</h3>
                          <p className="mt-0.5 text-xs text-[#f8f7f2]/60">
                            Check the slots to receive this set. Selected slots replace their current items.
                          </p>
                        </div>
                        <span className="rounded-full border border-[#d6b46b]/40 bg-[#d6b46b]/10 px-2.5 py-1 text-xs font-semibold tabular-nums text-[#f7e7ba]">
                          {selectedSlotCount} selected
                        </span>
                      </div>
                      <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/20 p-2">
                        <div className="grid min-w-[35rem] grid-cols-[minmax(0,0.7fr)_minmax(0,2fr)_minmax(0,1fr)] items-start gap-2">
                          <section className="flex min-w-0 flex-col items-center gap-2">
                            {QUICK_GEAR_JEWEL_SLOTS.map((slot) => renderQuickGearSlotChoice(slot))}
                          </section>
                          <section className="flex min-w-0 flex-col items-center gap-1">
                            {SET_LAYOUT_ROWS.map((row, rowIndex) => (
                              <div key={`quick-slot-row-${rowIndex}`} className="flex items-start justify-center gap-1">
                                {row.map((item) => (
                                  <div key={item.slot} className={'colSpan' in item && item.colSpan ? 'mx-auto' : ''}>
                                    {renderQuickGearSlotChoice(item.slot)}
                                  </div>
                                ))}
                              </div>
                            ))}
                          </section>
                          <section className="flex min-w-0 flex-col items-center gap-2">
                            <div className="flex gap-1">{QUICK_GEAR_WEAPON_SLOTS.slice(0, 2).map((slot) => renderQuickGearSlotChoice(slot))}</div>
                            <div className="flex gap-1">{QUICK_GEAR_WEAPON_SLOTS.slice(2).map((slot) => renderQuickGearSlotChoice(slot))}</div>
                          </section>
                        </div>
                      </div>
                    </section>

                    {quickGearError && (
                      <p role="alert" className="border border-red-500/70 bg-red-950/40 p-3 text-sm text-red-200">
                        {quickGearError}
                      </p>
                    )}
                    {isApplyingQuickGear && (
                      <p className="text-sm text-[#d6b46b]" role="status">Applying set...</p>
                    )}
                    </div>

                    <div className="flex min-h-0 min-w-0 flex-col gap-3 xl:overflow-y-auto xl:pb-2 xl:pr-2">
                  <section className="shrink-0 border border-[#d6b46b]/70 bg-[#171717] p-3">
                    <h3 className="mb-2 text-sm font-semibold text-[#f8f7f2]">Slot selection helpers</h3>
                    <p className="mb-3 text-xs text-[#f8f7f2]/70">
                      These options only check or clear their slots; you can also select slots manually.
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2 2xl:grid-cols-3">
                      {slotPresets.map(({ preset, label, description }) => {
                        const selected = isPresetSelected(preset);
                        return (
                          <button
                            key={preset}
                            type="button"
                            disabled={isApplyingQuickGear}
                            aria-pressed={selected}
                            onClick={() => { togglePreset(preset); setQuickGearError(null); }}
                            className={`rounded border px-3 py-2 text-sm font-semibold transition disabled:opacity-50 ${
                              selected
                                ? 'border-[#f8f7f2] bg-[#fff8e6] text-[#111111] ring-2 ring-[#f7e7ba] shadow-lg'
                                : 'border-[#d6b46b] bg-black/40 text-[#f8f7f2] hover:border-[#f8f7f2]'
                            }`}
                          >
                            {label}
                            <span className={`mt-1 block text-xs font-normal ${selected ? 'text-[#111111]/75' : 'text-[#f8f7f2]/70'}`}>
                              {description}
                            </span>
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        disabled={isApplyingQuickGear || equippedSets.length === 0}
                        aria-pressed={quickGearSetup.isReplaceSetPickerOpen || quickGearSetup.replaceSetIds.length > 0}
                        onClick={() => setQuickGearSetup((current) => {
                          if (!current) return current;
                          return {
                            ...current,
                            isReplaceSetPickerOpen: !current.isReplaceSetPickerOpen,
                          };
                        })}
                        className={`rounded border px-3 py-2 text-sm font-semibold transition disabled:opacity-50 ${
                          quickGearSetup.isReplaceSetPickerOpen || quickGearSetup.replaceSetIds.length > 0
                            ? 'border-[#f8f7f2] bg-[#fff8e6] text-[#111111] ring-2 ring-[#f7e7ba] shadow-lg'
                            : 'border-[#d6b46b] bg-black/40 text-[#f8f7f2] hover:border-[#f8f7f2]'
                        }`}
                      >
                        Replace a set
                        <span className={`mt-1 block text-xs font-normal ${
                          quickGearSetup.isReplaceSetPickerOpen || quickGearSetup.replaceSetIds.length > 0
                            ? 'text-[#111111]/75'
                            : 'text-[#f8f7f2]/70'
                        }`}>
                          {quickGearSetup.replaceSetIds.length
                            ? `${quickGearSetup.replaceSetIds.length} set${quickGearSetup.replaceSetIds.length === 1 ? '' : 's'} selected`
                            : 'Choose equipped sets to free their slots'}
                        </span>
                      </button>
                    </div>
                    {(quickGearSetup.isReplaceSetPickerOpen || quickGearSetup.replaceSetIds.length > 0) && (
                      <div className="mt-3 border-t border-[#d6b46b]/40 pt-3">
                        <h4 className="mb-2 text-xs font-semibold text-[#f8f7f2]">Equipped sets</h4>
                        {equippedSets.length ? (
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            {equippedSets.map((set) => {
                              const isSelected = quickGearSetup.replaceSetIds.includes(set.id);
                              return (
                                <button
                                  key={set.id}
                                  type="button"
                                  disabled={isApplyingQuickGear}
                                  aria-pressed={isSelected}
                                  onClick={() => {
                                    setQuickGearSetup((current) => {
                                      if (!current) return current;
                                      const replaceSetIds = current.replaceSetIds.includes(set.id)
                                        ? current.replaceSetIds.filter((setId) => setId !== set.id)
                                        : [...current.replaceSetIds, set.id];
                                      return { ...current, isReplaceSetPickerOpen: true, replaceSetIds };
                                    });
                                    setQuickGearError(null);
                                  }}
                                  className={`flex min-w-0 items-center gap-3 rounded border px-3 py-2 text-left text-sm transition disabled:opacity-50 ${
                                    isSelected
                                      ? 'border-[#f8f7f2] bg-[#d6b46b]/20 text-[#f8f7f2] ring-2 ring-[#d6b46b]/70'
                                      : 'border-[#d6b46b]/70 bg-black/30 text-[#f8f7f2] hover:border-[#f8f7f2]'
                                  }`}
                                >
                                  <SetHeadIcon
                                    setId={set.id}
                                    setName={set.setName}
                                    className="flex h-10 w-10 shrink-0 items-center justify-center border border-[#d6b46b]/70 bg-black/40 p-1"
                                  />
                                  <span className="min-w-0 flex-1 [overflow-wrap:anywhere] font-semibold">{set.setName}</span>
                                  {isSelected && <span aria-hidden="true" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#d6b46b] text-sm font-bold text-black">✓</span>}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-sm text-[#f8f7f2]/70">No equipped sets to replace.</p>
                        )}
                      </div>
                    )}
                  </section>

                  {selectedQuickSet && quickGearSetup.selectedSetId !== null && (
                    <section className="shrink-0 border border-[#d6b46b]/70 bg-[#171717] p-3">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <h3 className="font-semibold text-[#f8f7f2]">3. Review item types and defaults</h3>
                          <p className="text-xs text-[#f8f7f2]/70">{selectedQuickSet.setName}: change any automatic armor type, trait, or enchantment before applying.</p>
                        </div>
                        <button
                          type="button"
                          disabled={isApplyingQuickGear}
                          onClick={() => setQuickGearSetup((current) => current
                            ? {
                              ...current,
                              selectedSetId: null,
                              isReplaceSetPickerOpen: false,
                              selectedSlots: [],
                              draggedItems: {},
                              bodyArmorWeight: '',
                              bodyEnchantment: '',
                              jewelryEnchantment: '',
                              bodyTrait: '',
                              jewelryTrait: '',
                            }
                            : current)}
                          className="text-xs text-[#d6b46b] underline hover:text-[#f7e7ba] disabled:opacity-50"
                        >
                          Clear selection
                        </button>
                      </div>
                      <div className="grid gap-3 border-t border-[#d6b46b]/50 pt-3 sm:grid-cols-2">
                        {availableArmorWeights.length > 0 && (
                          <label className="min-w-0 text-[11px] text-[#f8f7f2]/80">
                            Armor type
                            <select
                              aria-label="Armor item type"
                              value={selectedArmorWeight}
                              disabled={isApplyingQuickGear}
                              onChange={(event) => {
                                const weight = availableArmorWeights.find((option) => option === event.target.value) ?? '';
                                setQuickGearSetup((current) => current
                                  ? { ...current, bodyArmorWeight: weight }
                                  : current);
                              }}
                              className="mt-1 w-full border border-[#d6b46b]/60 bg-[#111111] p-1 text-[10px] text-[#f8f7f2]"
                            >
                              {availableArmorWeights.map((weight) => (
                                <option key={weight} value={weight}>{weight}</option>
                              ))}
                            </select>
                          </label>
                        )}
                        {[
                          { category: 'body' as const, label: 'Body armor', gearType: 'armor' as const, enchantment: quickGearSetup.bodyEnchantment, trait: quickGearSetup.bodyTrait, traits: quickGearTraitOptions.body, defaults: automaticBodyDefaults },
                          { category: 'jewelry' as const, label: 'Jewelry', gearType: 'jewelry' as const, enchantment: quickGearSetup.jewelryEnchantment, trait: quickGearSetup.jewelryTrait, traits: quickGearTraitOptions.jewelry, defaults: automaticJewelryDefaults },
                        ].filter(({ traits }) => traits.length > 0).map(({ category, label, gearType, enchantment, trait, traits, defaults }) => {
                          const enchantmentField = category === 'body' ? 'bodyEnchantment' : 'jewelryEnchantment';
                          const traitField = category === 'body' ? 'bodyTrait' : 'jewelryTrait';
                          return (
                            <fieldset key={category} className="min-w-0 rounded border border-white/10 p-2">
                              <legend className="px-1 text-xs font-semibold text-[#d6b46b]">{label} defaults</legend>
                              <div className="grid grid-cols-2 gap-2">
                                <label className="min-w-0 text-[11px] text-[#f8f7f2]/80">
                                  Enchantment
                                  <select
                                    aria-label={`${label} default enchantment`}
                                    value={enchantment}
                                    disabled={isApplyingQuickGear}
                                    onChange={(event) => setQuickGearSetup((current) => current
                                      ? { ...current, [enchantmentField]: event.target.value }
                                      : current)}
                                    className="mt-1 w-full border border-[#d6b46b]/60 bg-[#111111] p-1 text-[10px] text-[#f8f7f2]"
                                  >
                                    <option value="">Automatic</option>
                                    {ESO_ENCHANTS.filter((entry) => entry.gearType === gearType).map((entry) => (
                                      <option key={entry.id} value={String(entry.id)}>{entry.name}</option>
                                    ))}
                                  </select>
                                  {!enchantment && (
                                    <span className="mt-1 block text-[9px] leading-tight text-white/60">
                                      Automatic ({defaults.length ? defaults.map((entry) => entry.enchantmentName).join(', ') : 'no automatic choice'})
                                    </span>
                                  )}
                                </label>
                                <label className="min-w-0 text-[11px] text-[#f8f7f2]/80">
                                  Trait
                                  <select
                                    aria-label={`${label} default trait`}
                                    value={trait}
                                    disabled={isApplyingQuickGear}
                                    onChange={(event) => setQuickGearSetup((current) => current
                                      ? { ...current, [traitField]: event.target.value }
                                      : current)}
                                    className="mt-1 w-full border border-[#d6b46b]/60 bg-[#111111] p-1 text-[10px] text-[#f8f7f2]"
                                  >
                                    <option value="">Automatic</option>
                                    {traits.map((entry) => (
                                      <option key={entry || NO_TRAIT_VALUE} value={entry || NO_TRAIT_VALUE}>{entry || 'No trait'}</option>
                                    ))}
                                  </select>
                                  {!trait && (
                                    <span className="mt-1 block text-[9px] leading-tight text-white/60">
                                      Automatic ({defaults.length ? defaults.map((entry) => entry.trait || 'No trait').join(', ') : 'no automatic choice'})
                                    </span>
                                  )}
                                </label>
                              </div>
                            </fieldset>
                          );
                        })}
                      </div>
                    </section>
                  )}

                  <div className="shrink-0">
                    {renderSetSummary(equippedSets)}
                  </div>
                  </div>
                  </div>
                  {selectedQuickSet && (
                    <div className="mt-3 shrink-0 border-t border-emerald-400/40 pt-3">
                      <button
                        type="button"
                        disabled={isApplyingQuickGear || (quickGearSetup.selectedSlots.length === 0 && quickGearSetup.replaceSetIds.length === 0)}
                        onClick={() => void applyQuickGearSet(selectedQuickSet.id, quickGearSetup.selectedSlots)}
                        className="w-full rounded-xl border-2 border-emerald-200 bg-emerald-400 px-4 py-3 text-base font-extrabold text-emerald-950 shadow-[0_0_24px_rgba(74,222,128,0.28)] transition hover:bg-emerald-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111111] disabled:opacity-45"
                      >
                        {isApplyingQuickGear ? 'Applying set…' : `4. Apply ${selectedQuickSet.setName}`}
                      </button>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>,
        document.body,
      )}

      {gearDetails && (() => {
        const gear = fight.playersStuff.find((entry) => entry.id === gearDetails.playerId)?.sets[gearDetails.slot];
        const item = gearDetails.item;
        const enchantment = ESO_ENCHANTS.find((entry) => String(entry.id) === gear?.enchantment);
        const itemType = item ? getItemTypeLabel(item) : null;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-3xl rounded-lg border-2 border-[#d6b46b] bg-[#111111] p-6">
              <div className="mb-4 flex items-start justify-between gap-4 border-b border-[#d6b46b] pb-4">
                <h2 className="text-2xl font-bold text-[#f8f7f2]">{gearDetails.label} details</h2>
                <div className="flex shrink-0 items-start gap-3">
                  <div className="h-16 w-16 overflow-hidden border border-[#d6b46b] bg-black/60 p-1">
                    <GearIcon
                      key={`${gearDetails.itemId}-${gearDetails.slot}`}
                      gear={gear}
                      slot={gearDetails.slot}
                      fallbackSrc={SET_SLOT_PLACEHOLDER_IMAGES[gearDetails.slot]}
                      alt={item ? getItemLabel(item) : 'Selected item'}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setGearDetails(null)}
                    aria-label="Close item details"
                    className="text-2xl text-[#d6b46b] hover:text-[#f7e7ba]"
                  >
                    ×
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 border border-[#d6b46b] bg-[#171717] p-4 text-sm text-[#f8f7f2]">
                <div className="col-span-2">
                  <span className="text-[#d6b46b]">Set name:</span>{' '}
                  {item?.setName ?? (gearDetailsError ? 'Unavailable' : 'Loading...')}
                </div>
                <div className="col-span-2">
                  <span className="text-[#d6b46b]">Item:</span>{' '}
                  {item?.name ?? (gearDetailsError ? 'Unavailable' : 'Loading...')}
                </div>
                <div>
                  <span className="text-[#d6b46b]">Trait:</span>{' '}
                  {gear?.trait || item?.trait || (item ? 'No trait' : gearDetailsError ? 'Unavailable' : 'Loading...')}
                </div>
                <div>
                  <span className="text-[#d6b46b]">Item type:</span>{' '}
                  <span className={item?.gearType === 'armor' ? getArmorWeightTextClass(item.armorWeight) : ''}>
                    {itemType ?? (gearDetailsError ? 'Unavailable' : 'Loading...')}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-[#d6b46b]">Enchantment:</span>{' '}
                  <span className={getEnchantmentColorClass(enchantment?.name)}>
                    {enchantment?.name ?? (gear?.enchantment ? `Unknown enchantment (${gear.enchantment})` : 'None')}
                  </span>
                </div>
                {item?.gearType === 'weapon' && <div className="col-span-2">
                  <span className="text-[#d6b46b]">Poison:</span>{' '}
                  {gear && 'poison' in gear ? gear.poison || 'None' : 'None'}
                </div>}
                {gearDetailsError && (
                  <p role="alert" className="col-span-2 text-sm text-red-300">
                    {gearDetailsError}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
