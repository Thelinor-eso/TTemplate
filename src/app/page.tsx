"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useRaid } from '@/features/template/RaidContext';
import { defaultTemplateAssetByRaid, esoRaids } from '@/data/raidConstants';
import { createEmptyTemplateDocument } from '@/features/template/raidTemplate';
import DriveTemplatePicker from '@/features/template/DriveTemplatePicker';
import { triggerJsonImport } from '@/features/template/templateFileIO';
import { getRaidBackground, getRaidTheme } from '@/lib/raidDisplay';
import { withBasePath } from '@/lib/staticAssets';

const raidMenuIcon = withBasePath('/game-assets/storage/menu/gp_reconstruction_tabicon_trialgroup.png');
const groupMenuIcon = withBasePath('/game-assets/storage/menu/gp_tutorial_idexicon_groups.png');

export default function LandingPage() {
  const router = useRouter();
  const { setSelectedRaid, setGroupName, loadTemplate, template } = useRaid();

  const [raidChoice, setRaidChoice] = useState(template.raid.selectedRaid ?? '');
  const [startError, setStartError] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const onSelectRaid = (raid: string) => {
    setRaidChoice(raid);
    setSelectedRaid(raid);
    setStartError(null);
  };

  const onStartRaid = async () => {
    if (!raidChoice) return;

    const groupName = template.raid.groupName;
    if (raidChoice === 'Neutral') {
      const emptyTemplate = createEmptyTemplateDocument();
      emptyTemplate.raid.groupName = groupName;
      loadTemplate(emptyTemplate);
      router.push('/players');
      return;
    }

    const staticTemplateAsset = defaultTemplateAssetByRaid[raidChoice];
    if (!staticTemplateAsset) {
      setStartError(`No default template is configured for ${raidChoice}.`);
      return;
    }

    setStartError(null);
    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
      const response = await fetch(`${basePath}/default-templates/${staticTemplateAsset}`);
      if (!response.ok) {
        throw new Error(`The default template could not be loaded (${response.status}).`);
      }

      const parsed = loadTemplate(await response.text());
      setSelectedRaid(parsed.raid.selectedRaid ?? raidChoice);
      setGroupName(groupName);
    } catch (error) {
      setStartError(error instanceof Error ? error.message : 'The default template could not be loaded.');
      return;
    }

    router.push('/players');
  };

  const onImportJson = () => {
    setImportError(null);
    triggerJsonImport((text, source) => {
      try {
        const parsed = loadTemplate(text, source);
        const selected = parsed.raid.selectedRaid ?? '';
        setRaidChoice(selected);
        setSelectedRaid(selected);
        router.push('/players');
      } catch (error) {
        setImportError(error instanceof Error ? error.message : 'The JSON file could not be imported.');
      }
    }, (error) => setImportError(error instanceof Error ? error.message : 'The JSON file could not be imported.'));
  };

  const onDriveTemplateImported = (
    importedTemplate: ReturnType<typeof loadTemplate>,
    file: { id: string; name: string },
  ) => {
    loadTemplate(importedTemplate, { mode: 'drive', id: file.id, name: file.name });
    const selected = importedTemplate.raid.selectedRaid ?? '';
    setRaidChoice(selected);
    setSelectedRaid(selected);
    router.push('/players');
  };

  const raidTheme = getRaidTheme(raidChoice);
  const raidBackground = getRaidBackground(raidChoice);

  return (
    <main
      className="app-page landing-page bg-cover bg-center bg-fixed"
      data-raid-theme={raidTheme || undefined}
      data-neutral-template={raidChoice === 'Neutral' ? '' : undefined}
      style={{
        backgroundImage: raidBackground
          ? `url(${raidBackground})`
          : raidChoice === 'Neutral'
            ? 'none'
          : 'linear-gradient(to bottom right, #050506, #111111, #050506)',
      }}
    >
      <div className="app-page__scrim" />

      <div className="landing-page__layout">
        <section className="landing-page__brand" aria-label="TTemplate">
          <h1 className="landing-page__title">TTemplate</h1>
          <p className="landing-page__byline">by Thelinor</p>
        </section>

        <section className="landing-card" aria-labelledby="setup-heading">
            <h2 id="setup-heading" className="sr-only">Choose an ESO trial</h2>

            <div className="landing-card__fields">
              <div>
                <label htmlFor="group-name" className="landing-card__section-label">
                  <Image src={groupMenuIcon} alt="" width={24} height={24} />
                  <span>Group name</span>
                </label>
                <input
                  id="group-name"
                  type="text"
                  value={template.raid.groupName}
                  onChange={(event) => setGroupName(event.target.value)}
                  className="w-full px-4 py-3"
                />
              </div>
              <div>
                <p className="landing-card__section-label">
                  <Image src={raidMenuIcon} alt="" width={24} height={24} />
                  <span>Trial</span>
                </p>
                <div className="landing-card__raid-picker" role="group" aria-label="Choose an ESO trial">
                  {esoRaids.map((raid) => {
                    const background = getRaidBackground(raid);
                    const isSelected = raidChoice === raid;

                    return (
                      <button
                        key={raid}
                        type="button"
                        aria-pressed={isSelected}
                        aria-label={`Choose ${raid}`}
                        onClick={() => onSelectRaid(raid)}
                        className={`landing-card__raid-option${isSelected ? ' is-selected' : ''}`}
                      >
                        {background ? (
                          <Image
                            src={background}
                            alt=""
                            fill
                            sizes="(max-width: 720px) 40vw, (max-width: 1100px) 25vw, 180px"
                            className="landing-card__raid-option-image"
                          />
                        ) : (
                          <span className="landing-card__raid-option-placeholder" aria-hidden="true" />
                        )}
                        <span className="landing-card__raid-option-scrim" />
                        <span className="landing-card__raid-option-name">{raid}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="grid gap-3">
              {raidChoice ? (
                <button
                  onClick={onStartRaid}
                  className="landing-card__primary w-full bg-[#d3b475] px-5 py-3 text-[#10141b] transition hover:bg-[#f0d69c]"
                >
                  Start trial
                </button>
              ) : (
                <div className="flex min-h-12 w-full cursor-not-allowed items-center justify-center rounded-xl bg-white/6 px-4 py-3 text-center text-sm font-semibold text-slate-500">
                  Choose a trial
                </div>
              )}
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <button
                type="button"
                onClick={onImportJson}
                className="inline-flex w-full items-center justify-center gap-2 border border-white/10 bg-white/4 px-5 py-3 text-slate-200 transition hover:bg-white/8 hover:text-white"
              >
                <svg aria-hidden="true" className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3v12" />
                  <path d="m7 10 5 5 5-5" />
                  <path d="M5 17v4h14v-4" />
                </svg>
                Import JSON from this device
              </button>
              <DriveTemplatePicker
                onImported={onDriveTemplateImported}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 border border-white/10 bg-white/4 px-5 py-3 text-slate-200 transition hover:bg-white/8 hover:text-white"
              />
            </div>
            {importError && (
              <p role="alert" className="mt-3 text-sm text-red-300">{importError}</p>
            )}
            {startError && (
              <p role="alert" className="mt-4 text-sm text-red-300">
                {startError}
              </p>
            )}
        </section>
      </div>
    </main>
  );
}
