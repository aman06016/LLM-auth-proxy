import { resolveCodexAccess } from "../auth/codexTokenRefresher.js";
import { buildEndpoint, forwardJsonRequest } from "../upstream/forwardRequest.js";
import os from "node:os";

const ALLOWED_CODEX_FIELDS = [
  "model",
  "input",
  "instructions",
  "max_output_tokens",
  "tools",
  "tool_choice",
  "parallel_tool_calls",
  "prompt_cache_key",
  "reasoning",
  "text",
  "metadata",
  "previous_response_id",
  "conversation",
  "include"
];

export function createCodexOAuthBackend(config) {
  return {
    name: "codex-oauth",
    async health() {
      const auth = await resolveCodexAccess(config);
      return {
        ok: true,
        mode: "codex-oauth",
        authFile: config.authFile,
        hasAccess: Boolean(auth.access),
        expires: auth.expires ?? null
      };
    },
    async forwardResponses(body) {
      const auth = await resolveCodexAccess(config);
      return forwardJsonRequest({
        url: buildEndpoint(config.baseUrl, config.responsesPath || "/responses"),
        headers: {
          "content-type": "application/json",
          "accept": "text/event-stream",
          "authorization": `Bearer ${auth.access}`,
          "OpenAI-Beta": "responses=experimental",
          "originator": "pi",
          "User-Agent": `pi (${os.platform()} ${os.release()}; ${os.arch()})`,
          ...(auth.accountId ? { "chatgpt-account-id": auth.accountId } : {})
        },
        body: normalizeCodexBody(body)
      });
    }
  };
}

function normalizeCodexBody(body) {
  const nextBody = {
    ...pickAllowedFields(body),
    instructions: typeof body?.instructions === "string" ? body.instructions : "",
    store: false,
    stream: body?.stream ?? true
  };

  if (!Array.isArray(nextBody.input)) {
    nextBody.input = [
      {
        role: "user",
        content: typeof body?.input === "string" ? body.input : JSON.stringify(body?.input ?? "")
      }
    ];
  }

  return nextBody;
}

function pickAllowedFields(body) {
  const picked = {};
  for (const key of ALLOWED_CODEX_FIELDS) {
    if (body?.[key] !== undefined) {
      picked[key] = body[key];
    }
  }
  return picked;
}
