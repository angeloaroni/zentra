import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: any = null;
  private readonly fromEmail: string;
  private readonly appName: string;
  private readonly frontendUrl: string;

  constructor(private config: ConfigService) {
    this.fromEmail = this.config.get('SMTP_FROM', 'Zentra <onboarding@resend.dev>');
    this.appName = this.config.get('APP_NAME', 'Zentra');
    this.frontendUrl = this.config.get('FRONTEND_URL', 'http://localhost:3000');

    const apiKey = this.config.get('RESEND_API_KEY');
    if (apiKey) {
      const { Resend } = require('resend');
      this.resend = new Resend(apiKey);
      this.logger.log('Resend email service configured');
    } else {
      this.logger.warn('RESEND_API_KEY not set. Emails will be logged to console only.');
    }
  }

  async sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
    if (this.resend) {
      try {
        await this.resend.emails.send({
          from: this.fromEmail,
          to,
          subject: `${this.appName} - Restablecer contrasena`,
          html: this.buildResetHtml(resetUrl),
        });
        this.logger.log(`Password reset email sent to ${to}`);
      } catch (err) {
        this.logger.error(`Failed to send email to ${to}: ${err.message}`);
      }
    } else {
      this.logger.warn(`[DEV] Password reset for ${to}: ${resetUrl}`);
    }
  }

  async sendSplitInviteEmail(to: string, inviterName: string, groupName: string, inviteUrl: string): Promise<void> {
    if (this.resend) {
      try {
        await this.resend.emails.send({
          from: this.fromEmail,
          to,
          subject: `${this.appName} - ${inviterName} te invita al grupo "${groupName}"`,
          html: this.buildSplitInviteHtml(inviterName, groupName, inviteUrl),
        });
        this.logger.log(`Split invite email sent to ${to}`);
      } catch (err) {
        this.logger.error(`Failed to send split invite email to ${to}: ${err.message}`);
      }
    } else {
      this.logger.warn(`[DEV] Split invite for ${to}: ${inviteUrl}`);
    }
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
}