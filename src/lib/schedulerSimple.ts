import { prisma } from "./prisma";
import { sendThrough } from "./integrations";

/**
 * Process scheduled messages using the Message table (simple approach)
 */
export async function processScheduledMessagesSimple() {
  try {
    const now = new Date();
    console.log(`[Scheduler] Starting at ${now.toISOString()}`);

    // Find all pending messages that have scheduledAt set and are due
    const dueMessages = await prisma.message.findMany({
      where: {
        status: 'PENDING',
        scheduledAt: {
          not: null,
          lte: now,
        },
      },
      include: {
        contact: true,
        user: true,
      },
    });

    console.log(`[Scheduler] Found ${dueMessages.length} messages to send`);

    if (dueMessages.length === 0) {
      console.log('[Scheduler] No messages due for sending');
      return {
        processed: 0,
        sent: 0,
        failed: 0,
        messages: [],
      };
    }

    let sent = 0;
    let failed = 0;
    const results = [];

    for (const scheduled of dueMessages) {
      console.log(`[Scheduler] Processing message ${scheduled.id}`, {
        scheduledAt: (scheduled as any).scheduledAt,
        channel: scheduled.channel,
        contactId: scheduled.contactId,
        hasContact: !!scheduled.contact,
      });
      try {
        if (!scheduled.contact) {
          console.error(`[Scheduler] No contact found for message ${scheduled.id}`);
          await prisma.message.update({
            where: { id: scheduled.id },
            data: { status: 'FAILED' },
          });
          continue;
        }

        // Determine recipient address
        const toAddr = 
          scheduled.channel === 'email' 
            ? scheduled.contact.email 
            : scheduled.channel === 'sms' 
            ? scheduled.contact.phone 
            : scheduled.contact.whatsapp || scheduled.contact.phone;

        if (!toAddr) {
          console.error(`[Scheduler] No address found for contact ${scheduled.contact.id}, channel ${scheduled.channel}`);
          await prisma.message.update({
            where: { id: scheduled.id },
            data: { status: 'FAILED' },
          });
          continue;
        }

        console.log(`[Scheduler] Sending message ${scheduled.id} to ${toAddr} via ${scheduled.channel}`);

        // Send the message
        const result = await sendThrough(scheduled.channel as any, {
          to: toAddr,
          body: scheduled.content,
          subject: scheduled.subject || undefined,
          mediaUrls: scheduled.mediaUrls,
        });

        // Update message status
        await prisma.message.update({
          where: { id: scheduled.id },
          data: {
            status: 'SENT',
            messageSid: result.id || undefined,
            timestamp: now, // Update timestamp to when it was actually sent
          },
        });

        console.log(`[Scheduler] Sent scheduled message ${scheduled.id} to ${toAddr}`);
        sent++;
        results.push({ id: scheduled.id, status: 'SENT', contact: scheduled.contact.name || toAddr });
      } catch (err: any) {
        console.error(`[Scheduler] Failed to send scheduled message ${scheduled.id}:`, err);
        await prisma.message.update({
          where: { id: scheduled.id },
          data: { status: 'FAILED' },
        });
        failed++;
        results.push({ id: scheduled.id, status: 'FAILED', error: err.message });
      }
    }

    const summary = {
      processed: dueMessages.length,
      sent,
      failed,
      messages: results,
    };

    console.log('[Scheduler] Processing complete:', summary);
    return summary;
  } catch (err) {
    console.error('[Scheduler] Error processing scheduled messages:', err);
    return {
      processed: 0,
      sent: 0,
      failed: 0,
      error: (err as any).message,
      messages: [],
    };
  }
}
