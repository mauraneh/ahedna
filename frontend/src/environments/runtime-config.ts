export interface AppRuntimeConfig {
  apiUrl: string;
}

declare global {
  interface Window {
    __AHEDNA_CONFIG__?: Partial<AppRuntimeConfig>;
  }
}

const DEFAULT_API_URL = '/api';

function normalizeApiUrl(value: unknown): string {
  if (typeof value !== 'string') {
    return DEFAULT_API_URL;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return DEFAULT_API_URL;
  }

  return trimmed.replace(/\/+$/, '');
}

export function getRuntimeConfig(): AppRuntimeConfig {
  if (typeof window === 'undefined') {
    return {
      apiUrl: DEFAULT_API_URL,
    };
  }

  return {
    apiUrl: normalizeApiUrl(window.__AHEDNA_CONFIG__?.apiUrl),
  };
}
