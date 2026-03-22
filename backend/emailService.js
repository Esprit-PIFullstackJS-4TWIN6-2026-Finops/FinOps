const nodemailer = require('nodemailer');

let transporter;

function getTransporter() {
  if (transporter) return transporter;

  const user = process.env.GMAIL_USER;
  const pass = (process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '');

  if (!user || !pass) {
    throw new Error(
      'GMAIL_USER ou GMAIL_APP_PASSWORD manquant dans le fichier .env',
    );
  }

  transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    requireTLS: true,
    auth: { user, pass },
  });

  return transporter;
}

async function sendEmail(to, subject, text, html) {
  try {
    if (!to || !subject || !text) {
      throw new Error("Champs requis manquants: 'to', 'subject', 'text'");
    }

    const mailer = getTransporter();
    const from = process.env.GMAIL_USER;

    const info = await mailer.sendMail({
      from: `"FinOps Mail API" <${from}>`,
      to,
      subject,
      text,
      html: html || `<p>${text}</p>`,
    });

    console.log('[EMAIL] Envoye avec succes');
    console.log(`[EMAIL] MessageId: ${info.messageId}`);
    console.log(`[EMAIL] To: ${to}`);

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('[EMAIL] Erreur envoi:', error.message);
    return { success: false, error: error.message };
  }
}

module.exports = { sendEmail };
