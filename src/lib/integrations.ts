import { sendMessage as twilioSend } from "./twilio";
import { sendEmail } from "./resend";

export type SendPayload = {
  to: string;
  body?: string;
  mediaUrls?: string[];
  subject?: string; // for email
  from?: string; // for email
};

export interface Sender {
  send(opts: SendPayload): Promise<any>;
}

class TwilioSender implements Sender {
  channel: "sms" | "whatsapp";
  constructor(channel: "sms" | "whatsapp") {
    this.channel = channel;
  }
  async send(opts: SendPayload) {
    return twilioSend({ to: opts.to, channel: this.channel, body: opts.body, mediaUrls: opts.mediaUrls });
  }
}

class EmailSender implements Sender {
  async send(opts: SendPayload) {
    return sendEmail({
      to: opts.to,
      subject: opts.subject || 'New Message',
      body: opts.body || '',
      from: opts.from,
    });
  }
}

export function createSender(name: string): Sender {
  // Simple factory. Expandable to support 'email', 'twitter', etc.
  if (name === "sms") return new TwilioSender("sms");
  if (name === "whatsapp") return new TwilioSender("whatsapp");
  if (name === "email") return new EmailSender();
  throw new Error(`Unknown sender: ${name}`);
}

export async function sendThrough(channel: string, payload: SendPayload) {
  const sender = createSender(channel);
  return sender.send(payload);
}
