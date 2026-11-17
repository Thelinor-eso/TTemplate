import {
  isMechanicsNumber,
  MECHANICS_NUMBERS,
  type MechanicsNumber,
  type MechanicsNumberField,
  type RaidPlayer,
} from '@/features/template/raidTemplate';
import type { MechanicsPageProps } from '@/features/encounters/mechanics/types';

type NumberedMechanicsTableProps = Pick<MechanicsPageProps, 'players' | 'playersStuff' | 'isEditMode' | 'onPlayerMechanicsChange'> & {
  field: MechanicsNumberField;
  title: string;
};

export default function NumberedMechanicsTable({
  players,
  playersStuff,
  isEditMode,
  onPlayerMechanicsChange,
  field,
  title,
}: NumberedMechanicsTableProps) {
  const mechanicsByPlayerId = new Map(playersStuff.map((playerStuff) => [playerStuff.id, playerStuff.mechanics]));
  const playersById = new Map(players.map((player) => [player.id, player]));
  const playersByNumber = new Map<MechanicsNumber, RaidPlayer>();
  for (const playerStuff of playersStuff) {
    const number = playerStuff.mechanics[field];
    const player = playersById.get(playerStuff.id);
    if (isMechanicsNumber(number) && player) playersByNumber.set(number, player);
  }

  return (
    <section aria-label={`${title} assignments`} className="min-w-0 overflow-hidden rounded-xl border border-white/30 bg-[#070809]/90 p-2 shadow-xl">
      <h3 className="mb-1.5 text-xl font-bold text-white/90">{title}</h3>
      <div className="max-h-[38rem] overflow-y-auto">
        <table className="w-full min-w-0 table-fixed border-separate border-spacing-0">
          <thead className="sticky top-0 z-10">
            <tr>
              <th scope="col" className="w-1/3 rounded-tl-lg border border-white/15 bg-[#111315] px-2 py-1 text-left text-base font-semibold">Number</th>
              <th scope="col" className="w-2/3 rounded-tr-lg border border-l-0 border-white/15 bg-[#111315] px-2 py-1 text-left text-base font-semibold">Player</th>
            </tr>
          </thead>
          <tbody>
            {MECHANICS_NUMBERS.map((number) => {
              const assignedPlayer = playersByNumber.get(number);

              return (
                <tr key={number}>
                  <th scope="row" className="border border-t-0 border-white/15 px-2 py-1 text-left text-sm font-semibold text-white/90">
                    {number}
                  </th>
                  <td className="border border-t-0 border-l-0 border-white/15 px-2 py-1 text-sm text-white/90">
                    {isEditMode ? (
                      <select
                        aria-label={`Player for ${title} number ${number}`}
                        value={assignedPlayer ? String(assignedPlayer.id) : ''}
                        onChange={(event) => {
                          const rawPlayerId = event.target.value;
                          if (rawPlayerId === '') {
                            if (assignedPlayer) onPlayerMechanicsChange(assignedPlayer.id, field, null);
                            return;
                          }
                          const playerId = Number(rawPlayerId);
                          if (!Number.isSafeInteger(playerId) || !players.some((player) => player.id === playerId)) {
                            throw new Error(`Invalid ${field} assignment: expected a known player.`);
                          }
                          onPlayerMechanicsChange(playerId, field, number);
                        }}
                        className="w-full rounded border border-white/20 bg-[#1a1d20] px-1.5 py-1 text-sm text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#d6b46b]"
                      >
                        <option value="">-</option>
                        {players.map((player) => {
                          const assignedNumber = mechanicsByPlayerId.get(player.id)?.[field];
                          return (
                            <option
                              key={player.id}
                              value={player.id}
                              disabled={isMechanicsNumber(assignedNumber) && assignedNumber !== number}
                            >
                              {player.name}
                            </option>
                          );
                        })}
                      </select>
                    ) : (
                      <span className="block truncate" title={assignedPlayer?.name}>
                        {assignedPlayer?.name ?? '-'}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
