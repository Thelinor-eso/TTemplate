import LucentCitadelMechanics from '@/features/encounters/mechanics/lucent-citadel/LucentCitadelMechanics';
import SlayerStackTable from '@/features/encounters/mechanics/shared/SlayerStackTable';
import type { EncounterMechanicsViewProps } from '@/features/encounters/mechanics/types';

export default function EncounterMechanicsView(props: EncounterMechanicsViewProps) {
  if (props.raidName === 'Lucent Citadel') {
    return <LucentCitadelMechanics {...props} />;
  }

  return (
    <section aria-label={`${props.fightName} mechanics`} className="encounter-surface rounded-2xl border border-white/10 bg-[#111111]/95 p-4 text-[#f8f7f2] shadow-2xl sm:p-6">
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(18rem,20rem)]">
        <div>
          <h2 className="text-lg font-semibold text-white">{props.fightName} mechanics</h2>
          <p className="mt-2 text-sm text-white/60">No arena mechanics are configured for this encounter yet.</p>
        </div>
        <SlayerStackTable
          players={props.players}
          playersStuff={props.playersStuff}
          isEditMode={props.isEditMode}
          className="relative max-h-[40rem] w-full overflow-y-auto rounded-xl border border-white/30 bg-[#070809]/90 p-2 shadow-xl"
          onPlayerMechanicsChange={props.onPlayerMechanicsChange}
        />
      </div>
    </section>
  );
}
