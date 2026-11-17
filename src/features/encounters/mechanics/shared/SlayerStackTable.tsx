import Image from 'next/image';
import { useState, type DragEvent } from 'react';
import MechanicsPlayerToken from '@/features/encounters/mechanics/shared/MechanicsPlayerToken';
import type { FightPlayerStuff, MechanicsSide, RaidPlayer } from '@/features/template/raidTemplate';
import { withBasePath } from '@/lib/staticAssets';

type SlayerStackTableProps = {
  players: RaidPlayer[];
  playersStuff: FightPlayerStuff[];
  isEditMode: boolean;
  showSideAssignment?: boolean;
  className?: string;
  onPlayerMechanicsChange: (playerId: number, field: 'side' | 'slayerStack', value: MechanicsSide | null) => void;
};

const DEFAULT_CLASS_NAME = 'absolute right-[2%] top-[2%] z-30 max-h-[96%] w-[clamp(12rem,26%,20rem)] max-w-[20rem] overflow-y-auto rounded-xl border border-white/30 bg-[#070809]/90 p-2 shadow-xl backdrop-blur-sm';

export default function SlayerStackTable({
  players,
  playersStuff,
  isEditMode,
  showSideAssignment = false,
  className = DEFAULT_CLASS_NAME,
  onPlayerMechanicsChange,
}: SlayerStackTableProps) {
  const [dragOverStack, setDragOverStack] = useState<MechanicsSide | null>(null);
  const mechanicsByPlayerId = new Map(playersStuff.map((playerStuff) => [playerStuff.id, playerStuff.mechanics]));
  const slayerStacksByPlayerId = new Map(playersStuff.map((playerStuff) => [
    playerStuff.id,
    playerStuff.mechanics.slayerStack === 'left' || playerStuff.mechanics.slayerStack === 'right'
      ? playerStuff.mechanics.slayerStack
      : null,
  ]));
  const stackPlayers = (side: MechanicsSide) => players.filter((player) => slayerStacksByPlayerId.get(player.id) === side);
  const unassignedPlayers = players.filter((player) => slayerStacksByPlayerId.get(player.id) === null);

  const handleDragStart = (event: DragEvent<HTMLButtonElement>, playerId: number) => {
    event.dataTransfer.setData('text/plain', String(playerId));
    event.dataTransfer.effectAllowed = 'move';
  };
  const handleDragOver = (event: DragEvent<HTMLTableCellElement>, side: MechanicsSide) => {
    if (!isEditMode) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDragOverStack(side);
  };
  const handleDrop = (event: DragEvent<HTMLTableCellElement>, side: MechanicsSide) => {
    if (!isEditMode) return;
    event.preventDefault();
    setDragOverStack(null);
    const playerIdValue = event.dataTransfer.getData('text/plain');
    if (!/^\d+$/.test(playerIdValue)) return;
    const playerId = Number(playerIdValue);
    if (!Number.isSafeInteger(playerId) || !players.some((player) => player.id === playerId)) return;
    if (slayerStacksByPlayerId.get(playerId) === side) return;
    onPlayerMechanicsChange(playerId, 'slayerStack', side);
  };

  return (
    <section aria-label="Slayer stack assignments" className={className}>
      <div className="mb-1.5">
        <h3 className="flex items-center gap-2 text-xl font-bold text-white/90">
          <Image
            src={withBasePath('/buffs/ability_buff_major_slayer.png')}
            alt="Major Slayer"
            width={24}
            height={24}
            className="h-6 w-6 shrink-0 object-contain"
          />
          Slayer stack
        </h3>
      </div>
      <table className="w-full min-w-0 table-fixed border-separate border-spacing-0">
        <thead>
          <tr>
            <th scope="col" className="w-1/2 rounded-tl-lg border border-white/15 bg-white/[0.04] px-1.5 py-1 text-left text-base font-semibold">Left</th>
            <th scope="col" className="w-1/2 rounded-tr-lg border border-l-0 border-white/15 bg-white/[0.04] px-1.5 py-1 text-left text-base font-semibold">Right</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            {(['left', 'right'] as const).map((side) => {
              const sidePlayers = stackPlayers(side);
              return (
                <td
                  key={side}
                  onDragOver={(event) => handleDragOver(event, side)}
                  onDragLeave={(event) => {
                    if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return;
                    setDragOverStack(null);
                  }}
                  onDrop={(event) => handleDrop(event, side)}
                  className={`align-top border border-t-0 border-white/15 p-1 transition-colors ${dragOverStack === side ? 'bg-white/10' : ''}`}
                >
                  {sidePlayers.length > 0 ? (
                    <div className="flex flex-col gap-1">
                      {sidePlayers.map((player) => (
                        <MechanicsPlayerToken
                          key={player.id}
                          player={player}
                          assignments={[{
                            field: 'slayerStack',
                            value: side,
                            onChange: (nextSide) => onPlayerMechanicsChange(player.id, 'slayerStack', nextSide),
                          }]}
                          isEditMode={isEditMode}
                          isCompact
                          isTiny
                          isDraggable={isEditMode}
                          onDragStart={(event) => handleDragStart(event, player.id)}
                          onDragEnd={() => setDragOverStack(null)}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="py-2 text-center text-[10px] text-white/40">No players assigned</p>
                  )}
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
      {unassignedPlayers.length > 0 && (
        <div className="mt-2 border-t border-white/15 pt-2">
          <div className="mb-1 flex items-center justify-between gap-1">
            <h4 className="text-base font-semibold text-white/75">Unassigned</h4>
            <span className="text-base text-white/50">{unassignedPlayers.length}</span>
          </div>
          <div className="flex flex-col gap-1">
            {unassignedPlayers.map((player) => (
              <MechanicsPlayerToken
                key={player.id}
                player={player}
                assignments={showSideAssignment ? [
                  {
                    field: 'side',
                    value: mechanicsByPlayerId.get(player.id)?.side === 'left' || mechanicsByPlayerId.get(player.id)?.side === 'right'
                      ? mechanicsByPlayerId.get(player.id)?.side ?? null
                      : null,
                    onChange: (side) => onPlayerMechanicsChange(player.id, 'side', side),
                  },
                  {
                    field: 'slayerStack',
                    value: null,
                    onChange: (side) => onPlayerMechanicsChange(player.id, 'slayerStack', side),
                  },
                ] : [{
                  field: 'slayerStack',
                  value: null,
                  onChange: (side) => onPlayerMechanicsChange(player.id, 'slayerStack', side),
                }]}
                isEditMode={isEditMode}
                isCompact
                isTiny
                isDraggable={isEditMode}
                onDragStart={(event) => handleDragStart(event, player.id)}
                onDragEnd={() => setDragOverStack(null)}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
