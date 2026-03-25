# llm-auth-proxy

Local OpenAI-compatible proxy for two auth modes:

- `codex-oauth`
- `api-key`

## Why

Some projects only support an OpenAI-style `base_url` plus API key. This proxy lets those projects talk to a local service while the service decides how to authenticate upstream.

## v1 features

- `GET /health`
- `POST /v1/responses`
- `POST /v1/chat/completions`
- Codex OAuth auth-file loading and refresh
- API-key backend support
- Loopback bind by default

## Quick start

1. Copy the example config:

```bash
cp config/llm-auth-proxy.example.json config/llm-auth-proxy.json
```

2. Start the server:

```bash
npm start
```

3. Point a client at it:

```bash
export OPENAI_BASE_URL=http://127.0.0.1:4318/v1
export OPENAI_API_KEY=dummy
```

## Config

The server reads config from:

- `LLM_AUTH_PROXY_CONFIG`
- or `./config/llm-auth-proxy.json`

Environment overrides:

- `LLM_AUTH_PROXY_HOST`
- `LLM_AUTH_PROXY_PORT`
- `LLM_AUTH_PROXY_DEFAULT_BACKEND`

## Notes

- v1 does not support streaming.
- v1 does not support embeddings, images, audio, or realtime.
- For `chat/completions`, the proxy maps the request into a Responses-style payload and converts the response back into a chat-completions shape.
