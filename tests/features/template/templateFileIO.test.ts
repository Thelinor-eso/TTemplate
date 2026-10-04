import { describe, expect, it, vi } from 'vitest';
import { createEmptyTemplateDocument, exportTemplateDocument } from '@/features/template/raidTemplate';
import { createTemplateFilename, saveTemplateToLocalFile } from '@/features/template/templateFileIO';

describe('createTemplateFilename', () => {
  it('uses the group, selected raid and a compact timestamp', () => {
    const template = createEmptyTemplateDocument();
    template.raid.groupName = 'ESO Raid Team';
    template.raid.selectedRaid = "Sanity's Edge";

    expect(createTemplateFilename(template, new Date(2026, 9, 5, 20, 8, 4)))
      .toBe("ESO Raid Team_Sanity's Edge_20261005-200804.json");
  });

  it('replaces filename-invalid characters and falls back for empty names', () => {
    const template = createEmptyTemplateDocument();
    template.raid.groupName = 'Guild/Team';
    template.raid.selectedRaid = null;

    expect(createTemplateFilename(template, new Date(2026, 0, 2, 3, 4, 5)))
      .toBe('Guild-Team_raid_20260102-030405.json');
  });
});

describe('saveTemplateToLocalFile', () => {
  it('writes the current template to the previously selected file', async () => {
    const template = createEmptyTemplateDocument();
    const write = vi.fn(async () => {});
    const close = vi.fn(async () => {});
    const handle = {
      name: 'raid.json',
      getFile: vi.fn(),
      queryPermission: vi.fn(async () => 'granted' as PermissionState),
      createWritable: vi.fn(async () => ({ write, close })),
    };

    await expect(saveTemplateToLocalFile(template, handle)).resolves.toBe('raid.json');
    expect(write).toHaveBeenCalledWith(exportTemplateDocument(template));
    expect(close).toHaveBeenCalledOnce();
  });

  it('requests write permission when the file is not already writable', async () => {
    const template = createEmptyTemplateDocument();
    const handle = {
      name: 'raid.json',
      getFile: vi.fn(),
      queryPermission: vi.fn(async () => 'prompt' as PermissionState),
      requestPermission: vi.fn(async () => 'granted' as PermissionState),
      createWritable: vi.fn(async () => ({ write: vi.fn(async () => {}), close: vi.fn(async () => {}) })),
    };

    await saveTemplateToLocalFile(template, handle);
    expect(handle.requestPermission).toHaveBeenCalledWith({ mode: 'readwrite' });
  });
});
