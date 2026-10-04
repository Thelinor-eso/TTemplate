'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRaid } from '@/features/template/RaidContext';
import { useEffect, useState } from 'react';
import { getRaidBackground, getRaidTheme } from '@/lib/raidDisplay';
import { MUNDUS_ICON_MAP, SKILL_LINE_ICON_MAP, ROLE_ICON_MAP, CLASS_ICON_MAP, RACE_ICON_MAP } from '@/data/iconMaps';
import EditModeToggle from '@/components/layout/EditModeToggle';
import { ESO_CLASS_SKILL_LINES, getClassForSkillLine } from '@/data/esoClasses';
import { ESO_RACES } from '@/data/esoRaces';
import { CLASS_MASTERY_OPTIONS_BY_CLASS, ClassName, MUNDUS_STONE_OPTIONS, ROLE_OPTIONS, SKILL_CLASS_SLOTS, copyPlayerSetup, pastePlayerSetup, type ClassMasteries, type ClassSkillLine, type PlayerSetup } from '@/features/template/raidTemplate';

const skillLineIconMap = SKILL_LINE_ICON_MAP;
const classIconMap = CLASS_ICON_MAP;
const classMasteryOptionsByClass = CLASS_MASTERY_OPTIONS_BY_CLASS;

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

type CopiedPlayerSetup = {
  playerId: number;
  playerName: string;
  setup: PlayerSetup;
};

export default function PlayersPage() {
  const {
    template,
    players,
    isEditMode,
    addPlayer,
    removePlayer,
    updatePlayer,
    updatePlayerName,
    updatePlayerRole,
    updatePlayerClasses,
    updatePlayerClassMasteries,
    updatePlayerMundus,
  } = useRaid();
  const [activeDropdownKey, setActiveDropdownKey] = useState<string | null>(null);
  const [copiedPlayerSetup, setCopiedPlayerSetup] = useState<CopiedPlayerSetup | null>(null);
  const [playerPendingDeletion, setPlayerPendingDeletion] = useState<{ id: number; name: string } | null>(null);
  const [hasScrolled, setHasScrolled] = useState(false);

  useEffect(() => {
    if (!playerPendingDeletion && !activeDropdownKey) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setPlayerPendingDeletion(null);
      setActiveDropdownKey(null);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [playerPendingDeletion, activeDropdownKey]);

  useEffect(() => {
    const updateScrollState = () => setHasScrolled(window.scrollY > 72);
    updateScrollState();
    window.addEventListener('scroll', updateScrollState, { passive: true });
    return () => window.removeEventListener('scroll', updateScrollState);
  }, []);

  const toggleDropdown = (playerId: number, index: number) => {
    const key = `${playerId}-${index}`;
    setActiveDropdownKey(current => current === key ? null : key);
  };

  const toggleClassDropdown = (playerId: number) => {
    const key = `${playerId}-class`;
    setActiveDropdownKey(current => current === key ? null : key);
  };

  const toggleRaceDropdown = (playerId: number) => {
    const key = `${playerId}-race`;
    setActiveDropdownKey(current => current === key ? null : key);
  };

  const selectPlayerRace = (playerId: number, raceId: number | null) => {
    if (!isEditMode) return;
    updatePlayer(playerId, (player) => ({ ...player, race: raceId }));
    setActiveDropdownKey(null);
  };

  const toggleMundusDropdown = (playerId: number) => {
    const key = `${playerId}-mundus`;
    setActiveDropdownKey(current => current === key ? null : key);
  };

  const selectPlayerMundus = (playerId: number, mundus: string) => {
    if (!isEditMode) return;

    updatePlayerMundus(playerId, mundus);
    setActiveDropdownKey(null);
  };

  const selectClass = (playerId: number, index: number, skillLine: ClassSkillLine) => {
    if (!isEditMode) return;

    const player = players.find(p => p.id === playerId);
    if (!player) return;

    const currentClasses = SKILL_CLASS_SLOTS.map((slot) => player.skillClasses[slot]);
    const existingSkillIndex = currentClasses.indexOf(skillLine);
    if (existingSkillIndex !== -1 && existingSkillIndex !== index) {
      return;
    }

    const nextSkillClasses = { ...player.skillClasses, [SKILL_CLASS_SLOTS[index]]: skillLine };
    updatePlayerClasses(playerId, nextSkillClasses);

    const nextClasses = SKILL_CLASS_SLOTS.map((slot) => nextSkillClasses[slot]);
    const nextClass = getClassForSkillLine(nextClasses[0]);
    const hasCompleteClass = !!nextClass &&
      nextClasses.every(line => !!line && getClassForSkillLine(line) === nextClass);
    if (!hasCompleteClass) {
      updatePlayerClassMasteries(playerId, { firstClassMastery: '', secondClassMastery: '' });
    }

    setActiveDropdownKey(null);
  };

  const selectPlayerClass = (playerId: number, className: keyof typeof ESO_CLASS_SKILL_LINES) => {
    if (!isEditMode) return;

    const player = players.find(p => p.id === playerId);
    if (!player) return;

    const skillLines = ESO_CLASS_SKILL_LINES[className];
    updatePlayerClasses(playerId, {
      MainSkillClass: skillLines[0],
      SecondSkillClass: skillLines[1],
      ThirdSkillClass: skillLines[2],
    });

    const currentClasses = SKILL_CLASS_SLOTS.map((slot) => player.skillClasses[slot]);
    const currentClass = getClassForSkillLine(currentClasses.find(Boolean));
    const hasCompleteSelectedClass = currentClass === className &&
      currentClasses.every(line => !!line && getClassForSkillLine(line) === className);
    if (!hasCompleteSelectedClass) {
      updatePlayerClassMasteries(playerId, { firstClassMastery: '', secondClassMastery: '' });
    }
  };

  const updateClassMastery = (playerId: number, className: string, masteryName: string) => {
    if (!isEditMode) return;

    const player = players.find(p => p.id === playerId);
    if (!player) return;

    const currentFirst = player.classMasteries.firstClassMastery;
    const currentSecond = player.classMasteries.secondClassMastery;

    const nextMasteries: ClassMasteries = {
      firstClassMastery: currentFirst,
      secondClassMastery: currentSecond,
    };

    const selected = currentFirst === masteryName || currentSecond === masteryName;

    if (selected) {
      if (currentFirst === masteryName) nextMasteries.firstClassMastery = '';
      if (currentSecond === masteryName) nextMasteries.secondClassMastery = '';
    } else if (!currentFirst || currentFirst === className) {
      nextMasteries.firstClassMastery = masteryName;
    } else if (!currentSecond || currentSecond === className) {
      nextMasteries.secondClassMastery = masteryName;
    } else {
      nextMasteries.secondClassMastery = masteryName;
    }

    updatePlayerClassMasteries(playerId, nextMasteries);
  };

  const closeAllDropdowns = () => {
    setActiveDropdownKey(null);
  };

  const raidBackground = getRaidBackground(template.raid.selectedRaid);
  const raidTheme = getRaidTheme(template.raid.selectedRaid);

  return (
    <div
      className="app-page players-page bg-cover bg-center bg-fixed p-5 sm:p-8"
      data-raid-theme={raidTheme || undefined}
      data-neutral-template={template.raid.selectedRaid === 'Neutral' ? '' : undefined}
      style={{
        backgroundImage: raidBackground
          ? `url(${raidBackground})`
          : template.raid.selectedRaid === 'Neutral'
            ? 'none'
            : 'linear-gradient(to bottom right, #050506, #111111, #050506)',
      }}
    >
      <div className="app-page__scrim" />

      <div className="app-page__content mx-auto max-w-[96rem]">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="page-heading !mb-0">
            <h1 className="page-heading__title">Players</h1>
            <p className="page-heading__description min-h-[4.95em]">
              Organize roles, class skill lines and group buffs for every player in your roster.
            </p>
          </div>
          <div className={`app-page__actions flex shrink-0 flex-wrap items-center gap-3 ${hasScrolled ? 'is-fixed' : ''}`}>
            <Link
              href="/encounters"
              className="raid-action-control inline-flex shrink-0 items-center gap-2 border px-4 py-2.5 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f8f7f2]"
            >
              Go to Encounter
              <span aria-hidden="true">→</span>
            </Link>
            <EditModeToggle className="raid-action-control" />
          </div>
        </div>
        {activeDropdownKey !== null && (
          <div
            className="fixed inset-0 z-30"
            onClick={closeAllDropdowns}
          />
        )}

        {isEditMode && copiedPlayerSetup && (
          <div className="mb-5 rounded-xl border border-[#d6b46b] bg-[#111720]/90 px-4 py-3 text-sm text-yellow-100 shadow-lg">
            Copied to clipboard: <span className="font-bold text-[#f7e7ba]">Player setup</span> from <span className="font-bold text-[#f7e7ba]">{copiedPlayerSetup.playerName}</span>. Use the paste icon on another player to apply the role, skill lines, class masteries and Mundus stone.
          </div>
        )}

        <div className="players-page__roster-layout">
          <div className="players-page__roster grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {players.map((player) => {
            const currentPlayerClasses = SKILL_CLASS_SLOTS.map((slot) => player.skillClasses[slot]);
            const firstFilledIndex = currentPlayerClasses.findIndex(Boolean);
            const primaryClass = firstFilledIndex >= 0 ? getClassForSkillLine(currentPlayerClasses[firstFilledIndex]) : null;
            const sameClassMasteries = !!primaryClass && currentPlayerClasses.filter(Boolean).length === SKILL_CLASS_SLOTS.length && currentPlayerClasses.filter(Boolean).every(skillLine => getClassForSkillLine(skillLine) === primaryClass);
            const hasOpenDropdown = Boolean(
              activeDropdownKey === `${player.id}-class`
              || activeDropdownKey === `${player.id}-race`
              || activeDropdownKey === `${player.id}-mundus`
              || [0, 1, 2].some((index) => activeDropdownKey === `${player.id}-${index}`),
            );

            return (
              <div
                key={player.id}
                className={`player-card relative bg-[#111111] border-2 border-[#d6b46b] rounded-lg p-4 sm:p-5 ${hasOpenDropdown ? 'z-40' : 'z-0'}`}
              >
                {isEditMode && (
                  <div className="absolute top-3 right-3 z-10 flex items-center gap-1">
                    <button
                      type="button"
                      aria-label={`Copy ${player.name}'s setup`}
                      title={`Copy ${player.name}'s setup`}
                      onClick={() => setCopiedPlayerSetup({
                        playerId: player.id,
                        playerName: player.name,
                        setup: copyPlayerSetup(player),
                      })}
                      className={`flex h-7 w-7 items-center justify-center rounded border transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#f8f7f2] ${
                        copiedPlayerSetup?.playerId === player.id
                          ? 'border-[#f7e7ba] bg-[#d6b46b] text-black'
                          : 'border-[#d6b46b] bg-[#1c1c1f] text-white hover:bg-[#333]'
                      }`}
                    >
                      <CopyIcon />
                    </button>
                    <button
                      type="button"
                      disabled={!copiedPlayerSetup || copiedPlayerSetup.playerId === player.id}
                      aria-label={`Paste ${copiedPlayerSetup?.playerName ?? 'copied player'}'s setup`}
                      title={`Paste ${copiedPlayerSetup?.playerName ?? 'copied player'}'s setup`}
                      onClick={() => {
                        if (!copiedPlayerSetup || copiedPlayerSetup.playerId === player.id) return;
                        updatePlayer(player.id, (target) => pastePlayerSetup(target, copiedPlayerSetup.setup));
                      }}
                      className="paste-setup-button flex h-7 w-7 items-center justify-center rounded border border-[#d6b46b] bg-[#d6b46b] text-black transition hover:bg-[#f7e7ba] disabled:cursor-not-allowed disabled:border-yellow-900 disabled:bg-[#29251a] disabled:text-yellow-800"
                    >
                      <PasteIcon />
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${player.name}`}
                      title={`Delete ${player.name}`}
                      onClick={() => setPlayerPendingDeletion({ id: player.id, name: player.name })}
                      className="inline-flex items-center justify-center rounded-lg border-2 border-dashed border-red-600 bg-[#201010] p-2 font-bold text-red-200 shadow-2xl transition hover:border-red-400 hover:bg-[#331818] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-300"
                    >
                      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-7 w-7">
                        <path d="m6 6 12 12M18 6 6 18" />
                      </svg>
                    </button>
                  </div>
                )}

                <div className="mb-3 pt-7">
                  <label className="text-xs font-bold text-[#f8f7f2] uppercase block mb-1">Name</label>
                  {isEditMode ? (
                    <input
                      type="text"
                      value={player.name}
                      onChange={(e) => updatePlayerName(player.id, e.target.value)}
                      className="text-center font-bold text-[#f8f7f2] bg-[#111111] border border-[#d6b46b] rounded px-2 py-1 w-full transition-transform hover:scale-[1.02] focus:outline-none focus:border-[#f8f7f2]"
                    />
                  ) : (
                    <div className="text-center font-bold text-[#f8f7f2] px-2 py-1 w-full">
                      {player.name}
                    </div>
                  )}
                </div>

                <div className="mb-3 flex items-end justify-between gap-3">
                  <div className="min-w-0">
                    <label className="text-xs font-bold text-yellow-400 uppercase block mb-2">Role</label>
                    <div className="flex gap-2">
                    {ROLE_OPTIONS.map((role) => {
                      const isSelected = player.role === role;
                      let bgColor = 'bg-[#111111]';
                      let borderColor = 'border-[#d6b46b]';
                      let selectedBg = 'bg-[#d6b46b]';
                      let hoverBorder = 'hover:border-[#f8f7f2]';

                      if (role === 'Tank') {
                        bgColor = 'bg-[#221313]';
                        borderColor = 'border-[#b76b6b]';
                        selectedBg = 'bg-[#b76b6b]';
                        hoverBorder = 'hover:border-[#f8f7f2]';
                      } else if (role === 'Heal') {
                        bgColor = 'bg-[#0f211d]';
                        borderColor = 'border-[#95b3a3]';
                        selectedBg = 'bg-[#95b3a3]';
                        hoverBorder = 'hover:border-[#f8f7f2]';
                      } else if (role === 'DPS') {
                        bgColor = 'bg-[#16171c]';
                        borderColor = 'border-[#a8a8b2]';
                        selectedBg = 'bg-[#a8a8b2]';
                        hoverBorder = 'hover:border-[#f8f7f2]';
                      }

                      return (
                        <button
                          type="button"
                          disabled={!isEditMode}
                          key={role}
                          onClick={() => {
                            if (isEditMode) updatePlayerRole(player.id, role);
                          }}
                          className={`relative group transition disabled:cursor-default ${isEditMode && isSelected ? 'scale-110' : ''}`}
                        >
                          <div className={`w-14 h-14 rounded border-2 transition flex items-center justify-center ${isEditMode ? 'cursor-pointer hover:scale-110 transform' : 'cursor-default'} ${borderColor} ${
                            isSelected
                              ? selectedBg
                              : `${bgColor} ${isEditMode ? hoverBorder : ''}`
                          }`}>
                            <Image
                              src={ROLE_ICON_MAP[role] || ''}
                              alt={role}
                              width={40}
                              height={40}
                              className="w-10 h-10"
                            />
                          </div>
                          {isSelected && (
                            <div className="absolute -top-2 -right-2 bg-yellow-400 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold text-yellow-900">
                              ✓
                            </div>
                          )}
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none z-10">
                            {role}
                          </div>
                        </button>
                      );
                    })}
                    </div>
                  </div>
                  <div className="shrink-0">
                    <label className="text-xs font-bold text-yellow-400 uppercase block mb-2 text-right">Race</label>
                    <div className="relative">
                      <button
                        type="button"
                        disabled={!isEditMode}
                        aria-label={player.race === null ? 'Select race' : `Select race: ${ESO_RACES.find(({ id }) => id === player.race)?.name ?? 'Unknown'}`}
                        aria-expanded={activeDropdownKey === `${player.id}-race`}
                        title={ESO_RACES.find(({ id }) => id === player.race)?.name ?? 'Select race'}
                        onClick={() => toggleRaceDropdown(player.id)}
                        className={`h-14 w-14 rounded-lg border-2 border-yellow-600 bg-yellow-950 flex items-center justify-center overflow-hidden transition ${isEditMode ? 'hover:border-yellow-400 hover:scale-110 transform cursor-pointer' : 'cursor-default'}`}
                      >
                        {player.race !== null && RACE_ICON_MAP[player.race] ? (
                          <Image src={RACE_ICON_MAP[player.race]} alt={ESO_RACES.find(({ id }) => id === player.race)?.name ?? ''} width={52} height={52} className="h-12 w-12 object-contain" />
                        ) : isEditMode && player.race === null ? <span className="text-lg text-yellow-400 font-bold">+</span> : player.race !== null ? <span className="text-xs font-bold text-yellow-200">{ESO_RACES.find(({ id }) => id === player.race)?.name.slice(0, 2).toUpperCase()}</span> : null}
                      </button>
                      {isEditMode && activeDropdownKey === `${player.id}-race` && (
                        <div className="player-card__race-menu absolute top-full mt-2 flex bg-gray-800 border-2 border-yellow-500 rounded shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-200">
                          <div className="w-[220px] shrink-0">
                            <div className="max-h-80 overflow-y-auto">
                              <div className="px-3 py-2 text-xs font-semibold text-yellow-300 border-b border-yellow-600 bg-gray-900">Select race</div>
                              {ESO_RACES.map((race) => (
                                <button key={race.id} type="button" onClick={() => selectPlayerRace(player.id, race.id)} className={`w-full px-3 py-2 text-sm text-left flex items-center gap-2 transition ${player.race === race.id ? 'bg-yellow-700 text-yellow-50' : 'text-yellow-200 hover:bg-yellow-700'}`}>
                                  {RACE_ICON_MAP[race.id] && <Image src={RACE_ICON_MAP[race.id]} alt="" width={24} height={24} className="w-6 h-6 object-contain" />}
                                  <span>{race.name}</span>
                                  {player.race === race.id && <span aria-label="Selected" className="ml-auto font-bold text-yellow-200">✓</span>}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="player-card__skill-setup">
                  <div className="player-card__skill-lines">
                    <label className="player-card__section-label text-xs font-bold text-yellow-400 uppercase">Skill Lines</label>
                    <div className="player-card__skill-grid grid grid-cols-3 gap-2">
                      {[0, 1, 2].map((index) => {
                        const selectedSkillLine = currentPlayerClasses[index];
                        const key = `${player.id}-${index}`;
                        const isOpen = activeDropdownKey === key;
                        const isPrimarySkillLine = index === firstFilledIndex && !!selectedSkillLine;
                        const isDuplicate = !!selectedSkillLine && currentPlayerClasses.indexOf(selectedSkillLine) !== index;

                        return (
                          <div key={index} className="player-card__skill-option relative">
                            <button
                              disabled={!isEditMode}
                              onClick={() => toggleDropdown(player.id, index)}
                              className="player-card__skill-trigger relative group disabled:cursor-default"
                              type="button"
                            >
                              <div
                                className={`player-card__skill-tile w-16 h-16 bg-yellow-950 border-[3px] rounded transition flex items-center justify-center ${isEditMode ? `${selectedSkillLine ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'} hover:border-yellow-400 hover:scale-110 transform` : 'cursor-default'} ${
                                  isPrimarySkillLine ? 'border-white shadow-[0_0_0_3px_rgba(255,255,255,0.35)]' : 'border-yellow-600'
                                } ${isDuplicate ? 'opacity-60' : ''}`}
                                style={{
                                  backgroundImage: selectedSkillLine && skillLineIconMap[selectedSkillLine] ? `url(${skillLineIconMap[selectedSkillLine]})` : 'none',
                                  backgroundSize: 'cover',
                                  backgroundPosition: 'center',
                                }}
                              >
                                {!selectedSkillLine && isEditMode && (
                                  <span className="text-lg text-yellow-400 font-bold">+</span>
                                )}
                              </div>
                              {selectedSkillLine && (
                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none z-50">
                                  {selectedSkillLine}
                                </div>
                              )}
                            </button>

                            {isEditMode && isOpen && (
                              <div className="player-card__skill-menu absolute top-full mt-2 left-0 bg-gray-800 border-2 border-yellow-500 rounded shadow-2xl z-50 min-w-max max-h-80 overflow-y-auto animate-in fade-in zoom-in-95 duration-200"
                                style={{
                                  animation: 'slideDown 0.2s ease-out'
                                }}
                              >
                                {Object.entries(ESO_CLASS_SKILL_LINES).map(([className, skillLines]) => (
                                  <div key={className}>
                                    <div className="px-3 py-2 text-xs font-semibold text-yellow-300 border-b border-yellow-600 bg-gray-900 sticky top-0">
                                      {className}
                                    </div>
                                    {skillLines.map(skillLine => {
                                      const disabled = currentPlayerClasses.includes(skillLine) && currentPlayerClasses.indexOf(skillLine) !== index;

                                      return (
                                        <button
                                          key={skillLine}
                                          type="button"
                                          disabled={disabled}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (!disabled) {
                                              selectClass(player.id, index, skillLine);
                                            }
                                          }}
                                          className={`w-full px-3 py-2 text-sm text-left flex items-center gap-2 transition ${disabled ? 'text-gray-500 cursor-not-allowed opacity-60' : 'text-yellow-200 hover:bg-yellow-700'}`}
                                        >
                                          {skillLineIconMap[skillLine] && (
                                            <Image
                                              src={skillLineIconMap[skillLine]}
                                              alt={skillLine}
                                              width={24}
                                              height={24}
                                              className="w-6 h-6"
                                            />
                                          )}
                                          <span>{skillLine}</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                  </div>
                  <div className="player-card__class-option">
                    <label className="player-card__section-label text-xs font-bold text-yellow-400 uppercase">Class</label>
                    <div className="relative">
                      <button
                        type="button"
                        disabled={!isEditMode}
                        aria-label={primaryClass ? `Select class: ${primaryClass}` : 'Select class'}
                        aria-expanded={activeDropdownKey === `${player.id}-class`}
                        title={primaryClass ?? 'Select class'}
                        onClick={() => toggleClassDropdown(player.id)}
                        className={`player-card__class-tile w-16 h-16 rounded-lg border-2 border-yellow-600 bg-yellow-950 flex items-center justify-center overflow-hidden transition ${isEditMode ? 'hover:border-yellow-400 hover:scale-110 transform cursor-pointer' : 'cursor-default'}`}
                      >
                        {primaryClass && classIconMap[primaryClass] ? (
                          <Image
                            src={classIconMap[primaryClass]}
                            alt={primaryClass}
                            width={56}
                            height={56}
                            className="w-14 h-14 object-contain"
                          />
                        ) : isEditMode ? (
                          <span className="text-lg text-yellow-400 font-bold">+</span>
                        ) : null}
                      </button>

                      {isEditMode && activeDropdownKey === `${player.id}-class` && (
                        <div className="player-card__class-menu absolute top-full mt-2 left-0 flex bg-gray-800 border-2 border-yellow-500 rounded shadow-2xl z-50">
                            <div className="w-[220px] shrink-0 border-r border-yellow-600">
                              <div className="px-3 py-2 text-xs font-semibold text-yellow-300 border-b border-yellow-600 bg-gray-900">
                                Select class
                              </div>
                              <div className="max-h-80 overflow-y-auto">
                                {Object.values(ClassName).map((className) => (
                                  <button
                                    key={className}
                                    type="button"
                                    disabled={!isEditMode}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (isEditMode) selectPlayerClass(player.id, className);
                                    }}
                                    className={`w-full px-3 py-2 text-sm text-left flex items-center gap-2 transition ${primaryClass === className && sameClassMasteries ? 'bg-yellow-700 text-yellow-50' : 'text-yellow-200 hover:bg-yellow-700'}`}
                                  >
                                    <Image
                                      src={classIconMap[className]}
                                      alt=""
                                      width={24}
                                      height={24}
                                      className="w-6 h-6 object-contain"
                                    />
                                    <span>{className}</span>
                                  </button>
                                ))}
                              </div>
                            </div>

                            {primaryClass && sameClassMasteries && (
                              <div className="w-[230px] shrink-0">
                                <div className="px-3 py-2 text-xs font-semibold text-yellow-300 border-b border-yellow-600 bg-gray-900">
                                  Class Masteries
                                </div>
                                <div className="max-h-80 overflow-y-auto">
                                  {classMasteryOptionsByClass[primaryClass].map((masteryName) => {
                                  const selected =
                                    player.classMasteries.firstClassMastery === masteryName ||
                                    player.classMasteries.secondClassMastery === masteryName;
                                  const disabled =
                                    !selected &&
                                    !!player.classMasteries.firstClassMastery &&
                                    !!player.classMasteries.secondClassMastery;

                                  return (
                                    <button
                                      key={`${primaryClass}-${masteryName}`}
                                      type="button"
                                      disabled={disabled || !isEditMode}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        updateClassMastery(player.id, primaryClass, masteryName);
                                      }}
                                      className={`w-full px-3 py-2 text-left text-sm transition ${selected ? 'relative z-10 border-2 border-yellow-300 bg-yellow-700 font-semibold text-yellow-50 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.45)]' : disabled ? 'border-2 border-transparent text-gray-500 cursor-not-allowed opacity-60' : 'border-2 border-transparent text-yellow-200 hover:bg-yellow-700'}`}
                                    >
                                      <span className="flex items-center justify-between gap-2">
                                        <span>{masteryName}</span>
                                        {selected && <span aria-label="Selected" className="font-bold text-yellow-200">✓</span>}
                                      </span>
                                    </button>
                                  );
                                  })}
                                </div>
                              </div>
                            )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                  <div className="mt-3">
                    <label className="text-[10px] font-bold uppercase tracking-wide text-yellow-300 block mb-1">
                      Class Masteries
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[player.classMasteries.firstClassMastery, player.classMasteries.secondClassMastery]
                        .map((mastery, index) => (
                          <div key={`${player.id}-mastery-${index}`} className="min-h-7 min-w-0">
                            {mastery && (
                              <span className="inline-block max-w-full rounded border border-yellow-500 bg-black/30 px-2 py-1 text-sm text-yellow-100">
                                {mastery}
                              </span>
                            )}
                          </div>
                        ))}
                    </div>

                  <div className="mt-3">
                    <label className="text-[10px] font-bold uppercase tracking-wide text-yellow-300 block mb-1">Mundus Stone</label>
                    {isEditMode ? (
                      <div className="relative min-h-8">
                        <button
                          type="button"
                          aria-label={player.mundus ? `Select Mundus stone: ${player.mundus}` : 'Select Mundus stone'}
                          aria-expanded={activeDropdownKey === `${player.id}-mundus`}
                          onClick={() => toggleMundusDropdown(player.id)}
                          className="flex w-full items-center gap-2 rounded border border-yellow-600 bg-yellow-950 px-2 py-1 text-left text-sm text-yellow-100 transition hover:border-yellow-400 cursor-pointer"
                        >
                          {player.mundus && MUNDUS_ICON_MAP[player.mundus] && (
                            <Image
                              src={MUNDUS_ICON_MAP[player.mundus]}
                              alt=""
                              width={24}
                              height={24}
                              className="h-6 w-6 shrink-0 object-contain"
                            />
                          )}
                          <span className="min-w-0 flex-1 truncate">{player.mundus || 'Select'}</span>
                        </button>
                        {activeDropdownKey === `${player.id}-mundus` && (
                          <div
                            className="player-card__mundus-menu absolute top-full mt-2 left-0 bg-gray-800 border-2 border-yellow-500 rounded shadow-2xl z-50 min-w-max max-h-80 overflow-y-auto animate-in fade-in zoom-in-95 duration-200"
                            style={{ animation: 'slideDown 0.2s ease-out' }}
                          >
                            {MUNDUS_STONE_OPTIONS.map((stone) => (
                              <button
                                key={stone}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  selectPlayerMundus(player.id, stone);
                                }}
                                className={`w-full px-3 py-2 text-sm text-left flex items-center gap-2 transition ${player.mundus === stone ? 'bg-yellow-700 text-yellow-50 hover:bg-yellow-700' : 'text-yellow-200 hover:bg-yellow-700'}`}
                              >
                                {MUNDUS_ICON_MAP[stone] && (
                                  <Image
                                    src={MUNDUS_ICON_MAP[stone]}
                                    alt=""
                                    width={24}
                                    height={24}
                                    className="w-6 h-6"
                                  />
                                )}
                                <span>{stone}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex min-h-8 items-center gap-2 text-sm text-yellow-100">
                        {player.mundus && (
                          <>
                            {MUNDUS_ICON_MAP[player.mundus] && (
                              <Image
                                src={MUNDUS_ICON_MAP[player.mundus]}
                                alt=""
                                width={24}
                                height={24}
                                className="h-6 w-6 shrink-0 object-contain"
                              />
                            )}
                            <span>{player.mundus}</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {isEditMode && (
            <div className="flex min-h-[24rem] items-center justify-center">
              <button
                type="button"
                onClick={addPlayer}
                aria-label="Add player"
                className="flex h-32 w-1/2 flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-green-600 bg-[#102016] p-3 text-green-200 shadow-2xl transition hover:border-green-400 hover:bg-[#183322] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-300"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-current">
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-6 w-6">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </span>
                <span className="text-sm font-bold">Add player</span>
              </button>
            </div>
          )}
          </div>
        </div>
      </div>
      {isEditMode && playerPendingDeletion && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" onClick={(event) => {
          if (event.target === event.currentTarget) setPlayerPendingDeletion(null);
        }}>
          <section role="alertdialog" aria-modal="true" aria-labelledby="delete-player-title" aria-describedby="delete-player-description" className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111720] p-6 shadow-2xl">
            <h2 id="delete-player-title" className="text-lg font-bold text-white">Delete player?</h2>
            <p id="delete-player-description" className="mt-3 text-sm leading-6 text-slate-300">Are you sure you want to delete {playerPendingDeletion.name}? This action cannot be undone.</p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setPlayerPendingDeletion(null)} className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/5">Cancel</button>
              <button type="button" onClick={() => { removePlayer(playerPendingDeletion.id); setPlayerPendingDeletion(null); }} className="rounded-xl bg-[#d3b475] px-4 py-2.5 text-sm font-semibold text-[#10141b] transition hover:bg-[#f0d69c]">Delete player</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
