import { AppError } from "../http/errors.js";
import { chatToResponsesPayload, responsesToChatCompletion } from "../compat/chatToResponses.js";

export async function handleChatCompletionsRoute(registry, body) {
  if (!body?.model) {
    throw new AppError(400, "model is required");
  }
  const backend = registry.getDefault();

  if (typeof backend.forwardChatCompletions === "function") {
    return backend.forwardChatCompletions(body);
  }

  const mapped = chatToResponsesPayload(body);
  const upstream = await backend.forwardResponses(mapped);
  return {
    status: upstream.status,
    headers: upstream.headers,
    body: responsesToChatCompletion(upstream.body, body.model)
  };
}
