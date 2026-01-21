import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.EMAIL_FROM || 'Alert <onboarding@resend.dev>';

interface ClassInfo {
  subject: string;
  catalogNbr: string;
  courseTitle: string;
  instructorName: string;
  seatsAvailable: number;
}

export async function sendMagicLink(email: string, token: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const magicLink = `${appUrl}/verify?token=${token}`;

  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: 'Sign in to Alert',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #C8102E;">Alert</h1>
        <p>Click the button below to sign in to your account:</p>
        <a href="${magicLink}" style="display: inline-block; background-color: #C8102E; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Sign In
        </a>
        <p style="margin-top: 20px; color: #666; font-size: 14px;">
          This link will expire in 1 hour. If you didn't request this, you can safely ignore this email.
        </p>
      </div>
    `,
  });

  if (error) {
    console.error('Failed to send magic link:', error);
    throw new Error('Failed to send email');
  }

  return data;
}

export async function sendClassAlert(email: string, classInfo: ClassInfo) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: `${classInfo.subject} ${classInfo.catalogNbr} is NOW OPEN!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #C8102E;">Class Available!</h1>
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h2 style="margin: 0 0 10px 0; color: #333;">${classInfo.subject} ${classInfo.catalogNbr}</h2>
          <p style="margin: 5px 0; color: #666;"><strong>Title:</strong> ${classInfo.courseTitle}</p>
          <p style="margin: 5px 0; color: #666;"><strong>Instructor:</strong> ${classInfo.instructorName}</p>
          <p style="margin: 5px 0; color: #28a745; font-weight: bold;">
            <strong>Available Seats:</strong> ${classInfo.seatsAvailable}
          </p>
        </div>
        <a href="https://classbrowser.uh.edu" style="display: inline-block; background-color: #C8102E; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Register Now on UH Class Browser
        </a>
        <p style="margin-top: 30px; color: #999; font-size: 12px;">
          <a href="${appUrl}/unsubscribe?email=${encodeURIComponent(email)}" style="color: #999;">Unsubscribe from alerts</a>
        </p>
      </div>
    `,
  });

  if (error) {
    console.error('Failed to send class alert:', error);
    throw new Error('Failed to send email');
  }

  return data;
}

export async function sendVerificationEmail(email: string, token: string) {
  return sendMagicLink(email, token);
}
