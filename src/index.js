import { loadConfig } from "./config/loadConfig.js";
import { createBackendRegistry } from "./providers/createBackendRegistry.js";
import { createServer } from "./server/createServer.js";
import { logger } from "./logging/logger.js";

const loaded = loadConfig();
const registry = createBackendRegistry(loaded.data);
const server = createServer({ registry });

server.listen(loaded.data.server.port, loaded.data.server.host, () => {
  logger.info("llm-auth-proxy listening", {
    host: loaded.data.server.host,
    port: loaded.data.server.port,
    configPath: loaded.path,
    defaultBackend: loaded.data.defaultBackend
  });
});
