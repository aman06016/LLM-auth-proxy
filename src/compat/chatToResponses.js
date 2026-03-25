import { AppError } from "../http/errors.js";

function mapContent(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === "string") return item;
        if (item?.type === "text") return item.text || "";
        return "";
      })
      .filter(Boolean)
      .join("\n");
  }
  return "";
}

export function chatToResponsesPayload(body) {
  if (!body || typeof body !== "object") {
    throw new AppError(400, "Chat request body is required");
  }
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    throw new AppError(400, "messages must be a non-empty array");
  }

  return {
    model: body.model,
    input: body.messages.map((message) => ({
      role: message.role,
      content: mapContent(message.content)
    })),
    max_output_tokens: body.max_tokens,
    temperature: body.temperature
  };
}

function extractResponseText(responseBody) {
  if (!responseBody || typeof responseBody !== "object") return "";
  if (typeof responseBody.output_text === "string") return responseBody.output_text;
  const output = Array.isArray(responseBody.output) ? responseBody.output : [];
  const parts = [];
  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const part of content) {
      if (typeof part?.text === "string") parts.push(part.text);
      else if (typeof part?.content === "string") parts.push(part.content);
    }
  }
  return parts.join("\n").trim();
}

export function responsesToChatCompletion(responseBody, requestedModel) {
  const text = extractResponseText(responseBody);
  return {
    id: responseBody?.id || `chatcmpl_${Date.now()}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: requestedModel || responseBody?.model || "unknown",
    choices: [
      {
        index: 0,
        finish_reason: "stop",
        message: {
          role: "assistant",
          content: text
        }
      }
    ],
    usage: responseBody?.usage
  };
}
