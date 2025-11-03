import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "../../../lib/prisma";
import { sendThrough } from "../../../lib/integrations";
import { findOrCreateThread, getTeamIdForUser } from "../../../lib/threads";
import { sendMessageSchema } from "../../../lib/schemas";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;

    const url = new URL(req.url);
    const contactId = url.searchParams.get("contactId");
    const channel = url.searchParams.get("channel");

    const where: any = { 
      contact: { userId } // Only show messages for contacts owned by this user
    };
    if (contactId) where.contactId = contactId;
    if (channel) where.channel = channel;

    const messages = await prisma.message.findMany({
      where,
      include: { contact: true, user: true, thread: true },
      orderBy: { timestamp: "asc" },
    });

    return NextResponse.json({ messages });
  } catch (err) {
    console.error("GET /api/messages error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const authenticatedUserId = (session.user as any).id;

    const json = await req.json();
    console.log('POST /api/messages received payload:', json);
    const parsed = sendMessageSchema.safeParse(json);
    if (!parsed.success) {
      console.error('Validation error:', parsed.error.flatten());
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    }

    const { contactId, to, channel, content, media, mediaUrls, subject, userId } = parsed.data;
    console.log('Parsed data:', { contactId, to, channel, content, subject, mediaUrls });

    // Find contact if contactId provided, else try to find by phone/whatsapp via `to` value.
    // IMPORTANT: Only allow access to contacts owned by the authenticated user
    let contact = null;
    if (contactId) {
      // First check if contact exists at all
      const contactExists = await prisma.contact.findUnique({ 
        where: { id: contactId }
      });
      console.log('Contact lookup:', { contactId, exists: !!contactExists, userId: contactExists?.userId, authenticatedUserId });
      
      contact = await prisma.contact.findFirst({ 
        where: { 
          id: contactId,
          userId: authenticatedUserId 
        } 
      });
      if (!contact) {
        return NextResponse.json({ error: "Contact not found or access denied" }, { status: 404 });
      }
    } else if (to) {
      const normalized = to.replace(/^\+/, "");
      contact = await prisma.contact.findFirst({
        where: { 
          userId: authenticatedUserId,
          OR: [{ phone: { equals: to } }, { whatsapp: { equals: to } }] 
        },
      });
    }

    // Determine thread (if we have a contact)
    let threadId: string | undefined = undefined;
    if (contact) {
      const teamId = await getTeamIdForUser(userId);
      const thread = await findOrCreateThread(contact.id, teamId || undefined);
      threadId = thread.id;
    }

    // Persist outbound message first (optimistic)
    console.log('Creating message with mediaUrls:', mediaUrls);
    const message = await prisma.message.create({
      data: {
        content,
        channel,
        direction: "outbound",
        contactId: contact ? contact.id : undefined,
        threadId: threadId || undefined,
        userId: userId || undefined,
        mediaUrls: mediaUrls || [],
        subject: subject || undefined,
      },
    });
    console.log('Message created:', message.id);

    // Send via integrations factory (Twilio for sms/whatsapp, Resend for email)
    try {
      const toAddr = (to ?? (contact ? contact.email ?? contact.phone ?? contact.whatsapp : "")) || "";
      
      // For email, subject is required
      if (channel === 'email' && !subject) {
        console.warn('Email sent without subject, using default');
      }
      
      // Convert relative URLs to absolute for Twilio/Email
      const absoluteMediaUrls = (mediaUrls || []).map((url: string) => {
        if (url.startsWith('/')) {
          const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
          return `${baseUrl}${url}`;
        }
        return url;
      });
      
      // Validate that we're not using localhost for media URLs (Twilio can't access localhost)
      if (channel !== 'email' && absoluteMediaUrls.length > 0 && absoluteMediaUrls.some(u => u.includes('localhost'))) {
        console.error('❌ Cannot send media via localhost. Twilio requires publicly accessible URLs.');
        console.error('💡 Solution: Run ngrok and set NEXT_PUBLIC_BASE_URL. See NGROK_SETUP.md');
        throw new Error('Media URLs must be publicly accessible. Set NEXT_PUBLIC_BASE_URL with your ngrok URL (e.g., https://abc123.ngrok.io)');
      }
      
      console.log('Sending with absolute media URLs:', absoluteMediaUrls);
      const res = await sendThrough(channel || "sms", { 
        to: toAddr, 
        body: content,
        subject: subject,
        mediaUrls: absoluteMediaUrls.length > 0 ? absoluteMediaUrls : (media || undefined)
      });
      const sid = (res as any)?.sid;
      if (sid) {
        await (prisma as any).message.update({ where: { id: message.id }, data: { messageSid: sid, status: "SENT" } });
      } else {
        await (prisma as any).message.update({ where: { id: message.id }, data: { status: "SENT" } });
      }
      console.log("Send result:", sid || res);
    } catch (sendErr: any) {
      console.error("Send error:", sendErr);
      try {
        await (prisma as any).message.update({ where: { id: message.id }, data: { status: "FAILED" } });
      } catch (e) {
        console.error("Failed to update message status to FAILED", e);
      }

      if (sendErr?.code === 63007) {
        return NextResponse.json({ error: "WhatsApp From number not configured for your Twilio account. Use the Twilio WhatsApp sandbox number or enable your number for WhatsApp in the Twilio console." }, { status: 400 });
      }
      
      if (sendErr?.code === 21620) {
        return NextResponse.json({ 
          error: "Invalid media URL. Twilio requires publicly accessible URLs. Run 'ngrok http 3000' and set NEXT_PUBLIC_BASE_URL in .env. See NGROK_SETUP.md for instructions." 
        }, { status: 400 });
      }
      
      // Re-throw to be caught by outer catch
      throw sendErr;
    }

    return NextResponse.json({ message }, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/messages error:", err);
    console.error("Error stack:", err.stack);
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
