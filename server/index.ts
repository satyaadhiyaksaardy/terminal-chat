// server/index.ts
import path from "path";
import { TextDecoder } from "util";

type ChatPayload =
  | { kind: "text"; content: string }
  | {
      kind: "file";
      name: string;
      mimeType: string;
      size: number;
      data: string;
    };

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB limit for live sharing
const textDecoder = new TextDecoder();

console.log("Starting WebSocket server...");

const server = Bun.serve<{ username: string }>({
  port: 3002,
  reusePort: true,
  hostname: "0.0.0.0",
  async fetch(req, server) {
    const url = new URL(req.url);
    if (url.pathname === "/chat") {
      // For simplicity, we'll use a query param for username.
      // In a real app, you'd use a more secure authentication method.
      const username = url.searchParams.get("username") || "Anonymous";
      const success = server.upgrade(req, {
        data: { username },
      });
      return success
        ? undefined
        : new Response("WebSocket upgrade error", { status: 400 });
    }

    const publicPath = path.resolve(import.meta.dir, "../dist");
    const filePath = path.join(
      publicPath,
      url.pathname === "/" ? "index.html" : url.pathname
    );

    const file = Bun.file(filePath);
    const exists = await file.exists();

    if (exists) {
      return new Response(file);
    }

    // Fallback to index.html for client-side routing
    const indexFile = Bun.file(path.join(publicPath, "index.html"));
    const indexExists = await indexFile.exists();
    if (indexExists) {
      return new Response(indexFile);
    }

    return new Response("Not found", { status: 404 });
  },
  websocket: {
    open(ws) {
      console.log(`[open] ${ws.data.username} has joined the chat`);
      ws.subscribe("the-group-chat");
      server.publish(
        "the-group-chat",
        JSON.stringify({
          type: "system",
          message: `${ws.data.username} has joined the chat`,
        })
      );
    },
    message(ws, message) {
      console.log(`[message] from ${ws.data.username}`);

      const payload = normalizePayload(message);

      if (!payload) {
        ws.send(
          JSON.stringify({
            type: "system",
            message:
              "Unrecognized message format. Only text or file payloads are supported.",
          })
        );
        return;
      }

      if (payload.kind === "file" && payload.size > MAX_FILE_SIZE_BYTES) {
        ws.send(
          JSON.stringify({
            type: "system",
            message: `File '${payload.name}' exceeds ${(
              MAX_FILE_SIZE_BYTES /
              (1024 * 1024)
            ).toFixed(1)}MB limit.`,
          })
        );
        return;
      }

      // Broadcast structured payload to all clients in the chat room
      server.publish(
        "the-group-chat",
        JSON.stringify({
          type: "user",
          username: ws.data.username,
          payload,
        })
      );
    },
    close(ws) {
      console.log(`[close] ${ws.data.username} has left the chat`);
      ws.unsubscribe("the-group-chat");
      server.publish(
        "the-group-chat",
        JSON.stringify({
          type: "system",
          message: `${ws.data.username} has left the chat`,
        })
      );
    },
  },
});

console.log(`WebSocket server listening on ws://localhost:${server.port}/chat`);

function normalizePayload(
  message: string | ArrayBuffer | ArrayBufferView
): ChatPayload | null {
  try {
    const parsed = JSON.parse(coerceToString(message));
    if (
      parsed &&
      typeof parsed === "object" &&
      parsed.kind === "text" &&
      typeof parsed.content === "string"
    ) {
      return { kind: "text", content: parsed.content.slice(0, 2000) };
    }

    if (
      parsed &&
      typeof parsed === "object" &&
      parsed.kind === "file" &&
      typeof parsed.name === "string" &&
      typeof parsed.mimeType === "string" &&
      typeof parsed.size === "number" &&
      typeof parsed.data === "string"
    ) {
      return {
        kind: "file",
        name: parsed.name,
        mimeType: parsed.mimeType,
        size: parsed.size,
        data: parsed.data,
      };
    }
  } catch {
    const text = coerceToString(message);
    if (text.trim().length) {
      return { kind: "text", content: text.slice(0, 2000) };
    }
  }

  return null;
}

function coerceToString(message: string | ArrayBuffer | ArrayBufferView) {
  if (typeof message === "string") {
    return message;
  }

  if (message instanceof ArrayBuffer) {
    return textDecoder.decode(message);
  }

  if (ArrayBuffer.isView(message)) {
    return textDecoder.decode(message);
  }

  return String(message);
}
