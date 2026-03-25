import { AppError } from "../http/errors.js";

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
  const maybeJson = contentType.includes("application/json") && text ? JSON.parse(text) : text;

  if (!response.ok) {
    throw new AppError(response.status, `Upstream request failed: ${response.statusText}`, maybeJson);
  }

  return {
    status: response.status,
    headers: response.headers,
    body: maybeJson
  };
}

export function buildEndpoint(baseUrl, pathname) {
  return joinUrl(baseUrl, pathname);
}
