import { z } from "zod";

export const actionItemsSchema = z.object({
  summary: z.string().optional(),
  items: z.array(
    z.object({
      title: z.string(),
      description: z.string().optional(),
      priority: z.enum(["high", "medium", "low"]),
      dueDate: z.string().optional(),
    })
  ),
});

export const decisionFrameworkSchema = z.object({
  question: z.string(),
  options: z.array(
    z.object({
      name: z.string(),
      pros: z.array(z.string()),
      cons: z.array(z.string()),
      riskLevel: z.enum(["low", "medium", "high"]).optional(),
    })
  ),
  recommendation: z.string(),
  reasoning: z.string(),
});

export const summarySchema = z.object({
  title: z.string(),
  keyPoints: z.array(z.string()),
  decisions: z.array(z.string()),
  nextSteps: z.array(z.string()),
});
