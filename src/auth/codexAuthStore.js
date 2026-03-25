import fs from "node:fs";
import { AppError } from "../http/errors.js";

function normalizeFromAuthProfiles(raw) {
  const profiles = raw?.profiles;
  if (!profiles || typeof profiles !== "object") return null;
  const firstOauth = Object.values(profiles).find((entry) => entry && entry.type === "oauth" && entry.provider === "openai-codex");
  if (!firstOauth) return null;
  return {
    source: "auth-profiles",
    access: firstOauth.access,
    refresh: firstOauth.refresh,
    expires: firstOauth.expires,
    accountId: firstOauth.accountId,
    email: firstOauth.email
  };
}

function normalizeFromCodexAuth(raw) {
  const tokens = raw?.tokens;
  if (!tokens || typeof tokens !== "object") return null;
  return {
    source: "codex-auth",
    access: tokens.access_token,
    refresh: tokens.refresh_token,
    expires: decodeJwtExpiry(tokens.access_token),
    accountId: tokens.account_id ?? raw?.account_id ?? null,
    email: null
  };
}

function decodeJwtExpiry(token) {
  if (!token || typeof token !== "string") return undefined;
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
    return typeof payload.exp === "number" ? payload.exp * 1000 : undefined;
  } catch {
    return undefined;
  }
}

export function loadCodexAuthFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new AppError(500, `Codex auth file not found: ${filePath}`);
  }
  const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const normalized = normalizeFromAuthProfiles(raw) || normalizeFromCodexAuth(raw);
  if (!normalized?.access || !normalized?.refresh) {
    throw new AppError(500, `Unsupported or incomplete Codex auth file: ${filePath}`);
  }
  return {
    raw,
    normalized
  };
}

export function saveCodexAuthFile(filePath, loaded, updated) {
  const nextRaw = structuredClone(loaded.raw);

  if (loaded.normalized.source === "auth-profiles") {
    for (const entry of Object.values(nextRaw.profiles || {})) {
      if (entry?.type === "oauth" && entry.provider === "openai-codex") {
        entry.access = updated.access;
        entry.refresh = updated.refresh;
        entry.expires = updated.expires;
        if (updated.email) entry.email = updated.email;
        if (updated.accountId) entry.accountId = updated.accountId;
        break;
      }
    }
  } else {
    nextRaw.tokens ||= {};
    nextRaw.tokens.access_token = updated.access;
    nextRaw.tokens.refresh_token = updated.refresh;
    if (updated.accountId) nextRaw.tokens.account_id = updated.accountId;
    nextRaw.last_refresh = new Date().toISOString();
  }

  fs.writeFileSync(filePath, `${JSON.stringify(nextRaw, null, 2)}\n`, "utf8");
}
