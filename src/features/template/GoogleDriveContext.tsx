'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  ensureJsonFilename,
} from '@/features/template/templateFileIO';
import {
  exportTemplateDocument,
  parseTemplateDocument,
  type RaidTemplateDocument,
} from '@/features/template/raidTemplate';

type GoogleTokenResponse = {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

type GoogleTokenClient = {
  requestAccessToken: (options?: { prompt?: string }) => void;
};

type GooglePickerFile = {
  id: string;
  name: string;
  mimeType: string;
};

type GooglePickerInstance = {
  setVisible: (visible: boolean) => void;
};

declare global {
  interface Window {
    gapi?: {
      load: (library: string, options: { callback: () => void; onerror: () => void }) => void;
    };
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (options: {
            client_id: string;
            scope: string;
            callback: (response: GoogleTokenResponse) => void;
            error_callback: (error: { type: string; message?: string }) => void;
          }) => GoogleTokenClient;
          revoke: (token: string, callback?: () => void) => void;
        };
      };
      picker?: {
        Action: { PICKED: string; CANCEL: string };
        ViewId: { DOCS: string };
        DocsView: new (viewId: string) => {
          setMimeTypes: (mimeTypes: string) => unknown;
          setIncludeFolders: (include: boolean) => unknown;
          setSelectFolderEnabled: (enabled: boolean) => unknown;
        };
        PickerBuilder: new () => {
          setAppId: (appId: string) => unknown;
          setOAuthToken: (token: string) => unknown;
          setDeveloperKey: (key: string) => unknown;
          addView: (view: unknown) => unknown;
          enableFeature: (feature: string) => unknown;
          setCallback: (callback: (data: {
            action?: string;
            docs?: GooglePickerFile[];
          }) => void) => unknown;
          build: () => GooglePickerInstance;
        };
      };
    };
  }
}

interface GoogleDriveContextValue {
  isConnected: boolean;
  googleAccountEmail: string | null;
  disconnect: () => void;
  pickTemplateFile: () => Promise<GoogleDriveTemplateFile | null>;
  pickDriveFolder: () => Promise<{ id: string; name: string } | null>;
  loadTemplateFile: (fileId: string) => Promise<RaidTemplateDocument>;
  saveTemplate: (template: RaidTemplateDocument, filename: string, folderId?: string) => Promise<{ id: string; name: string }>;
  updateTemplateFile: (fileId: string, template: RaidTemplateDocument) => Promise<{ id: string; name: string }>;
}

export interface GoogleDriveTemplateFile {
  id: string;
  name: string;
  modifiedTime: string;
}

const GoogleDriveContext = createContext<GoogleDriveContextValue | undefined>(undefined);
const DRIVE_SCOPES = 'openid email https://www.googleapis.com/auth/drive.file';

class GoogleOAuthPopupClosedError extends Error {
  constructor() {
    super('Google sign-in popup was closed.');
    this.name = 'GoogleOAuthPopupClosedError';
  }
}

export function isGoogleOAuthPopupClosed(error: unknown): boolean {
  return error instanceof GoogleOAuthPopupClosedError;
}

let pickerApiPromise: Promise<void> | null = null;

function loadGooglePickerApi(): Promise<void> {
  if (window.google?.picker && window.gapi) return Promise.resolve();
  if (pickerApiPromise) return pickerApiPromise;

  pickerApiPromise = new Promise<void>((resolve, reject) => {
    const loadPicker = () => {
      if (!window.gapi) {
        reject(new Error('Google Picker could not be loaded.'));
        return;
      }
      window.gapi.load('picker', {
        callback: resolve,
        onerror: () => reject(new Error('Google Picker could not be loaded.')),
      });
    };

    const existingScript = document.querySelector<HTMLScriptElement>('script[src="https://apis.google.com/js/api.js"]');
    if (existingScript) {
      existingScript.addEventListener('load', loadPicker, { once: true });
      if (window.gapi) loadPicker();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.async = true;
    script.onload = loadPicker;
    script.onerror = () => reject(new Error('Google Picker could not be loaded.'));
    document.head.appendChild(script);
  }).catch((error: unknown) => {
    pickerApiPromise = null;
    throw error;
  });

  return pickerApiPromise;
}

async function getErrorMessage(response: Response): Promise<string> {
  const body = await response.text();
  if (body) {
    try {
      const payload: unknown = JSON.parse(body);
      if (typeof payload === 'object' && payload !== null && 'error' in payload) {
        const error = payload.error;
        if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') {
          return error.message;
        }
      }
    } catch {
      return body;
    }
    return body;
  }

  return `Google Drive request failed (${response.status}).`;
}

export function GoogleDriveProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [googleAccountEmail, setGoogleAccountEmail] = useState<string | null>(null);
  const accessTokenRef = useRef<string | null>(null);
  const tokenExpiresAtRef = useRef(0);
  const pendingTokenRequestRef = useRef<Promise<string> | null>(null);

  const requestAccessToken = useCallback(() => {
    if (pendingTokenRequestRef.current) return pendingTokenRequestRef.current;

    let resolveRequest!: (token: string) => void;
    let rejectRequest!: (error: Error) => void;
    const tokenRequest = new Promise<string>((resolve, reject) => {
      resolveRequest = resolve;
      rejectRequest = reject;
    });
    pendingTokenRequestRef.current = tokenRequest;

    const fail = (error: Error) => {
      if (pendingTokenRequestRef.current === tokenRequest) pendingTokenRequestRef.current = null;
      rejectRequest(error);
    };

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const tokenClient = window.google?.accounts?.oauth2;
    if (!clientId) {
      fail(new Error('Google Drive is not configured. Set NEXT_PUBLIC_GOOGLE_CLIENT_ID and rebuild the app.'));
      return tokenRequest;
    }
    if (!tokenClient) {
      fail(new Error('Google sign-in is not ready. Reload the page and try again.'));
      return tokenRequest;
    }

    try {
      const client = tokenClient.initTokenClient({
        client_id: clientId,
        scope: DRIVE_SCOPES,
        callback: (response) => {
          if (response.error || !response.access_token) {
            fail(new Error(response.error_description ?? response.error ?? 'Google authorization failed.'));
            return;
          }
          accessTokenRef.current = response.access_token;
          tokenExpiresAtRef.current = Date.now() + (response.expires_in ?? 3600) * 1000;
          setAccessToken(response.access_token);
          setGoogleAccountEmail(null);
          void fetch('https://openidconnect.googleapis.com/v1/userinfo', {
            headers: { Authorization: `Bearer ${response.access_token}` },
          }).then(async (profileResponse) => {
            if (!profileResponse.ok) return;
            const profile: unknown = await profileResponse.json();
            if (typeof profile === 'object' && profile !== null && 'email' in profile
              && typeof profile.email === 'string' && accessTokenRef.current === response.access_token) {
              setGoogleAccountEmail(profile.email);
            }
          }).catch(() => undefined);
          if (pendingTokenRequestRef.current === tokenRequest) pendingTokenRequestRef.current = null;
          resolveRequest(response.access_token);
        },
        error_callback: (error) => fail(
          error.type === 'popup_closed'
            ? new GoogleOAuthPopupClosedError()
            : new Error(error.message ?? `Google sign-in failed: ${error.type}`),
        ),
      });

      client.requestAccessToken({ prompt: '' });
    } catch (error) {
      fail(error instanceof Error ? error : new Error('Google authorization failed.'));
    }
    return tokenRequest;
  }, []);

  const getAccessToken = useCallback(async () => {
    const currentToken = accessTokenRef.current;
    if (currentToken && Date.now() < tokenExpiresAtRef.current - 60_000) return currentToken;
    return requestAccessToken();
  }, [requestAccessToken]);

  const disconnect = useCallback(() => {
    if (accessTokenRef.current) window.google?.accounts?.oauth2?.revoke(accessTokenRef.current);
    accessTokenRef.current = null;
    tokenExpiresAtRef.current = 0;
    setAccessToken(null);
    setGoogleAccountEmail(null);
  }, []);

  const pickTemplateFile = useCallback(async () => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
    const appId = process.env.NEXT_PUBLIC_GOOGLE_APP_ID;
    if (!apiKey || !appId) {
      throw new Error('Google Picker is not configured. Set NEXT_PUBLIC_GOOGLE_API_KEY and NEXT_PUBLIC_GOOGLE_APP_ID, then rebuild the app.');
    }

    const token = await getAccessToken();
    await loadGooglePickerApi();
    const pickerApi = window.google?.picker;
    if (!pickerApi) throw new Error('Google Picker is not ready. Reload the page and try again.');

    return new Promise<GoogleDriveTemplateFile | null>((resolve, reject) => {
      const view = new pickerApi.DocsView(pickerApi.ViewId.DOCS);
      view.setMimeTypes('application/json');
      view.setIncludeFolders(false);
      const builder = new pickerApi.PickerBuilder();
      builder.setAppId(appId);
      builder.setOAuthToken(token);
      builder.setDeveloperKey(apiKey);
      builder.addView(view);
      builder.setCallback((data) => {
        if (data.action === pickerApi.Action.CANCEL) {
          resolve(null);
          return;
        }
        if (data.action !== pickerApi.Action.PICKED) return;

        const selectedFile = data.docs?.[0];
        if (!selectedFile?.id || !selectedFile.name) {
          reject(new Error('Google Picker did not return a valid file.'));
          return;
        }
        if (selectedFile.mimeType !== 'application/json' && !selectedFile.name.toLowerCase().endsWith('.json')) {
          reject(new Error('Select a JSON template file.'));
          return;
        }
        resolve({
          id: selectedFile.id,
          name: selectedFile.name,
          modifiedTime: '',
        });
      });
      builder.build().setVisible(true);
    });
  }, [getAccessToken]);

  const pickDriveFolder = useCallback(async () => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
    const appId = process.env.NEXT_PUBLIC_GOOGLE_APP_ID;
    if (!apiKey || !appId) {
      throw new Error('Google Picker is not configured. Set NEXT_PUBLIC_GOOGLE_API_KEY and NEXT_PUBLIC_GOOGLE_APP_ID, then rebuild the app.');
    }

    const token = await getAccessToken();
    await loadGooglePickerApi();
    const pickerApi = window.google?.picker;
    if (!pickerApi) throw new Error('Google Picker is not ready. Reload the page and try again.');

    return new Promise<{ id: string; name: string } | null>((resolve, reject) => {
      const view = new pickerApi.DocsView(pickerApi.ViewId.DOCS);
      view.setMimeTypes('application/vnd.google-apps.folder');
      view.setIncludeFolders(true);
      view.setSelectFolderEnabled(true);
      const builder = new pickerApi.PickerBuilder();
      builder.setAppId(appId);
      builder.setOAuthToken(token);
      builder.setDeveloperKey(apiKey);
      builder.addView(view);
      builder.setCallback((data) => {
        if (data.action === pickerApi.Action.CANCEL) {
          resolve(null);
          return;
        }
        if (data.action !== pickerApi.Action.PICKED) return;

        const selectedFolder = data.docs?.[0];
        if (!selectedFolder?.id || !selectedFolder.name || selectedFolder.mimeType !== 'application/vnd.google-apps.folder') {
          reject(new Error('Google Picker did not return a valid destination folder.'));
          return;
        }
        resolve({ id: selectedFolder.id, name: selectedFolder.name });
      });
      builder.build().setVisible(true);
    });
  }, [getAccessToken]);

  const loadTemplateFile = useCallback(async (fileId: string) => {
    const token = await getAccessToken();
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error(await getErrorMessage(response));
    return parseTemplateDocument(await response.text());
  }, [getAccessToken]);

  const saveTemplate = useCallback(async (template: RaidTemplateDocument, requestedFilename: string, folderId?: string) => {
    const token = await getAccessToken();
    const filename = ensureJsonFilename(requestedFilename);
    const boundary = `ttemplate_${crypto.randomUUID()}`;
    const metadata = JSON.stringify({
      name: filename,
      mimeType: 'application/json',
      ...(folderId ? { parents: [folderId] } : {}),
    });
    const body = [
      `--${boundary}`,
      'Content-Type: application/json; charset=UTF-8',
      '',
      metadata,
      `--${boundary}`,
      'Content-Type: application/json',
      '',
      exportTemplateDocument(template),
      `--${boundary}--`,
      '',
    ].join('\r\n');
    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    });
    if (!response.ok) throw new Error(await getErrorMessage(response));

    const result: unknown = await response.json();
    if (typeof result !== 'object' || result === null || !('id' in result) || typeof result.id !== 'string'
      || !('name' in result) || typeof result.name !== 'string') {
      throw new Error('Google Drive saved the template but returned an invalid file response.');
    }
    return { id: result.id, name: result.name };
  }, [getAccessToken]);

  const updateTemplateFile = useCallback(async (fileId: string, template: RaidTemplateDocument) => {
    const token = await getAccessToken();
    const response = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(fileId)}?uploadType=media&fields=id,name`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: exportTemplateDocument(template),
      },
    );
    if (!response.ok) throw new Error(await getErrorMessage(response));

    const result: unknown = await response.json();
    if (typeof result !== 'object' || result === null || !('id' in result) || typeof result.id !== 'string'
      || !('name' in result) || typeof result.name !== 'string') {
      throw new Error('Google Drive updated the template but returned an invalid file response.');
    }
    return { id: result.id, name: result.name };
  }, [getAccessToken]);

  const value = useMemo(() => ({
    isConnected: Boolean(accessToken),
    googleAccountEmail,
    disconnect,
    pickTemplateFile,
    pickDriveFolder,
    loadTemplateFile,
    saveTemplate,
    updateTemplateFile,
  }), [accessToken, googleAccountEmail, disconnect, pickTemplateFile, pickDriveFolder, loadTemplateFile, saveTemplate, updateTemplateFile]);

  return <GoogleDriveContext.Provider value={value}>{children}</GoogleDriveContext.Provider>;
}

export function useGoogleDrive() {
  const context = useContext(GoogleDriveContext);
  if (!context) throw new Error('useGoogleDrive must be used within GoogleDriveProvider');
  return context;
}
