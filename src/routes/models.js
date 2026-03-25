const DEFAULT_MODELS = [
  "gpt-5.4",
  "gpt-5",
  "gpt-5-mini",
  "gpt-5-nano"
];

export async function handleModels(registry) {
  const backends = [];
  for (const name of registry.list()) {
    const backend = registry.get(name);
    try {
      backends.push({
        name,
        ...(await backend.health())
      });
    } catch (error) {
      backends.push({
        name,
        ok: false,
        error: error.message
      });
    }
  }

  const ids = new Set(DEFAULT_MODELS);
  return {
    object: "list",
    data: [...ids].map((id) => ({
      id,
      object: "model",
      created: 0,
      owned_by: "llm-auth-proxy"
    })),
    backends
  };
}
