import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 5173;
const STATIC_ROOT = fileURLToPath(new URL("./", import.meta.url));

const ALLOWED_PUBLIC_PATHS = new Set([
  "/",
  "/index.html",
  "/styles.css",
  "/app.mjs",
  "/feedback-core.mjs",
  "/storage.mjs",
]);

const MIME_TYPES = Object.freeze({
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
});

const SECURITY_HEADERS = Object.freeze({
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; form-action 'self'",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
});

export function createFeedbackHubServer(options = {}) {
  const rootDirectory = options.rootDirectory ?? STATIC_ROOT;

  return createServer(async (request, response) => {
    if (!["GET", "HEAD"].includes(request.method)) {
      sendText(response, 405, "Method Not Allowed", {
        Allow: "GET, HEAD",
      });
      return;
    }

    const publicFile = resolvePublicFile(request.url, rootDirectory);

    if (!publicFile) {
      sendText(response, 404, "Not Found");
      return;
    }

    try {
      const fileStats = await stat(publicFile.filePath);

      if (!fileStats.isFile()) {
        sendText(response, 404, "Not Found");
        return;
      }

      response.writeHead(200, {
        ...SECURITY_HEADERS,
        "Cache-Control": "no-store",
        "Content-Length": fileStats.size,
        "Content-Type":
          MIME_TYPES[publicFile.extension] ?? "application/octet-stream",
      });

      if (request.method === "HEAD") {
        response.end();
        return;
      }

      createReadStream(publicFile.filePath).pipe(response);
    } catch (error) {
      if (error?.code === "ENOENT") {
        sendText(response, 404, "Not Found");
        return;
      }

      sendText(response, 500, "Internal Server Error");
    }
  });
}

export function startServer(options = {}) {
  const host = options.host ?? process.env.HOST ?? DEFAULT_HOST;
  const port = Number.parseInt(
    String(options.port ?? process.env.PORT ?? DEFAULT_PORT),
    10,
  );
  const logger = options.logger ?? console;
  const server = createFeedbackHubServer(options);

  server.listen(port, host, () => {
    logger.log(`Feedback Hub listening at http://${host}:${port}/`);
  });

  return server;
}

function resolvePublicFile(requestUrl, rootDirectory) {
  let pathname;

  try {
    pathname = new URL(requestUrl, "http://feedback-hub.local").pathname;
  } catch {
    return null;
  }

  if (!ALLOWED_PUBLIC_PATHS.has(pathname)) {
    return null;
  }

  const fileName = pathname === "/" ? "index.html" : pathname.slice(1);
  const filePath = path.resolve(rootDirectory, fileName);
  const normalizedRoot = path.resolve(rootDirectory);

  if (!filePath.startsWith(`${normalizedRoot}${path.sep}`)) {
    return null;
  }

  return {
    extension: path.extname(filePath),
    filePath,
  };
}

function sendText(response, statusCode, message, headers = {}) {
  response.writeHead(statusCode, {
    ...SECURITY_HEADERS,
    ...headers,
    "Content-Length": Buffer.byteLength(message),
    "Content-Type": "text/plain; charset=utf-8",
  });
  response.end(message);
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  startServer();
}
