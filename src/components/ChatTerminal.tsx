import { useState, useEffect, useRef } from "react";
import { MessageDisplay } from "./MessageDisplay";
import { TerminalInput } from "./TerminalInput";

interface Message {
  id: string;
  userId: string;
  text: string;
  timestamp: number;
}

export const ChatTerminal = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [userId, setUserId] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Generate random user ID on mount
  useEffect(() => {
    const randomId = `anon${Math.floor(1000 + Math.random() * 9000)}`;
    setUserId(randomId);
  }, []);

  // Get room code from URL parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const room = params.get("room") || generateRoomCode();
    setRoomCode(room);
    
    // Update URL if no room parameter exists
    if (!params.get("room")) {
      window.history.replaceState({}, "", `?room=${room}`);
    }
  }, []);

  // Auto-scroll to bottom when new messages arrive
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

  const addMessage = (text: string, senderId: string = userId) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      userId: senderId,
      text,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  const handleCommand = (command: string) => {
    const cmd = command.toLowerCase().trim();
    
    switch (cmd) {
      case "/help":
        addMessage("Available commands:", "system");
        addMessage("/help - Show this help message", "system");
        addMessage("/clear - Clear the terminal", "system");
        addMessage("/id - Show your anonymous ID", "system");
        addMessage("/room - Show current room code", "system");
        break;
      
      case "/clear":
        setMessages([]);
        break;
      
      case "/id":
        addMessage(`Your ID: ${userId}`, "system");
        break;
      
      case "/room":
        addMessage(`Current room: ${roomCode}`, "system");
        break;
      
      default:
        addMessage(`Unknown command: ${command}. Type /help for available commands.`, "system");
    }
  };

  const handleSendMessage = (text: string) => {
    if (text.startsWith("/")) {
      handleCommand(text);
    } else {
      addMessage(text, userId);
      
      // Placeholder for WebSocket send
      // In the future: ws.send(JSON.stringify({ room: roomCode, userId, text }));
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      {/* Terminal Header */}
      <div className="px-4 py-2 border-b border-border terminal-glow">
        <div className="text-sm">
          <span className="text-muted-foreground">session:</span> {userId}
          <span className="ml-6 text-muted-foreground">room:</span> /{roomCode}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-2">
        <div className="space-y-1">
          {messages.length === 0 && (
            <div className="text-muted-foreground text-sm">
              <p>Terminal Chat v1.0.0</p>
              <p>Type /help for available commands</p>
              <p className="mt-2">Waiting for messages...</p>
            </div>
          )}
          {messages.map((message) => (
            <MessageDisplay
              key={message.id}
              userId={message.userId}
              text={message.text}
              isSystem={message.userId === "system"}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <TerminalInput onSend={handleSendMessage} />
    </div>
  );
};
