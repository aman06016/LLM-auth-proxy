import { AppError } from "../http/errors.js";
import { Readable } from "node:stream";

function joinUrl(baseUrl, pathname) {
  const trimmedBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const trimmedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${trimmedBase}${trimmedPath}`;
}

export async function forwardJsonRequest({ url, method = "POST", headers = {}, body }) {
  const response = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  const contentType = response.headers.get("content-type") || "";
  const text = await response.text();
  const maybeJson = parseUpstreamBody(contentType, text);

  if (!response.ok) {
    throw new AppError(response.status, `Upstream request failed: ${response.statusText}`, maybeJson);
  }

  return {
    status: response.status,
    headers: response.headers,
    body: maybeJson
  };
}

export async function forwardStreamRequest({ url, method = "POST", headers = {}, body }) {
  const response = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  if (!response.ok) {
    const contentType = response.headers.get("content-type") || "";
    const text = await response.text();
    const maybeJson = parseUpstreamBody(contentType, text);
    throw new AppError(response.status, `Upstream request failed: ${response.statusText}`, maybeJson);
  }

  return {
    status: response.status,
    headers: response.headers,
    bodyStream: toNodeReadable(response.body)
  };
}

export function buildEndpoint(baseUrl, pathname) {
  return joinUrl(baseUrl, pathname);
}

function parseUpstreamBody(contentType, text) {
  if (!text) return "";
  if (contentType.includes("application/json")) {
    return JSON.parse(text);
  }
  if (contentType.includes("text/event-stream") || looksLikeSse(text)) {
    return parseSseTerminalPayload(text);
  }
  return text;
}

function parseSseTerminalPayload(text) {
  const chunks = text
    .split(/\n\n+/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  let lastEvent = null;
  for (const chunk of chunks) {
    const data = chunk
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trim())
      .join("\n")
      .trim();

    if (!data || data === "[DONE]") continue;

    try {
      const event = JSON.parse(data);
      if (event?.type === "response.completed" || event?.type === "response.done") {
        return event.response ?? event;
      }
      lastEvent = event;
    } catch {
      // Ignore malformed SSE frames and keep the last valid event.
    }
  }

  return lastEvent ?? text;
}

function looksLikeSse(text) {
  return text.startsWith("event:") || text.startsWith("data:");
}

function toNodeReadable(body) {
  if (!body) return Readable.from([]);
  if (typeof body.pipe === "function") {
    return body;
  }
  return Readable.fromWeb(body);
}
