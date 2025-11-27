interface MessageDisplayProps {
  userId: string;
  text: string;
  isSystem?: boolean;
}

export const MessageDisplay = ({ userId, text, isSystem }: MessageDisplayProps) => {
  if (isSystem) {
    return (
      <div className="text-accent text-sm">
        <span className="text-muted-foreground">[system]:</span> {text}
      </div>
    );
  }

  return (
    <div className="text-sm terminal-glow">
      <span className="text-secondary">[{userId}]:</span>{" "}
      <span className="text-foreground">{text}</span>
    </div>
  );
};
