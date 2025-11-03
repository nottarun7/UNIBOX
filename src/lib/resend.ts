import { Resend } from 'resend';

// Lazy initialization - only create Resend instance when actually sending email
let resendInstance: Resend | null = null;

function getResendInstance() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY not configured');
  }
  if (!resendInstance) {
    resendInstance = new Resend(process.env.RESEND_API_KEY);
  }
  return resendInstance;
}

export async function sendEmail({
  to,
  subject,
  body,
  from,
}: {
  to: string;
  subject?: string;
  body: string;
  from?: string;
}) {
  const resend = getResendInstance();

  const fromEmail = from || process.env.EMAIL_FROM || 'noreply@yourdomain.com';

  try {
    const result = await resend.emails.send({
      from: fromEmail,
      to: [to],
      subject: subject || 'New Message',
      text: body,
      // Optionally add HTML version
      html: body.replace(/\n/g, '<br>'),
    });

    console.log('Email sent via Resend:', result);
    return result;
  } catch (error) {
    console.error('Resend error:', error);
    throw error;
  }
}
