export type ConversationMode = "auto" | "coaching" | "task";
export type EffectiveMode = "coaching" | "task";

export function detectMode(
  userMessage: string,
  modeOverride: ConversationMode
): EffectiveMode {
  if (modeOverride === "coaching") return "coaching";
  if (modeOverride === "task") return "task";

  const taskSignals = [
    /action items/i,
    /summarize/i,
    /summary/i,
    /decision framework/i,
    /pros and cons/i,
    /create a plan/i,
    /list.*steps/i,
    /one[- ]pager/i,
    /draft.*email/i,
    /write.*memo/i,
    /prepare.*brief/i,
  ];

  return taskSignals.some((r) => r.test(userMessage)) ? "task" : "coaching";
}
