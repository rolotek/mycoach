"use client";

function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split("\n");
  return lines.map((line, i) => {
    const parts: React.ReactNode[] = [];
    let rest = line;
    while (rest.length > 0) {
      const boldMatch = rest.match(/\*\*(.+?)\*\*/);
      const listMatch = rest.match(/^-\s+/);
      if (listMatch) {
        parts.push(
          <span key={`${i}-list`} className="ml-4 list-disc">
            • {rest.slice(listMatch[0].length)}
          </span>
        );
        break;
      }
      if (boldMatch && boldMatch.index !== undefined) {
        if (boldMatch.index > 0) {
          parts.push(rest.slice(0, boldMatch.index));
        }
        parts.push(
          <strong key={`${i}-b-${parts.length}`}>{boldMatch[1]}</strong>
        );
        rest = rest.slice(boldMatch.index + boldMatch[0].length);
      } else {
        parts.push(rest);
        break;
      }
    }
    return (
      <span key={i}>
        {parts.length ? parts : line}
        {i < lines.length - 1 && <br />}
      </span>
    );
  });
}

export function AgentResultCard({
  agentName,
  result,
}: {
  agentName: string;
  result: string;
}) {
  return (
    <div className="rounded-lg border-2 border-green-200 bg-green-50/50 px-4 py-3">
      <div className="text-sm font-medium text-green-900">
        Result from {agentName}
      </div>
      <div className="mt-2 whitespace-pre-wrap break-words text-sm text-neutral-800">
        {renderMarkdown(result)}
      </div>
    </div>
  );
}

export function AgentDeniedCard() {
  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-100 px-4 py-2 text-sm text-neutral-500">
      Agent dispatch was declined
    </div>
  );
}
