import { useState, useRef, KeyboardEvent, ChangeEvent } from "react";

interface TerminalInputProps {
  onSend: (message: string) => void;
  onSendFile: (file: File) => void;
}

export const TerminalInput = ({ onSend, onSendFile }: TerminalInputProps) => {
  const [input, setInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && input.trim()) {
      onSend(input.trim());
      setInput("");
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onSendFile(file);
      event.target.value = "";
    }
  };

  return (
    <div className="border-t border-border px-4 py-3">
      <div className="flex items-center gap-3 text-sm">
        <span className="text-primary terminal-glow">{">"}</span>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent outline-none text-foreground terminal-glow"
          placeholder="Type a message or /help for commands..."
          autoFocus
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="text-xs uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors"
        >
          Attach
        </button>
        <span className="cursor-blink text-primary">▊</span>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
};
