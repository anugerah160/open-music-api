const nodemailer = require("nodemailer");

class MailSender {
  constructor() {
    this._transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: true, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }

  sendEmail(targetEmail, content) {
    const message = {
      from: "OpenMusic API V3",
      to: targetEmail,
      subject: "Ekspor Lagu dari Playlist",
      text: "Terlampir hasil dari ekspor lagu pada playlist Anda.",
      attachments: [
        {
          filename: "playlist.json",
          content,
          contentType: "application/json",
        },
      ],
    };

    return this._transporter.sendMail(message);
  }
}

module.exports = MailSender;
