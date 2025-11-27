import { useState, KeyboardEvent } from "react";

interface TerminalInputProps {
  onSend: (message: string) => void;
}

export const TerminalInput = ({ onSend }: TerminalInputProps) => {
  const [input, setInput] = useState("");

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && input.trim()) {
      onSend(input.trim());
      setInput("");
    }
  };

  return (
    <div className="border-t border-border px-4 py-3">
      <div className="flex items-center gap-2 text-sm">
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
        <span className="cursor-blink text-primary">▊</span>
      </div>
    </div>
  );
};
