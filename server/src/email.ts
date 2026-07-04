import nodemailer from 'nodemailer';
import type { EmailSender } from './auth-contracts.js';

export class ConsoleEmailSender implements EmailSender {
  async sendVerificationCode(message: { to: string; code: string; expiresInMinutes: number }): Promise<void> {
    console.log(`Verification code for ${message.to}: ${message.code} (expires in ${message.expiresInMinutes} minutes)`);
  }
}

export class SmtpEmailSender implements EmailSender {
  private readonly transporter;

  constructor(
    smtp: { host: string; port: number; secure: boolean; user: string; password: string },
    private readonly from: string,
  ) {
    this.transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: { user: smtp.user, pass: smtp.password },
      requireTLS: !smtp.secure,
    });
  }

  async sendVerificationCode(message: { to: string; code: string; expiresInMinutes: number }): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to: message.to,
      subject: 'Your Virtual Classroom verification code',
      text: `Your Virtual Classroom verification code is ${message.code}. It expires in ${message.expiresInMinutes} minutes. If you did not request this code, ignore this email.`,
      html: `<p>Your Virtual Classroom verification code is:</p><p style="font-size:24px;font-weight:bold;letter-spacing:4px">${message.code}</p><p>It expires in ${message.expiresInMinutes} minutes. If you did not request this code, ignore this email.</p>`,
    });
  }
}
