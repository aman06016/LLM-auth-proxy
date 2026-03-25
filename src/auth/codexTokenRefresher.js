import { loadCodexAuthFile, saveCodexAuthFile } from "./codexAuthStore.js";
import { AppError } from "../http/errors.js";

const DEFAULT_BUFFER_MS = 5 * 60 * 1000;
const DEFAULT_CLIENT_ID = "app_EMoamEEZ73f0CkXaXp7hrann";
const DEFAULT_TOKEN_URL = "https://auth.openai.com/oauth/token";

function isFresh(expires) {
  return typeof expires === "number" && Number.isFinite(expires) && Date.now() + DEFAULT_BUFFER_MS < expires;
}

async function refreshWithOpenAIOAuth(credential, clientId = DEFAULT_CLIENT_ID) {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: credential.refresh,
    client_id: clientId
  });

  const response = await fetch(DEFAULT_TOKEN_URL, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "accept": "application/json"
    },
    body
  });

  if (!response.ok) {
    const text = await response.text();
    throw new AppError(502, `Codex OAuth refresh failed: ${text || response.statusText}`);
  }

  const payload = await response.json();
  const access = payload.access_token?.trim();
  const refresh = payload.refresh_token?.trim() || credential.refresh;
  const expiresIn = payload.expires_in;

  if (!access) {
    throw new AppError(502, "Codex OAuth refresh response missing access_token");
  }
  if (typeof expiresIn !== "number" || !Number.isFinite(expiresIn) || expiresIn <= 0) {
    throw new AppError(502, "Codex OAuth refresh response missing expires_in");
  }

  return {
    access,
    refresh,
    expires: Date.now() + expiresIn * 1000,
    accountId: credential.accountId,
    email: credential.email
  };
}

export async function resolveCodexAccess(config) {
  const loaded = loadCodexAuthFile(config.authFile);
  if (isFresh(loaded.normalized.expires)) {
    return loaded.normalized;
  }

  try {
    const refreshed = await refreshWithOpenAIOAuth(loaded.normalized, config.clientId);
    saveCodexAuthFile(config.authFile, loaded, refreshed);
    return refreshed;
  } catch (error) {
    if (loaded.normalized.access) {
      return loaded.normalized;
    }
    throw error;
  }
}
