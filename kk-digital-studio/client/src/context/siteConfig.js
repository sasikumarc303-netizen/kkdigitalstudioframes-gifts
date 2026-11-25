import { DEFAULT_CONFIG } from '../../../server/services/defaults.js';

const MAX_ATTEMPTS = 2;
export const SITE_CONFIG_TIMEOUT_MS = 10_000;

const isRetryable = (error) =>
  error?.network === true ||
  (Number.isInteger(error?.status) && error.status >= 500 && error.status <= 599);

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function loadSiteConfig(fetchSite, pause = wait) {
  let error;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetchSite({ timeoutMs: SITE_CONFIG_TIMEOUT_MS });
      if (!response?.config || typeof response.config !== 'object' || Array.isArray(response.config)) {
        throw new Error('The server returned incomplete site settings.');
      }

      return {
        config: response.config,
        payment: response.payment ?? null,
        error: null,
        usingFallback: false,
      };
    } catch (cause) {
      error = cause instanceof Error ? cause : new Error('Site settings could not be loaded.');
      if (attempt === MAX_ATTEMPTS || !isRetryable(error)) break;
      await pause(750);
    }
  }

  return {
    config: DEFAULT_CONFIG,
    payment: null,
    error,
    usingFallback: true,
  };
}
