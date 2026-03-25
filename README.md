# LLM-auth-proxy

`LLM-auth-proxy` is a local OpenAI-compatible proxy that lets existing tools and projects keep using standard OpenAI-style endpoints while authenticating upstream with either Codex OAuth or a normal API key.

Supported auth modes:

- `codex-oauth`
- `api-key`

## Why

Some projects only support an OpenAI-style `base_url` plus API key. This proxy lets those projects talk to a local service while the service decides how to authenticate upstream.

## v1 features

- `GET /health`
- `GET /v1/models`
- `POST /v1/responses`
- `POST /v1/chat/completions`
- Codex OAuth auth-file loading and refresh
- API-key backend support
- Loopback bind by default

## Supported API surface

The local proxy currently supports:

- `GET /health`
  health summary for configured backends
- `GET /v1/models`
  lightweight model list for OpenAI-compatible clients that probe available models
- `POST /v1/responses`
  primary local Responses API surface
- `POST /v1/chat/completions`
  compatibility route for projects that still send chat-completions style bodies

Compatibility behavior:

- extra unsupported fields are ignored when possible
- `temperature` is dropped for `gpt-5*` requests
- `messages`, `input`, and `prompt` are normalized into a Codex-compatible request body

Not supported in v1:

- streaming responses
- embeddings
- images
- audio
- realtime APIs

## Quick start

For a Codex OAuth-specific machine setup guide, read:

- `./SETUP-CODEX-OAUTH.md`

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

- For `chat/completions`, the proxy maps the request into a Responses-style payload and converts the response back into a chat-completions shape.
- Codex OAuth requests are sent to the ChatGPT Codex backend path (`/backend-api/codex/responses`) with the same Codex-specific headers OpenClaw uses.
