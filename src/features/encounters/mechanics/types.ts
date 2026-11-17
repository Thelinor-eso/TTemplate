import type {
  FightPlayerStuff,
  MechanicsDirection,
  MechanicsMirrorField,
  MechanicsNumber,
  MechanicsNumberField,
  MechanicsPosition,
  MechanicsSide,
  RaidPlayer,
} from '@/features/template/raidTemplate';

export type MechanicsPageProps = {
  fightName: string;
  players: RaidPlayer[];
  playersStuff: FightPlayerStuff[];
  isEditMode: boolean;
  onPlayerMechanicsChange: (
    playerId: number,
    field: 'position' | 'side' | 'slayerStack' | MechanicsNumberField,
    value: MechanicsSide | MechanicsPosition | MechanicsNumber | null,
  ) => void;
  onPlayerMirrorMechanicsChange: (
    playerId: number,
    field: MechanicsMirrorField,
    directions: MechanicsDirection[] | null,
  ) => void;
  onAssignPlayerToPosition: (playerId: number, side: MechanicsSide, position: MechanicsPosition) => void;
};

export type EncounterMechanicsViewProps = MechanicsPageProps & {
  raidName: string | null;
};
