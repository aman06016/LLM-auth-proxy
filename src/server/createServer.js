import http from "node:http";
import { randomUUID } from "node:crypto";
import { readJsonBody } from "../http/readJsonBody.js";
import { sendJson } from "../http/sendJson.js";
import { AppError, isAppError } from "../http/errors.js";
import { logger } from "../logging/logger.js";
import { handleHealth } from "../routes/health.js";
import { handleResponsesRoute } from "../routes/responses.js";
import { handleChatCompletionsRoute } from "../routes/chatCompletions.js";

export function createServer({ registry }) {
  return http.createServer(async (req, res) => {
    const requestId = randomUUID();
    try {
      if (req.method === "GET" && req.url === "/health") {
        return sendJson(res, 200, await handleHealth(registry));
      }

      if (req.method === "POST" && req.url === "/v1/responses") {
        const body = await readJsonBody(req);
        const result = await handleResponsesRoute(registry, body);
        return sendJson(res, result.status || 200, result.body);
      }

      if (req.method === "POST" && req.url === "/v1/chat/completions") {
        const body = await readJsonBody(req);
        const result = await handleChatCompletionsRoute(registry, body);
        return sendJson(res, result.status || 200, result.body);
      }

      throw new AppError(404, "Not found");
    } catch (error) {
      const status = isAppError(error) ? error.status : 500;
      logger.error("request failed", {
        requestId,
        method: req.method,
        url: req.url,
        status,
        error: error.message
      });
      sendJson(res, status, {
        error: {
          message: error.message || "Internal server error",
          type: isAppError(error) ? "app_error" : "internal_error",
          details: isAppError(error) ? error.details : undefined
        }
      });
    }
  });
}
