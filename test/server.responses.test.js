import test from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";

import { createServer } from "../src/server/createServer.js";

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve(`http://${address.address}:${address.port}`);
    });
  });
}

test("POST /v1/responses returns JSON for non-stream requests", async () => {
  const registry = {
    getDefault() {
      return {
        async forwardResponses(body) {
          assert.equal(body.model, "gpt-5");
          return {
            status: 200,
            body: { id: "resp_1", output_text: "hi" }
          };
        }
      };
    }
  };

  const server = createServer({ registry });
  const baseUrl = await listen(server);

  try {
    const response = await fetch(`${baseUrl}/v1/responses`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model: "gpt-5", input: "hi" })
    });

    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type") || "", /application\/json/);
    assert.deepEqual(await response.json(), { id: "resp_1", output_text: "hi" });
  } finally {
    server.close();
  }
});

test("POST /v1/responses passes through SSE for stream requests", async () => {
  const registry = {
    getDefault() {
      return {
        async forwardResponses(body) {
          assert.equal(body.model, "gpt-5");
          assert.equal(body.stream, true);
          return {
            status: 200,
            headers: new Headers({
              "content-type": "text/event-stream; charset=utf-8"
            }),
            bodyStream: Readable.from([
              "event: response.output_text.delta\n",
              'data: {"type":"response.output_text.delta","delta":"hi"}\n\n',
              "event: response.completed\n",
              'data: {"type":"response.completed","response":{"id":"resp_1"}}\n\n'
            ])
          };
        }
      };
    }
  };

  const server = createServer({ registry });
  const baseUrl = await listen(server);

  try {
    const response = await fetch(`${baseUrl}/v1/responses`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model: "gpt-5", input: "hi", stream: true })
    });

    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type") || "", /text\/event-stream/);
    const text = await response.text();
    assert.match(text, /response\.output_text\.delta/);
    assert.match(text, /"delta":"hi"/);
    assert.match(text, /response\.completed/);
  } finally {
    server.close();
  }
});
