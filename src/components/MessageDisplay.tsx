import type { ChatPayload } from "./ChatTerminal";

interface MessageDisplayProps {
  userId: string;
  payload: ChatPayload;
  isSystem?: boolean;
}

export const MessageDisplay = ({
  userId,
  payload,
  isSystem,
}: MessageDisplayProps) => {
  if (payload.kind === "text") {
    if (isSystem) {
      return (
        <div className="text-accent text-sm">
          <span className="text-muted-foreground">[system]:</span>{" "}
          {payload.content}
        </div>
      );
    }

    return (
      <div className="text-sm terminal-glow">
        <span className="text-secondary">[{userId}]:</span>{" "}
        <span className="text-foreground">{payload.content}</span>
      </div>
    );
  }

  return (
    <div className="text-sm terminal-glow space-y-1">
      <div className="text-foreground">
        <span className="text-secondary">
          [{isSystem ? "system" : userId}]:
        </span>{" "}
        sent a file
      </div>
      <AttachmentCard payload={payload} />
    </div>
  );
};

const AttachmentCard = ({
  payload,
}: {
  payload: Extract<ChatPayload, { kind: "file" }>;
}) => {
  const dataUrl = `data:${payload.mimeType};base64,${payload.data}`;
  const isImage = payload.mimeType.startsWith("image/");

  return (
    <div className="border border-border rounded-md p-2 bg-muted/30">
      <div className="text-xs text-muted-foreground mb-2">
        {payload.name} ({(payload.size / 1024).toFixed(1)} KB)
      </div>
      {isImage ? (
        <img
          src={dataUrl}
          alt={payload.name}
          className="max-h-60 rounded-sm object-contain"
        />
      ) : (
        <div className="text-sm text-foreground">File preview unavailable</div>
      )}
      <div className="mt-2">
        <a
          href={dataUrl}
          download={payload.name}
          className="text-primary underline text-xs"
        >
          Download
        </a>
      </div>
    </div>
  );
};
