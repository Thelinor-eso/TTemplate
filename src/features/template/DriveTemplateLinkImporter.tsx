'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { useGoogleDrive, type GoogleDriveTemplateFile } from '@/features/template/GoogleDriveContext';
import type { RaidTemplateDocument } from '@/features/template/raidTemplate';
import { getGoogleDriveFileId } from '@/features/template/googleDriveLink';

interface DriveTemplateLinkImporterProps {
  onImported: (template: RaidTemplateDocument, file: GoogleDriveTemplateFile) => void;
  onDialogOpenChange?: (isOpen: boolean) => void;
  className?: string;
}

export default function DriveTemplateLinkImporter({
  onImported,
  onDialogOpenChange,
  className,
}: DriveTemplateLinkImporterProps) {
  const { pickTemplateFile, loadTemplateFile } = useGoogleDrive();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [link, setLink] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setDialogOpen = useCallback((isOpen: boolean) => {
    setIsDialogOpen(isOpen);
    onDialogOpenChange?.(isOpen);
  }, [onDialogOpenChange]);

  useEffect(() => {
    if (!isDialogOpen || isLoading) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setDialogOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [isDialogOpen, isLoading, setDialogOpen]);

  const importFromLink = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const fileId = getGoogleDriveFileId(link);
      const selectedFile = await pickTemplateFile(fileId);
      if (!selectedFile) return;
      if (selectedFile.id !== fileId) {
        throw new Error('Google Drive returned a different file than the one in the link.');
      }
      const result = await loadTemplateFile(selectedFile.id);
      onImported(result.template, result.file);
      setLink('');
      setDialogOpen(false);
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : 'The Google Drive template could not be imported.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        aria-expanded={isDialogOpen}
        onClick={() => {
          setDialogOpen(true);
          setError(null);
        }}
        className={className}
      >
        <svg aria-hidden="true" className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.72-1.71" />
        </svg>
        Import using a Google Drive link
      </button>
      {isDialogOpen && createPortal(
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget && !isLoading) setDialogOpen(false);
          }}
        >
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="google-drive-link-title"
            onSubmit={(event) => void importFromLink(event)}
            className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#111720] p-6 shadow-2xl"
          >
            <h2 id="google-drive-link-title" className="text-lg font-bold text-white">
              Import using a Google Drive link
            </h2>
            <label htmlFor="google-drive-template-link" className="mt-4 block text-sm text-slate-300">
              Paste a link to a Google Drive JSON template
            </label>
            <p className="mt-2 text-xs text-slate-400">
              Google Drive will show only the file from this link. Select it to authorize access.
            </p>
            <input
              id="google-drive-template-link"
              type="url"
              required
              autoFocus
              value={link}
              onChange={(event) => setLink(event.target.value)}
              placeholder="https://drive.google.com/file/d/…"
              className="mt-3 w-full rounded-lg border border-white/15 bg-[#0b1017] px-3 py-2 text-sm text-white outline-none focus:border-[#d3b475]"
            />
            {error && <p role="alert" className="mt-2 text-sm text-red-300">{error}</p>}
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                disabled={isLoading}
                onClick={() => setDialogOpen(false)}
                className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/5 disabled:cursor-wait disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="rounded-xl border border-[#f0d69c] bg-[#d3b475] px-4 py-2.5 text-sm font-semibold text-[#10141b] transition-colors hover:bg-[#f0d69c] disabled:cursor-wait disabled:opacity-70"
              >
                {isLoading ? 'Waiting for Google Drive…' : 'Select this file in Google Drive'}
              </button>
            </div>
          </form>
        </div>,
        document.body,
      )}
    </div>
  );
}
