import { AppError } from "../http/errors.js";
import { chatToResponsesPayload } from "../compat/chatToResponses.js";

function normalizeResponsesBody(body) {
  if (!body || typeof body !== "object") {
    return body;
  }

  if (Array.isArray(body.messages) && body.messages.length > 0) {
    return {
      ...chatToResponsesPayload(body),
      model: body.model
    };
  }

  const nextBody = { ...body };
  if (typeof nextBody.temperature === "number" && /^gpt-5([.-]|$)/i.test(String(nextBody.model || ""))) {
    delete nextBody.temperature;
  }
  return nextBody;
}

export async function handleResponsesRoute(registry, body) {
  if (!body?.model) {
    throw new AppError(400, "model is required");
  }
  const backend = registry.getDefault();
  return backend.forwardResponses(normalizeResponsesBody(body));
}
