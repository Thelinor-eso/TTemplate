import { exportTemplateDocument, type RaidTemplateDocument } from './raidTemplate';

export interface LocalJsonFileHandle {
  name: string;
  getFile: () => Promise<File>;
  createWritable: () => Promise<{
    write: (data: string) => Promise<void>;
    close: () => Promise<void>;
  }>;
  queryPermission?: (descriptor: { mode: 'readwrite' }) => Promise<PermissionState>;
  requestPermission?: (descriptor: { mode: 'readwrite' }) => Promise<PermissionState>;
}

export type ImportedTemplateFile =
  | { mode: 'drive'; id: string; name: string }
  | { mode: 'local'; name: string; handle?: LocalJsonFileHandle };

declare global {
  interface Window {
    showOpenFilePicker?: (options: {
      multiple: false;
      types: Array<{ description: string; accept: Record<string, string[]> }>;
    }) => Promise<LocalJsonFileHandle[]>;
  showSaveFilePicker?: (options: {
    suggestedName?: string;
    types: Array<{ description: string; accept: Record<string, string[]> }>;
  }) => Promise<LocalJsonFileHandle>;
  }
}

const sanitizeFilenamePart = (value: string | null, fallback: string) => {
  const sanitized = value
    ?.trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
    .replace(/[. ]+$/g, '');
  return sanitized || fallback;
};

export const createTemplateFilename = (template: RaidTemplateDocument, timestamp = new Date()) => {
  const pad = (value: number) => String(value).padStart(2, '0');
  const shortTimestamp = `${timestamp.getFullYear()}${pad(timestamp.getMonth() + 1)}${pad(timestamp.getDate())}-${pad(timestamp.getHours())}${pad(timestamp.getMinutes())}${pad(timestamp.getSeconds())}`;
  const groupName = sanitizeFilenamePart(template.raid.groupName, 'groupe');
  const raidName = sanitizeFilenamePart(template.raid.selectedRaid, 'raid');

  return `${groupName}_${raidName}_${shortTimestamp}.json`;
};

export const ensureJsonFilename = (filename: string) => {
  const trimmed = filename.trim();
  if (!trimmed) throw new Error('Enter a filename before saving the template.');
  return trimmed.toLowerCase().endsWith('.json') ? trimmed : `${trimmed}.json`;
};

export const downloadTemplateAsJson = (template: RaidTemplateDocument, filename = createTemplateFilename(template)) => {
  const jsonString = exportTemplateDocument(template);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

export const triggerJsonImport = (
  onFileSelected: (text: string, source: ImportedTemplateFile) => void,
  onError?: (error: unknown) => void,
) => {
  if (window.showOpenFilePicker) {
    void window.showOpenFilePicker({
      multiple: false,
      types: [{ description: 'JSON template', accept: { 'application/json': ['.json'] } }],
    }).then(async ([handle]) => {
      if (!handle) return;
      const file = await handle.getFile();
      onFileSelected(await file.text(), { mode: 'local', name: handle.name, handle });
    }).catch((error: unknown) => {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      if (onError) onError(error);
      else console.error('The JSON template could not be imported.', error);
    });
    return;
  }

  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';
  input.onchange = (event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    void file.text().then((text) => {
      onFileSelected(text, { mode: 'local', name: file.name });
    }).catch((error: unknown) => {
      if (onError) onError(error);
      else console.error('The JSON template could not be imported.', error);
    });
  };
  input.click();
};

export const saveTemplateToLocalFile = async (
  template: RaidTemplateDocument,
  handle: LocalJsonFileHandle,
) => {
  const permission = await handle.queryPermission?.({ mode: 'readwrite' });
  const grantedPermission = permission === 'granted'
    ? permission
    : await handle.requestPermission?.({ mode: 'readwrite' });
  if (permission !== 'granted' && grantedPermission !== 'granted') {
    throw new Error(`Write access to ${handle.name} was not granted.`);
  }

  const writable = await handle.createWritable();
  await writable.write(exportTemplateDocument(template));
  await writable.close();
  return handle.name;
};

export const saveTemplateAsLocalFile = async (
  template: RaidTemplateDocument,
  filename = createTemplateFilename(template),
): Promise<ImportedTemplateFile> => {
  const suggestedName = ensureJsonFilename(filename);
  if (window.showSaveFilePicker) {
    const handle = await window.showSaveFilePicker({
      suggestedName,
      types: [{ description: 'JSON template', accept: { 'application/json': ['.json'] } }],
    });
    const filename = await saveTemplateToLocalFile(template, handle);
    return { mode: 'local', name: filename, handle };
  }

  downloadTemplateAsJson(template, suggestedName);
  return { mode: 'local', name: suggestedName };
};
