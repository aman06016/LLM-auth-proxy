import { AppError } from "./errors.js";

const MAX_BYTES = 5 * 1024 * 1024;

export async function readJsonBody(req) {
  const chunks = [];
  let total = 0;

  for await (const chunk of req) {
    total += chunk.length;
    if (total > MAX_BYTES) {
      throw new AppError(413, "Request body too large");
    }
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) {
    throw new AppError(400, "Request body is required");
  }

  try {
    return JSON.parse(raw);
  } catch {
    throw new AppError(400, "Request body must be valid JSON");
  }
}
