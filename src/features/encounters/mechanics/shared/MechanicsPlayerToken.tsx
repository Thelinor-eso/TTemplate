import Image from 'next/image';
import { useState, type DragEvent } from 'react';
import { CLASS_ICON_MAP } from '@/data/iconMaps';
import { getClassForSkillLine } from '@/data/esoClasses';
import type { MechanicsPosition, MechanicsSide, RaidPlayer } from '@/features/template/raidTemplate';

const MECHANICS_POSITIONS: readonly MechanicsPosition[] = [1, 2, 3, 4, 5, 6];

export type MechanicsPlayerAssignment =
  | { field: 'position'; value: MechanicsPosition | null; onChange: (value: MechanicsPosition | null) => void; positionOptions?: readonly MechanicsPosition[] }
  | { field: 'side' | 'slayerStack'; value: MechanicsSide | null; onChange: (value: MechanicsSide | null) => void };

type MechanicsPlayerTokenProps = {
  player: RaidPlayer;
  assignments: MechanicsPlayerAssignment[];
  isEditMode: boolean;
  isCompact?: boolean;
  isTiny?: boolean;
  isGridItem?: boolean;
  isDraggable?: boolean;
  onDragStart?: (event: DragEvent<HTMLButtonElement>) => void;
  onDragEnd?: () => void;
};

export default function MechanicsPlayerToken({
  player,
  assignments,
  isEditMode,
  isCompact = false,
  isTiny = false,
  isGridItem = false,
  isDraggable = false,
  onDragStart,
  onDragEnd,
}: MechanicsPlayerTokenProps) {
  const [isAssignmentMenuOpen, setIsAssignmentMenuOpen] = useState(false);
  const skillLine = [
    player.skillClasses.MainSkillClass,
    player.skillClasses.SecondSkillClass,
    player.skillClasses.ThirdSkillClass,
  ].find(Boolean);
  const className = getClassForSkillLine(skillLine);
  const classIcon = className ? CLASS_ICON_MAP[className] : '';

  return (
    <div
      className={`relative flex min-w-0 flex-col items-center ${isGridItem ? 'w-full' : ''} ${isCompact ? 'gap-0.5' : 'gap-1'}`}
      onBlur={(event) => {
        const nextFocus = event.relatedTarget;
        if (nextFocus instanceof Node && event.currentTarget.contains(nextFocus)) return;
        setIsAssignmentMenuOpen(false);
      }}
    >
      <button
        type="button"
        disabled={!isEditMode || assignments.length === 0}
        aria-expanded={isEditMode && assignments.length > 0 ? isAssignmentMenuOpen : undefined}
        aria-label={`${player.name} — ${className ?? 'Class not set'}${isEditMode ? ', click to edit assignments' : ''}`}
        onClick={() => setIsAssignmentMenuOpen((isOpen) => !isOpen)}
        draggable={isDraggable}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        title={player.name}
        className={`group relative flex items-center justify-center rounded-lg border border-white/15 bg-black/65 outline-none transition hover:border-white/70 focus-visible:ring-2 focus-visible:ring-white/80 ${isTiny ? 'h-8 w-8' : isCompact ? 'h-[clamp(2rem,4vw,2.5rem)] w-[clamp(2rem,4vw,2.5rem)]' : 'h-14 w-14'} ${isDraggable ? 'cursor-grab active:cursor-grabbing' : ''} disabled:cursor-default`}
      >
        {classIcon ? (
          <Image
            src={classIcon}
            alt=""
            draggable={false}
            width={isTiny ? 24 : isCompact ? 30 : 40}
            height={isTiny ? 24 : isCompact ? 30 : 40}
            className={`${isTiny ? 'h-6 w-6' : isCompact ? 'h-[clamp(1.5rem,3vw,1.875rem)] w-[clamp(1.5rem,3vw,1.875rem)]' : 'h-10 w-10'} object-contain`}
          />
        ) : (
          <span aria-hidden="true" className={`font-semibold text-white/40 ${isTiny ? 'text-base' : isCompact ? 'text-lg' : 'text-xl'}`}>?</span>
        )}
      </button>
      <span title={player.name} className={`max-w-full truncate text-center text-white/90 ${isTiny ? '[font-size:clamp(1.25rem,1.8vw,1.375rem)] font-semibold leading-6' : '[font-size:clamp(1.5rem,2.5vw,1.875rem)] font-bold leading-9'}`}>
        {player.name}
      </span>
      {isEditMode && isAssignmentMenuOpen && assignments.length > 0 && (
        <div role="group" aria-label={`${player.name} assignments`} className="absolute left-1/2 top-full z-50 mt-1 flex min-w-28 -translate-x-1/2 flex-col gap-1 rounded-md border border-white/30 bg-[#101214] p-2 text-white shadow-xl">
          {assignments.map((assignment) => {
            const { field, value } = assignment;
            const label = field === 'position' ? 'Position' : field === 'side' ? 'Side' : 'Slayer stack';
            return (
              <label key={field}>
                <span className="mb-0.5 block text-[9px] font-semibold text-white/65">{label}</span>
                <select
                  aria-label={`${label} for ${player.name}`}
                  value={value === null ? '' : String(value)}
                  onChange={(event) => {
                    if (assignment.field === 'position') {
                      const nextPosition = MECHANICS_POSITIONS.find((position) => String(position) === event.target.value) ?? null;
                      assignment.onChange(nextPosition);
                      setIsAssignmentMenuOpen(false);
                      return;
                    }
                    const nextSide = event.target.value;
                    assignment.onChange(nextSide === 'left' || nextSide === 'right' ? nextSide : null);
                    setIsAssignmentMenuOpen(false);
                  }}
                  className="w-full rounded border border-white/20 bg-[#1a1d20] px-1 py-1 text-[10px] text-white"
                >
                  <option value="">Unassigned</option>
                  {assignment.field === 'position' ? (
                    (assignment.positionOptions ?? MECHANICS_POSITIONS).map((position) => (
                      <option key={position} value={position}>{position}</option>
                    ))
                  ) : (
                    <>
                      <option value="left">Left</option>
                      <option value="right">Right</option>
                    </>
                  )}
                </select>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
