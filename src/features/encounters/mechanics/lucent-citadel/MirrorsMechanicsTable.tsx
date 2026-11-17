import type { FightPlayerStuff, MechanicsDirection, MechanicsMirrorField, RaidPlayer } from '@/features/template/raidTemplate';

type MirrorsMechanicsTableProps = {
  players: RaidPlayer[];
  playersStuff: FightPlayerStuff[];
  isEditMode: boolean;
  className?: string;
  onPlayerMirrorMechanicsChange: (playerId: number, field: MechanicsMirrorField, directions: MechanicsDirection[] | null) => void;
};

const DIRECTIONS: readonly MechanicsDirection[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
const MIRROR_ROWS: readonly { field: MechanicsMirrorField; label: string }[] = [
  { field: 'whiteTrash', label: 'White Trash' },
  { field: 'redTrash', label: 'Red Trash' },
  { field: 'whiteTrash2', label: 'White Trash 2' },
  { field: 'redTrash2', label: 'Red Trash 2' },
  { field: 'mirror90', label: 'Mirror 90' },
  { field: 'mirror60', label: 'Mirror 60' },
  { field: 'mirror40', label: 'Mirror 40' },
  { field: 'mirror20', label: 'Mirror 20' },
];

function isSpecialMirrorCell(field: MechanicsMirrorField, direction: MechanicsDirection) {
  if (field === 'mirror90') return direction === 'E' || direction === 'W';
  if (field === 'mirror60') return direction === 'N' || direction === 'S';
  if (field === 'mirror40' || field === 'mirror20') {
    return direction === 'N' || direction === 'S' || direction === 'E' || direction === 'W';
  }
  return false;
}

export default function MirrorsMechanicsTable({
  players,
  playersStuff,
  isEditMode,
  className,
  onPlayerMirrorMechanicsChange,
}: MirrorsMechanicsTableProps) {
  const mirrorsByPlayerId = new Map(playersStuff.map((playerStuff) => [playerStuff.id, playerStuff.mechanics.mirrors]));

  return (
    <section aria-label="Mirrors mechanics" className={`font-sans ${className ?? ''}`}>
      <header className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="text-xl font-bold tracking-tight text-white/95">Mirrors</h3>
          <p className="mt-1 text-sm text-white/55">Player assignments by arena direction</p>
        </div>
        {isEditMode && (
          <p className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/60">
            Select a player to assign or remove
          </p>
        )}
      </header>
      <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#090c11]/80 p-2 shadow-lg shadow-black/20">
        <table className="w-full min-w-[960px] table-fixed border-separate border-spacing-1 text-sm">
          <caption className="sr-only">Player assignments for each Orphic mirror mechanic and compass direction</caption>
          <colgroup>
            <col className="w-44" />
            {DIRECTIONS.map((direction) => <col key={direction} />)}
          </colgroup>
          <thead>
            <tr>
              <th scope="col" className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-[0.14em] text-white/45">
                Mechanic
              </th>
              {DIRECTIONS.map((direction) => (
                <th key={direction} scope="col" className="rounded-lg border border-[#a9c5ed]/40 bg-[#a9c5ed]/[0.12] px-2 py-2.5 text-base font-bold tracking-wide text-[#d1e5f7]">
                  {direction}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MIRROR_ROWS.map(({ field, label }) => {
              const assignedPlayers = players.flatMap((player) => {
                const directions = mirrorsByPlayerId.get(player.id)?.[field] ?? [];
                return directions.map((direction) => ({ player, direction }));
              });
              const assignedDirectionByPlayerId = new Map(
                assignedPlayers.map(({ player, direction }) => [player.id, direction]),
              );

              return (
                <tr key={field} className="group/row">
                  <th scope="row" className="rounded-lg border border-white/[0.08] bg-white/[0.035] px-3 py-2.5 text-left text-sm font-semibold tracking-wide text-white/85 transition-colors group-hover/row:bg-white/[0.06]">
                    <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-[#a9c5ed]/70 align-middle" aria-hidden="true" />
                    <span className="align-middle">{label}</span>
                  </th>
                  {DIRECTIONS.map((direction) => {
                    const cellPlayers = assignedPlayers.filter((entry) => entry.direction === direction);
                    const assignedPlayerIds = new Set(cellPlayers.map(({ player }) => player.id));
                    const assignedPlayerNames = cellPlayers.map(({ player }) => player.name).join(', ');
                    const isSpecialCell = isSpecialMirrorCell(field, direction);
                    return (
                      <td
                        key={direction}
                        className={`h-[4.25rem] rounded-lg border p-1.5 align-middle transition-colors ${
                          isSpecialCell
                            ? cellPlayers.length > 0
                              ? 'border-[#e5a1a7]/65 bg-[#a84e5a]/[0.45]'
                              : 'border-[#b85c67]/35 bg-[#a84e5a]/[0.18]'
                            : cellPlayers.length > 0
                              ? 'border-[#a9c5ed]/50 bg-[#a9c5ed]/[0.16]'
                              : 'border-white/[0.07] bg-white/[0.025] group-hover/row:bg-white/[0.045]'
                        }`}
                      >
                        <div className="flex min-h-10 items-center justify-center">
                          {isEditMode && (
                            <select
                              aria-label={`Assign player to ${label} ${direction}`}
                              title={assignedPlayerNames || undefined}
                              value=""
                              onChange={(event) => {
                                if (event.target.value === '__remove__') {
                                  for (const { player } of cellPlayers) {
                                    const nextDirections = mirrorsByPlayerId.get(player.id)?.[field] ?? [];
                                    const updatedDirections = nextDirections.filter((assignedDirection) => assignedDirection !== direction);
                                    onPlayerMirrorMechanicsChange(
                                      player.id,
                                      field,
                                      updatedDirections.length > 0 ? updatedDirections : null,
                                    );
                                  }
                                  return;
                                }
                                if (!/^\d+$/.test(event.target.value)) return;
                                const playerId = Number(event.target.value);
                                if (!Number.isSafeInteger(playerId) || !players.some((player) => player.id === playerId)) return;
                                if (cellPlayers.length > 0 && !assignedPlayerIds.has(playerId)) return;
                                const nextDirections = mirrorsByPlayerId.get(playerId)?.[field] ?? [];
                                if (nextDirections.some((assignedDirection) => assignedDirection !== direction)) return;
                                const updatedDirections = nextDirections.includes(direction)
                                  ? nextDirections.filter((assignedDirection) => assignedDirection !== direction)
                                  : [...nextDirections, direction];
                                onPlayerMirrorMechanicsChange(
                                  playerId,
                                  field,
                                  updatedDirections.length > 0 ? updatedDirections : null,
                                );
                              }}
                              className={`h-10 w-full min-w-0 cursor-pointer rounded-md border px-2 text-center text-xs font-semibold shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-[#d1e5f7] focus-visible:ring-offset-2 focus-visible:ring-offset-[#090c11] ${
                                isSpecialCell
                                  ? cellPlayers.length > 0
                                    ? 'border-[#f2c0c4]/60 bg-[#d98991] text-[#1b1012] hover:bg-[#e6a3a9]'
                                    : 'border-[#b85c67]/35 bg-[#30171d] text-white/75 hover:border-[#d98790]/50 hover:bg-[#452129]'
                                  : cellPlayers.length > 0
                                    ? 'border-[#d1e5f7]/60 bg-[#a9c5ed] text-[#111820] hover:bg-[#c1d7f3]'
                                    : 'border-white/10 bg-[#151c26] text-white/60 hover:border-[#a9c5ed]/40 hover:bg-[#1b2634] hover:text-white'
                              }`}
                            >
                              <option value="">{assignedPlayerNames || '-'}</option>
                              {cellPlayers.length > 0 && <option value="__remove__">-</option>}
                              {players.map((player) => (
                                <option
                                  key={player.id}
                                  value={player.id}
                                  disabled={
                                    (cellPlayers.length > 0 && !assignedPlayerIds.has(player.id))
                                    || (assignedDirectionByPlayerId.has(player.id) && assignedDirectionByPlayerId.get(player.id) !== direction)
                                  }
                                >
                                  {assignedPlayerIds.has(player.id) ? `✓ ${player.name}` : player.name}
                                </option>
                              ))}
                            </select>
                          )}
                          {!isEditMode && (
                            cellPlayers.length > 0 ? (
                              <div className="flex w-full flex-wrap items-center justify-center gap-1">
                                {cellPlayers.map(({ player }) => (
                                  <span
                                    key={player.id}
                                    title={player.name}
                                    className={`max-w-full truncate rounded-md border px-2.5 py-1 text-xs font-semibold leading-5 shadow-sm ${
                                      isSpecialCell
                                        ? 'border-[#f2c0c4]/60 bg-[#d98991] text-[#1b1012]'
                                        : 'border-[#d1e5f7]/60 bg-[#a9c5ed] text-[#111820]'
                                    }`}
                                  >
                                    {player.name}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="select-none text-xs text-white/20" aria-hidden="true">-</span>
                            )
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
