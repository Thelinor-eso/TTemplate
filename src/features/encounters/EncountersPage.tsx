'use client';

import Image from 'next/image';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { useEffect, useRef, useState, type DragEvent, type FormEvent, type ReactNode } from 'react';
import { useRaid } from '@/features/template/RaidContext';
import EditModeToggle from '@/components/layout/EditModeToggle';
import { CLASS_ICON_MAP, DEFAULT_FOOD_ICON, DEFAULT_POTION_ICON, FOOD_ICON_MAP, POTION_ICON_MAP, MUNDUS_ICON_MAP, ROLE_ICON_MAP, SKILL_LINE_ICON_MAP } from '@/data/iconMaps';
import { ESO_CLASS_SKILL_LINES, getClassForSkillLine } from '@/data/esoClasses';
import { ESO_FOODS } from '@/data/esoFoods';
import { ESO_POTIONS } from '@/data/esoPotions';
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
import { fetchSetCatalogIndex, fetchSetById, getItemLabel, getSlotItemOptions, getCachedCatalogItem, ensureCatalogItemLoaded, ensureCatalogItemsLoaded, findCatalogItemVariant, findCompatibleSlotItem, getCatalogItemChoiceKey, getSetMaxPiecesRequired, groupCatalogItems, sortSetsBySelectedPieceCount, type CatalogSetItem, type CatalogSetSummary } from '@/lib/esoSetCatalog';
import { ESO_ENCHANTS } from '@/data/esoEnchants';
import { ESO_POISONS } from '@/data/esoPoisons';
import { getCritDamageBreakdown, getSetSummary, type CritDamageBreakdown } from '@/lib/critDamage';
import {
  decodeScribingSkillId,
  encodeScribingSkillId,
  ESO_SKILLS_BY_ID,
  getScribingOptions,
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
  createEmptyFightPlayerStuff,
  getPairedWeaponSlot,
  getChampionPointDisciplineFromSlot,
  requiresTwoWeaponSlots,
  MAIN_BAR_SLOTS,
  copyFightPlayerSetup,
  MUNDUS_STONE_OPTIONS,
  type FightPlayerStuff,
  type FightPlayerSetup,
  type GearPiece,
  type GearDraft,
  type GearSlotPiece,
  type SkillAbilityId,
  type Skills,
  type ClassMasteries,
  type ChampionPoints,
  type SetSlot,
} from '@/features/template/raidTemplate';
import { GearIcon } from '@/lib/gearIcons';
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
type DraggedSetSlot = { playerId: number; slot: SetSlot; itemId: number; category: SetSlotCategory };

function getDefaultSetItemSelection(
  choice: ReturnType<typeof groupCatalogItems>[number] | undefined,
  slot: SetSlot,
  role: RoleType,
) {
  if (!choice) return { trait: null, item: undefined, enchantment: '', poison: '' };

  const representative = choice.representative;
  let trait: string | null = null;
  let enchantment = '';
  let poison = '';
  if (representative.gearType === 'armor') {
    trait = choice.variants.some((item) => item.trait === 'Divines') ? 'Divines' : null;
    const enchantId = representative.armorWeight === 'light' ? 2
      : representative.armorWeight === 'medium' ? 4
        : representative.armorWeight === 'heavy' ? 1 : null;
    enchantment = enchantId === null ? '' : String(enchantId);
  } else if (representative.gearType === 'jewelry') {
    const preferredTrait = role === RoleType.DPS ? 'Bloodthirsty' : 'Infused';
    trait = choice.variants.some((item) => item.trait === preferredTrait) ? preferredTrait : null;
    enchantment = role === RoleType.DPS ? '28' : '35';
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

  if (trait && !choice.variants.some((item) => item.trait === trait)) trait = null;
  const item = findCatalogItemVariant(choice, trait ?? '');

  return { trait, item, enchantment, poison };
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

function PortalTooltip({ children, content }: { children: ReactNode; content: ReactNode }) {
  const [position, setPosition] = useState<{ top: number; left: number; above: boolean } | null>(null);

  const show = (element: HTMLElement) => {
    const trigger = element.firstElementChild instanceof HTMLElement ? element.firstElementChild : element;
    const bounds = trigger.getBoundingClientRect();
    const width = 288;
    const above = bounds.top > 220;
    setPosition({
      top: above ? bounds.top - 8 : bounds.bottom + 8,
      left: Math.max(8, Math.min(window.innerWidth - width - 8, bounds.left + bounds.width / 2 - width / 2)),
      above,
    });
  };

  return (
    <span className="contents" onMouseEnter={(event) => show(event.currentTarget)} onMouseLeave={() => setPosition(null)} onFocus={(event) => show(event.currentTarget)} onBlur={() => setPosition(null)}>
      {children}
      {position && typeof document !== 'undefined' ? createPortal(
        <span className={`pointer-events-none fixed z-[99999] w-72 max-h-[min(60vh,28rem)] overflow-y-auto rounded-lg border border-[#d6b46b] bg-[#111111] p-3 text-left text-xs text-white shadow-2xl ${position.above ? '-translate-y-full' : ''}`} style={{ top: position.top, left: position.left }}>
          {content}
        </span>,
        document.body,
      ) : null}
    </span>
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

function SetHeadIcon({ setId, setName }: { setId: number; setName: string }) {
  const [headItem, setHeadItem] = useState<CatalogSetItem | null>(null);

  useEffect(() => {
    let active = true;
    void fetchSetById(setId).then((set) => {
      if (active) setHeadItem(set?.items.find((item) => item.equipType === 'Head') ?? set?.items[0] ?? null);
    }).catch(() => {
      if (active) setHeadItem(null);
    });
    return () => { active = false; };
  }, [setId]);

  if (!headItem) return null;
  return (
    <span className="mb-2 flex h-12 w-12 items-center justify-center border border-[#d6b46b] bg-black/40 p-1">
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

function GearDetailsTooltip({ label, itemId, gear, slot }: { label: string; itemId: number; gear: GearSlotPiece | undefined; slot: SetSlot }) {
  const [item, setItem] = useState<CatalogSetItem | null>(() => getCachedCatalogItem(itemId, gear?.trait));

  useEffect(() => {
    let active = true;
    void ensureCatalogItemLoaded(itemId, gear?.trait).then((loadedItem) => {
      if (active) setItem(loadedItem);
    }).catch(() => {
      if (active) setItem(null);
    });
    return () => { active = false; };
  }, [itemId, gear?.trait]);

  const enchantment = ESO_ENCHANTS.find((entry) => String(entry.id) === gear?.enchantment);
  const poison = gear && 'poison' in gear ? gear.poison : null;
  const itemType = item
    ? item.gearType === 'armor'
      ? `${item.armorWeight ? `${item.armorWeight} ` : ''}armor • ${item.equipType}`
      : item.gearType === 'weapon'
        ? item.weaponType
        : `Jewelry • ${item.equipType}`
    : 'Loading...';

  return (
    <div className="w-full">
      <div className="mb-2 flex items-start justify-between gap-3 border-b border-[#d6b46b] pb-2">
        <h3 className="font-bold text-[#f7e7ba]">{label} details</h3>
        <GearIcon gear={gear} slot={slot} fallbackSrc={SET_SLOT_PLACEHOLDER_IMAGES[slot]} alt={item ? getItemLabel(item) : 'Selected item'} className="h-12 w-12 shrink-0 border border-[#d6b46b] bg-black/40 p-1 object-cover" />
      </div>
      <dl className="space-y-1">
        <div><dt className="inline text-[#d6b46b]">Set name: </dt><dd className="inline">{item?.setName ?? 'Loading...'}</dd></div>
        <div><dt className="inline text-[#d6b46b]">Item: </dt><dd className="inline">{item?.name ?? 'Loading...'}</dd></div>
        <div><dt className="inline text-[#d6b46b]">Trait: </dt><dd className="inline">{gear?.trait || item?.trait || 'No trait'}</dd></div>
        <div><dt className="inline text-[#d6b46b]">Item type: </dt><dd className="inline">{itemType}</dd></div>
        <div><dt className="inline text-[#d6b46b]">Enchantment: </dt><dd className="inline">{enchantment?.name ?? (gear?.enchantment ? `Unknown enchantment (${gear.enchantment})` : 'None')}</dd></div>
        {item?.gearType === 'weapon' && <div><dt className="inline text-[#d6b46b]">Poison: </dt><dd className="inline">{poison || 'None'}</dd></div>}
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
  const { template, players, updatePlayerClasses, updatePlayerClassMasteries, updatePlayerRole, updateFightPlayerStuff, updatePlayerMundus, pasteFightPlayerSetup, pasteFightSetup, addFight, duplicateFight, renameFight, removeFight, swapFights, updateFightRequiredSets, isEditMode } = useRaid();
  const [selectedFightName, setSelectedFightName] = useState(template.fights[0]?.name ?? '');
  const [isOverview, setIsOverview] = useState(false);
  const [isDeleteFightConfirmationOpen, setIsDeleteFightConfirmationOpen] = useState(false);
  const [selectedSetupPlayerId, setSelectedSetupPlayerId] = useState<number | null>(null);
  const [hasScrolled, setHasScrolled] = useState(false);
  const [skillEditor, setSkillEditor] = useState<SkillEditorState | null>(null);
  const [scribingDraft, setScribingDraft] = useState<ScribingDraft | null>(null);
  const [viewSkillDetails, setViewSkillDetails] = useState<SkillAbilityId | null>(null);
  const [viewChampionDiscipline, setViewChampionDiscipline] = useState<{ playerId: number; playerName: string; discipline: ChampionPointDiscipline } | null>(null);
  const [overviewSetPlayerId, setOverviewSetPlayerId] = useState<number | null>(null);
  const [mundusEditorPlayerId, setMundusEditorPlayerId] = useState<number | null>(null);
  const [setEditor, setSetEditor] = useState<SetEditorState | null>(null);
  const [gearDetails, setGearDetails] = useState<GearDetailsState | null>(null);
  const [gearDetailsError, setGearDetailsError] = useState<string | null>(null);
  const [setTransferError, setSetTransferError] = useState<string | null>(null);
  const [gearDraft, setGearDraft] = useState<GearDraft | null>(null);
  const [setSearch, setSetSearch] = useState('');
  const [catalogSets, setCatalogSets] = useState<CatalogSetSummary[]>([]);
  const [requiredSetSearch, setRequiredSetSearch] = useState('');
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
        {playerSetupEditor?.playerId === player.id && playerSetupEditor.type === 'mastery' && className && completeClass && <div className="absolute left-0 top-full z-50 mt-1 max-h-80 w-56 overflow-y-auto rounded border-2 border-yellow-500 bg-gray-800 shadow-2xl">{CLASS_MASTERY_OPTIONS_BY_CLASS[className].map((mastery) => { const selected = player.classMasteries.firstClassMastery === mastery || player.classMasteries.secondClassMastery === mastery; const full = !!player.classMasteries.firstClassMastery && !!player.classMasteries.secondClassMastery; return <button key={mastery} type="button" disabled={!selected && full} onClick={() => togglePlayerMastery(player.id, className, mastery)} className={`block w-full px-3 py-2 text-left text-xs transition ${selected ? 'bg-yellow-700 font-semibold text-yellow-50' : 'text-yellow-200 hover:bg-yellow-700 disabled:cursor-not-allowed disabled:opacity-40'}`}>{selected ? '✓ ' : ''}{mastery}</button>; })}</div>}
      </div>;
  };

  const renderRoleIcon = (player: (typeof players)[number]) => {
    const open = playerSetupEditor?.playerId === player.id && playerSetupEditor.type === 'role';
    return <PortalTooltip content={<span className="block font-bold text-[#f7e7ba]">{player.role}</span>}><div className="relative inline-block">
      <button type="button" disabled={!isEditMode} aria-label={`${player.name} role: ${player.role}`} aria-expanded={isEditMode ? open : undefined} onClick={() => isEditMode && setPlayerSetupEditor(open ? null : { playerId: player.id, type: 'role' })} className={isEditMode ? 'cursor-pointer rounded hover:ring-2 hover:ring-yellow-300' : 'cursor-default'}>
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
        return <PortalTooltip key={slot} content={<span className="block font-bold text-[#f7e7ba]">{line}</span>}>
        <div className="relative">
          <button type="button" disabled={!isEditMode} aria-label={`${player.name} skill line ${index + 1}${line ? `: ${line}` : ': empty'}`} aria-expanded={isEditMode ? open : undefined} onClick={() => isEditMode && setPlayerSetupEditor(open ? null : { playerId: player.id, type: 'skill', index })} className={`${size === 'small' ? 'h-6 w-6' : 'h-8 w-8'} flex items-center justify-center rounded-full border ${line ? 'border-yellow-500 bg-black/30 p-1' : 'border-dashed border-yellow-600 bg-black/20'} ${isEditMode ? 'cursor-pointer hover:border-yellow-300' : 'cursor-default'}`}>
            {icon ? <Image src={icon} alt="" width={iconSize} height={iconSize} className="h-full w-full rounded-full object-cover" /> : isEditMode ? <span className="text-sm leading-none text-yellow-300">+</span> : null}
          </button>
          {open && <div className={`absolute top-full z-50 mt-1 max-h-64 w-56 overflow-auto rounded border border-yellow-500 bg-gray-900 p-1 shadow-xl ${size === 'small' && index === 2 ? 'right-0' : 'left-0'}`}>{Object.entries(ESO_CLASS_SKILL_LINES).map(([name, options]) => <div key={name}><div className="sticky top-0 bg-gray-950 px-2 py-1 text-[10px] font-bold text-yellow-300">{name}</div>{options.map((option) => <button key={option} type="button" disabled={SKILL_CLASS_SLOTS.some((otherSlot, otherIndex) => otherIndex !== index && player.skillClasses[otherSlot] === option)} onClick={() => selectPlayerSkillLine(player.id, index, option)} className="flex w-full items-center gap-2 px-2 py-1 text-left text-xs text-yellow-100 hover:bg-yellow-800 disabled:opacity-40">{SKILL_LINE_ICON_MAP[option] && <Image src={SKILL_LINE_ICON_MAP[option]} alt="" width={24} height={24} className="h-6 w-6" />}<span>{option}</span></button>)}</div>)}</div>}
        </div>
        </PortalTooltip>;
      })}
    </div>
  );

  useEffect(() => {
    const hasOpenMenu = Boolean(
      isDeleteFightConfirmationOpen || skillEditor || viewSkillDetails || viewChampionDiscipline
      || overviewSetPlayerId !== null || mundusEditorPlayerId !== null || setEditor || gearDetails
      || consumableEditor || championPointEditor || playerSetupEditor,
    );
    if (!hasOpenMenu) return;

    const closeMenusOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setIsDeleteFightConfirmationOpen(false);
      setSkillEditor(null);
      setScribingDraft(null);
      setViewSkillDetails(null);
      setViewChampionDiscipline(null);
      setOverviewSetPlayerId(null);
      setMundusEditorPlayerId(null);
      setSetEditor(null);
      setGearDetails(null);
      setConsumableEditor(null);
      setChampionPointEditor(null);
      setPlayerSetupEditor(null);
    };

    window.addEventListener('keydown', closeMenusOnEscape);
    return () => window.removeEventListener('keydown', closeMenusOnEscape);
  }, [isDeleteFightConfirmationOpen, skillEditor, viewSkillDetails, viewChampionDiscipline, overviewSetPlayerId, mundusEditorPlayerId, setEditor, gearDetails, consumableEditor, championPointEditor, playerSetupEditor]);

  const draggedAbilitySlot = useRef<{ playerId: number; field: keyof Skills } | null>(null);
  const draggedChampionPointSlot = useRef<{ playerId: number; field: keyof ChampionPoints } | null>(null);
  const draggedSetSlot = useRef<DraggedSetSlot | null>(null);
  const autoSelectFirstItemForSetId = useRef<number | null>(null);

  const raidBackground = getRaidBackground(template.raid.selectedRaid);
  const raidTheme = getRaidTheme(template.raid.selectedRaid);

  useEffect(() => {
    const updateScrollState = () => setHasScrolled(window.scrollY > 72);
    updateScrollState();
    window.addEventListener('scroll', updateScrollState, { passive: true });
    return () => window.removeEventListener('scroll', updateScrollState);
  }, []);

  const activeFightName = template.fights.some((entry) => entry.name === selectedFightName)
    ? selectedFightName
    : template.fights[0]?.name ?? '';
  const fight = template.fights.find((entry) => entry.name === activeFightName) ?? template.fights[0];
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
  const enchantmentOptions = selectedSetItem
    ? ESO_ENCHANTS.filter((enchant) => enchant.gearType === selectedSetItem.gearType)
    : [];
  const validEnchantment = Boolean(
    selectedSetItem
    && gearDraft?.enchantment
    && enchantmentOptions.some((enchant) => String(enchant.id) === gearDraft.enchantment),
  );
  const poisonOptions = selectedSetItem?.gearType === 'weapon' ? ESO_POISONS : [];
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
  const filteredSets = sortSetsBySelectedPieceCount(
    catalogSets.filter((set) => (
      (setEditor ? setSupportsSlot(set, setEditor.slot) : false)
      && set.setName.toLowerCase().includes(setSearch.trim().toLowerCase())
    )),
    selectedSetPieceCounts,
  );
  const equippedSets = filteredSets.filter((set) => (selectedSetPieceCounts.get(set.id) ?? 0) > 0);
  const otherSets = filteredSets.filter((set) => (selectedSetPieceCounts.get(set.id) ?? 0) === 0);
  const filteredFoods = ESO_FOODS.filter((food) => food.name.toLowerCase().includes(foodSearch.trim().toLowerCase()));
  const filteredPotions = ESO_POTIONS.filter((potion) => potion.name.toLowerCase().includes(potionSearch.trim().toLowerCase()));
  const foodGroups = [
    { label: 'Mono-stat', foods: filteredFoods.filter((food) => [261, 351, 153].includes(food.id)) },
    { label: 'Bi-stat', foods: filteredFoods.filter((food) => [341, 62, 538].includes(food.id)) },
    { label: 'Stat + recovery', foods: filteredFoods.filter((food) => [119, 257, 175, 75].includes(food.id)) },
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
      <div className="flex justify-center gap-1">
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

    return (
      <button
        type="button"
        aria-label={`${slotLabel}: ${abilityName || 'empty'}`}
        draggable
        onDragStart={(event) => {
          draggedAbilitySlot.current = { playerId, field };
          event.dataTransfer.setData('text/plain', `${playerId}:${field}`);
          event.dataTransfer.effectAllowed = 'move';
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
          event.dataTransfer.dropEffect = 'move';
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
          if (sourcePlayerId === undefined || sourceField === field) return;
          if (isUltimateSkillSlot(sourceField) !== isUltimateSkillSlot(field)) return;

          const sourceStuff = fight.playersStuff.find((player) => player.id === sourcePlayerId);
          const targetStuff = fight.playersStuff.find((player) => player.id === playerId);
          if (!sourceStuff || !targetStuff) return;
          const sourceAbility = sourceStuff.competencies[sourceField];
          const targetAbility = targetStuff.competencies[field];
          updateFightPlayerStuff(fight.name, sourcePlayerId, sourceField, targetAbility);
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
        className={`flex ${compact ? 'h-auto max-h-9 w-full max-w-9 aspect-square' : 'h-12 w-12'} shrink-0 items-center justify-center border-2 bg-black/60 p-0.5 transition hover:border-yellow-400 ${
          hasValue ? 'border-yellow-600' : 'border-dashed border-yellow-700'
        } cursor-grab active:cursor-grabbing`}
      >
        {hasValue && category && abilityName ? (
          <Image src={getAbilityImagePath(category, abilityName)} alt="" width={40} height={40} className="h-full w-full object-cover" />
        ) : null}
      </button>
    );
  };

  const renderViewAbilityIcon = (value: SkillAbilityId | '', category?: AbilityCategory, compact = false) => {
    const abilityName = getAbilityDisplayName(value);
    if (!value || !category || !abilityName) {
      return <div className={`${compact ? 'h-auto max-h-9 w-full max-w-9 aspect-square' : 'h-12 w-12'} shrink-0 border border-dashed border-yellow-700 bg-black/40`} />;
    }
    const decoded = decodeScribingSkillId(value);
    const options = decoded ? getScribingOptions(decoded.grimoireAbilityId) : undefined;
    return (
      <PortalTooltip content={<><span className="mb-1 block font-bold text-[#f7e7ba]">{abilityName}</span>{decoded && options ? <span className="space-y-1">{(['focus', 'signature', 'affix'] as const).map((kind) => <span key={kind} className="block"><span className="text-[#d6b46b]">{kind[0].toUpperCase() + kind.slice(1)}: </span>{options[kind].find((option) => option.id === decoded[`${kind}ScriptId` as 'focusScriptId' | 'signatureScriptId' | 'affixScriptId'])?.name ?? '—'}</span>)}</span> : null}</>}>
      <button
        type="button"
        aria-label={`Show details for ${abilityName}`}
        onClick={() => setViewSkillDetails(value)}
        className={`group/skill relative flex ${compact ? 'h-auto max-h-9 w-full max-w-9 aspect-square' : 'h-12 w-12'} shrink-0 cursor-pointer items-center justify-center border-2 border-yellow-600 bg-black/40 p-0.5 transition hover:z-[60] hover:scale-110 hover:border-yellow-300 focus-visible:z-[60] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-300`}
      >
        <Image src={getAbilityImagePath(category, abilityName)} alt="" width={40} height={40} className="h-full w-full object-cover" />
      </button>
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
    const tooltipContent = <><span className="mb-1 block font-bold text-[#f7e7ba]">{itemName}</span>{foodEffect ? <span className="block">{foodEffect}</span> : null}</>;

    if (isEditMode) {
      return (
        <PortalTooltip content={tooltipContent}>
          <button
            type="button"
            onClick={() => setConsumableEditor({ playerId, type })}
            className={`flex ${compact ? 'h-8 w-8' : 'h-12 w-12'} shrink-0 items-center justify-center self-center border-2 bg-black/60 p-0.5 transition hover:border-yellow-400 ${
              value ? 'border-yellow-600' : 'border-dashed border-yellow-700'
            }`}
          >
            {iconSrc ? (
              <Image src={iconSrc} alt="" width={40} height={40} className="h-full w-full object-cover" />
            ) : null}
          </button>
        </PortalTooltip>
      );
    }

    if (!iconSrc) {
      return <div className={`${compact ? 'h-8 w-8' : 'h-12 w-12'} shrink-0 self-center border border-dashed border-yellow-700 bg-black/40`} />;
    }

    return (
      <PortalTooltip content={tooltipContent}>
        <div aria-label={itemName} className={`flex ${compact ? 'h-8 w-8' : 'h-12 w-12'} shrink-0 items-center justify-center self-center border-2 border-yellow-600 bg-black/40 p-0.5 transition hover:z-[60] hover:scale-110 hover:border-yellow-300`}>
          <Image src={iconSrc} alt="" width={40} height={40} className="h-full w-full object-cover" />
        </div>
      </PortalTooltip>
    );
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

  const renderSetSlot = (playerId: number, slot: SetSlot, label: string, showSlotLabel = true, detailPreview = false) => {
    const playerStuff = fight.playersStuff.find((entry) => entry.id === playerId);
    const gear = playerStuff?.sets[slot as keyof typeof playerStuff.sets];
    const gearItemId = gear?.itemId;
    const itemMeta = gear?.itemId !== null ? getCachedCatalogItem(gear?.itemId ?? null, gear?.trait) : null;
    const value = itemMeta?.setName ?? '';
    const placeholderImage = SET_SLOT_PLACEHOLDER_IMAGES[slot];

    return (
      <div className={`flex min-w-0 flex-col items-center gap-1 ${detailPreview ? 'w-16' : 'w-12'}`}>
        {showSlotLabel && <span className="w-full truncate text-center text-[clamp(8px,2.2cqw,10px)] font-semibold uppercase tracking-wide text-yellow-300">{label}</span>}
        {isEditMode ? (
          <PortalTooltip content={gearItemId !== null && gearItemId !== undefined ? <GearDetailsTooltip label={label} itemId={gearItemId} gear={gear} slot={slot} /> : null}>
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
            className={`group relative flex shrink-0 items-center justify-center overflow-visible border-2 bg-black/60 p-1 transition hover:z-30 hover:scale-110 hover:border-yellow-400 ${detailPreview ? 'h-16 w-16' : 'h-12 w-12 p-0.5'} ${
              value ? 'border-yellow-600' : 'border-dashed border-yellow-700'
            } cursor-grab active:cursor-grabbing`}
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
            <PortalTooltip content={<GearDetailsTooltip label={label} itemId={gearItemId} gear={gear} slot={slot} />}>
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
              className={`group relative flex shrink-0 cursor-pointer items-center justify-center overflow-visible border-2 border-yellow-600 bg-black/60 p-1 transition hover:z-30 hover:scale-110 hover:border-yellow-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-300 ${detailPreview ? 'h-16 w-16' : 'h-12 w-12 p-0.5'}`}
            >
              <GearIcon key={`${gearItemId}-${slot}`} gear={gear} slot={slot} fallbackSrc={placeholderImage} alt={value} className="h-full w-full object-cover" />
            </button>
            </PortalTooltip>
          ) : (
            <div
                className={`flex shrink-0 items-center justify-center overflow-hidden border-2 border-dashed border-yellow-700 bg-black/60 ${detailPreview ? 'h-16 w-16 p-1' : 'h-12 w-12 p-0.5'}`}
            >
              <GearIcon key={`${gear?.itemId ?? ''}-${slot}`} gear={gear} slot={slot} fallbackSrc={placeholderImage} alt={value} className="h-full w-full object-cover opacity-40" />
            </div>
          )
        )}
        <span
          className={`w-full truncate text-center text-yellow-100 ${showSlotLabel ? 'text-[clamp(8px,2cqw,10px)]' : 'text-[clamp(8px,3cqw,13px)] font-semibold'}`}
        >
          {value || ''}
        </span>
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
      return renderSetSlot(playerId, twoHandedSlot, barLabel, showSlotLabel, detailPreview);
    }

    return (
      <>
        {renderSetSlot(playerId, firstSlot, `${barLabel} Main Hand`, showSlotLabel, detailPreview)}
        {renderSetSlot(playerId, secondSlot, `${barLabel} Off Hand`, showSlotLabel, detailPreview)}
      </>
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
        <div className="encounters-page__heading mx-auto mb-4 flex w-full max-w-[96rem] shrink-0 items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="page-heading !mb-0">
              <h1 className="page-heading__title">Encounters</h1>
              <p className="page-heading__description min-h-[4.95em]">
                Prepare each encounter with player-specific gear, skills, Champion Points, food, and potions.
              </p>
            </div>
          </div>
          <div className={`app-page__actions flex shrink-0 flex-wrap items-center justify-end gap-2 ${hasScrolled ? 'is-fixed' : ''}`}>
            <Link href="/players" className="raid-action-control inline-flex shrink-0 items-center gap-2 border px-4 py-2.5 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f8f7f2]">
              <span aria-hidden="true">←</span>Back to Players
            </Link>
            <EditModeToggle className="raid-action-control" />
            <button type="button" aria-pressed={!isOverview} onClick={() => setIsOverview((value) => !value)} aria-label={isOverview ? 'See table' : 'See overview'} className={`raid-action-control inline-flex items-center border px-4 py-2.5 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f8f7f2] ${!isOverview ? 'raid-selected-control' : ''}`}>
              {isOverview ? 'See table' : 'See overview'}
            </button>
            <label className="shrink-0">
              <select aria-label="Show setup for player" value={visibleSetupPlayerId ?? ''} onChange={(event) => setSelectedSetupPlayerId(event.target.value ? Number(event.target.value) : null)} className="raid-action-control max-w-56 border px-4 py-2.5 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f8f7f2]">
                <option value="">All players</option>
                {players.map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}
              </select>
            </label>
          </div>
        </div>

        <div className="app-page__sticky-toolbar">
          <div className="encounters-page__fight-picker encounter-surface flex min-w-0 flex-1 shrink-0 flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-[#111720]/75 p-2.5 shadow-lg backdrop-blur-sm">
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
                    <div className="relative max-w-md">
                      <input
                        id="required-set-search"
                        aria-label="Search all sets"
                        value={requiredSetSearch}
                        onChange={(event) => setRequiredSetSearch(event.target.value)}
                        placeholder="Search any set…"
                        className="w-full rounded-md border border-white/20 bg-black/70 px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-[#d6b46b] focus:outline-none focus:ring-1 focus:ring-[#d6b46b]/50"
                      />
                      {requiredSetSearch.trim() && (
                        <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-52 overflow-y-auto rounded-md border border-[#d6b46b]/70 bg-[#111111] shadow-xl">
                          {catalogSets.filter((set) => set.setName.toLowerCase().includes(requiredSetSearch.trim().toLowerCase()) && !(fight.requiredSetChecks ?? []).some((check) => check.setIds.includes(set.id))).slice(0, 30).map((set) => (
                            <button
                              key={set.id}
                              type="button"
                              onClick={() => {
                                const proposal = REQUIRED_SET_PROPOSALS.find((entry) => entry.setIds.includes(set.id));
                                updateFightRequiredSets(fight.name, [...(fight.requiredSetChecks ?? []), proposal ? { key: proposal.key, setIds: proposal.setIds, requiredPlayers: proposal.defaultPlayers } : { key: `set:${set.id}`, setIds: [set.id], requiredPlayers: 1 }]);
                                setRequiredSetSearch('');
                              }}
                              className="block w-full px-3 py-2 text-left text-sm text-white transition hover:bg-white/10"
                            >{set.setName}</button>
                          ))}
                          {!catalogSets.some((set) => set.setName.toLowerCase().includes(requiredSetSearch.trim().toLowerCase()) && !(fight.requiredSetChecks ?? []).some((check) => check.setIds.includes(set.id))) && (
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

        {setTransferError && (
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

        <div className="mb-4 h-1 shrink-0 bg-gradient-to-r from-transparent via-[#d6b46b] to-transparent" />

        {isEditMode && copiedSetup && (
          <div className="encounter-surface mb-4 shrink-0 rounded-lg border border-[#d6b46b] bg-black/65 px-4 py-2 text-sm text-yellow-100">
            Copied to clipboard: <span className="font-bold text-[#f7e7ba]">{COPY_CATEGORY_LABELS[copiedSetup.category]}</span> from <span className="font-bold text-[#f7e7ba]">{copiedSetup.playerName}</span> in <span className="font-bold text-[#f7e7ba]">{copiedSetup.fightName}</span>. Use the paste icon in the same column on another player or encounter to apply only this category.
          </div>
        )}
        {copiedEncounterName && (
          <div className="encounter-surface mb-4 shrink-0 rounded-lg border border-[#d6b46b] bg-black/65 px-4 py-2 text-sm text-yellow-100">
            Encounter <span className="font-bold text-[#f7e7ba]">{copiedEncounterName}</span> copied. Use Ctrl+V on another Encounter page to paste the players’ setups.
          </div>
        )}

        {isOverview ? (
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
                  <div className="mb-2 flex flex-col items-center gap-1 text-xs text-yellow-200">{renderPlayerSetupEditors(player)}{classMasteries.map((mastery) => isEditMode ? <button key={mastery} type="button" disabled={!hasCompletePlayerClass(player)} aria-expanded={playerSetupEditor?.playerId === player.id && playerSetupEditor.type === 'mastery'} onClick={() => toggleMasteryMenu(player.id)} className="w-full rounded border border-yellow-500 bg-black/30 px-2 py-0.5 text-center text-yellow-200 transition hover:border-yellow-300 hover:bg-yellow-700/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-300">{mastery}</button> : <span key={mastery} className="w-full text-center">{mastery}</span>)}</div>
                  <div className="space-y-1 border-y border-white/10 py-2 text-[11px]">
                    {isEditMode ? (
                      <>
                        <PortalTooltip content={<><span className="mb-1 block font-bold text-[#f7e7ba]">{food}</span>{foodEffect ? <span className="block">{foodEffect}</span> : null}</>}><button type="button" onClick={() => setConsumableEditor({ playerId: player.id, type: 'food' })} className="flex w-full items-center gap-1 truncate text-left hover:text-yellow-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-300"><span className="text-white/50">Food</span>{playerStuff.food && <Image src={FOOD_ICON_MAP[playerStuff.food] ?? DEFAULT_FOOD_ICON} alt="" width={18} height={18} className="h-[18px] w-[18px] shrink-0 rounded" />}<span className="truncate">{food || 'None'}</span></button></PortalTooltip>
                        <button type="button" onClick={() => setConsumableEditor({ playerId: player.id, type: 'potion' })} className="flex w-full items-center gap-1 truncate text-left hover:text-yellow-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-300"><span className="text-white/50">Potion</span>{playerStuff.potion && <Image src={POTION_ICON_MAP[playerStuff.potion] ?? DEFAULT_POTION_ICON} alt="" width={18} height={18} className="h-[18px] w-[18px] shrink-0 rounded" />}<span className="truncate">{potion || 'None'}</span></button>
                      </>
                    ) : (
                      <>
                        <PortalTooltip content={<><span className="mb-1 block font-bold text-[#f7e7ba]">{food}</span>{foodEffect ? <span className="block">{foodEffect}</span> : null}</>}><div className="flex min-w-0 items-center gap-1 truncate"><span className="text-white/50">Food</span>{playerStuff.food && <Image src={FOOD_ICON_MAP[playerStuff.food] ?? DEFAULT_FOOD_ICON} alt="" width={18} height={18} className="h-[18px] w-[18px] shrink-0 rounded" />}<span className="truncate">{food || 'None'}</span></div></PortalTooltip>
                        <div className="flex min-w-0 items-center gap-1 truncate"><span className="text-white/50">Potion</span>{playerStuff.potion && <Image src={POTION_ICON_MAP[playerStuff.potion] ?? DEFAULT_POTION_ICON} alt="" width={18} height={18} className="h-[18px] w-[18px] shrink-0 rounded" />}<span className="truncate">{potion || 'None'}</span></div>
                      </>
                    )}
                    {isEditMode ? (
                      <button type="button" onClick={() => setMundusEditorPlayerId(player.id)} aria-label={`Change ${player.name} Mundus stone`} className="flex w-full min-w-0 cursor-pointer items-center gap-1 truncate text-left hover:text-yellow-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-300">
                        <span className="shrink-0 text-white/50">Mundus</span>
                        {player.mundus && MUNDUS_ICON_MAP[player.mundus] && <Image src={MUNDUS_ICON_MAP[player.mundus]} alt="" width={16} height={16} className="h-4 w-4 shrink-0 rounded" />}
                        <span className="truncate">{player.mundus || 'None'}</span>
                      </button>
                    ) : (
                      <div className="flex min-w-0 items-center gap-1 truncate"><span className="shrink-0 text-white/50">Mundus</span>{player.mundus && MUNDUS_ICON_MAP[player.mundus] && <Image src={MUNDUS_ICON_MAP[player.mundus]} alt="" width={16} height={16} className="h-4 w-4 shrink-0 rounded" />}<span className="truncate">{player.mundus || 'None'}</span></div>
                    )}
                  </div>
                  <div role="button" tabIndex={0} onClick={() => setOverviewSetPlayerId(player.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setOverviewSetPlayerId(player.id); } }} aria-label={`Show ${player.name} set slots`} className="mt-2 block w-full cursor-pointer border-t border-white/10 pt-2 text-left text-[11px] hover:bg-white/[0.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-300">
                    <div className="mb-1 flex justify-between text-white/50"><span>Sets</span><span>Pcs</span></div>
                    <ul className="space-y-1">{sets.length ? sets.map(({ id, setName, pieceCount }) => { const set = catalogSets.find((entry) => entry.id === id); return <li key={id} className="flex justify-between gap-2"><PortalTooltip content={<><SetHeadIcon setId={id} setName={setName} /><span className="mb-1 block font-bold text-[#f7e7ba]">{setName}</span>{set?.effects.map((effect) => <span key={`${effect.numberOfPiecesRequired}-${effect.description}`} className="mt-1 block">{effect.description.replace(/\|c[0-9a-fA-F]{6}|\|r/g, '')}</span>)}</>}><span>{setName}</span></PortalTooltip><span>{pieceCount}</span></li>; }) : <li className="text-white/50">No sets selected</li>}</ul>
                  </div>
                  <div className="mt-2 flex justify-center gap-3 border-t border-white/10 pt-2">
                    {CHAMPION_DISCIPLINE_GROUPS.map((group) => (
                      <button key={group.discipline} type="button" aria-label={`${player.name}: ${group.label} Champion Points`} onClick={() => setViewChampionDiscipline({ playerId: player.id, playerName: player.name, discipline: group.discipline })} className="group/cp relative rounded p-1 transition hover:z-30 hover:scale-110 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-300">
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

                        <div className="flex flex-col items-center gap-1 text-xs text-yellow-200">
                          {renderPlayerSetupEditors(player)}
                          {classMasteries.map((mastery) => isEditMode ? (
                            <button key={`${player.id}-${mastery}`} type="button" disabled={!hasCompletePlayerClass(player)} aria-expanded={playerSetupEditor?.playerId === player.id && playerSetupEditor.type === 'mastery'} onClick={() => toggleMasteryMenu(player.id)} className="rounded border border-yellow-500 bg-black/30 px-2 py-0.5 text-yellow-200 transition hover:border-yellow-300 hover:bg-yellow-700/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-300">
                              {mastery}
                            </button>
                          ) : (
                            <span key={`${player.id}-${mastery}`} className="rounded border border-yellow-500 bg-black/30 px-2 py-0.5">{mastery}</span>
                          ))}
                          {player.mundus ? (
                            <div className="relative mt-2 flex items-center justify-center gap-1">
                              <Image
                                src={MUNDUS_ICON_MAP[player.mundus] ?? ''}
                                alt={player.mundus}
                                width={24}
                                height={24}
                                className="h-6 w-6 rounded-full border border-yellow-500 bg-black/30 p-0.5"
                              />
                              <span className="text-[11px] text-yellow-200">{player.mundus}</span>
                            </div>
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
                      <div className="flex w-full min-w-0 flex-col items-center gap-3">
                        {renderCopyPasteControls('sets', player.id, player.name, playerStuff, emptyPlayerStuff)}
                        <button
                          type="button"
                          aria-pressed={showSetDetailsByPlayer[player.id] ?? false}
                          onClick={() => setShowSetDetailsByPlayer((current) => ({
                            ...current,
                            [player.id]: !(current[player.id] ?? false),
                          }))}
                          className={`rounded border px-3 py-1 text-xs font-bold transition ${
                            showSetDetailsByPlayer[player.id]
                              ? 'border-[#f8f7f2] bg-[#d6b46b] text-black'
                              : 'border-[#d6b46b] bg-[#1c1c1f] text-white hover:bg-[#333]'
                          }`}
                        >
                          Show details
                        </button>

                        {showSetDetailsByPlayer[player.id] ? (
                          <div className="@container/set-details grid w-full min-w-0 grid-cols-[minmax(0,0.7fr)_minmax(0,2fr)_minmax(0,1fr)] items-start gap-[2cqw]">
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
                        ) : (
                          <ul className="w-full space-y-1 text-center text-sm text-yellow-100">
                            {setSummary.length > 0 ? (
                              setSummary.map(({ id, setName, pieceCount, requiredPieces }) => (
                                <li key={id}>
                                  <PortalTooltip content={<><SetHeadIcon setId={id} setName={setName} /><span className="mb-1 block font-bold text-[#f7e7ba]">{setName}</span>{catalogSets.find((set) => set.id === id)?.effects.map((effect) => <span key={`${effect.numberOfPiecesRequired}-${effect.description}`} className="mt-1 block">{effect.description.replace(/\|c[0-9a-fA-F]{6}|\|r/g, '')}</span>)}</>}>
                                    <span>{setName}: {pieceCount}{requiredPieces !== null ? `/${requiredPieces}` : ''} {pieceCount === 1 ? 'piece' : 'pieces'}</span>
                                  </PortalTooltip>
                                </li>
                              ))
                            ) : (
                              <li className="text-xs text-yellow-200">No sets selected</li>
                            )}
                          </ul>
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

      {viewSkillDetails && (() => {
        const skillName = getAbilityDisplayName(viewSkillDetails);
        const decoded = decodeScribingSkillId(viewSkillDetails);
        const options = decoded ? getScribingOptions(decoded.grimoireAbilityId) : undefined;
        const scripts = decoded && options
          ? [
            { label: 'Focus', name: options.focus.find((option) => option.id === decoded.focusScriptId)?.name },
            { label: 'Signature', name: options.signature.find((option) => option.id === decoded.signatureScriptId)?.name },
            { label: 'Affix', name: options.affix.find((option) => option.id === decoded.affixScriptId)?.name },
          ]
          : [];

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="view-skill-details-title"
              className="w-full max-w-md rounded-lg border-2 border-[#d6b46b] bg-[#111111] p-6"
            >
              <div className="mb-4 flex items-start justify-between gap-4">
                <h2 id="view-skill-details-title" className="text-xl font-bold text-[#f8f7f2]">
                  {skillName}
                </h2>
                <button
                  type="button"
                  aria-label="Close skill details"
                  onClick={() => setViewSkillDetails(null)}
                  className="text-2xl leading-none text-[#d6b46b] hover:text-[#f7e7ba]"
                >
                  ×
                </button>
              </div>
              {scripts.length > 0 && (
                <dl className="space-y-3 text-sm text-[#f8f7f2]">
                  {scripts.map(({ label, name }) => (
                    <div key={label}>
                      <dt className="font-semibold text-[#d6b46b]">{label}</dt>
                      <dd>{name}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          </div>
        );
      })()}

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
                  <button key={stone} type="button" onClick={() => { updatePlayerMundus(player.id, stone); setMundusEditorPlayerId(null); }} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition ${player.mundus === stone ? 'bg-white/15 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}>
                    {MUNDUS_ICON_MAP[stone] && <Image src={MUNDUS_ICON_MAP[stone]} alt="" width={24} height={24} className="h-6 w-6 shrink-0 rounded" />}
                    <span>{stone}</span>
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
                      className="rounded border border-[#d6b46b] bg-[#d6b46b] px-4 py-2 text-sm font-bold text-black hover:bg-[#f7e7ba] disabled:cursor-not-allowed disabled:opacity-40"
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
                        className="group relative flex w-full items-center gap-3 rounded border border-[#d6b46b] bg-[#202020] p-2 text-left transition hover:border-[#f8f7f2] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-[#d6b46b]"
                      >
                        <div className="flex h-12 w-12 items-center justify-center">
                          <Image src={getAbilityImagePath(activeSkillCategory, parent.skillName)} alt={parent.skillName} width={40} height={40} className="h-10 w-10 object-cover" />
                        </div>
                        <span className="text-sm font-bold text-[#f8f7f2]">{parent.skillName}</span>
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
                              className="group relative flex items-center gap-2 rounded border border-[#8c7645] bg-[#111111] p-2 text-left transition hover:border-[#f8f7f2] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-[#8c7645]"
                            >
                              <Image src={getAbilityImagePath(activeSkillCategory, morph.skillName)} alt={morph.skillName} width={36} height={36} className="h-9 w-9 object-cover" />
                              <span className="text-xs font-semibold text-[#f8f7f2]">{morph.skillName}</span>
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
                      className={`rounded border px-3 py-2 text-left text-sm font-semibold transition hover:border-[#f8f7f2] hover:bg-[#242424] disabled:cursor-not-allowed disabled:opacity-40 ${selectedChampionPoints.includes(championPoint) ? 'ring-2 ring-yellow-300 ring-offset-2 ring-offset-black' : ''}`}
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
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-lg border-2 border-[#d6b46b] bg-[#111111] p-6">
            <div className="sticky top-0 z-10 -mx-6 -mt-6 mb-4 flex items-start justify-between gap-4 border-b border-[#d6b46b] bg-[#111111] px-6 pb-4 pt-6">
              <h2 className="text-2xl font-bold text-[#f8f7f2]">Choose a set</h2>
              <div className="flex shrink-0 items-start gap-3">
                <button
                  type="button"
                  onClick={() => {
                    updateFightPlayerStuff(fight.name, setEditor.playerId, setEditor.slot, createEmptyGearPiece());
                    setSetEditor(null);
                    setGearDraft(null);
                    setSetSearch('');
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
                <button type="button" onClick={() => { setSetEditor(null); setGearDraft(null); setSetSearch(''); setSelectedSetId(null); setSelectedItemChoiceKey(''); setSelectedTrait(null); setSetItemOptions([]); }} className="text-2xl text-[#d6b46b] hover:text-[#f7e7ba]">×</button>
              </div>
            </div>

            {gearDraft && (
              <div className="mb-5 grid grid-cols-2 gap-3 border border-[#d6b46b] bg-[#171717] p-4">
                <div className="col-span-2 text-sm text-[#f8f7f2]">
                  <span className="text-[#d6b46b]">Selected set:</span> {selectedSetId ? filteredSets.find((set) => set.id === selectedSetId)?.setName ?? 'selected' : 'none'}
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
                {selectedSetItem?.gearType === 'weapon' && <label className="text-sm text-[#f8f7f2]">Poison<select value={gearDraft && 'poison' in gearDraft ? gearDraft.poison : ''} onChange={(event) => setGearDraft({ ...gearDraft, poison: event.target.value, enchantment: '' })} className="mt-1 w-full border border-[#d6b46b] bg-[#171717] p-2"><option value="">Choose a poison</option>{ESO_POISONS.map((poison) => <option key={poison} value={poison}>{poison}</option>)}</select></label>}
                <button type="button" disabled={!canValidateSet} onClick={() => { if (!canValidateSet || !selectedSetItem) return; const draftHasPoison = 'poison' in gearDraft; updateFightPlayerStuff(fight.name, setEditor.playerId, setEditor.slot, { itemId: selectedSetItem.id, trait: selectedSetItem.trait, enchantment: draftHasPoison && gearDraft.poison ? '' : gearDraft.enchantment, ...(selectedSetItem.gearType === 'weapon' && draftHasPoison ? { poison: gearDraft.poison } : {}) }); setSetEditor(null); setGearDraft(null); setSetSearch(''); setSelectedSetId(null); setSelectedItemChoiceKey(''); setSelectedTrait(null); setSetItemOptions([]); }} className="col-span-2 border border-[#f8f7f2] bg-[#d6b46b] px-3 py-2 font-bold text-black disabled:opacity-50">Validate</button>
              </div>
            )}

            <div className="relative mb-4">
              <input
                type="search"
                value={setSearch}
                onChange={(event) => setSetSearch(event.target.value)}
                placeholder="Search a set..."
                aria-label="Search a set"
                className="w-full border border-[#d6b46b] bg-[#171717] px-3 py-2 text-[#f8f7f2] outline-none placeholder:text-[#b7b5aa]/80 focus:border-[#f8f7f2]"
              />
            </div>

            <div className="max-h-[42vh] space-y-5 overflow-y-auto pr-1">
              {[
                { title: 'Sets already equipped on this player', sets: equippedSets },
                { title: 'Other sets', sets: otherSets },
              ].map(({ title, sets }) => sets.length > 0 && (
                <section key={title}>
                  <h3 className="mb-2 text-sm font-semibold text-[#d6b46b]">{title}</h3>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                    {sets.map((set) => (
                      <button
                        key={set.id}
                        type="button"
                        onClick={() => {
                          autoSelectFirstItemForSetId.current = set.id;
                          setSelectedSetId(set.id);
                          setSelectedItemChoiceKey('');
                          setSelectedTrait(null);
                          setGearDraft({ itemId: null, enchantment: '' });
                          setSetSearch(set.setName);
                        }}
                        className="min-w-0 rounded border border-[#d6b46b] bg-[#171717] px-3 py-2 text-left text-sm [overflow-wrap:anywhere] text-[#f8f7f2] transition hover:border-[#f8f7f2] hover:bg-[#242424]"
                      >
                        {set.setName}
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>,
        document.body,
      )}

      {gearDetails && (() => {
        const gear = fight.playersStuff.find((entry) => entry.id === gearDetails.playerId)?.sets[gearDetails.slot];
        const item = gearDetails.item;
        const enchantment = ESO_ENCHANTS.find((entry) => String(entry.id) === gear?.enchantment);
        const itemType = item
          ? item.gearType === 'armor'
            ? `${item.armorWeight ? `${item.armorWeight} ` : ''}armor • ${item.equipType}`
            : item.gearType === 'weapon'
              ? item.weaponType
              : `Jewelry • ${item.equipType}`
          : null;

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
                  {itemType ?? (gearDetailsError ? 'Unavailable' : 'Loading...')}
                </div>
                <div className="col-span-2">
                  <span className="text-[#d6b46b]">Enchantment:</span>{' '}
                  {enchantment?.name ?? (gear?.enchantment ? `Unknown enchantment (${gear.enchantment})` : 'None')}
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
