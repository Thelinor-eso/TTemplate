'use client';

import { useState } from 'react';
import {
  isGoogleOAuthPopupClosed,
  useGoogleDrive,
  type GoogleDriveTemplateFile,
} from '@/features/template/GoogleDriveContext';
import type { RaidTemplateDocument } from '@/features/template/raidTemplate';

interface DriveTemplatePickerProps {
  onImported: (template: RaidTemplateDocument, file: GoogleDriveTemplateFile) => void;
  className?: string;
}

export default function DriveTemplatePicker({ onImported, className }: DriveTemplatePickerProps) {
  const { pickTemplateFile, loadTemplateFile } = useGoogleDrive();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const importFromDrive = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const selectedFile = await pickTemplateFile();
      if (!selectedFile) return;
      const template = await loadTemplateFile(selectedFile.id);
      onImported(template, selectedFile);
    } catch (importError) {
      if (!isGoogleOAuthPopupClosed(importError)) {
        setError(importError instanceof Error ? importError.message : 'The selected JSON template could not be imported.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <button type="button" onClick={() => void importFromDrive()} disabled={isLoading} className={className}>
        <svg aria-hidden="true" className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
          <path fill="#00832D" d="M8.2 2.5h7.6L7.6 16.7 3.8 10.1z" />
          <path fill="#0066DA" d="m15.8 2.5 8.1 14.2-3.8 6.7L12 9.2z" />
          <path fill="#FFBA00" d="M3.8 10.1 0 16.7l3.8 6.7h16.3l3.8-6.7H7.6z" />
        </svg>
        {isLoading ? 'Opening Google Drive…' : 'Import JSON from Google Drive'}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
