# Unibox — Demo Playbook (Comprehensive)

This file is a scripted demo playbook for Unibox. It walks you through a full demo of every major feature with exact commands, UI steps, expected results, and short speaking notes you can read verbatim. Use this to run an end-to-end demo or to rehearse before presenting.

Estimated total time: 35–45 minutes (full run). Short/technical variants included.

---

## Prerequisites

- Node.js 20+ installed
- Supabase project + DB with the app schema applied
- Twilio account (for SMS/WhatsApp/Voice) and Resend account (email)
- ngrok installed (for local webhook testing) or a public dev URL
- Environment variables configured in `.env`

Commands (Windows CMD):

```cmd
cd "c:\Projects\Attack Capital\unified-inbox"
npm install
copy .env.example .env
:: edit .env with credentials (TWILIO_*, RESEND_API_KEY, DATABASE_URL, NEXTAUTH_URL, NEXT_PUBLIC_BASE_URL)
npx prisma generate
:: If you haven't run the manual contact migration, run the SQL in Supabase SQL editor (see README)
npm run dev
```

Open the app: http://localhost:3000 (or your NEXT_PUBLIC_BASE_URL)

If testing webhooks locally:

```cmd
ngrok http 3000
:: copy ngrok URL into NEXT_PUBLIC_BASE_URL and Twilio webhooks
```

---

## How to run this demo (high-level)

1. Start dev server and ngrok
2. Sign up / Sign in as a new user
3. Create contacts (phone, whatsapp, email)
4. Send outbound messages (SMS, WhatsApp, Email) and show provider responses
5. Trigger inbound messages via Twilio webhook (use your phone or emulator) and show message creation
6. Show threads, read/unread behavior, notes, and message scheduling
7. Demonstrate voice call (get token, register Device, place call)
8. Show team workspace and role behavior (Owner/Admin/Member) — create a team and invite a user
9. Run through edge-case tests (duplicate contact prevention, invalid media URL)
10. Cleanup and finishing notes

---

## Demo Script — Step-by-step (what to do, what to show, what to say)

Each step includes:
- Action: what to click / what command to run
- Expected result: what to show on screen/logs
- Script: short speaking lines you can read
- Time estimate

### 0. Quick intro (30s)
Script: "I'll show Unibox — a unified inbox that handles SMS, WhatsApp, Email, and Voice with team collaboration. We'll cover contact management, messaging, inbound webhooks, and in-browser VoIP, plus how the system ensures privacy and scale."

---

### 1. Start environment (2 minutes)
Action:
- In terminal run the commands above (install, generate, npm run dev)
- If local webhook testing, run `ngrok http 3000` and update `.env` if needed

Expected:
- Next.js dev server starts, show terminal logs
- ngrok shows forwarding URL

Script: "First I'll start the dev server and expose it to the internet via ngrok so Twilio can callback to our local machine."

Verification:
- Show `npm run dev` terminal with server listening on :3000
- Show ngrok forwarding URL

---

### 2. Signup and Authentication (2–3 minutes)
Action:
- Open http://localhost:3000/signup or /signin
- Create a test user (email + password)

Expected:
- On success, app redirects to /inbox
- Terminal logs confirm session creation

Script: "I'll sign up as a new user; authentication uses NextAuth with secure cookies. Notice the session cookie is HTTP-only and we use JWTs for internal APIs."

Talking point: privacy — personal contacts are isolated to the logged-in user.

---

### 3. Contact Management (3–5 minutes)
Action:
- Go to Contacts → Create Contact
- Add: name, phone (+1...), whatsapp (same E.164), email
- Create 2-3 contacts (one phone-only, one WhatsApp-enabled, one email-only)

Expected:
- New contact shows in list, counts update
- If you attempt duplicate phone for same user, you should see validation error

Script lines:
- "This contact model stores multiple channels for each person and enforces uniqueness per user — so your team's contacts don't leak into other accounts."
- "If an inbound message arrives from an unknown number we auto-create a contact and assign it to a default user — in production you can route by number or round-robin."

Verification:
- Show `GET /api/contacts` in network tab returning only contacts for current user
- Terminal logs (if enabled) show `GET /api/contacts - Authenticated user: <id>`

---

### 4. Outbound Messaging — SMS/WhatsApp/Email (6–8 minutes)
Action:
- Open a contact thread and send a message via SMS (choose channel), then WhatsApp, then Email
- For email include a subject
- Optionally attach a public image URL (hosted on Cloudinary or a public file)

Expected:
- Message appears in UI (status PENDING then SENT)
- Provider SIDs in message details (Twilio SID / Resend message id)
- For media, Twilio fetches the URL and attaches

Script: "Sending is routed through an integration factory — Twilio for SMS and WhatsApp, Resend for email. The API creates a message record before sending for audit and retry."

Show logs:
- Terminal: POST /api/messages received payload
- Prisma: message create log (if enabled)

Verification:
- Twilio Console shows the outgoing message SID
- Email inbox receives the test email

Troubleshooting:
- If media doesn't attach, ensure the URL is publicly accessible (ngrok will not host media)

---

### 5. Inbound Messages (Webhook) (5–7 minutes)
Action:
- Use your phone to send an SMS/WhatsApp to your Twilio number (or use Twilio console simulator)
- Show Twilio hitting `https://<ngrok-url>/api/webhooks/twilio`

Expected:
- Webhook validates signature, finds/creates contact, creates message record, and updates thread
- Message appears in UI within seconds

Script: "Inbound messages are processed by a webhook that validates Twilio signatures and idempotently creates messages. We create a contact if necessary and assign a thread."

Verification:
- Twilio logs show webhook request and response 200
- App UI inbox shows inbound message and threads update

Edge case to demo:
- Send the same MessageSid twice (Twilio retry behavior). Show that deduplication prevents duplicates.

---

### 6. Threads, Read/Unread, and Notes (3–5 minutes)
Action:
- Show thread list, open a thread, mark messages read/unread
- Add a note to a contact

Expected:
- Unread badges update, thread ordering updates
- Notes persist and appear on contact profile

Script: "Threads aggregate messages by contact and team scope. Read/unread counters update separately so team members can triage messages. Notes provide context for conversations."

---

### 7. Message Scheduling and Cron (3–4 minutes)
Action:
- Schedule a message to be sent in 1–2 minutes via message composer
- Monitor scheduler logs (server Cron endpoint logs) and show message status transition

Expected:
- Message status is `SCHEDULED`, scheduler job picks it up and changes to `SENT` or `FAILED`

Script: "Scheduled messages are stored and processed by the scheduler; the app runs a cron job that picks due messages and sends them through the same send pipeline."

Verification:
- Show server logs: "[Scheduler] Found 1 message to send"
- UI message status changes to SENT

---

### 8. Voice Calling (6–8 minutes)
Action:
- In the UI, click Call on a contact
- The browser fetches `/api/twilio/token`, initializes Twilio Device, and invokes `device.connect({ To: '+1...' })`
- Accept an incoming call or demonstrate outgoing call to a number

Expected:
- Token endpoint returns a JWT token
- Device registers and call connects, show audio controls
- Twilio call SID and recording visible in Twilio Console (if enabled)

Script: "Voice uses Twilio's Voice SDK and issues short-lived tokens. We handle TwiML responses to connect to PSTN destinations and can record calls."

Network/permissions:
- Ensure microphone permissions are granted
- If audio is absent, check STUN/TURN connectivity

---

### 9. Team Collaboration (5 minutes)
Action:
- Create a Team in UI (if feature wired). Invite a second test user via email
- Switch to team view and show a shared thread

Expected:
- Team members see team threads, personal threads still exist
- Role-based permissions restrict actions (Owner/Admin can remove members)

Script: "Teams allow many users to work on the same thread; roles determine permissions. Contacts remain private unless explicitly shared or team-scoped."

---

### 10. Admin/Edge Cases & Validation (3 minutes)
Actions to demo quickly:
- Try to send a message to a contact that belongs to another user (should be blocked)
- Attempt duplicate contact creation (should show per-user unique error)
- Enter an invalid media URL (should return provider error)

Script: "We enforce strict per-user access control and runtime validation via Zod to avoid bad data reaching providers."

---

### 11. Wrap-up and Q&A (2 minutes)
Script: "That covers the core flows: contact management, multi-channel messaging, inbound webhook handling, scheduling, voice calls, and team collaboration. For production, we recommend deploying on Vercel, using Supabase as the DB, and configuring Twilio webhooks to your production domain."

Followups (offer):
- Walk through how to add a new integration (Slack/Slack DMs)
- Show scaling considerations (connection pooling with pgBouncer, manual SQL migrations for Supabase)

---

## Quick Troubleshooting Cheatsheet

- "Contact not found or access denied" — assign `userId` in DB or create contact under your account
- Twilio signature invalid — ensure webhook URL in Twilio matches exactly and `TWILIO_AUTH_TOKEN` is correct
- Media not uploaded — ensure media URL is public and HTTPS
- No audio on calls — check microphone permissions and STUN/TURN

## Commands & SQL snippets (copy-paste)

Start dev server (Windows cmd):
```cmd
cd "c:\Projects\Attack Capital\unified-inbox"
npm run dev
```

Generate Prisma client:
```cmd
npx prisma generate
```

Fix contacts missing userId (run in Supabase SQL Editor):
```sql
UPDATE "Contact"
SET "userId" = (SELECT id FROM "User" ORDER BY "createdAt" ASC LIMIT 1)
WHERE "userId" IS NULL;
```

Reassign a single contact to your user (replace ids):
```sql
UPDATE "Contact"
SET "userId" = 'REPLACE_WITH_YOUR_USER_ID'
WHERE id = 'cmhgvqs4y0000t8bkth2qjoma';
```

Verify contact counts:
```sql
SELECT COUNT(*) AS total_contacts, COUNT(DISTINCT "userId") AS unique_users FROM "Contact";
```

---

## Short demo variant (5 minutes)

If you have 5 minutes, do this:
1. Start server and ngrok (1 min)
2. Sign in (30s)
3. Create contact and send an SMS (1 min)
4. Send inbound SMS from your phone and show it appears in UI (1–2 min)
5. Quick voice call demo (optional)

Script: Keep narration high level — focus on unified inbox, privacy, and multi-channel coverage.

---

## Technical demo variant (20–30 minutes)

Follow the full script above. Emphasize architecture, integration factory, Zod schemas, Prisma model changes (user-isolated contacts), and production deployment notes.

---

## Closing notes

If you'd like, I can:
- Add this file into the main `README.md` or keep it separate as `README_DEMO.md`
- Generate a printable one-page checklist for presenters
- Create a short script for an executive versus technical audience


---

*File created by the development helper — update the user IDs and env settings before running live demos.*
