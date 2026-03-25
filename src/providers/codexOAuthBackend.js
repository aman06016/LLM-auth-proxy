import { resolveCodexAccess } from "../auth/codexTokenRefresher.js";
import { buildEndpoint, forwardJsonRequest } from "../upstream/forwardRequest.js";

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
          "accept": "application/json",
          "authorization": `Bearer ${auth.access}`
        },
        body
      });
    }
  };
}
