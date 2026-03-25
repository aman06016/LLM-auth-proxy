# Codex OAuth Setup

This guide is for a machine that already has `codex` CLI login working through ChatGPT OAuth.

The goal is simple:

- clone this project
- start the local proxy
- point any OpenAI-compatible project at `http://127.0.0.1:4318/v1`
- keep using your existing Codex OAuth instead of a normal OpenAI API key

## What This Proxy Does

Many projects only know how to talk to:

- `base_url`
- `api_key`

This proxy gives them that interface locally, while the proxy itself uses your existing Codex OAuth session under the hood.

## Prerequisites

You need all of these first:

1. `Node.js 20+`
2. `git`
3. working `codex` CLI login through ChatGPT OAuth
4. a local Codex auth file at one of these paths:
   - `~/.codex/auth.json`
   - or another path you will set in config

## Verify Codex OAuth First

Before using this project, make sure your Codex login already works.

If needed:

```bash
codex login
```

Then verify the auth file exists:

```bash
ls ~/.codex/auth.json
```

If that file does not exist, this proxy cannot use Codex OAuth yet.

## Clone And Start

Clone the project:

```bash
git clone <your-repo-url>
cd llm-auth-proxy
```

If you are using the already-shared local copy, just enter the project:

```bash
cd /path/to/llm-auth-proxy
```

Install dependencies:

```bash
npm install
```

Copy the config:

```bash
cp config/llm-auth-proxy.example.json config/llm-auth-proxy.json
```

Start the proxy:

```bash
npm start
```

For development mode with auto-restart:

```bash
npm run dev
```

## Default Behavior

By default, the proxy listens on:

```text
http://127.0.0.1:4318
```

And the default backend is:

```text
codex
```

Which means requests go through your Codex OAuth session.

## Config File

The default config file is:

```text
config/llm-auth-proxy.json
```

Important Codex section:

```json
{
  "defaultBackend": "codex",
  "backends": {
    "codex": {
      "type": "codex-oauth",
      "authFile": "~/.codex/auth.json",
      "baseUrl": "https://chatgpt.com/backend-api",
      "responsesPath": "/codex/responses"
    }
  }
}
```

If your auth file is somewhere else, change:

```json
"authFile": "~/.codex/auth.json"
```

to the real path.

## Verify The Proxy

Health check:

```bash
curl -sS http://127.0.0.1:4318/health
```

You should see both backend health and Codex auth availability.

Test the Responses API:

```bash
curl --location --request POST 'http://127.0.0.1:4318/v1/responses' \
  --header 'Authorization: Bearer dummy' \
  --header 'Content-Type: application/json' \
  --data '{
    "model": "gpt-5.4",
    "input": "Reply in one short sentence: say hello from the proxy."
  }'
```

Expected result:

- a normal JSON response body
- assistant output containing `Hello from the proxy.`

Test the Chat Completions compatibility route:

```bash
curl --location --request POST 'http://127.0.0.1:4318/v1/chat/completions' \
  --header 'Authorization: Bearer dummy' \
  --header 'Content-Type: application/json' \
  --data '{
    "model": "gpt-5.4",
    "messages": [
      { "role": "user", "content": "Reply in one short sentence: say hello from the proxy." }
    ]
  }'
```

Expected result:

- OpenAI-style `chat.completion` JSON
- assistant message containing `Hello from the proxy.`

## Use It In Other Projects

Point your client/project at the local proxy:

```bash
export OPENAI_BASE_URL=http://127.0.0.1:4318/v1
export OPENAI_API_KEY=dummy
```

The `dummy` key is only there because many clients require a non-empty API key string.
The proxy ignores it and uses the configured upstream backend internally.

Examples:

```bash
OPENAI_BASE_URL=http://127.0.0.1:4318/v1 OPENAI_API_KEY=dummy <your-project-command>
```

or in code:

```js
const client = new OpenAI({
  baseURL: "http://127.0.0.1:4318/v1",
  apiKey: "dummy"
});
```

## How Codex OAuth Is Used

This proxy does not use the public OpenAI API key path for Codex mode.

Instead it mirrors OpenClaw's working Codex transport:

- reads your local Codex OAuth tokens
- refreshes them when needed
- sends requests to the ChatGPT Codex backend
- converts the upstream SSE response into normal JSON for local clients

## Common Problems

### 1. `Codex auth file not found`

Fix:

- make sure `codex login` has already been completed
- verify the auth file path
- update `authFile` in config if needed

### 2. `Failed to connect to 127.0.0.1:4318`

Fix:

- make sure the proxy is running
- run:

```bash
curl -sS http://127.0.0.1:4318/health
```

### 3. `Upstream request failed`

Fix:

- verify your Codex login is still valid
- restart the proxy
- re-run the health check

### 4. Project still tries to hit OpenAI directly

Fix:

- confirm the project is actually using:
  - `OPENAI_BASE_URL=http://127.0.0.1:4318/v1`
  - `OPENAI_API_KEY=dummy`

## Environment Overrides

You can override runtime settings with env vars:

```bash
LLM_AUTH_PROXY_CONFIG=/path/to/config.json
LLM_AUTH_PROXY_HOST=127.0.0.1
LLM_AUTH_PROXY_PORT=4318
LLM_AUTH_PROXY_DEFAULT_BACKEND=codex
```

## Recommended First Test

Do these in order:

1. `curl http://127.0.0.1:4318/health`
2. test `/v1/responses`
3. test `/v1/chat/completions`
4. point one real project at the proxy

That is enough to confirm the machine is ready to use Codex OAuth through a normal local API surface.
