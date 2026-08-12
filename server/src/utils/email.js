import nodemailer from 'nodemailer'

// Only wires up a real transporter if SMTP env vars are set. Without them
// (e.g. local dev, or before you've picked an email provider) sendEmail()
// just logs the message so the reset-password flow is still fully testable.
let transporter = null
if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

export const sendEmail = async ({ to, subject, text }) => {
  if (!transporter) {
    console.log(`\n📧 [SMTP not configured — email not sent]\nTo: ${to}\nSubject: ${subject}\n${text}\n`)
    return
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    text,
  })
}
