import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

function parseFrom(from: string): { email: string; name?: string } {
  const match = from.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  if (match) {
    const name = match[1].trim();
    const email = match[2].trim();
    return name ? { email, name } : { email };
  }
  return { email: from.trim() };
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: any = null;
  private smtpTransport: any = null;
  private sendgridApiKey: string | null = null;
  private readonly fromEmail: string;
  private readonly appName: string;

  constructor(private config: ConfigService) {
    const configuredFrom = this.config.get<string>('SMTP_FROM');
    this.fromEmail = configuredFrom || 'Zentra <onboarding@resend.dev>';
    this.appName = this.config.get('APP_NAME', 'Zentra');

    this.sendgridApiKey = this.config.get<string>('SENDGRID_API_KEY') || null;
    if (this.sendgridApiKey) {
      this.logger.log('SendGrid email API configured');
    }

    const smtpHost = this.config.get<string>('SMTP_HOST');
    const smtpUser = this.config.get<string>('SMTP_USER');
    const smtpPass = this.config.get<string>('SMTP_PASS');

    if (!this.sendgridApiKey && smtpHost && smtpUser && smtpPass) {
      const port = Number(this.config.get('SMTP_PORT', 587));
      const nodemailer = require('nodemailer');
      this.smtpTransport = nodemailer.createTransport({
        host: smtpHost,
        port,
        secure: port === 465,
        auth: { user: smtpUser, pass: smtpPass },
        connectionTimeout: 10_000,
      });
      this.logger.log(`SMTP email transport configured (${smtpHost}:${port})`);
    }

    const apiKey = this.config.get('RESEND_API_KEY');
    if (!this.sendgridApiKey && !this.smtpTransport && apiKey) {
      const { Resend } = require('resend');
      this.resend = new Resend(apiKey);
      this.logger.log('Resend email service configured');
    }

    if (!this.sendgridApiKey && !this.smtpTransport && !apiKey) {
      this.logger.warn(
        'No email provider configured (SENDGRID_API_KEY, SMTP_HOST or RESEND_API_KEY). Emails will be logged to console only.',
      );
    }

    if (
      this.isProduction &&
      !this.sendgridApiKey &&
      !this.smtpTransport &&
      (!configuredFrom || configuredFrom.includes('resend.dev'))
    ) {
      this.logger.error(
        'SMTP_FROM is not configured with a verified sender. Emails will likely fail or land in spam. ' +
          'Set SMTP_FROM to a verified sender (e.g. "Zentra <noreply@tudominio.com>") or configure SENDGRID_API_KEY.',
      );
    }
  }

  private get isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  private async deliver(to: string, subject: string, html: string, devHint?: string): Promise<boolean> {
    if (this.sendgridApiKey) {
      return this.sendViaSendGrid(to, subject, html);
    }

    if (this.smtpTransport) {
      try {
        await this.smtpTransport.sendMail({ from: this.fromEmail, to, subject, html });
        this.logger.log(`Email sent to ${to} via SMTP`);
        return true;
      } catch (err) {
        this.logger.error(`Failed to send email to ${to} via SMTP: ${err.message}`);
        return false;
      }
    }

    if (this.resend) {
      try {
        const { error } = await this.resend.emails.send({ from: this.fromEmail, to, subject, html });
        if (error) {
          this.logger.error(
            `Failed to send email to ${to} via Resend: ${error.message || JSON.stringify(error)}`,
          );
          return false;
        }
        this.logger.log(`Email sent to ${to} via Resend`);
        return true;
      } catch (err) {
        this.logger.error(`Failed to send email to ${to} via Resend: ${err.message}`);
        return false;
      }
    }

    this.logger.warn(`[DEV] Email for ${to}: ${subject}${devHint ? ` - ${devHint}` : ''}`);
    return !this.isProduction;
  }

  private async sendViaSendGrid(to: string, subject: string, html: string): Promise<boolean> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    try {
      const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.sendgridApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to }] }],
          from: parseFrom(this.fromEmail),
          subject,
          content: [{ type: 'text/html', value: html }],
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        this.logger.error(`Failed to send email to ${to} via SendGrid (${res.status}): ${text}`);
        return false;
      }

      this.logger.log(`Email sent to ${to} via SendGrid`);
      return true;
    } catch (err) {
      this.logger.error(`Failed to send email to ${to} via SendGrid: ${err.message}`);
      return false;
    } finally {
      clearTimeout(timeout);
    }
  }

  async sendPasswordResetEmail(to: string, resetUrl: string): Promise<boolean> {
    return this.deliver(
      to,
      `${this.appName} - Restablecer contrasena`,
      this.buildResetHtml(resetUrl),
      resetUrl,
    );
  }

  async sendSplitInviteEmail(to: string, inviterName: string, groupName: string, inviteUrl: string): Promise<boolean> {
    return this.deliver(
      to,
      `${this.appName} - ${inviterName} te invita al grupo "${groupName}"`,
      this.buildSplitInviteHtml(inviterName, groupName, inviteUrl),
      inviteUrl,
    );
  }

  async sendVerificationEmail(to: string, verificationUrl: string): Promise<boolean> {
    return this.deliver(
      to,
      `${this.appName} - Verifica tu email`,
      this.buildVerificationHtml(verificationUrl),
      verificationUrl,
    );
  }

  private buildResetHtml(resetUrl: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #3B82F6, #6366F1); padding: 32px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">${this.appName}</h1>
          <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0;">Restablecer contrasena</p>
        </div>
        <div style="padding: 32px; background: #ffffff; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            Hemos recibido una solicitud para restablecer la contrasena de tu cuenta.
          </p>
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            Haz clic en el siguiente boton para crear una nueva contrasena:
          </p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${resetUrl}" style="background: linear-gradient(135deg, #3B82F6, #6366F1); color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">
              Restablecer contrasena
            </a>
          </div>
          <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
            Si no solicitaste este cambio, puedes ignorar este email. El enlace expira en 1 hora.
          </p>
          <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
            Si el boton no funciona, copia y pega este enlace en tu navegador:<br/>
            <a href="${resetUrl}" style="color: #3B82F6; word-break: break-all;">${resetUrl}</a>
          </p>
        </div>
      </div>
    `;
  }

  private buildSplitInviteHtml(inviterName: string, groupName: string, inviteUrl: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #3B82F6, #6366F1); padding: 32px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">${this.appName}</h1>
          <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0;">Invitacion a grupo</p>
        </div>
        <div style="padding: 32px; background: #ffffff; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            <strong>${inviterName}</strong> te ha invitado a unirte al grupo <strong>"${groupName}"</strong> en ${this.appName} para dividir gastos.
          </p>
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            Registrate en ${this.appName} y se uniremos automaticamente al grupo:
          </p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${inviteUrl}" style="background: linear-gradient(135deg, #3B82F6, #6366F1); color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">
              Registrarme y unirme al grupo
            </a>
          </div>
          <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
            Si el boton no funciona, copia y pega este enlace en tu navegador:<br/>
            <a href="${inviteUrl}" style="color: #3B82F6; word-break: break-all;">${inviteUrl}</a>
          </p>
          <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
            Esta invitacion expira en 7 dias.
          </p>
        </div>
      </div>
    `;
  }

  private buildVerificationHtml(verificationUrl: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #3B82F6, #6366F1); padding: 32px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">${this.appName}</h1>
          <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0;">Verifica tu email</p>
        </div>
        <div style="padding: 32px; background: #ffffff; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            Bienvenido a ${this.appName}! Para completar tu registro, haz clic en el boton de abajo para verificar tu email.
          </p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${verificationUrl}" style="background: linear-gradient(135deg, #3B82F6, #6366F1); color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">
              Verificar email
            </a>
          </div>
          <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
            Si no creaste esta cuenta, puedes ignorar este email. El enlace expira en 24 horas.
          </p>
          <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
            Si el boton no funciona, copia y pega este enlace en tu navegador:<br/>
            <a href="${verificationUrl}" style="color: #3B82F6; word-break: break-all;">${verificationUrl}</a>
          </p>
        </div>
      </div>
    `;
  }
}