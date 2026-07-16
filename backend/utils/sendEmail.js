import nodemailer from 'nodemailer'

if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
  console.error(
    '[sendEmail] ERROR: EMAIL_USER and EMAIL_PASSWORD must be set in your .env file.\n' +
      'Gmail requires an App Password (not your regular password).\n' +
      'Generate one at: https://myaccount.google.com/apppasswords'
  )
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
})

const sendEmail = async (to, subject, html) => {
  await transporter.sendMail({
    from: `"ExamHub" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  })
}

export default sendEmail
