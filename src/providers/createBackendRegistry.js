import { AppError } from "../http/errors.js";
import { createApiKeyBackend } from "./apiKeyBackend.js";
import { createCodexOAuthBackend } from "./codexOAuthBackend.js";

export function createBackendRegistry(config) {
  const entries = {};
  for (const [name, backendConfig] of Object.entries(config.backends)) {
    if (backendConfig.type === "codex-oauth") {
      entries[name] = createCodexOAuthBackend(backendConfig);
      continue;
    }
    if (backendConfig.type === "api-key") {
      entries[name] = createApiKeyBackend(backendConfig);
      continue;
    }
    throw new AppError(500, `Unsupported backend type: ${backendConfig.type}`);
  }

  return {
    get(name) {
      const backend = entries[name];
      if (!backend) throw new AppError(500, `Unknown backend: ${name}`);
      return backend;
    },
    getDefault() {
      return this.get(config.defaultBackend);
    },
    list() {
      return Object.keys(entries);
    }
  };
}
