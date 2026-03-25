function redact(value) {
  if (!value || typeof value !== "string") return value;
  if (value.length <= 10) return "[redacted]";
  return `${value.slice(0, 3)}...[redacted]...${value.slice(-3)}`;
}

function sanitize(meta) {
  if (!meta || typeof meta !== "object") return meta;
  const next = {};
  for (const [key, value] of Object.entries(meta)) {
    if (/(authorization|token|secret|api[_-]?key|refresh|access)/i.test(key)) {
      next[key] = "[redacted]";
      continue;
    }
    if (typeof value === "string" && /(bearer\s+)/i.test(value)) {
      next[key] = redact(value);
      continue;
    }
    next[key] = value;
  }
  return next;
}

function log(level, message, meta) {
  const stamp = new Date().toISOString();
  const suffix = meta ? ` ${JSON.stringify(sanitize(meta))}` : "";
  console.log(`[${stamp}] ${level.toUpperCase()} ${message}${suffix}`);
}

export const logger = {
  info(message, meta) {
    log("info", message, meta);
  },
  warn(message, meta) {
    log("warn", message, meta);
  },
  error(message, meta) {
    log("error", message, meta);
  }
};
