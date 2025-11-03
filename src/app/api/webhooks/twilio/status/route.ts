import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import Twilio from "twilio";

export async function POST(req: Request) {
  try {
    // Twilio posts application/x-www-form-urlencoded
    const raw = await req.text();
    const params = new URLSearchParams(raw);
    const messageSid = params.get("MessageSid") || params.get("MessageSid") || params.get("MessageSid") || undefined;
    const messageStatus = params.get("MessageStatus") || params.get("SmsStatus") || undefined;

    if (!messageSid) return NextResponse.json({ error: "Missing MessageSid" }, { status: 400 });

    // Validate signature similar to inbound webhook
    const twilioSignature = req.headers.get("x-twilio-signature") || "";
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (authToken) {
      const paramsObj: Record<string, string> = {};
      for (const [k, v] of params.entries()) paramsObj[k] = v;
      const host = req.headers.get("host") || "";
      const forwardedProto = req.headers.get("x-forwarded-proto") || req.headers.get("x-forwarded-protocol");
      const proto = forwardedProto || (host && host.includes("ngrok")) ? "https" : "https";
      const parsed = new URL(req.url);
      const reconstructedUrl = `${proto}://${host}${parsed.pathname}${parsed.search}`;
      const valid = Twilio.validateRequest(authToken, twilioSignature, reconstructedUrl, paramsObj as any);
      if (!valid) return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }

    // Map Twilio statuses to our enum
    let status: any = undefined;
    if (messageStatus) {
      const s = messageStatus.toLowerCase();
      if (s === "delivered") status = "DELIVERED";
      else if (s === "sent" || s === "accepted" || s === "queued") status = "SENT";
      else if (s === "failed" || s === "undelivered") status = "FAILED";
    }

    if (status) {
      await (prisma as any).message.updateMany({ where: { messageSid }, data: { status } });
    }

    return NextResponse.json({}, { status: 200 });
  } catch (err) {
    console.error("/api/webhooks/twilio/status error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
