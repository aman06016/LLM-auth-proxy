import { AppError } from "../http/errors.js";

export async function handleResponsesRoute(registry, body) {
  if (!body?.model) {
    throw new AppError(400, "model is required");
  }
  const backend = registry.getDefault();
  return backend.forwardResponses(body);
}
