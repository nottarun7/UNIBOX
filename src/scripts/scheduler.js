#!/usr/bin/env node
/**
 * Lightweight scheduler script
 * - Finds outbound messages with status=PENDING and scheduledAt <= now
 * - Sends them via Twilio (SMS or WhatsApp) and updates message status/messageSid
 *
 * Run with: node ./src/scripts/scheduler.js
 * It expects the normal project env vars to be present (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN,
 * TWILIO_FROM_NUMBER, optional TWILIO_WHATSAPP_FROM, DATABASE_URL).
 */

const { PrismaClient } = require('@prisma/client');
const twilio = require('twilio');

async function main() {
  const prisma = new PrismaClient();

  const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
  const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
  const TWILIO_FROM = process.env.TWILIO_FROM_NUMBER;
  const TWILIO_WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_FROM; // should be like 'whatsapp:+1415...'

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    console.error('Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN in env. Exiting.');
    process.exit(1);
  }

  const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

  const now = new Date();

  console.log(`[scheduler] Looking for pending scheduled messages at ${now.toISOString()}`);

  const pending = await prisma.message.findMany({
    where: {
      status: 'PENDING',
      direction: 'outbound',
      scheduledAt: { lte: now }
    },
    include: { contact: true }
  });

  console.log(`[scheduler] Found ${pending.length} messages to process`);

  for (const msg of pending) {
    try {
      const contact = msg.contact;
      if (!contact) {
        console.warn(`[scheduler] Message ${msg.id} has no contact; marking FAILED`);
        await prisma.message.update({ where: { id: msg.id }, data: { status: 'FAILED' } });
        continue;
      }

      let from = TWILIO_FROM;
      let to = null;

      if (msg.channel === 'whatsapp') {
        if (!TWILIO_WHATSAPP_FROM) {
          console.warn('[scheduler] TWILIO_WHATSAPP_FROM not configured; skipping whatsapp message', msg.id);
          await prisma.message.update({ where: { id: msg.id }, data: { status: 'FAILED' } });
          continue;
        }
        from = TWILIO_WHATSAPP_FROM;
        const dest = contact.whatsapp || contact.phone;
        if (!dest) {
          console.warn('[scheduler] no whatsapp/phone for contact; marking FAILED', msg.id);
          await prisma.message.update({ where: { id: msg.id }, data: { status: 'FAILED' } });
          continue;
        }
        to = `whatsapp:${dest}`;
      } else {
        // sms or default
        const dest = contact.phone;
        if (!dest) {
          console.warn('[scheduler] no phone for contact; marking FAILED', msg.id);
          await prisma.message.update({ where: { id: msg.id }, data: { status: 'FAILED' } });
          continue;
        }
        to = dest;
      }

      console.log(`[scheduler] Sending message ${msg.id} to ${to} via ${msg.channel}`);

      const resp = await client.messages.create({
        from,
        to,
        body: msg.content
      });

      console.log(`[scheduler] Sent ${msg.id}, sid=${resp.sid}`);
      await prisma.message.update({ where: { id: msg.id }, data: { status: 'SENT', messageSid: resp.sid } });
    } catch (err) {
      console.error(`[scheduler] error sending message ${msg.id}:`, err?.message || err);
      try {
        await prisma.message.update({ where: { id: msg.id }, data: { status: 'FAILED' } });
      } catch (e) {
        console.error('[scheduler] failed to mark message FAILED', e?.message || e);
      }
    }
  }

  await prisma.$disconnect();
}

main()
  .then(() => {
    console.log('[scheduler] done');
    process.exit(0);
  })
  .catch((err) => {
    console.error('[scheduler] fatal error', err);
    process.exit(1);
  });
