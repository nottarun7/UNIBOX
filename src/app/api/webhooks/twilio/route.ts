import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { findOrCreateThread } from "../../../../lib/threads";
import Twilio from "twilio";

// Note: Twilio sends webhooks as application/x-www-form-urlencoded.
export async function POST(req: Request) {
  try {
    const raw = await req.text();
    const params = new URLSearchParams(raw);

    // Validate Twilio signature when possible
    const twilioSignature = req.headers.get("x-twilio-signature") || "";
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (authToken) {
      // Twilio.validateRequest expects params as an object
      const paramsObj: Record<string, string> = {};
      for (const [k, v] of params.entries()) paramsObj[k] = v;

      // Reconstruct the external URL Twilio used. In dev with ngrok the Host header
      // will be the ngrok domain, but req.url may contain localhost. Use headers when present.
      const host = req.headers.get("host") || "";
      const forwardedProto = req.headers.get("x-forwarded-proto") || req.headers.get("x-forwarded-protocol");
      const proto = forwardedProto || (host && host.includes("ngrok")) ? "https" : "https";
      const parsed = new URL(req.url);
      const reconstructedUrl = `${proto}://${host}${parsed.pathname}${parsed.search}`;

      const valid = Twilio.validateRequest(authToken, twilioSignature, reconstructedUrl, paramsObj as any);
      if (!valid) {
        console.warn("Invalid Twilio signature for webhook", { reconstructedUrl, twilioSignature, host, forwardedProto });
        return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
      }
    } else {
      console.warn("TWILIO_AUTH_TOKEN not set; skipping Twilio signature validation.");
    }

    const from = params.get("From") || "";
    const to = params.get("To") || "";
    const body = params.get("Body") || "";
    const messageSid = params.get("MessageSid") || undefined;

    // Determine channel and normalize phone
    let channel: "sms" | "whatsapp" = "sms";
    let normalizedFrom = from;
    if (from.startsWith("whatsapp:")) {
      channel = "whatsapp";
      normalizedFrom = from.replace(/^whatsapp:/, "");
    }

    // Find or create contact
    // For inbound messages, we need to determine which user should own this contact.
    // Strategy: Use the first user in the system (or you can add a userId query param if needed)
    const defaultUser = await prisma.user.findFirst({
      orderBy: { createdAt: 'asc' },
    });

    if (!defaultUser) {
      console.error("No users found in system to assign inbound contact");
      return NextResponse.json({ error: "No users in system" }, { status: 500 });
    }

    const contactWhere = channel === "whatsapp" 
      ? { whatsapp: normalizedFrom, userId: defaultUser.id } 
      : { phone: normalizedFrom, userId: defaultUser.id };
    let contact = await prisma.contact.findFirst({ where: contactWhere });
    if (!contact) {
      contact = await prisma.contact.create({ 
        data: { 
          name: null, 
          phone: channel === "sms" ? normalizedFrom : null, 
          whatsapp: channel === "whatsapp" ? normalizedFrom : null,
          userId: defaultUser.id,
        } 
      });
    }

    // Persist inbound message, but skip if we already have the same Twilio MessageSid
    if (messageSid) {
      const exists = await (prisma as any).message.findFirst({ where: { messageSid } });
      if (exists) {
        console.log("Duplicate inbound messageSid received, skipping", messageSid);
        return NextResponse.json({}, { status: 200 });
      }
    }

    // Ensure there's a thread for this contact (global thread)
    const thread = await findOrCreateThread(contact.id, undefined);

    const message = await (prisma as any).message.create({
      data: {
        content: body,
        channel,
        direction: "inbound",
        contactId: contact.id,
        threadId: thread?.id,
        messageSid: messageSid || undefined,
      },
    });

    // Optionally log messageSid for cross-referencing
    console.log("Inbound Twilio message saved", { messageId: message.id, messageSid });

    // Respond 200 OK. Twilio expects a 200. Optionally return TwiML to reply.
    return NextResponse.json({}, { status: 200 });
  } catch (err) {
    console.error("/api/webhooks/twilio error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
