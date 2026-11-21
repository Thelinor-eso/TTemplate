import { describe, expect, it } from 'vitest';
import { getGoogleDriveFileId } from '@/features/template/googleDriveLink';

describe('getGoogleDriveFileId', () => {
  it('extracts IDs from Drive file links and Google Docs links', () => {
    expect(getGoogleDriveFileId('https://drive.google.com/file/d/1abc_X-9/view?usp=sharing'))
      .toBe('1abc_X-9');
    expect(getGoogleDriveFileId('https://drive.google.com/open?id=1abc_X-9'))
      .toBe('1abc_X-9');
    expect(getGoogleDriveFileId('https://docs.google.com/document/d/1abc_X-9/edit'))
      .toBe('1abc_X-9');
  });

  it('rejects links outside Google Drive and links without a valid file ID', () => {
    expect(() => getGoogleDriveFileId('https://example.com/file/d/1abc'))
      .toThrow('Paste a valid Google Drive file link.');
    expect(() => getGoogleDriveFileId('https://drive.google.com/file/d/invalid.id/view'))
      .toThrow('The Google Drive link does not contain a valid file ID.');
  });
});
