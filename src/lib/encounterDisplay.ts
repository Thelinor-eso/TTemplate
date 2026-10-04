import {
  ChampionPointDiscipline,
  ChampionPointName,
  CHAMPION_POINT_SLOTS,
  SET_SLOT_OPTIONS,
  type ChampionPointName as ChampionPointNameType,
  type SetSlot,
} from '@/features/template/raidTemplate';
import { withBasePath } from './staticAssets';

export const SET_SLOT_PLACEHOLDER_IMAGES = Object.fromEntries(
  SET_SLOT_OPTIONS.map((slot) => [slot, withBasePath('/empty-set-slot.svg')]),
) as Record<SetSlot, string>;

export const SET_LAYOUT_ROWS = [
  [{ slot: 'head', label: 'Head', colSpan: 2 }],
  [
    { slot: 'shoulders', label: 'Shoulder' },
    { slot: 'chest', label: 'Chest' },
  ],
  [
    { slot: 'gloves', label: 'Arm' },
    { slot: 'waist', label: 'Waist' },
  ],
  [
    { slot: 'legs', label: 'Legs' },
    { slot: 'boots', label: 'Boots' },
  ],
] as const;

export const CHAMPION_CATEGORY_STYLE: Record<ChampionPointDiscipline, string> = {
  [ChampionPointDiscipline.TheMage]: 'border-blue-500 text-blue-100 bg-blue-950',
  [ChampionPointDiscipline.TheWarrior]: 'border-red-500 text-red-100 bg-red-950',
  [ChampionPointDiscipline.TheThief]: 'border-green-500 text-green-100 bg-green-950',
};

export const CHAMPION_CATEGORY_FRAME: Record<ChampionPointDiscipline, string> = {
  [ChampionPointDiscipline.TheMage]: 'border-blue-500/80',
  [ChampionPointDiscipline.TheWarrior]: 'border-red-500/80',
  [ChampionPointDiscipline.TheThief]: 'border-green-500/80',
};

export const CHAMPION_DISCIPLINE_ICON: Record<ChampionPointDiscipline, string> = {
  [ChampionPointDiscipline.TheMage]: withBasePath('/champion-points/champion_points_magicka_icon.png'),
  [ChampionPointDiscipline.TheWarrior]: withBasePath('/champion-points/champion_points_health_icon.png'),
  [ChampionPointDiscipline.TheThief]: withBasePath('/champion-points/champion_points_stamina_icon.png'),
};

export const CHAMPION_DISCIPLINE_BACKGROUND: Record<ChampionPointDiscipline, string> = {
  [ChampionPointDiscipline.TheMage]: withBasePath('/champion-points/mage.png'),
  [ChampionPointDiscipline.TheWarrior]: withBasePath('/champion-points/warrior.png'),
  [ChampionPointDiscipline.TheThief]: withBasePath('/champion-points/thief.png'),
};

type ChampionPointSlot = (typeof CHAMPION_POINT_SLOTS)[number];

export type ChampionDisciplineGroup = {
  discipline: ChampionPointDiscipline;
  slots: ChampionPointSlot[];
  label: string;
};

export const CHAMPION_DISCIPLINE_GROUPS: ChampionDisciplineGroup[] = [
  {
    discipline: ChampionPointDiscipline.TheMage,
    slots: CHAMPION_POINT_SLOTS.filter((slot) => slot.startsWith('Blue')),
    label: ChampionPointDiscipline.TheMage,
  },
  {
    discipline: ChampionPointDiscipline.TheWarrior,
    slots: CHAMPION_POINT_SLOTS.filter((slot) => slot.startsWith('Red')),
    label: ChampionPointDiscipline.TheWarrior,
  },
  {
    discipline: ChampionPointDiscipline.TheThief,
    slots: CHAMPION_POINT_SLOTS.filter((slot) => slot.startsWith('Green')),
    label: ChampionPointDiscipline.TheThief,
  },
];

export const FREQUENT_MAGE_CHAMPION_POINTS_BY_ROLE = {
  Tank: [
    ChampionPointName.Bulwark,
    ChampionPointName.Ironclad,
    ChampionPointName.DuelistsRebuff,
    ChampionPointName.EnduringResolve,
    ChampionPointName.Unassailable,
    ChampionPointName.FocusedMending,
  ],
  Heal: [
    ChampionPointName.SoothingTide,
    ChampionPointName.SwiftRenewal,
    ChampionPointName.FromTheBrink,
    ChampionPointName.EnliveningOverflow,
  ],
  DPS: [
    ChampionPointName.BitingAura,
    ChampionPointName.MasterAtArms,
    ChampionPointName.WrathfulStrikes,
    ChampionPointName.Exploiter,
    ChampionPointName.DeadlyAim,
    ChampionPointName.Thaumaturge,
    ChampionPointName.ReavingBlows,
    ChampionPointName.FightingFinesse,
  ],
} as const satisfies Record<'Tank' | 'Heal' | 'DPS', readonly ChampionPointNameType[]>;

export const FREQUENT_CHAMPION_POINTS_BY_DISCIPLINE: Record<
  typeof ChampionPointDiscipline.TheWarrior | typeof ChampionPointDiscipline.TheThief,
  readonly ChampionPointNameType[]
> = {
  [ChampionPointDiscipline.TheWarrior]: [
    ChampionPointName.BoundlessVitality,
    ChampionPointName.Fortified,
    ChampionPointName.Rejuvenation,
    ChampionPointName.Celerity,
    ChampionPointName.ExpertEvasion,
    ChampionPointName.Slippery,
    ChampionPointName.BracingAnchor,


  ],
  [ChampionPointDiscipline.TheThief]: [
    ChampionPointName.WarMount,
    ChampionPointName.SteedsBlessing,
    ChampionPointName.GiftedRider,
  ],
};

export const FREQUENT_SITUATIONAL_CHAMPION_POINTS: readonly ChampionPointNameType[] = [
  ChampionPointName.Bastion,
  ChampionPointName.OnGuard,
  ChampionPointName.SustainedBySuffering,
  ChampionPointName.SiphoningSpells,
  ChampionPointName.WardMaster,
  ChampionPointName.BloodyRenewal,
  ChampionPointName.ShieldMaster,

];
