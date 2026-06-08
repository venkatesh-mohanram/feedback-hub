import assert from "node:assert/strict";
import test from "node:test";
import { createFeedbackHubServer } from "./server.mjs";

test("node server serves the app shell", async () => {
  const { server, baseUrl } = await listenOnRandomPort();

  try {
    const response = await fetch(`${baseUrl}/`);
    const body = await response.text();

    assert.equal(response.status, 200);
    assert.equal(
      response.headers.get("content-type"),
      "text/html; charset=utf-8",
    );
    assert.match(
      response.headers.get("content-security-policy"),
      /default-src 'self'/,
    );
    assert.match(body, /<title>Feedback Hub<\/title>/);
    assert.match(body, /src="\.\/app\.mjs"/);
  } finally {
    await closeServer(server);
  }
});

test("node server serves browser modules with JavaScript content type", async () => {
  const { server, baseUrl } = await listenOnRandomPort();

  try {
    const response = await fetch(`${baseUrl}/app.mjs`);
    const body = await response.text();

    assert.equal(response.status, 200);
    assert.equal(
      response.headers.get("content-type"),
      "text/javascript; charset=utf-8",
    );
    assert.match(body, /createFeedbackRepository/);
  } finally {
    await closeServer(server);
  }
});

test("node server blocks non-public source files and unsupported methods", async () => {
  const { server, baseUrl } = await listenOnRandomPort();

  try {
    const testFileResponse = await fetch(`${baseUrl}/server.test.mjs`);
    const traversalResponse = await fetch(`${baseUrl}/../README.md`);
    const postResponse = await fetch(`${baseUrl}/`, { method: "POST" });

    assert.equal(testFileResponse.status, 404);
    assert.equal(traversalResponse.status, 404);
    assert.equal(postResponse.status, 405);
    assert.equal(postResponse.headers.get("allow"), "GET, HEAD");
  } finally {
    await closeServer(server);
  }
});

function listenOnRandomPort() {
  const server = createFeedbackHubServer();

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve({
        baseUrl: `http://${address.address}:${address.port}`,
        server,
      });
    });
  });
}

function closeServer(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}
