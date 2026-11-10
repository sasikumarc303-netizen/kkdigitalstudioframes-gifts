import { env } from '../config/env.js';

let transporterPromise;
async function getTransporter() {
  if (!env.smtpEnabled) return null;
  if (!transporterPromise) {
    transporterPromise = import('nodemailer').then(({ default: nodemailer }) =>
      nodemailer.createTransport({
        host: env.smtp.host,
        port: env.smtp.port,
        secure: env.smtp.secure,
        auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
      })
    );
  }
  return transporterPromise;
}

/** Sends an email when SMTP is configured. Returns { sent:boolean }. Never throws. */
export async function sendMail({ to, subject, text }) {
  try {
    const transporter = await getTransporter();
    if (!transporter || !to) return { sent: false };
    await transporter.sendMail({ from: env.smtp.from, to, subject, text });
    return { sent: true };
  } catch (e) {
    console.error('[mail] failed:', e.message);
    return { sent: false };
  }
}

/** Best-effort notification to the studio's own contact e-mail about new bookings/orders/enquiries. */
export async function notifyStudio(config, subject, text) {
  const to = config?.contact?.email;
  if (!to) return { sent: false };
  return sendMail({ to, subject: `[KK Digital Studio] ${subject}`, text });
}
