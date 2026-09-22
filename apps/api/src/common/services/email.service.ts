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
  private readonly apiKey: string | null;
  private readonly fromEmail: string;
  private readonly appName: string;

  constructor(private config: ConfigService) {
    this.apiKey = this.config.get<string>('BREVO_API_KEY') || null;
    this.fromEmail = this.config.get<string>('EMAIL_FROM') || 'Zentra <no-reply@zentra.app>';
    this.appName = this.config.get('APP_NAME', 'Zentra');

    if (this.apiKey) {
      this.logger.log('Brevo email API configured');
    } else {
      this.logger.warn('BREVO_API_KEY not set. Emails will be logged to console only.');
    }

    if (this.isProduction && !this.apiKey) {
      this.logger.error(
        'BREVO_API_KEY is not set in production. Password reset, email verification and split invites will not be delivered.',
      );
    }
  }

  private get isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  private async deliver(to: string, subject: string, html: string, devHint?: string): Promise<boolean> {
    if (!this.apiKey) {
      this.logger.warn(`[DEV] Email for ${to}: ${subject}${devHint ? ` - ${devHint}` : ''}`);
      return !this.isProduction;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    try {
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': this.apiKey,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          sender: parseFrom(this.fromEmail),
          to: [{ email: to }],
          subject,
          htmlContent: html,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        this.logger.error(`Failed to send email to ${to} via Brevo (${res.status}): ${text}`);
        return false;
      }

      this.logger.log(`Email sent to ${to} via Brevo`);
      return true;
    } catch (err) {
      this.logger.error(`Failed to send email to ${to} via Brevo: ${err.message}`);
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
