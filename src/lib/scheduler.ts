import { prisma } from "./prisma";
import { sendThrough } from "./integrations";

/**
 * Process scheduled messages that are due
 * This should be called periodically (e.g., every minute via cron or setInterval)
 */
export async function processScheduledMessages() {
  try {
    const now = new Date();

    // Find all pending messages that are due
    const dueMessages = await prisma.scheduledMessage.findMany({
      where: {
        status: 'PENDING',
        scheduledFor: {
          lte: now,
        },
      },
      include: {
        contact: true,
        user: true,
      },
    });

    console.log(`[Scheduler] Found ${dueMessages.length} messages to send`);

    for (const scheduled of dueMessages) {
      try {
        // Determine recipient address
        const toAddr = 
          scheduled.channel === 'email' 
            ? scheduled.contact.email 
            : scheduled.channel === 'sms' 
            ? scheduled.contact.phone 
            : scheduled.contact.whatsapp || scheduled.contact.phone;

        if (!toAddr) {
          console.error(`[Scheduler] No address found for contact ${scheduled.contactId}, channel ${scheduled.channel}`);
          await prisma.scheduledMessage.update({
            where: { id: scheduled.id },
            data: { status: 'FAILED' },
          });
          continue;
        }

        // Send the message
        const result = await sendThrough(scheduled.channel as any, {
          to: toAddr,
          body: scheduled.content,
          subject: scheduled.subject,
        });

        // Create the actual message record
        const message = await prisma.message.create({
          data: {
            content: scheduled.content,
            subject: scheduled.subject,
            channel: scheduled.channel,
            direction: 'outbound',
            contactId: scheduled.contactId,
            userId: scheduled.userId,
            messageSid: result.id || undefined,
            status: 'SENT',
          },
        });

        // Update scheduled message status
        await prisma.scheduledMessage.update({
          where: { id: scheduled.id },
          data: {
            status: 'SENT',
            sentMessageId: message.id,
          },
        });

        console.log(`[Scheduler] Sent scheduled message ${scheduled.id} to ${toAddr}`);
      } catch (err: any) {
        console.error(`[Scheduler] Failed to send scheduled message ${scheduled.id}:`, err);
        await prisma.scheduledMessage.update({
          where: { id: scheduled.id },
          data: { status: 'FAILED' },
        });
      }
    }

    return { processed: dueMessages.length };
  } catch (err) {
    console.error('[Scheduler] Error processing scheduled messages:', err);
    throw err;
  }
}

/**
 * Start the scheduler (runs every minute)
 */
export function startScheduler() {
  console.log('[Scheduler] Starting message scheduler...');
  
  // Run immediately on startup
  processScheduledMessages().catch(console.error);
  
  // Then run every minute
  const interval = setInterval(() => {
    processScheduledMessages().catch(console.error);
  }, 60 * 1000); // 60 seconds

  return () => {
    console.log('[Scheduler] Stopping message scheduler...');
    clearInterval(interval);
  };
}
