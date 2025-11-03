# Unibox — Comprehensive Demo Script

This document is a step-by-step demo script for presenting the full Unibox product. It lists the preparation steps, commands to run, an ordered demo flow covering every major feature, exactly what to do in the UI, verification checks, and short speaking points for each step.

Use this file as your single-run cheat sheet during live demos. Keep terminal and Supabase/Twilio dashboards open in separate windows.

---

## Quick Setup (one-time before any demo)

1. Install dependencies and prepare environment

```cmd
cd "c:\Projects\Attack Capital\unified-inbox"
npm install
# copy environment template and set real values
copy .env.example .env
rem Edit .env: set DATABASE_URL, NEXTAUTH_URL, TWILIO_*, RESEND_API_KEY, NEXT_PUBLIC_BASE_URL
npx prisma generate
```

2. Start development server

```cmd
npm run dev
# in a second terminal (for webhooks):
ngrok http 3000
# copy the ngrok HTTPS URL and set NEXT_PUBLIC_BASE_URL and Twilio webhooks accordingly
```

3. Verify database migration (if not already run)

Open Supabase SQL editor and ensure Contact.userId is populated (see README migration section). If needed run the `fix_contact_userid.sql` script that was added to the repo.

---

## Demo Flow — Overview and Timing

Estimated total time: 20–30 minutes. Each numbered section below is a short demo step you can present sequentially.

1. Login / Signup (2 min)
2. Contacts (3 min)
3. Unified Inbox & Threads (3 min)
4. Send outbound messages (SMS, WhatsApp, Email) (5 min)
5. Inbound webhook (simulate with ngrok) (3 min)
6. Media attachments & MMS/WhatsApp (2 min)
7. Message scheduling & retry (2 min)
8. Team collaboration (invite, role demo) (3 min)
9. Voice call (browser VoIP) (4 min)
10. Admin checks, logs, and troubleshooting (2 min)

---

## Detailed Steps + Scripted Talking Points

Each section contains: what to click, what to say, and how to verify.

### 1) Login / Signup

What to do:
- Open http://localhost:3000
- Click Sign up, create test account (email/password). Then sign in.

What to say:
"We'll start by creating a user account — this demonstrates the authentication flow and session management (NextAuth). The session is stored in a secure HTTP-only cookie and includes the user's id used to isolate their data."

Verify:
- After sign-in you should be redirected to `/inbox`.

### 2) Contacts — privacy by default

What to do:
- Open the Contacts view. Create two contacts with phone numbers and one with an email.

What to say:
"Contacts are private per-user by default — users can't see other users' contacts. This is enforced at the API layer by filtering queries with the authenticated user's id and at the DB by the `userId` foreign key and per-user unique constraints."

Demo talking point:
- Create a contact named "Jane Demo" with a WhatsApp-capable number (+1...).

Verify:
- GET `/api/contacts` returns only your contacts (open network tab or use the built-in UI).

Optional: Show what happens if you try to access another user's contact (the API returns 404). Say: "This prevents accidental data exposure." 

### 3) Unified Inbox & Threads

What to do:
- Navigate to Inbox. Click a contact you created.

What to say:
"Messages are grouped into threads by contact (and optionally team). This keeps conversations contextual and supports team collaboration later."

Verify:
- The thread shows message count, unread badge, and last message preview.

### 4) Send Outbound Messages (SMS, WhatsApp, Email)

What to do:
- In a contact thread, type a message and send via SMS (if Twilio SMS configured) or WhatsApp.
- Switch channel to Email and send an email (Resend configured).

What to say:
"We use a single integration factory (`createSender`) that routes messages to the appropriate provider (Twilio for SMS/WhatsApp, Resend for email). This keeps our API surface consistent regardless of channel."

Verify:
- In the UI the message appears with status PENDING → SENT.
- Twilio Console shows the message SID (`SM...`).

Pro tip (demo):
- Use a short message like: “Hello from Unibox demo — ignore.”

### 5) Inbound Webhook (simulate with ngrok)

What to do:
- Ensure ngrok is running and Twilio webhook is set to your ngrok URL: `https://xxxx.ngrok.app/api/webhooks/twilio`
- Send a message to your Twilio number from your phone.

What to say:
"Inbound messages arrive via webhook; we validate Twilio signature, find or create a contact, and create a message and thread. The webhook handler is idempotent using MessageSid."

Verify:
- New message appears in the Inbox within a second.
- In logs you should see webhook processing and contact creation.

### 6) Media attachments (MMS / WhatsApp media)

What to do:
- Send a message with an image from your phone to the Twilio number.

What to say:
"Media messages are stored as `mediaUrls` and shown in the thread. Twilio will fetch the media from the provided URL — for local development you must expose the app via ngrok or host media externally."

Verify:
- Image appears in the thread. Twilio delivery receipts show `NumMedia` > 0.

### 7) Message Scheduling & Retry

What to do:
- Open the scheduling UI, schedule a message 1-2 minutes in the future.

What to say:
"Scheduled messages are stored in `ScheduledMessage` and processed by the scheduler job which marks messages as PENDING and then attempts delivery. Retries are handled by the worker if the provider responds with a transient error."

Verify:
- Scheduled message appears in Outbox and is sent at the scheduled time.

### 8) Team Collaboration (Invite & Roles)

What to do:
- Create a team or invite a second account (Email invite flow).
- Switch active team (if UI supports switching) and show a team thread.

What to say:
"Teams allow multiple users to collaborate on shared threads — roles control permissions (Owner, Admin, Member, Viewer). Contacts remain private unless shared via team-scoped features (future enhancement)." 

Verify:
- Invited user appears in TeamMembers. Team threads show messages shared by team members.

### 9) Voice (Browser VoIP with Twilio)

What to do:
- Open the voice UI, click to request a token (GET `/api/twilio/token`).
- Register the Twilio Device and call a phone number.

What to say:
"We use Twilio Voice SDK with short-lived JWT tokens. The audio path uses WebRTC with Twilio-managed STUN/TURN for reliability and Opus codec for quality."

Demonstrate controls:
- Mute/unmute, DTMF keypad, hang up.

Verify:
- Call connects and audio flows both ways. Twilio shows a Call SID in the call logs.

### 10) Admin / Logs / Troubleshooting

What to do:
- Show recent logs, Twilio console, delivery receipts, and DB entries for messages & threads.

What to say:
"Everything is auditable: messages have statuses, provider SIDs, and retry metadata. Webhook retries are idempotent via MessageSid checks."

Common checks:
- If media doesn't show: ensure NEXT_PUBLIC_BASE_URL points to a public HTTPS URL (ngrok).
- If contacts appear for the wrong user: verify `Contact.userId` values in DB and that session user id matches.

---

## Demo Scripts: Exact Phrases (copy/paste friendly)

Use these short lines during the demo to explain each feature.

- "I'm signing up to show how easy it is to get started — the session token will keep you logged in securely."
- "Contacts are private by default — only this user can see the contacts they created." 
- "I'll send an SMS now using Twilio; notice how the message status updates and we get a provider SID for traceability." 
- "Now I'm going to send a WhatsApp message with an image — we support rich media and keep everything in the same thread." 
- "I'll simulate an inbound message from a customer; incoming messages are routed by our webhook and automatically create contacts and threads." 
- "Next, I'll invite a teammate to show collaborative handling of a conversation — roles control what they can do." 
- "Finally, I'll make a browser call using the Twilio Voice SDK — no phone required, and we support mute, DTMF, and call recording."

---

## Quick Troubleshooting Cheat Sheet

- 404 when sending message: contact is owned by a different user — reassign or create a new contact for current user.
- Twilio signature validation failed: ensure TWILIO_AUTH_TOKEN matches Twilio console and webhook URL is correct.
- Media not loading: use ngrok or a public HTTPS URL and set NEXT_PUBLIC_BASE_URL properly.
- Prisma types outdated: `npx prisma generate` and restart dev server.

---

## Post-demo cleanup (optional)

If you used test data, you can quickly remove it from the DB:

```sql
-- Delete contacts/messages created during demo (use carefully)
DELETE FROM "Message" WHERE content LIKE '%Unibox demo%';
DELETE FROM "Contact" WHERE name LIKE '%Demo%';
```

---

## Notes and Tips

- Keep Twilio Console and Supabase open in separate tabs to show real-time provider logs.
- Use a real mobile phone for WhatsApp and SMS tests — Twilio sandbox may be required for WhatsApp.
- Keep message examples short and friendly; avoid exposing real customer data during demos.

---

If you want, I can also: 
- Add a printable 1-page cheat-sheet with only click-by-click actions and exact phrases.
- Generate a short slide deck for the demo flow.

Ready for me to add a printable cheat-sheet as a second file? 
