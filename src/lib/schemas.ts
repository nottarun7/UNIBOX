import { z } from "zod";

export const sendMessageSchema = z.object({
  contactId: z.string().optional(),
  to: z.string().optional(),
  channel: z.enum(["sms", "whatsapp", "email"]).default("sms"),
  content: z.string().min(1),
  subject: z.string().optional(), // For email
  media: z.array(z.string()).optional(),
  mediaUrls: z.array(z.string()).optional(),
  userId: z.string().optional(),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
