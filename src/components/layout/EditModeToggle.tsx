'use client';

import { useRaid } from '@/features/template/RaidContext';

type EditModeToggleProps = { className?: string };

export default function EditModeToggle({ className = '' }: EditModeToggleProps) {
  const { isEditMode, toggleEditMode } = useRaid();

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isEditMode}
      aria-label="Edit mode"
      onClick={toggleEditMode}
      className={`inline-flex items-center gap-3 rounded-xl border border-white/20 bg-[#1c1c1f] px-4 py-2.5 text-sm font-semibold text-white transition hover:border-white/40 hover:bg-[#242424] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f8f7f2] ${className}`}
    >
      <span>Edit</span>
      <span
        aria-hidden="true"
        className={`relative h-5 w-9 rounded-full transition ${isEditMode ? 'raid-selected-indicator' : 'border border-white/20 bg-[#1c1c1f]'}`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${
            isEditMode ? 'left-[18px]' : 'left-0.5'
          }`}
        />
      </span>
    </button>
  );
}
