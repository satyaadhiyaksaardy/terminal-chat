import { useState, useEffect, useRef } from "react";
import { MessageDisplay } from "./MessageDisplay";
import { TerminalInput } from "./TerminalInput";

export type ChatPayload =
  | { kind: "text"; content: string }
  | {
      kind: "file";
      name: string;
      mimeType: string;
      size: number;
      data: string;
    };

interface Message {
  id: string;
  type: "user" | "system";
  username: string;
  payload: ChatPayload;
  timestamp: number;
}

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

export const ChatTerminal = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [userId, setUserId] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const randomId = `anon${Math.floor(1000 + Math.random() * 9000)}`;
    setUserId(randomId);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const room = params.get("room") || generateRoomCode();
    setRoomCode(room);

    if (!params.get("room")) {
      window.history.replaceState({}, "", `?room=${room}`);
    }
  }, []);

  useEffect(() => {
    if (!userId) return;

    const wsUrl = resolveWebSocketUrl(userId);
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("WebSocket connection established");
      setSocket(ws);
    };

    ws.onmessage = (event) => {
      try {
        const receivedMessage = JSON.parse(event.data);
        if (receivedMessage.type === "system") {
          addSystemMessage(receivedMessage.message);
          return;
        }

        if (receivedMessage.type === "user" && receivedMessage.payload) {
          addUserMessage(
            receivedMessage.username || "anon",
            receivedMessage.payload
          );
        }
      } catch (error) {
        console.error("Failed to parse message", error);
      }
    };

    ws.onclose = () => {
      console.log("WebSocket connection closed");
      addSystemMessage("Connection to server lost.");
      setSocket(null);
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      addSystemMessage("An error occurred with the connection.");
    };

    return () => {
      ws.close();
    };
  }, [userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const generateRoomCode = () => {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const addSystemMessage = (text: string) => {
    const newMessage: Message = {
      id: `${Date.now()}-${Math.random()}`,
      type: "system",
      username: "system",
      payload: { kind: "text", content: text },
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  const addUserMessage = (username: string, payload: ChatPayload) => {
    const newMessage: Message = {
      id: `${Date.now()}-${Math.random()}`,
      type: "user",
      username,
      payload,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  const handleCommand = (command: string) => {
    const cmd = command.toLowerCase().trim();

    switch (cmd) {
      case "/help":
        addSystemMessage("Available commands:");
        addSystemMessage("/help - Show this help message");
        addSystemMessage("/clear - Clear the terminal");
        addSystemMessage("/id - Show your anonymous ID");
        addSystemMessage("/room - Show current room code");
        break;

      case "/clear":
        setMessages([]);
        break;

      case "/id":
        addSystemMessage(`Your ID: ${userId}`);
        break;

      case "/room":
        addSystemMessage(`Current room: ${roomCode}`);
        break;

      default:
        addSystemMessage(
          `Unknown command: ${command}. Type /help for available commands.`
        );
    }
  };

  const handleSendMessage = (text: string) => {
    const sanitized = text.trim();
    if (!sanitized) {
      return;
    }

    if (sanitized.startsWith("/")) {
      handleCommand(sanitized);
      return;
    }

    if (socket && socket.readyState === WebSocket.OPEN) {
      const payload: ChatPayload = { kind: "text", content: sanitized };
      socket.send(JSON.stringify(payload));
      return;
    }

    addSystemMessage("You are not connected to the server.");
  };

  const handleSendFile = async (file: File) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      addSystemMessage("Cannot send file: not connected to the server.");
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      addSystemMessage(
        `File '${file.name}' exceeds ${(
          MAX_FILE_SIZE_BYTES /
          (1024 * 1024)
        ).toFixed(1)}MB limit.`
      );
      return;
    }

    try {
      const base64 = await fileToBase64(file);
      const payload: ChatPayload = {
        kind: "file",
        name: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        data: base64,
      };

      socket.send(JSON.stringify(payload));
    } catch (error) {
      console.error("Failed to encode file", error);
      addSystemMessage(`Failed to send file '${file.name}'.`);
    }
  };

  const fileToBase64 = async (file: File) => {
    const buffer = await file.arrayBuffer();
    let binary = "";
    const bytes = new Uint8Array(buffer);
    const chunkSize = 0x8000;

    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode(...chunk);
    }

    return btoa(binary);
  };

  const resolveWebSocketUrl = (username: string) => {
    const explicitBase = import.meta.env.VITE_WS_URL?.trim();
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const fallbackBase = `${protocol}://${window.location.host}/chat`;
    const baseUrl = explicitBase || fallbackBase;

    try {
      const url = new URL(baseUrl, window.location.origin);
      url.searchParams.set("username", username);
      if (!explicitBase) {
        url.protocol = protocol;
      }
      return url.toString();
    } catch (error) {
      console.warn("Invalid WebSocket base URL", baseUrl, error);
      const separator = baseUrl.includes("?") ? "&" : "?";
      return `${baseUrl}${separator}username=${encodeURIComponent(username)}`;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <div className="px-4 py-2 border-b border-border terminal-glow">
        <div className="text-sm">
          <span className="text-muted-foreground">session:</span> {userId}
          <span className="ml-6 text-muted-foreground">room:</span> /{roomCode}
          <span className="ml-6 text-muted-foreground">status:</span>{" "}
          {socket ? (
            <span className="text-green-400">connected</span>
          ) : (
            <span className="text-red-400">disconnected</span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-2">
        <div className="space-y-1">
          {messages.length === 0 && (
            <div className="text-muted-foreground text-sm">
              <p>Terminal Chat v1.0.0</p>
              <p>Type /help for available commands</p>
              <p className="mt-2">Connecting to server...</p>
            </div>
          )}
          {messages.map((message) => (
            <MessageDisplay
              key={message.id}
              userId={message.username}
              payload={message.payload}
              isSystem={message.type === "system"}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <TerminalInput onSend={handleSendMessage} onSendFile={handleSendFile} />
    </div>
  );
};
