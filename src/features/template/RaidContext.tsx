"use client";

import React, { createContext, useState, useContext, ReactNode, useCallback, useMemo, useEffect, useRef } from 'react';
import { getCachedCatalogItem } from '@/lib/esoSetCatalog';
import { decodeScribingSkillId, isSkillAbilityId } from '@/lib/esoSkills';
import {
  RaidTemplateDocument,
  RaidPlayer,
  createEmptyTemplateDocument,
  exportTemplateDocument,
  normalizeTemplateDocument,
  parseTemplateDocument,
  createEmptyPlayer,
  createEmptyFightPlayerStuff,
  MundusStone,
  type RoleType,
  type SkillClasses,
  type GearSlotPiece,
  type ChampionPointName,
  type ClassMasteries,
  getChampionPointDisciplineFromSlot,
  getChampionPointDisciplineFromName,
  MAIN_BAR_SLOTS,
  BACK_BAR_SLOTS,
  updateSetSlot,
  type SetSlot,
  type FightPlayerSetup,
  copyFightPlayerSetup,
  pasteFightPlayerSetup,
} from '@/features/template/raidTemplate';
import type { ImportedTemplateFile } from '@/features/template/templateFileIO';

interface RaidContextType {
  template: RaidTemplateDocument;
  players: RaidPlayer[];
  selectedRaid: string | null;
  isEditMode: boolean;
  isHomeNavigationConfirmationOpen: boolean;
  importedTemplateFile: ImportedTemplateFile | null;
  hasUnsavedChanges: boolean;
  toggleEditMode: () => void;
  requestHomeNavigation: () => void;
  closeHomeNavigationConfirmation: () => void;
  setSelectedRaid: (raidName: string | null) => void;
  setGroupName: (groupName: string) => void;
  setTemplate: (nextTemplate: RaidTemplateDocument) => void;
  loadTemplate: (json: string | object, source?: ImportedTemplateFile | null) => RaidTemplateDocument;
  markTemplateSaved: (source: ImportedTemplateFile, savedTemplate: RaidTemplateDocument) => void;
  addPlayer: () => void;
  removePlayer: (id: number) => void;
  addFight: (name?: string) => string;
  duplicateFight: (fightName: string) => string | null;
  renameFight: (fightName: string, newName: string) => string | null;
  removeFight: (fightName: string) => string | null;
  swapFights: (firstFightName: string, secondFightName: string) => void;
  updatePlayer: (id: number, updater: (player: RaidPlayer) => RaidPlayer) => void;
  updatePlayerName: (id: number, newName: string) => void;
  updatePlayerRole: (id: number, newRole: RoleType) => void;
  updatePlayerClasses: (id: number, newClasses: SkillClasses) => void;
  updatePlayerClassMasteries: (id: number, newMasteries: ClassMasteries) => void;
  updatePlayerMundus: (id: number, newMundus: string) => void;
  updateFightPlayerStuff: (fightName: string, playerId: number, field: string, value: string | number | GearSlotPiece | ChampionPointName) => void;
  pasteFightPlayerSetup: (fightName: string, playerId: number, setup: FightPlayerSetup) => void;
  pasteFightSetup: (fightName: string, setups: Array<{ playerId: number; setup: FightPlayerSetup }>) => void;
}

const RaidContext = createContext<RaidContextType | undefined>(undefined);
const TEMPLATE_STORAGE_KEY = 'ttemplate:current-template';

export function RaidProvider({ children }: { children: ReactNode }) {
  const [template, setTemplateState] = useState<RaidTemplateDocument>(() => normalizeTemplateDocument(createEmptyTemplateDocument()));
  const templateRef = useRef(template);
  const hasInitializedTemplateRef = useRef(false);
  const [isTemplateStorageReady, setIsTemplateStorageReady] = useState(false);
  const [importedTemplateFile, setImportedTemplateFile] = useState<ImportedTemplateFile | null>(null);
  const [savedTemplateSnapshot, setSavedTemplateSnapshot] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isHomeNavigationConfirmationOpen, setIsHomeNavigationConfirmationOpen] = useState(false);
  const [templateStorageError, setTemplateStorageError] = useState<string | null>(null);

  useEffect(() => {
    if (hasInitializedTemplateRef.current) return;
    hasInitializedTemplateRef.current = true;

    let restoredTemplate: RaidTemplateDocument | null = null;
    let storageReady = true;
    let storageError: string | null = null;

    try {
      const savedTemplate = window.localStorage.getItem(TEMPLATE_STORAGE_KEY);
      if (savedTemplate) restoredTemplate = parseTemplateDocument(savedTemplate);
    } catch (error) {
      storageReady = false;
      storageError = error instanceof Error ? error.message : String(error);
    }

    queueMicrotask(() => {
      if (restoredTemplate) setTemplateState(restoredTemplate);
      if (storageError) setTemplateStorageError(storageError);
      setIsTemplateStorageReady(storageReady);
    });
  }, []);

  useEffect(() => {
    templateRef.current = template;
  }, [template]);

  useEffect(() => {
    if (!isTemplateStorageReady) return;

    const persistTemplate = () => {
      try {
        window.localStorage.setItem(TEMPLATE_STORAGE_KEY, exportTemplateDocument(templateRef.current));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        queueMicrotask(() => setTemplateStorageError(message));
      }
    };

    persistTemplate();
    window.addEventListener('pagehide', persistTemplate);
    return () => window.removeEventListener('pagehide', persistTemplate);
  }, [isTemplateStorageReady, template]);

  const requestHomeNavigation = useCallback(() => {
    setIsHomeNavigationConfirmationOpen(true);
  }, []);

  const closeHomeNavigationConfirmation = useCallback(() => {
    setIsHomeNavigationConfirmationOpen(false);
  }, []);

  const toggleEditMode = useCallback(() => {
    setIsEditMode((current) => !current);
  }, []);

  const setTemplate = useCallback((nextTemplate: RaidTemplateDocument) => {
    setTemplateState(normalizeTemplateDocument(nextTemplate));
  }, []);

  const loadTemplate = useCallback((json: string | object, source: ImportedTemplateFile | null = null) => {
    const parsed = typeof json === 'string' ? JSON.parse(json) : json;
    const normalized = normalizeTemplateDocument(parsed as Partial<RaidTemplateDocument>);
    setTemplateState(normalized);
    setImportedTemplateFile(source);
    setSavedTemplateSnapshot(source ? exportTemplateDocument(normalized) : null);
    return normalized;
  }, []);

  const markTemplateSaved = useCallback((source: ImportedTemplateFile, savedTemplate: RaidTemplateDocument) => {
    setImportedTemplateFile(source);
    setSavedTemplateSnapshot(exportTemplateDocument(savedTemplate));
  }, []);

  const hasUnsavedChanges = useMemo(() => savedTemplateSnapshot !== null
    && exportTemplateDocument(template) !== savedTemplateSnapshot, [savedTemplateSnapshot, template]);

  const players = useMemo(() => template.raid.players, [template.raid.players]);
  const selectedRaid = template.raid.selectedRaid ?? null;

  const addFight = useCallback((name?: string) => {
    let createdName = name?.trim() || 'New Encounter';

    setTemplateState((prev) => {
      const baseName = createdName || 'New Encounter';
      let candidate = baseName;
      let index = 2;
      while (prev.fights.some((fight) => fight.name === candidate)) {
        candidate = `${baseName} ${index}`;
        index += 1;
      }

      const newFight = {
        name: candidate,
        playersStuff: prev.raid.players.map((player) => createEmptyFightPlayerStuff(player)),
      };

      createdName = candidate;
      return {
        ...prev,
        fights: [...prev.fights, newFight],
      };
    });

    return createdName;
  }, []);

  const duplicateFight = useCallback((fightName: string) => {
    const source = template.fights.find((fight) => fight.name === fightName);
    if (!source) return null;

    const baseName = `${source.name} Copy`;
    let duplicatedName = baseName;
    let index = 2;
    while (template.fights.some((fight) => fight.name === duplicatedName)) {
      duplicatedName = `${baseName} ${index}`;
      index += 1;
    }

    setTemplateState((prev) => {
      const sourceIndex = prev.fights.findIndex((fight) => fight.name === fightName);
      if (sourceIndex < 0) return prev;
      const currentSource = prev.fights[sourceIndex];
      const duplicatedFight = {
        name: duplicatedName,
        playersStuff: currentSource.playersStuff.map((playerStuff) => ({
          ...playerStuff,
          ...copyFightPlayerSetup(playerStuff),
        })),
      };

      return {
        ...prev,
        fights: [
          ...prev.fights.slice(0, sourceIndex + 1),
          duplicatedFight,
          ...prev.fights.slice(sourceIndex + 1),
        ],
      };
    });

    return duplicatedName;
  }, [template.fights]);

  const renameFight = useCallback((fightName: string, newName: string) => {
    const trimmedName = newName.trim();
    if (!trimmedName || !template.fights.some((fight) => fight.name === fightName)) return null;
    if (template.fights.some((fight) => fight.name === trimmedName && fight.name !== fightName)) return null;

    setTemplateState((prev) => ({
      ...prev,
      fights: prev.fights.map((fight) => (
        fight.name === fightName ? { ...fight, name: trimmedName } : fight
      )),
    }));

    return trimmedName;
  }, [template.fights]);

  const removeFight = useCallback((fightName: string): string | null => {
    let nextName: string | null = null;

    setTemplateState((prev) => {
      if (prev.fights.length <= 1) return prev;

      const nextFights = prev.fights.filter((fight) => fight.name !== fightName);
      nextName = nextFights[0]?.name ?? null;
      return { ...prev, fights: nextFights };
    });

    return nextName;
  }, []);

  const swapFights = useCallback((firstFightName: string, secondFightName: string) => {
    if (firstFightName === secondFightName) return;

    setTemplateState((prev) => {
      const firstIndex = prev.fights.findIndex((fight) => fight.name === firstFightName);
      const secondIndex = prev.fights.findIndex((fight) => fight.name === secondFightName);
      if (firstIndex < 0 || secondIndex < 0) return prev;

      const nextFights = [...prev.fights];
      [nextFights[firstIndex], nextFights[secondIndex]] = [nextFights[secondIndex], nextFights[firstIndex]];
      return { ...prev, fights: nextFights };
    });
  }, []);

  const addPlayer = useCallback(() => {
    setTemplateState((prev) => {
      const nextId = prev.raid.players.reduce((max, player) => Math.max(max, player.id), 0) + 1;
      const createdPlayer = createEmptyPlayer(nextId, `Player ${nextId}`);

      return {
        ...prev,
        raid: {
          ...prev.raid,
          players: [...prev.raid.players, createdPlayer],
        },
        fights: prev.fights.map((fight) => ({
          ...fight,
          playersStuff: [...fight.playersStuff, createEmptyFightPlayerStuff(createdPlayer)],
        })),
      };
    });
  }, []);

  const removePlayer = useCallback((id: number) => {
    setTemplateState((prev) => {
      const nextPlayers = prev.raid.players.filter((player) => player.id !== id);
      if (nextPlayers.length === prev.raid.players.length) {
        return prev;
      }

      return {
        ...prev,
        raid: {
          ...prev.raid,
          players: nextPlayers,
        },
        fights: prev.fights.map((fight) => ({
          ...fight,
          playersStuff: fight.playersStuff.filter((entry) => entry.id !== id),
        })),
      };
    });
  }, []);

  const setSelectedRaid = useCallback((raidName: string | null) => {
    setTemplateState((prev) => ({
      ...prev,
      raid: {
        ...prev.raid,
        selectedRaid: raidName,
      },
    }));
  }, []);

  const setGroupName = useCallback((groupName: string) => {
    setTemplateState((prev) => ({
      ...prev,
      raid: {
        ...prev.raid,
        groupName,
      },
    }));
  }, []);

  const updatePlayer = useCallback((id: number, updater: (player: RaidPlayer) => RaidPlayer) => {
    let updatedPlayer: RaidPlayer | undefined;

    setTemplateState((prev) => {
      const nextPlayers = prev.raid.players.map((player) => {
        if (player.id !== id) return player;
        updatedPlayer = updater(player);
        return updatedPlayer;
      });

      const nextFights = prev.fights.map((fight) => ({
        ...fight,
        playersStuff: fight.playersStuff.map((item) => {
          if (item.id !== id) return item;
          if (!updatedPlayer) return item;
          return {
            ...item,
            name: updatedPlayer.name,
            role: updatedPlayer.role,
          };
        }),
      }));

      return {
        ...prev,
        raid: { ...prev.raid, players: nextPlayers },
        fights: nextFights,
      };
    });
  }, []);

  const updatePlayerName = useCallback((id: number, newName: string) => {
    updatePlayer(id, (player) => ({ ...player, name: newName }));
  }, [updatePlayer]);

  const updatePlayerRole = useCallback((id: number, newRole: RoleType) => {
    updatePlayer(id, (player) => ({ ...player, role: newRole }));
  }, [updatePlayer]);

  const updatePlayerClasses = useCallback((id: number, newClasses: SkillClasses) => {
    setTemplateState((prev) => ({
      ...prev,
      raid: {
        ...prev.raid,
        players: prev.raid.players.map((player) => (player.id === id ? { ...player, skillClasses: newClasses } : player)),
      },
    }));
  }, []);

  const updatePlayerClassMasteries = useCallback((id: number, newMasteries: ClassMasteries) => {
    setTemplateState((prev) => ({
      ...prev,
      raid: {
        ...prev.raid,
        players: prev.raid.players.map((player) => (player.id === id ? { ...player, classMasteries: newMasteries } : player)),
      },
    }));
  }, []);

  const updatePlayerMundus = useCallback((id: number, newMundus: string) => {
    setTemplateState((prev) => ({
      ...prev,
      raid: {
        ...prev.raid,
        players: prev.raid.players.map((player) => (player.id === id ? { ...player, mundus: newMundus as MundusStone } : player)),
      },
    }));
  }, []);

  const updateFightPlayerStuff = useCallback((fightName: string, playerId: number, field: string, value: string | number | GearSlotPiece | ChampionPointName) => {
    setTemplateState((prev) => ({
      ...prev,
      fights: prev.fights.map((fight) => {
        if (fight.name !== fightName) return fight;
        return {
          ...fight,
          playersStuff: fight.playersStuff.map((item) => {
            if (item.id !== playerId) return item;
            if (field === 'food') return { ...item, food: typeof value === 'string' ? value : '' };
            if (field === 'potion') return { ...item, potion: typeof value === 'string' ? value : '' };
            if (field === 'description') return { ...item, description: typeof value === 'string' ? value : '' };
            if (field in item.sets) {
              if (typeof value === 'string' || typeof value === 'number') return item;
              return {
                ...item,
                sets: updateSetSlot(item.sets, field as SetSlot, value, (itemId) => getCachedCatalogItem(itemId) ?? undefined),
              };
            }
            if (field in item.competencies) {
              if (value !== '' && !isSkillAbilityId(value)) return item;
              const competencies = { ...item.competencies, [field]: value };
              const updatedScribing = decodeScribingSkillId(value);

              if (updatedScribing) {
                const skillSlots = [
                  ...MAIN_BAR_SLOTS,
                  'MainBarUlt',
                  ...BACK_BAR_SLOTS,
                  'BackBarUlt',
                ] as const;

                skillSlots.forEach((slot) => {
                  if (
                    slot !== field
                    && decodeScribingSkillId(item.competencies[slot])?.grimoireAbilityId
                      === updatedScribing.grimoireAbilityId
                  ) {
                    competencies[slot] = value;
                  }
                });
              }

              return { ...item, competencies };
            }
            if (field in item.championPoints) {
              const slotDiscipline = getChampionPointDisciplineFromSlot(field);
              const selectedValue = typeof value === 'string' ? value : '';
              const selectedDiscipline = getChampionPointDisciplineFromName(selectedValue as ChampionPointName | '');

              if (slotDiscipline && selectedDiscipline && selectedDiscipline !== slotDiscipline) {
                return item;
              }

              if (selectedValue && !selectedDiscipline) {
                return item;
              }

              const category = field.startsWith('Blue') ? 'Blue' : field.startsWith('Red') ? 'Red' : field.startsWith('Green') ? 'Green' : '';
              if (category) {
                const existingCategoryValues = Object.entries(item.championPoints)
                  .filter(([slot]) => slot.startsWith(category))
                  .filter(([slot]) => slot !== field)
                  .map(([, cp]) => typeof cp === 'string' ? cp : '')
                  .filter(Boolean);

                if (existingCategoryValues.some((cp) => cp === selectedValue)) {
                  return item;
                }
              }

              return { ...item, championPoints: { ...item.championPoints, [field]: selectedValue } };
            }
            return item;
          }),
        };
      }),
    }));
  }, []);

  const pasteFightPlayerSetupForPlayer = useCallback((fightName: string, playerId: number, setup: FightPlayerSetup) => {
    setTemplateState((prev) => ({
      ...prev,
      fights: prev.fights.map((fight) => {
        if (fight.name !== fightName) return fight;

        return {
          ...fight,
          playersStuff: fight.playersStuff.map((item) => (
            item.id === playerId ? pasteFightPlayerSetup(item, setup) : item
          )),
        };
      }),
    }));
  }, []);

  const pasteFightSetup = useCallback((fightName: string, setups: Array<{ playerId: number; setup: FightPlayerSetup }>) => {
    const setupByPlayerId = new Map(setups.map(({ playerId, setup }) => [playerId, setup]));
    setTemplateState((prev) => ({
      ...prev,
      fights: prev.fights.map((fight) => fight.name !== fightName ? fight : ({
        ...fight,
        playersStuff: fight.playersStuff.map((item) => {
          const setup = setupByPlayerId.get(item.id);
          return setup ? pasteFightPlayerSetup(item, setup) : item;
        }),
      })),
    }));
  }, []);

  return (
    <RaidContext.Provider value={{
      template,
      players,
      selectedRaid,
      isEditMode,
      isHomeNavigationConfirmationOpen,
      importedTemplateFile,
      hasUnsavedChanges,
      toggleEditMode,
      requestHomeNavigation,
      closeHomeNavigationConfirmation,
      setSelectedRaid,
      setGroupName,
      setTemplate,
      loadTemplate,
      markTemplateSaved,
      addPlayer,
      removePlayer,
      addFight,
      duplicateFight,
      renameFight,
      removeFight,
      swapFights,
      updatePlayer,
      updatePlayerName,
      updatePlayerRole,
      updatePlayerClasses,
      updatePlayerClassMasteries,
      updatePlayerMundus,
      updateFightPlayerStuff,
      pasteFightPlayerSetup: pasteFightPlayerSetupForPlayer,
      pasteFightSetup,
    }}>
      <div
        className="contents"
        onDragStartCapture={(event) => {
          if (isEditMode) return;
          event.preventDefault();
          event.stopPropagation();
        }}
        onDragOverCapture={(event) => {
          if (isEditMode) return;
          event.preventDefault();
          event.stopPropagation();
        }}
        onDropCapture={(event) => {
          if (isEditMode) return;
          event.preventDefault();
          event.stopPropagation();
        }}
      >
        {templateStorageError && (
          <p role="alert" className="border-b border-red-400/30 bg-red-950/70 px-4 py-3 text-center text-sm text-red-200">
            Unable to restore or save the template in this browser: {templateStorageError}
          </p>
        )}
        {children}
      </div>
    </RaidContext.Provider>
  );
}

export function useRaid() {
  const context = useContext(RaidContext);
  if (context === undefined) {
    throw new Error('useRaid must be used within RaidProvider');
  }
  return context;
}
