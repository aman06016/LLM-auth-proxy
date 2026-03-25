import { AppError } from "../http/errors.js";

function isGpt5Family(model) {
  return typeof model === "string" && /(^|\/)gpt-5([.-]|$)/i.test(model);
}

function normalizeMessages(body) {
  if (Array.isArray(body?.messages) && body.messages.length > 0) {
    return body.messages;
  }

  if (Array.isArray(body?.input) && body.input.length > 0) {
    return body.input.map((item) => {
      if (typeof item === "string") {
        return { role: "user", content: item };
      }
      if (item && typeof item === "object") {
        return {
          role: item.role || "user",
          content: item.content ?? item.text ?? ""
        };
      }
      return { role: "user", content: "" };
    });
  }

  if (typeof body?.input === "string" && body.input.trim()) {
    return [{ role: "user", content: body.input }];
  }

  if (typeof body?.prompt === "string" && body.prompt.trim()) {
    return [{ role: "user", content: body.prompt }];
  }

  return null;
}

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

function mapResponseFormat(responseFormat) {
  if (!responseFormat || typeof responseFormat !== "object") return undefined;

  if (responseFormat.type === "json_schema" && responseFormat.json_schema) {
    const schemaConfig = responseFormat.json_schema;
    return {
      format: {
        type: "json_schema",
        name: schemaConfig.name || "response",
        strict: schemaConfig.strict ?? true,
        schema: schemaConfig.schema || {}
      }
    };
  }

  return undefined;
}

export function chatToResponsesPayload(body) {
  if (!body || typeof body !== "object") {
    throw new AppError(400, "Chat request body is required");
  }
  const messages = normalizeMessages(body);
  if (!messages) {
    throw new AppError(400, "messages must be a non-empty array");
  }

  const payload = {
    model: body.model,
    input: messages.map((message) => ({
      role: message.role,
      content: mapContent(message.content)
    })),
    max_output_tokens: body.max_tokens
  };

  if (typeof body.temperature === "number" && Number.isFinite(body.temperature) && !isGpt5Family(body.model)) {
    payload.temperature = body.temperature;
  }

  const textConfig = mapResponseFormat(body.response_format);
  if (textConfig) {
    payload.text = textConfig;
  }

  return payload;
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
