'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState, type FormEvent } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useRaid } from '@/features/template/RaidContext';
import { useGoogleDrive } from '@/features/template/GoogleDriveContext';
import BurgerMenu from '@/components/layout/BurgerMenu';
import { getRaidTheme } from '@/lib/raidDisplay';
import { withBasePath } from '@/lib/staticAssets';

const raidMenuIcon = withBasePath('/game-assets/storage/menu/gp_reconstruction_tabicon_trialgroup.png');
const groupMenuIcon = withBasePath('/game-assets/storage/menu/gp_tutorial_idexicon_groups.png');

export default function GroupNameHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { isConnected, googleAccountEmail } = useGoogleDrive();
  const {
    template,
    setMarkers,
    isEditMode,
    importedTemplateFile,
    hasUnsavedChanges,
    isHomeNavigationConfirmationOpen,
    requestHomeNavigation,
    closeHomeNavigationConfirmation,
  } = useRaid();
  const groupName = template.raid.groupName.trim();
  const raidName = template.raid.selectedRaid;
  const [markersCopied, setMarkersCopied] = useState(false);
  const [isMarkersEditorOpen, setIsMarkersEditorOpen] = useState(false);
  const [markersDraft, setMarkersDraft] = useState('');

  const copyMarkers = async () => {
    try {
      await navigator.clipboard.writeText(template.raid.markers);
      setMarkersCopied(true);
      window.setTimeout(() => setMarkersCopied(false), 1800);
    } catch {
      setMarkersCopied(false);
    }
  };

  const openMarkersEditor = () => {
    setMarkersDraft(template.raid.markers);
    setIsMarkersEditorOpen(true);
  };

  const saveMarkers = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMarkers(markersDraft);
    setIsMarkersEditorOpen(false);
  };

  useEffect(() => {
    if (!isHomeNavigationConfirmationOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      closeHomeNavigationConfirmation();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [isHomeNavigationConfirmationOpen, closeHomeNavigationConfirmation]);

  useEffect(() => {
    if (!isMarkersEditorOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setIsMarkersEditorOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [isMarkersEditorOpen]);

  useEffect(() => {
    const currentPath = pathname.replace(/\/$/, '');
    if (currentPath !== '/players' && currentPath !== '/encounters') return;

    const warnBeforeRefresh = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // A non-empty value is still needed by some browsers to trigger the
      // native confirmation dialog. Browsers may replace it with generic text.
      const driveWarning = isConnected && importedTemplateFile?.mode === 'drive'
        ? ' Refreshing will disconnect Google Drive and stop synchronization with your Drive file.'
        : '';
      event.returnValue = `Your current template may be lost if you refresh.${driveWarning}`;
    };

    window.addEventListener('beforeunload', warnBeforeRefresh);
    return () => window.removeEventListener('beforeunload', warnBeforeRefresh);
  }, [pathname, isConnected, importedTemplateFile?.mode]);

  return (
    <>
      <header className="site-header" data-raid-theme={getRaidTheme(raidName) || undefined}>
        <div className="site-header__inner">
          <Link
            href="/"
            onClick={(event) => {
              if (pathname !== '/') {
                event.preventDefault();
                requestHomeNavigation();
              }
            }}
            className="site-brand"
            aria-label="TTemplate home"
          >
            <span className="site-brand__mark" aria-hidden="true">TT</span>
            <span className="site-brand__copy">
              <span className="site-brand__name block">TTemplate</span>
              <span className="site-brand__caption block">ESO raid planner</span>
            </span>
          </Link>
          <div className="site-markers-actions">
            {isEditMode && (
              <button
                type="button"
                className="site-markers-action"
                onClick={openMarkersEditor}
                title="Edit raid markers"
                aria-label="Edit Markers"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
                </svg>
                <span>Edit Markers</span>
              </button>
            )}
            <button
              type="button"
              className="site-markers-action"
              onClick={copyMarkers}
              title={markersCopied ? 'Markers copied' : 'Copy raid markers'}
              aria-label={markersCopied ? 'Markers copied' : 'Copy Markers'}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="8" y="8" width="12" height="12" rx="2" />
                <path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" />
              </svg>
              <span>{markersCopied ? 'Copied!' : 'Copy Markers'}</span>
            </button>
          </div>
          <div className="site-context">
            {groupName && (
              <p className="site-context__group">
                <Image src={groupMenuIcon} alt="" width={18} height={18} />
                <span>{groupName}</span>
              </p>
            )}
            {raidName && (
              <p className="site-context__raid">
                <Image src={raidMenuIcon} alt="" width={20} height={20} />
                <span>{raidName}</span>
              </p>
            )}
            <p
              className={`site-context__file-status${hasUnsavedChanges ? ' is-dirty' : ''}${importedTemplateFile ? '' : ' is-unsaved'}`}
              title={importedTemplateFile
                ? `${importedTemplateFile.mode === 'drive' ? 'Google Drive' : 'Local file'}: ${importedTemplateFile.name}${hasUnsavedChanges ? ' — unsaved changes' : ' — saved'}`
                : 'No saved file yet'}
            >
              <span className="site-context__file-status-copy">
                <span className="site-context__file-name-row">
                  {importedTemplateFile?.mode === 'drive' ? (
                    <svg aria-label="Google Drive" role="img" className="site-context__file-status-icon" width="14" height="14" viewBox="0 0 24 24">
                      <path fill="#00832D" d="M8.2 2.5h7.6L7.6 16.7 3.8 10.1z" />
                      <path fill="#0066DA" d="m15.8 2.5 8.1 14.2-3.8 6.7L12 9.2z" />
                      <path fill="#FFBA00" d="M3.8 10.1 0 16.7l3.8 6.7h16.3l3.8-6.7H7.6z" />
                    </svg>
                  ) : importedTemplateFile?.mode === 'local' ? (
                    <svg aria-label="Local file" role="img" className="site-context__file-status-icon is-local" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 2.75h8l5 5v13.5H6z" />
                      <path d="M14 2.75v5h5M9 13h7M9 16.5h7" />
                    </svg>
                  ) : (
                    <svg aria-label="Unsaved file" role="img" className="site-context__file-status-icon is-unsaved" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 2.75h8l5 5v13.5H6z" />
                      <path d="M14 2.75v5h5M12 11v4M12 18h.01" />
                    </svg>
                  )}
                  <strong>{importedTemplateFile?.name ?? 'No saved file yet'}</strong>
                </span>
                <span className="site-context__file-status-detail">
                  {hasUnsavedChanges || !importedTemplateFile ? '⚠️' : '✅'}
                  {importedTemplateFile
                    ? (hasUnsavedChanges ? 'Unsaved changes' : 'Saved')
                    : 'Not saved'}
                </span>
              </span>
            </p>
            <p
              className={`site-context__google-status${isConnected ? ' is-connected' : ''}`}
              title={isConnected
                ? (googleAccountEmail ? `Connected to Google as ${googleAccountEmail}` : 'Connected to Google')
                : 'Not connected to Google'}
            >
              <svg aria-hidden="true" className="site-context__google-icon" viewBox="0 0 24 24">
                <path fill="#00832D" d="M8.2 2.5h7.6L7.6 16.7 3.8 10.1z" />
                <path fill="#0066DA" d="m15.8 2.5 8.1 14.2-3.8 6.7L12 9.2z" />
                <path fill="#FFBA00" d="M3.8 10.1 0 16.7l3.8 6.7h16.3l3.8-6.7H7.6z" />
              </svg>
              <span>{isConnected
                ? (googleAccountEmail ? `Connected: ${googleAccountEmail}` : 'Google connected')
                : 'Google not connected'}</span>
            </p>
          </div>
          <BurgerMenu />
        </div>
      </header>
      {isMarkersEditorOpen && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget) setIsMarkersEditorOpen(false);
          }}
        >
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="markers-dialog-title"
            className="w-full max-w-xl rounded-2xl border border-white/10 bg-[#111720] p-6 shadow-2xl"
            onSubmit={saveMarkers}
          >
            <h2 id="markers-dialog-title" className="text-lg font-bold text-white">Edit markers</h2>
            <label htmlFor="raid-markers" className="mt-4 block text-sm font-medium text-slate-300">Markers text</label>
            <textarea
              id="raid-markers"
              autoFocus
              rows={10}
              value={markersDraft}
              onChange={(event) => setMarkersDraft(event.target.value)}
              className="mt-2 w-full resize-y rounded-xl border border-white/15 bg-[#0b1017] px-4 py-3 font-mono text-sm text-white outline-none focus:border-[#d3b475] focus:ring-2 focus:ring-[#d3b475]/30"
            />
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setIsMarkersEditorOpen(false)} className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/5">Cancel</button>
              <button type="submit" className="rounded-xl bg-[#d3b475] px-4 py-2.5 text-sm font-semibold text-[#10141b] transition hover:bg-[#f0d69c]">Save</button>
            </div>
          </form>
        </div>
      )}
      {isHomeNavigationConfirmationOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeHomeNavigationConfirmation();
          }}
        >
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="home-navigation-title"
            aria-describedby="home-navigation-description"
            className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111720] p-6 shadow-2xl"
          >
            <h2 id="home-navigation-title" className="text-lg font-bold text-white">
              Go to Home?
            </h2>
            <p id="home-navigation-description" className="mt-3 text-sm leading-6 text-slate-300">
              Returning to Home may overwrite your current template. Starting a new raid or loading a JSON file will replace it and discard its current data.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeHomeNavigationConfirmation}
                className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/5"
              >
                Stay here
              </button>
              <button
                type="button"
                onClick={() => {
                  closeHomeNavigationConfirmation();
                  router.push('/');
                }}
                className="rounded-xl bg-[#d3b475] px-4 py-2.5 text-sm font-semibold text-[#10141b] transition hover:bg-[#f0d69c]"
              >
                Go to Home
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
