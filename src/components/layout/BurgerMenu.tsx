"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { useRaid } from '@/features/template/RaidContext';
import { isGoogleOAuthPopupClosed, useGoogleDrive } from '@/features/template/GoogleDriveContext';
import {
  createTemplateFilename,
  ensureJsonFilename,
  saveTemplateAsLocalFile,
  saveTemplateToLocalFile,
  triggerJsonImport,
  type ImportedTemplateFile,
} from '@/features/template/templateFileIO';
import DriveTemplatePicker from '@/features/template/DriveTemplatePicker';

interface BurgerMenuProps {
  onImport?: () => void;
}

function TemplateSourceIcon({ mode }: { mode: 'drive' | 'local' }) {
  if (mode === 'drive') {
    return (
      <svg aria-hidden="true" className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
        <path fill="#00832D" d="M8.2 2.5h7.6L7.6 16.7 3.8 10.1z" />
        <path fill="#0066DA" d="m15.8 2.5 8.1 14.2-3.8 6.7L12 9.2z" />
        <path fill="#FFBA00" d="M3.8 10.1 0 16.7l3.8 6.7h16.3l3.8-6.7H7.6z" />
      </svg>
    );
  }
  return (
    <svg aria-hidden="true" className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2.75h8l5 5v13.5H6z" />
      <path d="M14 2.75v5h5M9 13h7M9 16.5h7" />
    </svg>
  );
}

function SaveIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 3.5h13l3.5 3.5v13.5H4z" />
      <path d="M8 3.5v6h8v-6M8 20.5v-7h8v7" />
      <path d="M17.5 3.5v3" />
    </svg>
  );
}

export default function BurgerMenu({ onImport }: BurgerMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [driveMessage, setDriveMessage] = useState<string | null>(null);
  const [isNewFileBusy, setIsNewFileBusy] = useState(false);
  const [isLocalSaveBusy, setIsLocalSaveBusy] = useState(false);
  const [isNewFileDialogOpen, setIsNewFileDialogOpen] = useState(false);
  const [selectedDriveFolder, setSelectedDriveFolder] = useState<{ id: string; name: string } | null>(null);
  const [newFileNameDraft, setNewFileNameDraft] = useState('');
  const [newFileNameError, setNewFileNameError] = useState<string | null>(null);
  const [isImportedSaveBusy, setIsImportedSaveBusy] = useState(false);
  const [isGroupNameDialogOpen, setIsGroupNameDialogOpen] = useState(false);
  const [isRaidNameDialogOpen, setIsRaidNameDialogOpen] = useState(false);
  const [isSaveDestinationDialogOpen, setIsSaveDestinationDialogOpen] = useState(false);
  const [groupNameDraft, setGroupNameDraft] = useState('');
  const [raidNameDraft, setRaidNameDraft] = useState('');
  const pathname = usePathname();
  const { template, importedTemplateFile, loadTemplate, markTemplateSaved, requestHomeNavigation, setGroupName, setSelectedRaid } = useRaid();
  const { isConnected, disconnect, pickDriveFolder, saveTemplate, updateTemplateFile } = useGoogleDrive();

  useEffect(() => {
    if (!isOpen && !isNewFileDialogOpen && !isGroupNameDialogOpen && !isRaidNameDialogOpen && !isSaveDestinationDialogOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (isNewFileBusy) return;
      event.preventDefault();
      setIsNewFileDialogOpen(false);
      setIsGroupNameDialogOpen(false);
      setIsRaidNameDialogOpen(false);
      setIsSaveDestinationDialogOpen(false);
      setIsOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [isOpen, isNewFileDialogOpen, isGroupNameDialogOpen, isRaidNameDialogOpen, isSaveDestinationDialogOpen, isNewFileBusy]);

  const openNewDriveFileDialog = () => {
    setDriveMessage(null);
    setNewFileNameDraft(createTemplateFilename(template));
    setNewFileNameError(null);
    setSelectedDriveFolder(null);
    setIsOpen(false);
    setIsNewFileDialogOpen(true);
  };

  const handleImport = () => {
    setIsOpen(false);
    if (onImport) {
      onImport();
      return;
    }
    triggerJsonImport((text, source) => {
      loadTemplate(text, source);
    });
  };

  const handleSaveNewFile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNewFileNameError(null);
    let filename: string;
    try {
      filename = ensureJsonFilename(newFileNameDraft);
    } catch (error) {
      setNewFileNameError(error instanceof Error ? error.message : 'Enter a valid filename.');
      return;
    }

    setNewFileNameDraft(filename);
    setIsNewFileBusy(true);
    try {
      const savedFile = await saveTemplate(template, filename, selectedDriveFolder?.id);
      markTemplateSaved({ mode: 'drive', ...savedFile }, template);
      setDriveMessage(`Saved ${savedFile.name} to Google Drive.`);
      setIsNewFileDialogOpen(false);
    } catch (error) {
      setNewFileNameError(error instanceof Error ? error.message : 'The template could not be saved.');
    } finally {
      setIsNewFileBusy(false);
    }
  };

  const handleChooseDriveFolder = async () => {
    setNewFileNameError(null);
    setIsNewFileBusy(true);
    setIsNewFileDialogOpen(false);
    try {
      const folder = await pickDriveFolder();
      if (folder) setSelectedDriveFolder(folder);
    } catch (error) {
      setNewFileNameError(error instanceof Error ? error.message : 'Google Drive folders could not be loaded.');
    } finally {
      setIsNewFileBusy(false);
      setIsNewFileDialogOpen(true);
    }
  };

  const handleSaveNewLocalFile = async () => {
    setIsOpen(false);
    setDriveMessage(null);
    setIsLocalSaveBusy(true);
    try {
      const savedFile = await saveTemplateAsLocalFile(template);
      markTemplateSaved(savedFile, template);
      setDriveMessage(`Saved ${savedFile.name} locally.`);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        setDriveMessage(error instanceof Error ? error.message : 'The template could not be saved locally.');
      }
    } finally {
      setIsLocalSaveBusy(false);
    }
  };

  const handleSaveImportedFile = async () => {
    if (!importedTemplateFile) return;
    setIsImportedSaveBusy(true);
    setDriveMessage(null);
    try {
      let filename: string;
      let savedSource: ImportedTemplateFile;
      if (importedTemplateFile.mode === 'drive') {
        const savedFile = await updateTemplateFile(importedTemplateFile.id, template);
        filename = savedFile.name;
        savedSource = { mode: 'drive', ...savedFile };
      } else if (importedTemplateFile.handle) {
        filename = await saveTemplateToLocalFile(template, importedTemplateFile.handle);
        savedSource = { ...importedTemplateFile, name: filename };
      } else {
        throw new Error('Direct saving is not supported for this local file in the current browser. Export the template to a local file instead.');
      }
      markTemplateSaved(savedSource, template);
      setDriveMessage(`Saved changes to ${filename}.`);
    } catch (error) {
      if (!isGoogleOAuthPopupClosed(error)) {
        setDriveMessage(error instanceof Error ? error.message : 'The imported template could not be saved.');
      }
    } finally {
      setIsImportedSaveBusy(false);
    }
  };

  const handleSaveAction = async () => {
    if (isNewFileBusy || isLocalSaveBusy || isImportedSaveBusy) return;
    if (importedTemplateFile?.mode === 'drive') {
      await handleSaveImportedFile();
      return;
    }
    if (importedTemplateFile?.mode === 'local') {
      if (importedTemplateFile.handle) await handleSaveImportedFile();
      else await handleSaveNewLocalFile();
      return;
    }
    setIsOpen(false);
    setIsSaveDestinationDialogOpen(true);
  };

  const handleSaveActionRef = useRef(handleSaveAction);
  handleSaveActionRef.current = handleSaveAction;

  useEffect(() => {
    const onSaveShortcut = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 's') return;
      event.preventDefault();
      if (isNewFileDialogOpen) {
        if (!isNewFileBusy) {
          (document.getElementById('new-template-form') as HTMLFormElement | null)?.requestSubmit();
        }
        return;
      }
      if (isSaveDestinationDialogOpen || isGroupNameDialogOpen || isRaidNameDialogOpen) return;
      void handleSaveActionRef.current();
    };

    window.addEventListener('keydown', onSaveShortcut);
    return () => window.removeEventListener('keydown', onSaveShortcut);
  }, [isGroupNameDialogOpen, isNewFileBusy, isNewFileDialogOpen, isRaidNameDialogOpen, isSaveDestinationDialogOpen]);

  const navItems = [
    { href: '/', label: 'Home', active: pathname === '/' },
    { href: '/players', label: 'Players', active: pathname === '/players' },
    { href: '/encounters', label: 'Encounters', active: pathname === '/encounters' },
  ];

  return (
    <div className="relative z-50">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={isOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={isOpen}
        className="site-menu__trigger flex h-11 w-11 items-center justify-center border border-white/10 bg-[#141b25] text-white shadow-lg transition hover:border-[#d6b46b]/60 hover:bg-[#1a2431] hover:text-[#f0d69c]"
      >
        <span className="flex flex-col gap-1.5" aria-hidden="true">
          <span className="block h-0.5 w-5 rounded bg-current" />
          <span className="block h-0.5 w-5 rounded bg-current" />
          <span className="block h-0.5 w-5 rounded bg-current" />
        </span>
      </button>

      {isOpen && (
        <div className="site-menu__panel absolute right-0 top-14 w-64 overflow-hidden rounded-2xl border border-white/10 bg-[#111720]/95 shadow-2xl backdrop-blur-xl">
          <div className="site-menu__navigation border-b border-white/10 p-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={(event) => {
                  if (item.href === '/' && pathname !== '/') {
                    event.preventDefault();
                    setIsOpen(false);
                    requestHomeNavigation();
                    return;
                  }
                  setIsOpen(false);
                }}
                className={`site-menu__nav-link block rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  item.active ? 'bg-[#d3b475]/15 text-[#f0d69c]' : 'text-slate-200 hover:bg-white/5 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="p-2">
            <button
              type="button"
              onClick={() => {
                setGroupNameDraft(template.raid.groupName);
                setIsGroupNameDialogOpen(true);
                setIsOpen(false);
              }}
              className="mb-2 flex w-full items-center gap-2 rounded-lg border border-white/10 bg-white/3 px-3 py-2 text-left text-sm font-semibold text-slate-200 transition hover:bg-white/7 hover:text-white"
            >
              <svg aria-hidden="true" className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m16 5 3 3" />
                <path d="M4 20h4l11-11a2.12 2.12 0 0 0-4-4L4 16v4Z" />
              </svg>
              Edit group name
            </button>

            <button
              type="button"
              onClick={() => {
                setRaidNameDraft(template.raid.selectedRaid ?? '');
                setIsRaidNameDialogOpen(true);
                setIsOpen(false);
              }}
              className="mb-2 flex w-full items-center gap-2 rounded-lg border border-white/10 bg-white/3 px-3 py-2 text-left text-sm font-semibold text-slate-200 transition hover:bg-white/7 hover:text-white"
            >
              <svg aria-hidden="true" className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m16 5 3 3" />
                <path d="M4 20h4l11-11a2.12 2.12 0 0 0-4-4L4 16v4Z" />
              </svg>
              Edit raid name
            </button>

            <button
              type="button"
              disabled={isNewFileBusy || isLocalSaveBusy || isImportedSaveBusy}
              onClick={() => void handleSaveAction()}
              className="mb-2 flex w-full items-center gap-2 rounded-lg border border-white/10 bg-white/3 px-3 py-2 text-left text-sm font-semibold text-slate-200 transition hover:bg-white/7 hover:text-white disabled:cursor-wait disabled:opacity-60"
            >
              <SaveIcon />
              {isNewFileBusy || isLocalSaveBusy || isImportedSaveBusy
                ? 'Saving…'
                : importedTemplateFile
                  ? `Save changes to ${importedTemplateFile.mode === 'drive' ? 'Google Drive' : 'local file'}`
                  : 'Save template'}
            </button>

            <DriveTemplatePicker
              onImported={(importedTemplate, file) => {
                loadTemplate(importedTemplate, { mode: 'drive', id: file.id, name: file.name });
                setIsOpen(false);
              }}
              className="mb-2 flex w-full items-center gap-2 rounded-lg border border-white/10 bg-white/3 px-3 py-2 text-left text-sm font-semibold text-slate-200 transition hover:bg-white/7 hover:text-white"
            />

            <button
              type="button"
              disabled={isNewFileBusy || isLocalSaveBusy}
              onClick={openNewDriveFileDialog}
              className="mb-4 flex w-full items-center gap-2 rounded-lg border border-white/10 bg-white/3 px-3 py-2 text-left text-sm font-semibold text-slate-200 transition hover:bg-white/7 hover:text-white disabled:cursor-wait disabled:opacity-60"
            >
              <TemplateSourceIcon mode="drive" />
              Export the template to Google Drive
            </button>

            <button
              type="button"
              onClick={handleImport}
              className="mb-2 flex w-full items-center gap-2 rounded-lg border border-white/10 bg-white/3 px-3 py-2 text-left text-sm font-semibold text-slate-200 transition hover:bg-white/7 hover:text-white"
            >
              <TemplateSourceIcon mode="local" />
              Import JSON from this device
            </button>

            <button
              type="button"
              disabled={isLocalSaveBusy || isNewFileBusy}
              onClick={() => void handleSaveNewLocalFile()}
              className="flex w-full items-center gap-2 rounded-lg border border-white/10 bg-white/3 px-3 py-2 text-left text-sm font-semibold text-slate-200 transition hover:bg-white/7 hover:text-white"
            >
              <TemplateSourceIcon mode="local" />
              {isLocalSaveBusy ? 'Exporting local file…' : 'Export the template to a local file'}
            </button>
            {importedTemplateFile?.mode === 'local' && !importedTemplateFile.handle && (
              <p className="px-3 pt-2 text-xs text-slate-400">
                Direct save is not supported by this browser. Export the template to a local file instead.
              </p>
            )}
            {isConnected && (
              <button
                type="button"
                onClick={() => {
                  disconnect();
                  setDriveMessage('Google Drive disconnected.');
                }}
                className="mt-2 flex w-full items-center rounded-lg px-3 py-2 text-left text-xs text-slate-400 transition hover:bg-white/5 hover:text-white"
              >
                Disconnect Google Drive
              </button>
            )}
            {driveMessage && (
              <p role="status" aria-live="polite" className="px-3 pt-2 text-xs text-slate-300">
                {driveMessage}
              </p>
            )}
          </div>
        </div>
      )}

      {isSaveDestinationDialogOpen && (
        createPortal(<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="save-destination-title"
            className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111720] p-6 shadow-2xl"
          >
            <h2 id="save-destination-title" className="text-lg font-bold text-white">Save template</h2>
            <p className="mt-2 text-sm text-slate-300">Choose where to save this template.</p>
            <div className="mt-5 grid gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsSaveDestinationDialogOpen(false);
                  openNewDriveFileDialog();
                }}
                className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/3 px-4 py-3 text-left text-sm font-semibold text-slate-200 transition hover:bg-white/7 hover:text-white"
              >
                <TemplateSourceIcon mode="drive" />
                Google Drive
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsSaveDestinationDialogOpen(false);
                  void handleSaveNewLocalFile();
                }}
                className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/3 px-4 py-3 text-left text-sm font-semibold text-slate-200 transition hover:bg-white/7 hover:text-white"
              >
                <TemplateSourceIcon mode="local" />
                Local file
              </button>
            </div>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setIsSaveDestinationDialogOpen(false)}
                className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/5"
              >
                Cancel
              </button>
            </div>
          </section>
        </div>, document.body)
      )}

      {isNewFileDialogOpen && (
        createPortal(<div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget && !isNewFileBusy) setIsNewFileDialogOpen(false);
          }}
        >
          <form
            id="new-template-form"
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-template-title"
            className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111720] p-6 shadow-2xl"
            onSubmit={(event) => void handleSaveNewFile(event)}
          >
            <h2 id="new-template-title" className="text-lg font-bold text-white">
              Export the template to Google Drive
            </h2>
            <label htmlFor="new-template-filename" className="mt-4 block text-sm font-medium text-slate-300">
              File name
            </label>
            <input
              id="new-template-filename"
              type="text"
              autoFocus
              required
              value={newFileNameDraft}
              onChange={(event) => setNewFileNameDraft(event.target.value)}
              className="mt-2 w-full rounded-xl border border-white/15 bg-[#0b1017] px-4 py-3 text-white"
            />
            <p className="mt-2 text-xs text-slate-400">The .json extension will be added if needed.</p>
            <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/3 px-4 py-3">
              <div className="min-w-0">
                <p className="text-xs text-slate-400">Save location</p>
                <p className="truncate text-sm font-semibold text-slate-200">{selectedDriveFolder?.name ?? 'My Drive'}</p>
              </div>
              <button
                type="button"
                disabled={isNewFileBusy}
                onClick={() => void handleChooseDriveFolder()}
                className="shrink-0 rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/5 disabled:opacity-50"
              >
                {selectedDriveFolder ? 'Change folder' : 'Choose folder'}
              </button>
            </div>
            {newFileNameError && <p role="alert" className="mt-3 text-sm text-red-300">{newFileNameError}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={isNewFileBusy}
                onClick={() => setIsNewFileDialogOpen(false)}
                className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/5 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isNewFileBusy}
                className="rounded-xl bg-[#d3b475] px-4 py-2.5 text-sm font-semibold text-[#10141b] transition hover:bg-[#f0d69c] disabled:opacity-50"
              >
                {isNewFileBusy ? 'Saving…' : 'Save to Google Drive'}
              </button>
            </div>
          </form>
        </div>, document.body)
      )}

      {isGroupNameDialogOpen && (
        createPortal(<div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget) setIsGroupNameDialogOpen(false);
          }}
        >
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="group-name-dialog-title"
            className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111720] p-6 shadow-2xl"
            onSubmit={(event) => {
              event.preventDefault();
              setGroupName(groupNameDraft);
              setIsGroupNameDialogOpen(false);
            }}
          >
            <h2 id="group-name-dialog-title" className="text-lg font-bold text-white">
              Edit group name
            </h2>
            <label htmlFor="burger-group-name" className="mt-4 block text-sm font-medium text-slate-300">
              Group name
            </label>
            <input
              id="burger-group-name"
              type="text"
              autoFocus
              value={groupNameDraft}
              onChange={(event) => setGroupNameDraft(event.target.value)}
              className="mt-2 w-full rounded-xl border border-white/15 bg-[#0b1017] px-4 py-3 text-white"
            />
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsGroupNameDialogOpen(false)}
                className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-xl bg-[#d3b475] px-4 py-2.5 text-sm font-semibold text-[#10141b] transition hover:bg-[#f0d69c]"
              >
                Save
              </button>
            </div>
          </form>
        </div>, document.body)
      )}

      {isRaidNameDialogOpen && (
        createPortal(<div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget) setIsRaidNameDialogOpen(false);
          }}
        >
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="raid-name-dialog-title"
            className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111720] p-6 shadow-2xl"
            onSubmit={(event) => {
              event.preventDefault();
              setSelectedRaid(raidNameDraft.trim() || null);
              setIsRaidNameDialogOpen(false);
            }}
          >
            <h2 id="raid-name-dialog-title" className="text-lg font-bold text-white">
              Edit raid name
            </h2>
            <label htmlFor="burger-raid-name" className="mt-4 block text-sm font-medium text-slate-300">
              Raid name
            </label>
            <input
              id="burger-raid-name"
              type="text"
              autoFocus
              value={raidNameDraft}
              onChange={(event) => setRaidNameDraft(event.target.value)}
              className="mt-2 w-full rounded-xl border border-white/15 bg-[#0b1017] px-4 py-3 text-white"
            />
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsRaidNameDialogOpen(false)}
                className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-xl bg-[#d3b475] px-4 py-2.5 text-sm font-semibold text-[#10141b] transition hover:bg-[#f0d69c]"
              >
                Save
              </button>
            </div>
          </form>
        </div>, document.body)
      )}
    </div>
  );
}
