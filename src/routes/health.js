export async function handleHealth(registry) {
  const backendSummaries = [];
  for (const name of registry.list()) {
    const backend = registry.get(name);
    try {
      backendSummaries.push({
        name,
        ...(await backend.health())
      });
    } catch (error) {
      backendSummaries.push({
        name,
        ok: false,
        error: error.message
      });
    }
  }

  return {
    ok: true,
    backends: backendSummaries
  };
}
