import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { AppError } from "../http/errors.js";

function expandHome(input) {
  if (!input || typeof input !== "string") return input;
  if (input === "~") return os.homedir();
  if (input.startsWith("~/")) return path.join(os.homedir(), input.slice(2));
  return input;
}

function loadFile(filePath) {
  const resolved = expandHome(filePath);
  if (!fs.existsSync(resolved)) {
    throw new AppError(500, `Config file not found: ${resolved}`);
  }
  const raw = fs.readFileSync(resolved, "utf8");
  return { resolved, data: JSON.parse(raw) };
}

export function loadConfig() {
  const configuredPath = process.env.LLM_AUTH_PROXY_CONFIG || path.resolve(process.cwd(), "config/llm-auth-proxy.json");
  const { resolved, data } = loadFile(configuredPath);

  data.server ||= {};
  data.server.host = process.env.LLM_AUTH_PROXY_HOST || data.server.host || "127.0.0.1";
  data.server.port = Number(process.env.LLM_AUTH_PROXY_PORT || data.server.port || 4318);
  data.defaultBackend = process.env.LLM_AUTH_PROXY_DEFAULT_BACKEND || data.defaultBackend;

  if (!data.defaultBackend) {
    throw new AppError(500, "defaultBackend is required in config");
  }
  if (!data.backends || !data.backends[data.defaultBackend]) {
    throw new AppError(500, `Configured default backend "${data.defaultBackend}" is missing`);
  }

  for (const backend of Object.values(data.backends)) {
    if (backend.authFile) backend.authFile = expandHome(backend.authFile);
  }

  return {
    path: resolved,
    data
  };
}
