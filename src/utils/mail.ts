import nodemailer from 'nodemailer'

export const sendEmail = async (options:object) => {
  const transporter = nodemailer.createTransport({
    host: process.env.smtp_host,
    port: process.env.smtp_port,
    service: process.env.smtp_service,
    secure: false,
    requireTLS: true,
    auth: {
      user: process.env.smtp_mail,
      pass: process.env.smtp_password,
    },
  });
  const mailOptions = {
    from: process.env.SMPT,
    to: options.email,
    subject: options.subject,
    html: options.html,
  };
  await transporter.sendMail(mailOptions);
};

