export function getGoogleDriveFileId(link: string): string {
  let url: URL;
  try {
    url = new URL(link.trim());
  } catch {
    throw new Error('Paste a valid Google Drive file link.');
  }

  if (url.protocol !== 'https:' || !['drive.google.com', 'docs.google.com'].includes(url.hostname)) {
    throw new Error('Paste a valid Google Drive file link.');
  }

  const fileId = url.pathname.match(/\/d\/([^/]+)/)?.[1] ?? url.searchParams.get('id');
  if (!fileId || !/^[A-Za-z0-9_-]+$/.test(fileId)) {
    throw new Error('The Google Drive link does not contain a valid file ID.');
  }
  return fileId;
}
