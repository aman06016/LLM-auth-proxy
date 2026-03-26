import { AppError } from "../http/errors.js";
import { buildEndpoint, forwardJsonRequest, forwardStreamRequest } from "../upstream/forwardRequest.js";

function getApiKey(config) {
  const key = config.apiKey || process.env[config.apiKeyEnv || "OPENAI_API_KEY"];
  if (!key) {
    throw new AppError(500, `Missing API key for backend env ${config.apiKeyEnv || "OPENAI_API_KEY"}`);
  }
  return key;
}

export function createApiKeyBackend(config) {
  return {
    name: "api-key",
    async health() {
      return {
        ok: true,
        mode: "api-key",
        baseUrl: config.baseUrl,
        apiKeyEnv: config.apiKeyEnv || "OPENAI_API_KEY",
        hasApiKey: Boolean(getApiKey(config))
      };
    },
    async forwardResponses(body) {
      const request = {
        url: buildEndpoint(config.baseUrl, "/responses"),
        headers: {
          "content-type": "application/json",
          "accept": body?.stream === true ? "text/event-stream" : "application/json",
          "authorization": `Bearer ${getApiKey(config)}`
        },
        body
      };

      if (body?.stream === true) {
        return forwardStreamRequest(request);
      }

      return forwardJsonRequest(request);
    },
    async forwardChatCompletions(body) {
      return forwardJsonRequest({
        url: buildEndpoint(config.baseUrl, "/chat/completions"),
        headers: {
          "content-type": "application/json",
          "accept": "application/json",
          "authorization": `Bearer ${getApiKey(config)}`
        },
        body
      });
    }
  };
}
