# Unibox - Unified Communication Platform

A production-ready, full-stack customer engagement platform with multi-channel messaging (SMS, WhatsApp, Email), team collaboration, and browser-based VoIP calling.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Features](#features)
3. [Architecture](#architecture)
4. [Database Schema](#database-schema)
5. [Integration Comparison](#integration-comparison)
6. [Quick Start](#quick-start)
7. [Core Functions](#core-functions)
8. [API Endpoints](#api-endpoints)
9. [Webhooks](#webhooks)
10. [WebSocket/Real-time](#websocketreal-time)
11. [Key Design Decisions](#key-design-decisions)

---

## Tech Stack

**Frontend:**
- Next.js 15 (App Router, React 19, Server Components)
- TypeScript 5.0
- Tailwind CSS 3.4
- TanStack Query 5.0 (data fetching, caching)
- Twilio Voice SDK (WebRTC for VoIP)

**Backend:**
- Next.js API Routes (RESTful endpoints)
- Prisma 5.0 (ORM with PostgreSQL)
- Zod 3.0 (runtime validation)
- NextAuth.js 4.24 (authentication)

**Infrastructure:**
- PostgreSQL (Supabase hosted)
- Vercel (hosting, edge functions)
- Twilio (SMS/WhatsApp/Voice)
- Resend (email delivery)
- Cloudinary (optional media storage)

---

## Features

### Multi-Channel Communication
- **SMS**: Two-way text messaging via Twilio
- **WhatsApp**: Business API with media support (images, PDFs)
- **Email**: Transactional and marketing emails via Resend
- **Voice Calls**: Browser-based VoIP using Twilio Client SDK

### Voice Calling
- In-browser calling without plugins (WebRTC + Twilio)
- Call controls: mute, hangup, DTMF keypad
- Call history with duration tracking
- Incoming call handling with accept/reject
- JWT-based authentication for voice tokens

### Team Collaboration
- Multi-team workspaces with role-based access control

### Unified Inbox
- Thread-based conversations (groups messages by contact)
- Message scheduling for automated follow-ups
- Media attachments (MMS, WhatsApp files)
- Read/unread status tracking
- Cross-channel conversation history

---

## Architecture

```
┌──────────────────────────────────────────────────┐
│          Client (Browser)                        │
│  Next.js App Router │ TanStack Query             │
│  Twilio Voice SDK (WebRTC)                       │
└────────────┬─────────────────────────────────────┘
             │
             │ HTTPS (fetch) │ WebSocket (Twilio)
             │
┌────────────▼─────────────────────────────────────┐
│          Next.js API Routes (Server)             │
│  /api/messages  │ /api/contacts │ /api/twilio/*  │
│  Authentication │ Validation │ Business Logic    │
└─────┬──────────────────────┬─────────────────────┘
      │                      │
      │                      │ Webhooks (inbound)
      │                      │
┌─────▼──────────┐    ┌──────▼────────────────────┐
│  PostgreSQL    │    │  External Services        │
│  (Supabase)    │    │  • Twilio (SMS/Voice)     │
│  • Users       │    │  • Resend (Email)         │
│  • Contacts    │    │  • Cloudinary (Storage)   │
│  • Messages    │    └───────────────────────────┘
│  • Threads     │
└────────────────┘
```

### Request Flow

1. **Outbound Message**:
   ```
   Client → POST /api/messages → Validation (Zod) → 
   Authorization (NextAuth) → Database (Prisma) → 
   Integration (Twilio/Resend) → Response
   ```

2. **Inbound Message (Webhook)**:
   ```
   Twilio → POST /api/webhooks/twilio → 
   Signature Validation → Find/Create Contact → 
   Database (Prisma) → HTTP 200 Response
   ```

3. **Voice Call**:
   ```
   Client → GET /api/twilio/token → JWT Generation → 
   Client initializes Twilio Device → Outgoing Call → 
   TwiML App → POST /api/twilio/voice → TwiML Response
   ```

---

## Database Schema

```mermaid
erDiagram
    User ||--o{ Contact : owns
    User ||--o{ Message : sends
    User ||--o{ Note : creates
    User ||--o{ TeamMember : belongs_to

    Contact ||--o{ Message : receives_sends
    Contact ||--o{ Thread : has_conversations_in
    Contact ||--o{ Note : has_notes_about

    Thread ||--o{ Message : contains
    Team ||--o{ Thread : manages
    Team ||--o{ TeamMember : has

    User {
        string id PK
        string email UK
        string name
        string role
        string passwordHash
        string activeTeamId FK
        datetime createdAt
        datetime updatedAt
    }

    Contact {
        string id PK
        string userId FK
        string name
        string phone
        string whatsapp
        string email
        json socialHandles
        string[] tags
        datetime createdAt
        datetime updatedAt
        UK userId_phone
    }

    Message {
        string id PK
        string content
        string channel
        string direction
        string status
        string contactId FK
        string userId FK
        string threadId FK
        string messageSid
        string[] mediaUrls
        string subject
        boolean read
        datetime timestamp
    }

    Thread {
        string id PK
        string contactId FK
        string teamId FK
        datetime lastMessageAt
        datetime createdAt
        datetime updatedAt
    }

    Team {
        string id PK
        string name
        string ownerId FK
        datetime createdAt
    }

    TeamMember {
        string id PK
        string userId FK
        string teamId FK
        string role
        datetime joinedAt
        UK userId_teamId
    }
}

```

---

## Integration Comparison

| Channel | Provider | Avg Latency | Cost per Message | Reliability | Media Support | Best Use Case |
|---------|----------|-------------|------------------|-------------|---------------|---------------|
| **SMS** | Twilio | 1-3 seconds | $0.0079 USD | 99.95% | MMS only ($0.02-0.10 extra) | Time-sensitive notifications, 2FA, marketing |
| **WhatsApp** | Twilio Business API | 2-5 seconds | $0.005-0.04 USD¹ | 99.9% | Images, PDFs, videos (free) | Rich media, international, customer support |
| **Email** | Resend | 3-10 seconds | $0.0001 USD | 99.5% | Unlimited attachments | Long-form content, receipts, newsletters |
| **Voice** | Twilio Voice SDK | 500ms connection | $0.013 USD/min | 99.95% | Audio only | Urgent issues, complex discussions, personal touch |

¹ WhatsApp pricing depends on message type:
- **Session messages** (user initiated, within 24hrs): $0.005-0.0127
- **Template messages** (business initiated): $0.0165-0.042
- Varies by country (US cheaper than India/Brazil)

### Detailed Latency Analysis

**SMS (Twilio)**
- API request to Twilio: ~200ms
- Twilio to carrier gateway: ~500ms
- Carrier delivery to device: ~500ms-2s
- Webhook callback (delivery receipt): ~500ms
- **Total**: 1-3 seconds end-to-end

**WhatsApp (Twilio)**
- API request: ~300ms
- WhatsApp Business API processing: ~1s
- WhatsApp network delivery: ~1-3s
- Webhook callback: ~500ms
- **Total**: 2-5 seconds
- **Note**: Template approval takes 24hrs (one-time per template)

**Email (Resend)**
- API request to Resend: ~200ms
- Resend SMTP handoff: ~2-8s
- Recipient server acceptance: ~1-60s (varies by ESP)
- Inbox placement: ~0-30s (spam checks)
- **Total**: 3-100s (average 10s)

**Voice (Twilio)**
- Token generation: ~100ms
- Device initialization: ~200ms
- Call connection (STUN/TURN): ~200-500ms
- Audio latency (one-way): ~50-150ms
- **Total**: ~500ms to connect, ~100ms ongoing latency

### Cost Optimization Strategies

1. **Use WhatsApp for media**: Sending images via WhatsApp is $0.005, MMS is $0.02-0.10
2. **Session-based WhatsApp**: Respond within 24hrs to save 75% vs templates
3. **Email for bulk**: 100x cheaper than SMS for non-urgent messages
4. **SMS for critical**: Despite high cost, 98% open rate (vs 20% email)
5. **Voice for high-value**: Most expensive but best for complex sales/support

### Reliability Considerations

- **SMS**: Carrier-dependent, can fail on landlines/VOIP numbers
- **WhatsApp**: Requires opt-in, blocked in some countries (China, UAE)
- **Email**: Spam filters can block, requires verified sender domain
- **Voice**: Network-dependent, works on any internet connection

---

## Quick Start

### Prerequisites
- Node.js 20+ ([Download](https://nodejs.org/))
- PostgreSQL database (Supabase recommended)
- Twilio account ([Sign up](https://www.twilio.com/try-twilio))
- Resend account for email ([Sign up](https://resend.com/))
- ngrok (for local webhook testing): `npm install -g ngrok`

### Installation

```bash
# Clone repository
git clone https://github.com/yourusername/unibox.git
cd unibox

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
# Edit .env with your credentials

# Generate Prisma client
npx prisma generate

# Start development server
npm run dev
```

### Database Setup

Since Prisma migrations don't work well with Supabase pooler, run this SQL manually:

1. Go to [Supabase SQL Editor](https://supabase.com/dashboard/project/[your-project]/sql)
2. Execute this SQL:

```sql
-- Add userId to Contact table
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "userId" TEXT;

-- Assign existing contacts to first user
UPDATE "Contact" 
SET "userId" = (SELECT id FROM "User" ORDER BY "createdAt" ASC LIMIT 1)
WHERE "userId" IS NULL;

-- Make userId required
ALTER TABLE "Contact" ALTER COLUMN "userId" SET NOT NULL;

-- Add foreign key
ALTER TABLE "Contact" 
ADD CONSTRAINT "Contact_userId_fkey" 
FOREIGN KEY ("userId") REFERENCES "User"("id") 
ON DELETE CASCADE ON UPDATE CASCADE;

-- Drop old global phone constraint
ALTER TABLE "Contact" DROP CONSTRAINT IF EXISTS "Contact_phone_key";

-- Add per-user phone uniqueness
ALTER TABLE "Contact" 
ADD CONSTRAINT "Contact_userId_phone_key" 
UNIQUE ("userId", "phone");

-- Add index for performance
CREATE INDEX IF NOT EXISTS "Contact_userId_idx" ON "Contact"("userId");
```

### Twilio Webhook Configuration

Configure your Twilio phone number:

1. Go to [Twilio Console → Phone Numbers](https://console.twilio.com/us1/develop/phone-numbers/manage/incoming)
2. Select your number
3. Under **Messaging Configuration**:
   - Webhook URL: `https://your-domain.com/api/webhooks/twilio`
   - Method: `POST`
4. Under **Voice Configuration** (for TwiML App):
   - Go to [TwiML Apps](https://console.twilio.com/us1/develop/voice/manage/twiml-apps)
   - Create new app
   - Voice Request URL: `https://your-domain.com/api/twilio/voice`
   - Method: `POST`

For local development with ngrok:
```bash
ngrok http 3000
# Use generated URL (e.g., https://abc123.ngrok-free.app)
# Update NEXTAUTH_URL and NEXT_PUBLIC_BASE_URL in .env
```

### First Run

```bash
# Start dev server
npm run dev

# Open browser
open http://localhost:3000

# Create account at /signup
# Test messaging at /inbox
```

---

## Core Functions

### Messaging Integration (`src/lib/integrations.ts`)

#### `sendThrough(channel, payload)`
Factory function that routes messages to appropriate provider.

**Purpose**: Single interface for sending messages across all channels.

**Parameters**:
- `channel` (string): "sms" | "whatsapp" | "email"
- `payload` (SendPayload):
  - `to` (string): Recipient address (phone number or email)
  - `body` (string, optional): Message content
  - `mediaUrls` (string[], optional): Array of media URLs (for MMS/WhatsApp)
  - `subject` (string, optional): Email subject line
  - `from` (string, optional): Sender email address

**Returns**: Promise<any> - Provider-specific response object

**Example**:
```typescript
const result = await sendThrough('sms', {
  to: '+1234567890',
  body: 'Hello from Unibox!',
  mediaUrls: ['https://example.com/image.jpg']
});
// Returns: { sid: 'SMxxxxx', status: 'queued', ... }
```

**Internal Flow**:
1. Calls `createSender(channel)` to get provider-specific sender
2. Delegates to sender's `send()` method
3. Returns raw provider response

**Error Handling**:
- Throws `Error` if channel is invalid
- Provider errors (Twilio/Resend) bubble up to caller

#### `createSender(name)`
Factory method that instantiates channel-specific sender classes.

**Purpose**: Encapsulates provider logic behind common interface.

**Parameters**:
- `name` (string): Channel identifier ("sms", "whatsapp", "email")

**Returns**: Sender - Object implementing `send(payload)` method

**Design Pattern**: Factory pattern for extensibility

**Supported Senders**:
- `TwilioSender("sms")`: SMS via Twilio
- `TwilioSender("whatsapp")`: WhatsApp via Twilio Business API
- `EmailSender()`: Email via Resend

**Adding New Channels**:
```typescript
// Example: Add Twitter DM support
class TwitterSender implements Sender {
  async send(opts: SendPayload) {
    // Twitter API logic
    return twitterClient.sendDM(opts.to, opts.body);
  }
}

// Register in createSender
if (name === "twitter") return new TwitterSender();
```

---

### Twilio Integration (`src/lib/twilio.ts`)

#### `sendMessage(opts)`
Low-level function for sending SMS/WhatsApp via Twilio API.

**Purpose**: Handles Twilio-specific formatting and API calls.

**Parameters**:
- `opts` (object):
  - `to` (string): Recipient phone number (E.164 format)
  - `channel` (string, optional): "sms" | "whatsapp" (default: "sms")
  - `body` (string, optional): Message text
  - `mediaUrls` (string[], optional): Media URLs for MMS/WhatsApp

**Returns**: Promise<MessageInstance> - Twilio message object with SID

**Phone Number Formatting**:
- SMS: Uses `TWILIO_FROM_NUMBER` as-is
- WhatsApp: Prepends "whatsapp:" prefix to both from/to numbers
- Validates E.164 format (+1XXXXXXXXXX)

**Example**:
```typescript
// Send SMS
await sendMessage({
  to: '+12025551234',
  channel: 'sms',
  body: 'Your verification code is 123456'
});

// Send WhatsApp with image
await sendMessage({
  to: '+12025551234',
  channel: 'whatsapp',
  body: 'Check out this image!',
  mediaUrls: ['https://example.com/photo.jpg']
});
```

**Error Handling**:
- Throws if Twilio client not configured
- Throws if accountSid doesn't start with "AC"
- Twilio API errors (invalid number, insufficient balance) propagate

**Environment Variables Required**:
- `TWILIO_ACCOUNT_SID`: Account identifier (starts with "AC")
- `TWILIO_AUTH_TOKEN`: API authentication token
- `TWILIO_FROM_NUMBER`: Your Twilio phone number
- `TWILIO_WHATSAPP_FROM`: WhatsApp-enabled number (optional, falls back to FROM_NUMBER)

---

### Thread Management (`src/lib/threads.ts`)

#### `findOrCreateThread(contactId, teamId?)`
Ensures a conversation thread exists for a contact.

**Purpose**: Groups messages into threads for conversation context.

**Parameters**:
- `contactId` (string): Contact's database ID
- `teamId` (string | null, optional): Team workspace ID (null for personal)

**Returns**: Promise<Thread> - Thread object with id, contactId, teamId

**Logic**:
1. Search for existing thread with exact contactId + teamId match
2. If not found and teamId provided, search for global thread (teamId=null)
3. If still not found, create new thread
4. Return thread object

**Thread Hierarchy**:
- **Team threads**: Shared among team members (teamId set)
- **Personal threads**: Private to user (teamId=null)
- **Fallback**: Personal threads used if no team thread exists

**Example**:
```typescript
// Get thread for contact in team workspace
const thread = await findOrCreateThread('contact_123', 'team_456');

// Get personal thread (no team)
const personalThread = await findOrCreateThread('contact_123', null);
```

**Use Cases**:
- Creating new messages: Assign threadId for grouping
- Displaying inbox: Show threads sorted by lastMessageAt
- Team collaboration: Multiple users see same thread

#### `getTeamIdForUser(userId?)`
Retrieves user's team membership for thread scoping.

**Purpose**: Determine which team workspace user is currently in.

**Parameters**:
- `userId` (string | null, optional): User's database ID

**Returns**: Promise<string | null> - Team ID or null if no membership

**Logic**:
1. Query `teamMember` table for userId
2. Return first team found (users can belong to multiple teams)
3. Return null if user has no team memberships

**Example**:
```typescript
const teamId = await getTeamIdForUser('user_123');
if (teamId) {
  // User is in a team, use team thread
  const thread = await findOrCreateThread(contactId, teamId);
} else {
  // User has no team, use personal thread
  const thread = await findOrCreateThread(contactId, null);
}
```

**Team Selection**:
- Currently returns first team (can be extended for active team selection)
- Users with multiple teams could have UI to switch active team
- Stored in `User.activeTeamId` field for future enhancement

---

### Email Integration (`src/lib/resend.ts`)

#### `sendEmail(opts)`
Sends transactional emails via Resend API.

**Purpose**: Handle email delivery with proper formatting and error handling.

**Parameters**:
- `opts` (object):
  - `to` (string): Recipient email address
  - `subject` (string): Email subject line
  - `body` (string): Plain text or HTML email body
  - `from` (string, optional): Sender email (defaults to EMAIL_FROM env)

**Returns**: Promise<any> - Resend API response with message ID

**Email Formatting**:
- Automatically detects HTML vs plain text (looks for `<` character)
- Plain text: Uses `text` field in Resend API
- HTML: Uses `html` field in Resend API
- From address must be verified domain in Resend

**Example**:
```typescript
// Plain text email
await sendEmail({
  to: 'customer@example.com',
  subject: 'Order Confirmation',
  body: 'Your order #12345 has been confirmed.'
});

// HTML email
await sendEmail({
  to: 'customer@example.com',
  subject: 'Welcome to Unibox!',
  body: '<h1>Welcome!</h1><p>Thanks for signing up.</p>'
});
```

**Error Handling**:
- Throws if Resend API key not configured
- Resend API errors (invalid email, unverified domain) propagate
- Logs full error object for debugging

**Environment Variables Required**:
- `RESEND_API_KEY`: API key from Resend dashboard
- `EMAIL_FROM`: Verified sender email (e.g., "noreply@yourdomain.com")

---

### Authentication (`src/lib/auth.ts`)

#### `authOptions`
NextAuth.js configuration object for authentication providers and callbacks.

**Purpose**: Configure authentication strategies and session management.

**Providers**:
1. **Credentials Provider**:
   - Email/password authentication
   - Bcrypt password hashing
   - User lookup in PostgreSQL

2. **Google OAuth** (optional):
   - Requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
   - Auto-creates user on first login

**Session Strategy**: JWT (JSON Web Tokens)
- Token stored in HTTP-only cookie
- Expires after 30 days
- Contains user id, email, name

**Callbacks**:
- `jwt()`: Adds user.id to JWT payload
- `session()`: Adds user.id to session object for API access

**Example Usage**:
```typescript
// In API route
const session = await getServerSession(authOptions);
if (!session?.user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
const userId = (session.user as any).id;
```

**Security Features**:
- Password hashing with bcrypt (10 rounds)
- CSRF protection via NextAuth
- Secure cookie flags (httpOnly, sameSite, secure)

---

### Validation Schemas (`src/lib/schemas.ts`)

#### `sendMessageSchema`
Zod schema for validating outbound message requests.

**Purpose**: Type-safe validation and auto-generated TypeScript types.

**Schema**:
```typescript
const sendMessageSchema = z.object({
  contactId: z.string().optional(),
  to: z.string().optional(),
  channel: z.enum(['sms', 'whatsapp', 'email']),
  content: z.string().min(1),
  media: z.any().optional(),
  mediaUrls: z.array(z.string().url()).optional(),
  subject: z.string().optional(), // Required for email
  userId: z.string().optional(),
});
```

**Validation Rules**:
- At least one of `contactId` or `to` must be provided
- `content` must be non-empty string
- `mediaUrls` must be valid URLs if provided
- `channel` must be one of the three supported types

**Usage in API**:
```typescript
const parsed = sendMessageSchema.safeParse(req.body);
if (!parsed.success) {
  return NextResponse.json({ 
    error: parsed.error.flatten() 
  }, { status: 422 });
}
const data = parsed.data; // Type-safe!
```

**Benefits**:
- Runtime validation catches bad data
- TypeScript types auto-generated from schema
- Detailed error messages for client
- Single source of truth for API contract

---

## API Endpoints

### Authentication Endpoints

#### `POST /api/auth/signup`
Creates new user account with email/password.

**Request Body**:
```json
{
  "email": "user@example.com",
  "name": "John Doe",
  "password": "securePassword123"
}
```

**Response** (201 Created):
```json
{
  "user": {
    "id": "cm123abc",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

**Validation**:
- Email must be valid format
- Password must be at least 8 characters
- Email must be unique (returns 400 if exists)

**Security**:
- Password hashed with bcrypt (10 rounds)
- Password never stored in plain text
- Salt automatically generated per user

**Error Responses**:
- `400 Bad Request`: Email already exists
- `422 Unprocessable Entity`: Invalid input format

#### `POST /api/auth/signin`
Authenticates user and creates session (handled by NextAuth).

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response**:
- Success: Sets HTTP-only cookie, redirects to /inbox
- Failure: Returns error message

**Error Messages**:
- "Invalid email or password": Wrong credentials
- "CredentialsSignin": Mapped to friendly error

---

### Contact Endpoints

#### `GET /api/contacts`
Lists all contacts owned by authenticated user.

**Authentication**: Required (NextAuth session)

**Query Parameters**: None

**Response** (200 OK):
```json
{
  "contacts": [
    {
      "id": "cm123abc",
      "userId": "user123",
      "name": "Jane Smith",
      "phone": "+12025551234",
      "whatsapp": "+12025551234",
      "email": "jane@example.com",
      "tags": ["customer", "vip"],
      "createdAt": "2024-01-15T10:30:00Z",
      "_count": {
        "messages": 42,
        "notes": 3
      }
    }
  ]
}
```

**Privacy**: Only returns contacts where `userId` matches authenticated user

**Ordering**: Alphabetically by name (ascending)

**Performance**: Includes message/note counts via Prisma aggregation

#### `POST /api/contacts`
Creates new contact for authenticated user.

**Authentication**: Required

**Request Body**:
```json
{
  "name": "John Doe",
  "phone": "+12025551234",
  "whatsapp": "+12025551234",
  "email": "john@example.com"
}
```

**Validation**:
- At least one contact method (phone/whatsapp/email) required
- Phone numbers must be E.164 format (+1XXXXXXXXXX)
- Email must be valid format
- Phone must be unique per user (not globally)

**Response** (201 Created):
```json
{
  "contact": {
    "id": "cm456def",
    "userId": "user123",
    "name": "John Doe",
    "phone": "+12025551234",
    "createdAt": "2024-01-15T11:00:00Z"
  }
}
```

**Error Responses**:
- `400 Bad Request`: Duplicate phone for this user
- `401 Unauthorized`: No session
- `422 Unprocessable Entity`: Invalid input

#### `PATCH /api/contacts/[id]`
Updates existing contact (only if owned by user).

**Authentication**: Required

**URL Parameters**:
- `id`: Contact ID (e.g., /api/contacts/cm123abc)

**Request Body**:
```json
{
  "name": "Jane Doe (Updated)",
  "phone": "+12025559999",
  "email": "jane.new@example.com"
}
```

**Authorization Check**:
1. Verifies contact exists
2. Verifies contact.userId matches authenticated user
3. Returns 404 if either check fails

**Response** (200 OK):
```json
{
  "contact": {
    "id": "cm123abc",
    "name": "Jane Doe (Updated)",
    "phone": "+12025559999",
    "updatedAt": "2024-01-15T12:00:00Z"
  }
}
```

**Error Responses**:
- `404 Not Found`: Contact doesn't exist or not owned by user
- `400 Bad Request`: Duplicate phone number

#### `DELETE /api/contacts/[id]`
Deletes contact and all related data (cascading delete).

**Authentication**: Required

**URL Parameters**:
- `id`: Contact ID

**Authorization**: Same as PATCH (verifies ownership)

**Cascade Behavior**:
- Deletes all messages with this contactId
- Deletes all notes for this contact
- Deletes all threads for this contact
- Deletes scheduled messages for this contact

**Response** (200 OK):
```json
{
  "success": true
}
```

**Error Responses**:
- `404 Not Found`: Contact doesn't exist or not owned by user

---

### Message Endpoints

#### `GET /api/messages`
Retrieves messages for authenticated user's contacts.

**Authentication**: Required

**Query Parameters**:
- `contactId` (optional): Filter by specific contact
- `channel` (optional): Filter by channel (sms/whatsapp/email)

**Response** (200 OK):
```json
{
  "messages": [
    {
      "id": "msg123",
      "content": "Hello!",
      "channel": "sms",
      "direction": "outbound",
      "status": "DELIVERED",
      "timestamp": "2024-01-15T14:30:00Z",
      "contactId": "cm123abc",
      "userId": "user123",
      "threadId": "thread456",
      "messageSid": "SM789xyz",
      "mediaUrls": [],
      "read": true,
      "contact": {
        "id": "cm123abc",
        "name": "Jane Smith"
      }
    }
  ]
}
```

**Filtering**: Automatically filters to contacts owned by authenticated user

**Ordering**: Chronological by timestamp (ascending)

**Includes**: Contact and user relations via Prisma

#### `POST /api/messages`
Sends a new message via SMS, WhatsApp, or Email.

**Authentication**: Required

**Request Body**:
```json
{
  "contactId": "cm123abc",
  "channel": "sms",
  "content": "Hello from Unibox!",
  "mediaUrls": ["https://example.com/image.jpg"],
  "subject": "Important Update"
}
```

**Validation** (Zod schema):
- `contactId` or `to` required
- `channel` must be "sms", "whatsapp", or "email"
- `content` must be non-empty
- `mediaUrls` must be valid URLs
- `subject` required for email channel

**Authorization**:
- Verifies contact belongs to authenticated user
- Returns 404 if contact not found or not owned

**Processing Flow**:
1. Find/create contact
2. Create message record in database (status: PENDING)
3. Determine thread (find or create)
4. Send via integration (Twilio/Resend)
5. Update message status (SENT/FAILED)
6. Return message object

**Response** (201 Created):
```json
{
  "message": {
    "id": "msg789",
    "status": "SENT",
    "messageSid": "SM123xyz",
    "timestamp": "2024-01-15T15:00:00Z"
  }
}
```

**Media URL Validation**:
- Must be publicly accessible (not localhost)
- For local dev, requires ngrok setup
- Twilio fetches media from URL during send

**Error Responses**:
- `400 Bad Request`: Invalid media URL, misconfigured WhatsApp
- `404 Not Found`: Contact not found or unauthorized
- `422 Unprocessable Entity`: Validation failed
- `500 Internal Server Error`: Provider API failure

**Special Error Codes** (from Twilio):
- `63007`: WhatsApp number not enabled
- `21620`: Invalid media URL (not publicly accessible)

---

### Thread Endpoints

#### `GET /api/threads`
Lists all conversation threads for authenticated user.

**Authentication**: Required

**Query Parameters**: None

**Response** (200 OK):
```json
{
  "threads": [
    {
      "id": "thread123",
      "contact": {
        "id": "cm123abc",
        "name": "Jane Smith",
        "phone": "+12025551234"
      },
      "lastMessage": {
        "content": "Thanks!",
        "timestamp": "2024-01-15T16:00:00Z",
        "channel": "sms"
      },
      "messageCount": 15,
      "unreadCount": 2,
      "teamId": null
    }
  ]
}
```

**Filtering**:
- Only threads for contacts owned by authenticated user
- Includes both team and personal threads
- Team scope: Threads where teamId matches user's team OR teamId is null

**Ordering**: Most recent activity first (updatedAt descending)

**Limit**: Returns up to 200 threads

**Includes**:
- Contact details
- Last message in thread
- Total message count
- Unread message count (calculated separately)

**Unread Count Logic**:
```typescript
// Count messages where:
// - contactId matches thread contact
// - direction is 'inbound'
// - read is false
const unreadCount = await prisma.message.count({
  where: {
    contactId: thread.contact.id,
    direction: "inbound",
    read: false,
  },
});
```

**Team Behavior**:
- If user in team: Shows team threads + personal threads
- If no team: Shows only personal threads (teamId=null)

**Performance Optimization**:
- Uses Prisma `include` for efficient joins
- Separate query for unread counts (can't aggregate in one query)
- Indexed on contactId, teamId, updatedAt

---

### Twilio Voice Endpoints

#### `GET /api/twilio/token`
Generates JWT access token for Twilio Voice SDK (browser calling).

**Authentication**: Required (NextAuth session)

**Purpose**: Authorizes browser to make/receive VoIP calls via Twilio

**Query Parameters**: None

**Response** (200 OK):
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJTS..."
}
```

**Token Contents**:
- **Identity**: `user_{userId}` (unique per user)
- **Grants**: VoiceGrant with outgoing/incoming call permissions
- **TTL**: 3600 seconds (1 hour)
- **Issuer**: TWILIO_API_KEY (SK...)
- **TwiML App**: TWILIO_TWIML_APP_SID (AP...)

**Token Generation Process**:
```typescript
const token = new AccessToken(
  TWILIO_ACCOUNT_SID,
  TWILIO_API_KEY,
  TWILIO_API_SECRET,
  { ttl: 3600 }
);

token.identity = `user_${userId}`;

const grant = new VoiceGrant({
  outgoingApplicationSid: TWILIO_TWIML_APP_SID,
  incomingAllow: true,
});

token.addGrant(grant);
```

**Client-Side Usage**:
```typescript
// Fetch token from API
const response = await fetch('/api/twilio/token');
const { token } = await response.json();

// Initialize Twilio Device
const device = new Device(token);
await device.register();

// Make outbound call
const call = await device.connect({
  params: { To: '+12025551234' }
});
```

**Token Refresh**:
- Frontend auto-refreshes token every 50 minutes
- Prevents call drops due to token expiration
- Handles refresh transparently during active calls

**Environment Variables Required**:
- `TWILIO_ACCOUNT_SID`: Your Twilio account ID
- `TWILIO_API_KEY`: API key (create in Twilio console)
- `TWILIO_API_SECRET`: API key secret
- `TWILIO_TWIML_APP_SID`: TwiML App ID

**Error Responses**:
- `401 Unauthorized`: No session
- `500 Internal Server Error`: Missing Twilio credentials

#### `POST /api/twilio/voice`
TwiML endpoint for routing outgoing voice calls (called by Twilio).

**Purpose**: Generates TwiML instructions for Twilio to route calls

**Note**: This endpoint is called by Twilio, not directly by client

**Request Body** (Twilio form data):
- `To`: Destination phone number (from Device.connect params)
- `From`: Caller identity (user_{userId})
- `CallSid`: Unique call identifier

**Response**: TwiML XML
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial callerId="+12025551234" record="record-from-answer">
    <Number>+19876543210</Number>
  </Dial>
</Response>
```

**TwiML Elements**:
- `<Dial>`: Initiates outbound call
- `callerId`: Shows your Twilio number to recipient
- `record`: Enables call recording
- `<Number>`: Destination phone number

**Call Flow**:
1. User clicks "Call" in browser
2. Twilio Device sends request to TwiML App URL
3. This endpoint generates TwiML response
4. Twilio connects call to destination number
5. Audio streams via WebRTC to browser

**WhatsApp Support**:
- Detects if `To` starts with "whatsapp:"
- Uses `<Client>` element for WhatsApp calls
- Requires WhatsApp Business API setup

**Error Handling**:
- If TWILIO_FROM_NUMBER not set: Returns TwiML with <Say> error message
- If To parameter missing: Returns 400 Bad Request

**Call Recording**:
- Enabled by default (`record="record-from-answer"`)
- Recordings accessible in Twilio Console
- Can be disabled by removing record attribute

#### `GET /api/twilio/voice`
TwiML endpoint for handling incoming voice calls.

**Purpose**: Routes incoming calls to browser (future feature)

**Status**: Currently returns placeholder TwiML

**Future Implementation**:
```xml
<Response>
  <Dial>
    <Client>user_123</Client>
  </Dial>
</Response>
```

**Incoming Call Flow** (planned):
1. Someone calls your Twilio number
2. Twilio requests this endpoint (GET)
3. Endpoint determines which user to route to
4. Returns TwiML with <Client> element
5. User's browser rings (if Device is registered)

---

### Webhook Endpoints

#### `POST /api/webhooks/twilio`
Receives inbound SMS/WhatsApp messages from Twilio.

**Purpose**: Process incoming messages and store in database

**Authentication**: Twilio signature validation (HMAC-SHA1)

**Request Headers**:
- `X-Twilio-Signature`: HMAC signature for validation
- `Content-Type`: application/x-www-form-urlencoded

**Request Body** (form-encoded):
```
From=+12025551234
To=+12025556789
Body=Hello!
MessageSid=SMxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NumMedia=0
```

**Additional Fields for MMS/WhatsApp**:
- `MediaUrl0`, `MediaUrl1`, etc.: URLs to media files
- `MediaContentType0`: MIME type (image/jpeg, application/pdf)

**Processing Flow**:
1. Parse form data from request body
2. Validate Twilio signature (verify authenticity)
3. Determine channel (SMS vs WhatsApp) from phone format
4. Find or create contact
5. Check for duplicate (by MessageSid)
6. Find or create thread
7. Create message record
8. Return HTTP 200 (Twilio requires fast response)

**Signature Validation**:
```typescript
const twilioSignature = req.headers.get("x-twilio-signature");
const authToken = process.env.TWILIO_AUTH_TOKEN;
const reconstructedUrl = `https://${host}${pathname}`;

const valid = Twilio.validateRequest(
  authToken,
  twilioSignature,
  reconstructedUrl,
  paramsObj
);

if (!valid) {
  return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
}
```

**Contact Assignment**:
- Inbound messages auto-create contacts if not found
- Assigned to first user in system (by createdAt)
- Future: Route based on Twilio number or round-robin

**Duplicate Prevention**:
- Checks if MessageSid already exists in database
- Skips processing if duplicate found
- Prevents double-insertion from Twilio retries

**Response** (200 OK):
```json
{}
```

**Error Responses**:
- `403 Forbidden`: Invalid Twilio signature
- `500 Internal Server Error`: Database or processing error

**Twilio Retry Behavior**:
- If endpoint returns non-200, Twilio retries up to 3 times
- Exponential backoff (1s, 2s, 4s)
- Duplicate check ensures idempotent processing

**ngrok Required for Local Dev**:
- Twilio needs publicly accessible URL
- Use ngrok to expose localhost:
  ```bash
  ngrok http 3000
  # Configure webhook: https://abc123.ngrok-free.app/api/webhooks/twilio
  ```

---

## WebSocket/Real-time

### Twilio Voice SDK (WebRTC)

**Technology**: Twilio Client SDK with WebRTC under the hood

**Purpose**: Real-time audio streaming for voice calls

**Connection Flow**:
1. Client fetches JWT token from `/api/twilio/token`
2. Initialize Device with token:
   ```typescript
   import { Device } from '@twilio/voice-sdk';
   const device = new Device(token);
   await device.register();
   ```
3. Device establishes WebSocket connection to Twilio
4. Signaling via WebSocket, media via SRTP (Secure RTP)

**Protocols Used**:
- **Signaling**: WebSocket (wss://) to Twilio edge servers
- **Media**: SRTP (UDP-based, encrypted audio)
- **Codec**: Opus (low-latency, high-quality)
- **NAT Traversal**: STUN/TURN servers (handled by Twilio)

**Device Events**:
```typescript
device.on('registered', () => {
  console.log('Ready to make/receive calls');
});

device.on('error', (error) => {
  console.error('Device error:', error);
});

device.on('incoming', (call) => {
  console.log('Incoming call from:', call.parameters.From);
  call.accept(); // Answer the call
});
```

**Call Events**:
```typescript
const call = await device.connect({ params: { To: '+1234567890' } });

call.on('accept', () => {
  console.log('Call connected');
});

call.on('disconnect', () => {
  console.log('Call ended');
});

call.on('cancel', () => {
  console.log('Call cancelled');
});

call.on('reject', () => {
  console.log('Call rejected');
});
```

**Call Controls**:
```typescript
// Mute microphone
call.mute(true);

// Unmute
call.mute(false);

// Hang up
call.disconnect();

// Send DTMF tones (for IVR navigation)
call.sendDigits('1234');
```

**Network Requirements**:
- **Outbound UDP**: Ports 10000-20000 (for SRTP media)
- **Outbound TCP**: Port 443 (for WebSocket signaling)
- **Bandwidth**: ~40 kbps per call (Opus codec)

**Firewall Considerations**:
- Corporate firewalls may block UDP media
- Twilio falls back to TCP if UDP blocked
- TURN servers ensure connectivity in restricted networks

**Token Refresh**:
```typescript
// Token expires after 1 hour
device.on('tokenWillExpire', async () => {
  const response = await fetch('/api/twilio/token');
  const { token } = await response.json();
  device.updateToken(token);
});
```

**Browser Support**:
- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support (iOS 11+)
- Mobile browsers: Full support
- No plugins required (native WebRTC)

**Audio Devices**:
```typescript
// List available devices
const devices = await navigator.mediaDevices.enumerateDevices();
const audioInputs = devices.filter(d => d.kind === 'audioinput');

// Select microphone
device.audio.setInputDevice(deviceId);

// Get current device
const currentDevice = device.audio.inputDevice;
```

**Call Quality Monitoring**:
```typescript
call.on('sample', (sample) => {
  console.log('Call stats:', {
    mos: sample.mos, // Mean Opinion Score (1-5)
    rtt: sample.rtt, // Round-trip time (ms)
    jitter: sample.jitter, // Audio jitter (ms)
    packetsLost: sample.packetsLost
  });
});
```

---

## Key Design Decisions

### 1. User-Isolated Contacts

**Decision**: Each user has private contact list (userId foreign key)

**Rationale**:
- **Privacy**: Users can't see other users' contacts
- **Data Isolation**: Prevents accidental data leakage in shared environment
- **Compliance**: Easier to meet GDPR/CCPA requirements
- **Scalability**: Can shard database by userId in future

**Implementation**:
```sql
ALTER TABLE "Contact" ADD COLUMN "userId" TEXT NOT NULL;
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_userId_fkey" 
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
-- Unique constraint per user (not global)
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_userId_phone_key" 
  UNIQUE ("userId", "phone");
```

**API Enforcement**:
- All contact queries filtered by `userId`
- Authorization checks verify ownership before modify/delete
- Webhook contacts assigned to first user (can be customized)

**Trade-offs**:
- Teams can't share contacts by default
- Future feature: Shared contacts with team scope
- Slightly more complex queries (always join on userId)

**Alternatives Considered**:
- Global contacts: Rejected due to privacy concerns
- Team-scoped contacts: Too complex for MVP
- Hybrid approach: May implement later

### 2. Factory Pattern for Integrations

**Decision**: Abstract messaging logic into `createSender()` factory

**Code**:
```typescript
// src/lib/integrations.ts
export function createSender(name: string): Sender {
  if (name === "sms") return new TwilioSender("sms");
  if (name === "whatsapp") return new TwilioSender("whatsapp");
  if (name === "email") return new EmailSender();
  throw new Error(`Unknown sender: ${name}`);
}
```

**Benefits**:
- **Maintainability**: Change provider without touching API routes
- **Testability**: Mock senders for unit tests
- **Extensibility**: Add new channels (Twitter, Slack) easily
- **Consistency**: All channels use same interface

**Example Extension**:
```typescript
// Adding Slack support
class SlackSender implements Sender {
  async send(opts: SendPayload) {
    return slackClient.postMessage({
      channel: opts.to,
      text: opts.body
    });
  }
}

// Register in factory
if (name === "slack") return new SlackSender();
```

**Why Not Direct API Calls?**
- Scatters provider logic across codebase
- Hard to swap providers (vendor lock-in)
- Difficult to test (need to mock HTTP calls)
- Violates DRY principle

### 3. Zod for Runtime Validation

**Decision**: All API inputs validated with Zod schemas

**Example**:
```typescript
const sendMessageSchema = z.object({
  contactId: z.string().optional(),
  channel: z.enum(['sms', 'whatsapp', 'email']),
  content: z.string().min(1),
  mediaUrls: z.array(z.string().url()).optional(),
});

const parsed = sendMessageSchema.safeParse(req.body);
if (!parsed.success) {
  return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
}
```

**Benefits**:
- **Type Safety**: Auto-generate TypeScript types from schema
- **Runtime Validation**: Catch invalid inputs at API boundary
- **Documentation**: Schema serves as API contract
- **Error Messages**: Detailed validation errors for client

**Why Not TypeScript Alone?**
- TypeScript only validates at compile time
- Client can send anything at runtime
- Need validation for external inputs (webhooks, user forms)

**Schema as Single Source of Truth**:
```typescript
// Define schema once
export const sendMessageSchema = z.object({ ... });

// Extract TypeScript type
export type SendMessageInput = z.infer<typeof sendMessageSchema>;

// Use in API route
function handler(req: Request) {
  const data: SendMessageInput = sendMessageSchema.parse(req.body);
  // data is now type-safe AND validated
}
```

### 4. Prisma with Connection Pooling

**Decision**: Use Supabase pooler with `pgbouncer=true` parameter

**Configuration**:
```bash
DATABASE_URL="postgresql://user:pass@host:5432/db?pgbouncer=true&connection_limit=1"
```

**Rationale**:
- **Serverless-Friendly**: Vercel functions have limited connection capacity
- **Cost-Effective**: Fewer idle connections = lower database costs
- **Performance**: Connection reuse reduces latency (no handshake)
- **Auto-Scaling**: Pooler handles connection management

**Caveats**:
- **Prepared Statements**: Don't work well with pgbouncer
- **Migrations**: Must use direct connection or manual SQL
- **Transactions**: Limited in transaction pooling mode

**pgbouncer Modes**:
- **Session**: One connection per client session (best compatibility)
- **Transaction**: Connection released after each transaction (best performance)
- **Statement**: Connection released after each statement (most restrictive)

**Why Not Direct Connection?**
- Exhausts connection pool quickly in serverless
- Each API request creates new connection
- PostgreSQL limited to ~100 connections
- Connection creation is slow (~100ms handshake)

### 5. Browser-Based VoIP (Twilio Voice SDK)

**Decision**: Use Twilio Voice SDK instead of custom WebRTC

**Rationale**:
- **Reliability**: Twilio handles NAT traversal, STUN/TURN servers
- **Quality**: Professional-grade Opus codec
- **PSTN Integration**: Can call regular phone numbers
- **Recording**: Built-in call recording
- **No Backend**: No need to manage signaling server

**Cost Comparison**:
- **Twilio**: $0.013/min (includes PSTN termination)
- **Custom WebRTC**: Free peer-to-peer, but can't call phones
- **SIP Trunk**: $0.005-0.01/min but requires SIP infrastructure

**Why Not Pure WebRTC?**
- Requires signaling server (Socket.IO, etc.)
- No PSTN connectivity (can't call phones)
- Complex NAT traversal logic
- Need to host TURN servers (~$50/month)

**Alternatives Considered**:
- **Agora**: Similar pricing, less reliable in my testing
- **Vonage**: $0.01/min but worse browser support
- **Amazon Chime**: Good for meetings, overkill for 1-on-1 calls

### 6. Thread-Based Conversations

**Decision**: Group messages by contact + team into threads

**Schema**:
```typescript
model Thread {
  id            String   @id @default(cuid())
  contactId     String
  teamId        String?  // null for personal threads
  lastMessageAt DateTime?
  messages      Message[]
}
```

**Benefits**:
- **Context**: All messages with a contact in one place
- **Team Collaboration**: Multiple users can handle same thread
- **Performance**: Efficient queries with indexed threadId
- **Flexibility**: Support both personal and team threads

**Thread Hierarchy**:
1. **Team threads**: Visible to all team members
2. **Personal threads**: Visible only to creator (teamId=null)
3. **Fallback**: If no team thread, use personal thread

**Why Not Flat Message List?**
- Hard to group messages by conversation
- Inefficient queries (must scan all messages)
- Difficult to implement team collaboration
- Poor UX (no conversation context)

**Future Enhancements**:
- Thread assignments (specific user handles thread)
- Thread status (open, closed, snoozed)
- Thread tags for categorization

### 7. Webhook-Based Inbound Processing

**Decision**: Twilio webhooks auto-create contacts for unknown senders

**Flow**:
```
Twilio receives SMS → POST /api/webhooks/twilio → 
Find or create contact → Create message → Return 200
```

**Rationale**:
- **Automation**: No manual contact creation needed
- **Low Latency**: Fast response required by Twilio (<10s)
- **Idempotency**: MessageSid prevents duplicates
- **Async**: Database writes don't block Twilio

**Contact Assignment Strategy**:
```typescript
// Current: Assign to first user
const defaultUser = await prisma.user.findFirst({
  orderBy: { createdAt: 'asc' }
});

// Future: Round-robin or phone number routing
const userMapping = {
  '+12025551234': 'user_sales',
  '+12025556789': 'user_support',
};
```

**Why Not Polling?**
- Webhooks are real-time (< 1s latency)
- Polling wastes API calls and costs money
- Webhooks scale better (Twilio handles retries)

**Webhook Security**:
- Signature validation (HMAC-SHA1)
- Rejects requests without valid signature
- Prevents spoofed messages

---


**1. "Can't reach database server"**
- Check DATABASE_URL is correct
- Verify Supabase IP allowlist (allow all for development)
- Use pooler URL, not direct connection
- Add `?pgbouncer=true` parameter

**2. "Twilio signature validation failed"**
- Ensure TWILIO_AUTH_TOKEN is correct
- Check webhook URL matches exactly (trailing slash matters)
- Verify ngrok URL in development
- Inspect X-Forwarded-Host header

**3. "Cannot send media via localhost"**
- Twilio requires publicly accessible URLs
- Use ngrok: `ngrok http 3000`
- Set NEXT_PUBLIC_BASE_URL to ngrok URL
- Media URLs must be HTTPS

**4. "WhatsApp From number not configured"**
- Use Twilio WhatsApp sandbox number for testing
- Production requires approved WhatsApp Business account
- Set TWILIO_WHATSAPP_FROM in .env

**5. "Voice call connects but no audio"**
- Check browser microphone permissions
- Verify TwiML App Voice URL is correct
- Check TWILIO_FROM_NUMBER is voice-enabled
- Test with different browser (Safari has stricter WebRTC)

---

## License

MIT License - See [LICENSE](LICENSE) for details.

---


## ✨ Features

### 📱 Multi-Channel Communication
- **SMS** - Send/receive text messages via Twilio
- **WhatsApp** - Business messaging integration
- **Email** - Full email support with Resend
- **Voice Calls** - In-app VoIP calling with Twilio Client SDK (browser-based)

### 📞 Voice Calling (NEW!)
- **Browser-based VoIP** - Make/receive calls directly in the app
- **Call Controls** - Mute, hang up, DTMF keypad, volume control
- **Incoming Calls** - Answer calls from your Twilio number
- **No Phone Required** - Works on desktop and mobile browsers
- See [VOICE_CALLING_SETUP.md](./VOICE_CALLING_SETUP.md) for setup instructions

### 💬 Messaging
- Unified inbox for all channels
- Thread-based conversations
- Message scheduling
- Media attachments (images, documents)
- Read/unread tracking
- Email with subject lines


## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
