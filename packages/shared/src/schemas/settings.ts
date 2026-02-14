import { z } from "zod";

export const updateSettingsSchema = z.object({
  preferredProvider: z.string().optional(),
  preferredModel: z.string().optional(),
});
