import { useState, type CSSProperties, type DragEvent } from 'react';
import MechanicsPlayerToken from '@/features/encounters/mechanics/shared/MechanicsPlayerToken';
import MirrorsMechanicsTable from '@/features/encounters/mechanics/lucent-citadel/MirrorsMechanicsTable';
import NumberedMechanicsTable from '@/features/encounters/mechanics/shared/NumberedMechanicsTable';
import SlayerStackTable from '@/features/encounters/mechanics/shared/SlayerStackTable';
import type {
  MechanicsData,
  MechanicsPosition,
  MechanicsSide,
  RaidPlayer,
} from '@/features/template/raidTemplate';
import type { MechanicsPageProps } from '@/features/encounters/mechanics/types';

const LUCENT_FIRST_BOSS = 'Count Ryelaz & Zilyesset';
const LUCENT_CAVOT_BOSSES = new Set(['Cavot', 'Cavot Agnan']);
const LUCENT_ORPHIC_BOSSES = new Set(['Orphic', 'Orphic Shattered Shard']);
const LUCENT_FINAL_BOSS = 'Xoryn';
const MECHANICS_POSITIONS: readonly MechanicsPosition[] = [1, 2, 3, 4, 5, 6];
const BOSS_BADGE_CLASS = 'rounded-full border border-white/40 bg-[#090a0b] px-4 py-2 text-center font-black uppercase tracking-widest text-white text-[clamp(1.75rem,3vw,2.25rem)]';
const SLAYER_STACK_PANEL_CLASS = 'relative max-h-[44rem] w-full overflow-y-auto rounded-xl border border-white/30 bg-[#070809]/90 p-2 shadow-xl';
// These percentage bounds align the groups with the SVG walls and center divider.
const ARENA_GROUP_BOUNDS = {
  left: { top: '14%', right: '28%', bottom: '52%', left: '28%' },
  right: { top: '52%', right: '28%', bottom: '14%', left: '28%' },
} satisfies Record<MechanicsSide, CSSProperties>;
const POSITION_GRID_AREA: Record<MechanicsPosition, string> = {
  1: 'col-start-2 row-start-1',
  2: 'col-start-3 row-start-2',
  3: 'col-start-3 row-start-3',
  4: 'col-start-2 row-start-3',
  5: 'col-start-1 row-start-3',
  6: 'col-start-1 row-start-2',
};

const CARDINAL_LABELS = [
  { direction: 'N', className: 'left-1/2 top-[3%] -translate-x-1/2' },
  { direction: 'NE', className: 'right-[15%] top-[15%] -translate-x-1/2' },
  { direction: 'E', className: 'right-[3%] top-1/2 -translate-y-1/2' },
  { direction: 'SE', className: 'bottom-[15%] right-[15%] translate-x-1/2' },
  { direction: 'S', className: 'bottom-[3%] left-1/2 -translate-x-1/2' },
  { direction: 'SW', className: 'bottom-[15%] left-[15%] -translate-x-1/2' },
  { direction: 'W', className: 'left-[3%] top-1/2 -translate-y-1/2' },
  { direction: 'NW', className: 'left-[15%] top-[15%] -translate-x-1/2' },
] as const;

function getPlayerAssignment(
  mechanics: MechanicsData | undefined,
  field: 'side' | 'slayerStack',
): MechanicsSide | null {
  const side = mechanics?.[field];
  return side === 'left' || side === 'right' ? side : null;
}

function getPlayerPosition(mechanics: MechanicsData | undefined): MechanicsPosition | null {
  const position = mechanics?.position;
  return MECHANICS_POSITIONS.find((validPosition) => validPosition === position) ?? null;
}

export default function LucentCitadelMechanics(props: MechanicsPageProps) {
  if (props.fightName === LUCENT_FIRST_BOSS) return <CountRyelazMechanicsPage {...props} />;
  if (LUCENT_CAVOT_BOSSES.has(props.fightName)) return <CavotMechanicsPage {...props} />;
  if (LUCENT_ORPHIC_BOSSES.has(props.fightName)) return <OrphicMechanicsPage {...props} />;
  if (props.fightName === LUCENT_FINAL_BOSS) return <XorynMechanicsPage {...props} />;
  return <UnconfiguredLucentMechanicsPage {...props} />;
}

function CountRyelazMechanicsPage({
  fightName,
  players,
  playersStuff,
  isEditMode,
  onPlayerMechanicsChange,
  onAssignPlayerToPosition,
}: MechanicsPageProps) {
  const [dragOverPosition, setDragOverPosition] = useState<{ side: MechanicsSide; position: MechanicsPosition } | null>(null);
  const [openPositionPicker, setOpenPositionPicker] = useState<{ side: MechanicsSide; position: MechanicsPosition } | null>(null);

  const mechanicsByPlayerId = new Map(playersStuff.map((playerStuff) => [playerStuff.id, playerStuff.mechanics]));
  const sidesByPlayerId = new Map(playersStuff.map((playerStuff) => [
    playerStuff.id,
    getPlayerAssignment(playerStuff.mechanics, 'side'),
  ]));
  const playersForSide = (side: MechanicsSide) => players.filter((player) => sidesByPlayerId.get(player.id) === side);
  const unassignedPlayers = players.filter((player) => !sidesByPlayerId.get(player.id));
  const playersByPositionBySide: Record<MechanicsSide, Map<MechanicsPosition, RaidPlayer>> = {
    left: new Map(),
    right: new Map(),
  };
  for (const player of players) {
    const side = sidesByPlayerId.get(player.id);
    if (!side) continue;
    const position = getPlayerPosition(mechanicsByPlayerId.get(player.id));
    const playersByPosition = playersByPositionBySide[side];
    if (position !== null && playersByPosition && !playersByPosition.has(position)) {
      playersByPosition.set(position, player);
    }
  }
  const availablePlayersForPosition = (side: MechanicsSide) => {
    const playersByPosition = playersByPositionBySide[side];
    const positionedPlayerIds = new Set(
      playersByPosition ? Array.from(playersByPosition.values(), (player) => player.id) : [],
    );
    return [...playersForSide(side).filter((player) => !positionedPlayerIds.has(player.id)), ...unassignedPlayers];
  };
  const availablePositionsFor = (playerId: number, side: MechanicsSide) => {
    const playersByPosition = playersByPositionBySide[side];
    return MECHANICS_POSITIONS.filter((position) => (
      !playersByPosition?.has(position) || playersByPosition.get(position)?.id === playerId
    ));
  };

  const handlePlayerDragStart = (event: DragEvent<HTMLButtonElement>, playerId: number) => {
    event.dataTransfer.setData('text/plain', String(playerId));
    event.dataTransfer.effectAllowed = 'move';
  };
  const handlePositionDragOver = (event: DragEvent<HTMLDivElement>, side: MechanicsSide, position: MechanicsPosition) => {
    if (!isEditMode || playersByPositionBySide[side].has(position)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDragOverPosition({ side, position });
  };
  const handlePositionDrop = (event: DragEvent<HTMLDivElement>, side: MechanicsSide, position: MechanicsPosition) => {
    if (!isEditMode || playersByPositionBySide[side].has(position)) return;
    event.preventDefault();
    setDragOverPosition(null);
    setOpenPositionPicker(null);
    const playerIdValue = event.dataTransfer.getData('text/plain');
    if (!/^\d+$/.test(playerIdValue)) return;
    const playerId = Number(playerIdValue);
    if (!Number.isSafeInteger(playerId) || !players.some((player) => player.id === playerId)) return;
    onAssignPlayerToPosition(playerId, side, position);
  };
  const renderPositionSlot = (side: MechanicsSide, position: MechanicsPosition) => {
    const playersByPosition = playersByPositionBySide[side];
    const player = playersByPosition?.get(position);
    const positionPlayers = availablePlayersForPosition(side);
    const isPositionPickerOpen = openPositionPicker?.side === side && openPositionPicker.position === position;
    const isDragOverPosition = dragOverPosition?.side === side && dragOverPosition.position === position;
    return (
      <div
        key={`${side}-${position}`}
        aria-label={`Position ${position} in ${side} group`}
        onDragOver={(event) => handlePositionDragOver(event, side, position)}
        onDragLeave={(event) => {
          if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return;
          setDragOverPosition(null);
        }}
        onDrop={(event) => handlePositionDrop(event, side, position)}
        className={`${POSITION_GRID_AREA[position]} relative flex min-w-0 flex-col items-center justify-center gap-1 ${isDragOverPosition ? 'rounded-xl bg-[#d6b46b]/15 ring-2 ring-[#d6b46b]' : ''}`}
      >
        {player ? (
          <MechanicsPlayerToken
            player={player}
            assignments={[
              {
                field: 'side',
                value: side,
                onChange: (side) => onPlayerMechanicsChange(player.id, 'side', side),
              },
              {
                field: 'position',
                value: position,
                positionOptions: availablePositionsFor(player.id, side),
                onChange: (nextPosition) => onPlayerMechanicsChange(player.id, 'position', nextPosition),
              },
            ]}
            isEditMode={isEditMode}
            isCompact
            isTiny
            isGridItem
            isDraggable={isEditMode}
            onDragStart={(event) => handlePlayerDragStart(event, player.id)}
            onDragEnd={() => setDragOverPosition(null)}
          />
        ) : (
          <>
            <button
              type="button"
              disabled={!isEditMode || positionPlayers.length === 0}
              aria-label={`Assign player to ${side} group position ${position}`}
              aria-expanded={isPositionPickerOpen}
              onClick={() => setOpenPositionPicker(isPositionPickerOpen ? null : { side, position })}
              className="flex min-h-[3.5rem] w-full flex-col items-center justify-center rounded-xl border border-dashed border-white/30 bg-white/[0.03] text-white/65 transition hover:border-[#d6b46b] hover:bg-[#d6b46b]/10 hover:text-[#f7e7ba] disabled:cursor-default disabled:hover:border-white/30 disabled:hover:bg-white/[0.03]"
            >
              <span aria-hidden="true" className="text-3xl leading-none">+</span>
              <span className="text-base font-semibold">Assign player</span>
            </button>
            {isEditMode && isPositionPickerOpen && (
              <div role="group" aria-label={`Available players for ${side} group position ${position}`} className="absolute left-1/2 top-1/2 z-50 flex max-h-56 w-48 -translate-x-1/2 -translate-y-1/2 flex-col overflow-y-auto rounded-xl border border-white/30 bg-[#101214] p-2 text-white shadow-2xl">
                {positionPlayers.length > 0 ? positionPlayers.map((candidate) => (
                  <button
                    key={candidate.id}
                    type="button"
                    onClick={() => {
                      onAssignPlayerToPosition(candidate.id, side, position);
                      setOpenPositionPicker(null);
                    }}
                    className="rounded-lg px-3 py-2 text-left text-base font-semibold hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f7e7ba]"
                  >
                    {candidate.name}
                  </button>
                )) : (
                  <p className="p-2 text-sm text-white/60">No players available</p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <section aria-label={`${fightName} mechanics`} className="encounter-surface rounded-2xl border border-white/10 bg-[#111111]/95 p-4 text-[#f8f7f2] shadow-2xl sm:p-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d6b46b]">Lucent Citadel</p>
          <h2 className="mt-1 text-xl font-bold">{fightName}</h2>
        </div>
        <p className="text-sm text-white/50">Click a class icon in Edit Mode to change assignments.</p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
        <div
          role="group"
          aria-label="Square arena with entrance corridors, the left group above the right group"
          className="relative isolate aspect-square w-full overflow-visible bg-[#090a0b] shadow-[0_0_30px_rgba(255,255,255,0.06)]"
        >
          <svg aria-hidden="true" viewBox="0 0 1000 1000" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 z-0 h-full w-full">
            <g fill="none" stroke="#f2f1ed" strokeLinecap="square" strokeLinejoin="miter">
              <path
                strokeWidth="4"
                d="M140 140 H420 M580 140 H860 V520 M860 610 V860 H580 M420 860 H140 V140 M420 140 V0 M580 140 V0 M420 860 V1000 M580 860 V1000 M860 520 H1000 M860 610 H1000 M140 504 H860"
              />
            </g>
          </svg>
          <section
            aria-label="Left group in the upper arena"
            style={ARENA_GROUP_BOUNDS.left}
            className="absolute z-40 grid grid-cols-3 grid-rows-3 items-center justify-items-center gap-0"
          >
            {MECHANICS_POSITIONS.map((position) => renderPositionSlot('left', position))}
            <span className={`col-start-2 row-start-2 ${BOSS_BADGE_CLASS}`}>Boss</span>
          </section>
          <section
            aria-label="Right group in the lower arena"
            style={ARENA_GROUP_BOUNDS.right}
            className="absolute z-10 grid grid-cols-3 grid-rows-3 items-center justify-items-center gap-0"
          >
            {MECHANICS_POSITIONS.map((position) => renderPositionSlot('right', position))}
            <span className={`pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 ${BOSS_BADGE_CLASS}`}>Boss</span>
          </section>
        </div>

        <SlayerStackTable
          players={players}
          playersStuff={playersStuff}
          isEditMode={isEditMode}
          className={SLAYER_STACK_PANEL_CLASS}
          showSideAssignment
          onPlayerMechanicsChange={onPlayerMechanicsChange}
        />
      </div>

    </section>
  );
}

function CavotMechanicsPage({
  fightName,
  players,
  playersStuff,
  isEditMode,
  onPlayerMechanicsChange,
}: MechanicsPageProps) {
  return (
    <section aria-label={`${fightName} mechanics`} className="encounter-surface rounded-2xl border border-white/10 bg-[#111111]/95 p-4 text-[#f8f7f2] shadow-2xl sm:p-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d6b46b]">Lucent Citadel</p>
          <h2 className="mt-1 text-xl font-bold">{fightName}</h2>
        </div>
        <p className="text-sm text-white/50">Toggle Edit Mode to edit Slayer assignments.</p>
      </header>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
        <div role="group" aria-label="Square arena with the boss in the center" className="relative isolate aspect-square w-full bg-[#090a0b]">
          <svg aria-hidden="true" viewBox="0 0 1000 1000" className="pointer-events-none absolute inset-0 h-full w-full">
            <rect x="140" y="140" width="720" height="720" fill="none" stroke="#f2f1ed" strokeWidth="4" />
          </svg>
          <span className={`pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 ${BOSS_BADGE_CLASS}`}>Boss</span>
        </div>
        <SlayerStackTable
          players={players}
          playersStuff={playersStuff}
          isEditMode={isEditMode}
          className={SLAYER_STACK_PANEL_CLASS}
          onPlayerMechanicsChange={onPlayerMechanicsChange}
        />
      </div>
    </section>
  );
}

function OrphicMechanicsPage({
  fightName,
  players,
  playersStuff,
  isEditMode,
  onPlayerMechanicsChange,
  onPlayerMirrorMechanicsChange,
}: MechanicsPageProps) {
  return (
    <section aria-label={`${fightName} mechanics`} className="encounter-surface rounded-2xl border border-white/10 bg-[#111111]/95 p-4 text-[#f8f7f2] shadow-2xl sm:p-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d6b46b]">Lucent Citadel</p>
          <h2 className="mt-1 text-xl font-bold">{fightName}</h2>
        </div>
        <p className="text-sm text-white/50">Toggle Edit Mode to edit mirrors and Slayer assignments.</p>
      </header>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
        <div
          role="group"
          aria-label="Circular arena with cardinal directions"
          className="relative isolate aspect-square w-full bg-[#090a0b] shadow-[0_0_30px_rgba(255,255,255,0.06)]"
        >
          <svg aria-hidden="true" viewBox="0 0 1000 1000" className="pointer-events-none absolute inset-0 h-full w-full">
            <circle cx="500" cy="500" r="430" fill="none" stroke="#f2f1ed" strokeWidth="4" />
          </svg>
          {CARDINAL_LABELS.map(({ direction, className }) => (
            <span
              key={direction}
              className={`absolute z-10 rounded bg-[#090a0b]/80 px-2 py-1 text-lg font-bold tracking-wide text-white ${className}`}
            >
              {direction}
            </span>
          ))}
          <span className={`pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 ${BOSS_BADGE_CLASS}`}>Boss</span>
        </div>
        <SlayerStackTable
          players={players}
          playersStuff={playersStuff}
          isEditMode={isEditMode}
          className={SLAYER_STACK_PANEL_CLASS}
          onPlayerMechanicsChange={onPlayerMechanicsChange}
        />
        <MirrorsMechanicsTable
          players={players}
          playersStuff={playersStuff}
          isEditMode={isEditMode}
          className="min-w-0 lg:col-span-2"
          onPlayerMirrorMechanicsChange={onPlayerMirrorMechanicsChange}
        />
      </div>
    </section>
  );
}

function XorynMechanicsPage({
  fightName,
  players,
  playersStuff,
  isEditMode,
  onPlayerMechanicsChange,
}: MechanicsPageProps) {
  return (
    <section aria-label={`${fightName} mechanics`} className="encounter-surface rounded-2xl border border-white/10 bg-[#111111]/95 p-4 text-[#f8f7f2] shadow-2xl sm:p-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d6b46b]">Lucent Citadel</p>
          <h2 className="mt-1 text-xl font-bold">{fightName}</h2>
        </div>
        <p className="text-sm text-white/50">Toggle Edit Mode to change Slayer, Current, and Knot assignments.</p>
      </header>
      <div className="grid gap-4 xl:grid-cols-3">
        <SlayerStackTable
          players={players}
          playersStuff={playersStuff}
          isEditMode={isEditMode}
          className="relative max-h-[44rem] w-full overflow-y-auto rounded-xl border border-white/30 bg-[#070809]/90 p-2 shadow-xl"
          onPlayerMechanicsChange={onPlayerMechanicsChange}
        />
        <NumberedMechanicsTable
          players={players}
          playersStuff={playersStuff}
          isEditMode={isEditMode}
          field="current"
          title="Current"
          onPlayerMechanicsChange={onPlayerMechanicsChange}
        />
        <NumberedMechanicsTable
          players={players}
          playersStuff={playersStuff}
          isEditMode={isEditMode}
          field="knot"
          title="Knot"
          onPlayerMechanicsChange={onPlayerMechanicsChange}
        />
      </div>
    </section>
  );
}

function UnconfiguredLucentMechanicsPage({
  fightName,
  players,
  playersStuff,
  isEditMode,
  onPlayerMechanicsChange,
}: MechanicsPageProps) {
  return (
    <section aria-label={`${fightName} mechanics`} className="encounter-surface rounded-2xl border border-white/10 bg-[#111111]/95 p-4 text-[#f8f7f2] shadow-2xl sm:p-6">
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(18rem,20rem)]">
        <div>
          <h2 className="text-lg font-semibold text-white">{fightName} mechanics</h2>
          <p className="mt-2 text-sm text-white/60">No arena mechanics are configured for this encounter yet.</p>
        </div>
        <SlayerStackTable
          players={players}
          playersStuff={playersStuff}
          isEditMode={isEditMode}
          className="relative max-h-[40rem] w-full overflow-y-auto rounded-xl border border-white/30 bg-[#070809]/90 p-2 shadow-xl"
          onPlayerMechanicsChange={onPlayerMechanicsChange}
        />
      </div>
    </section>
  );
}
