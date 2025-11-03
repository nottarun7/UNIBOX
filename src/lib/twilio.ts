import Twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_FROM_NUMBER;
// Optional separate From number for WhatsApp (e.g., the Twilio WhatsApp sandbox number)
const whatsappFromNumber = process.env.TWILIO_WHATSAPP_FROM || process.env.TWILIO_FROM_NUMBER;

if (!accountSid || !authToken) {
  // Do not throw at import time so local dev without Twilio can still run parts of the app.
  console.warn("Twilio credentials are not fully configured (TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN).");
}

let client: ReturnType<typeof Twilio> | null = null;

if (accountSid && authToken) {
  if (!accountSid.startsWith("AC")) {
    console.warn("TWILIO_ACCOUNT_SID does not look valid (must start with 'AC'). Twilio client will not be initialized.");
  } else {
    client = Twilio(accountSid, authToken);
  }
}

export async function sendMessage(opts: {
  to: string;
  channel?: "sms" | "whatsapp";
  body?: string;
  mediaUrls?: string[];
}) {
  if (!client) throw new Error("Twilio client not configured. Check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in .env");

  const { to, channel = "sms", body, mediaUrls } = opts;
  const isWhatsapp = channel === "whatsapp";
  const fromUsed = isWhatsapp ? whatsappFromNumber : fromNumber;
  const from = isWhatsapp ? `whatsapp:${fromUsed}` : fromUsed;
  const toAddr = isWhatsapp && !to.startsWith("whatsapp:") ? `whatsapp:${to}` : to;

  const payload: any = {
    from,
    to: toAddr,
  };
  if (body) payload.body = body;
  if (mediaUrls && mediaUrls.length) payload.mediaUrl = mediaUrls;

  return client.messages.create(payload);
}

export default client;
