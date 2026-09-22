import { EmailService } from './email.service';

jest.mock('nodemailer', () => ({ createTransport: jest.fn() }));
jest.mock('resend', () => ({ Resend: jest.fn() }));

import * as nodemailer from 'nodemailer';
import { Resend } from 'resend';

function makeConfig(values: Record<string, any>) {
  return {
    get: (key: string, def?: any) => (key in values ? values[key] : def),
  } as any;
}

describe('EmailService', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('SMTP transport', () => {
    it('sends via SMTP and returns true on success', async () => {
      const sendMail = jest.fn().mockResolvedValue({ messageId: '1' });
      (nodemailer.createTransport as jest.Mock).mockReturnValue({ sendMail });

      const service = new EmailService(
        makeConfig({
          SMTP_HOST: 'smtp.gmail.com',
          SMTP_PORT: 587,
          SMTP_USER: 'me@gmail.com',
          SMTP_PASS: 'app-pass',
          SMTP_FROM: 'Zentra <me@gmail.com>',
        }),
      );

      const result = await service.sendVerificationEmail('user@test.com', 'https://app/verify?token=1');

      expect(result).toBe(true);
      expect(sendMail).toHaveBeenCalledWith(
        expect.objectContaining({ from: 'Zentra <me@gmail.com>', to: 'user@test.com' }),
      );
    });

    it('returns false when SMTP send fails', async () => {
      const sendMail = jest.fn().mockRejectedValue(new Error('auth failed'));
      (nodemailer.createTransport as jest.Mock).mockReturnValue({ sendMail });

      const service = new EmailService(
        makeConfig({
          SMTP_HOST: 'smtp.gmail.com',
          SMTP_PORT: 587,
          SMTP_USER: 'me@gmail.com',
          SMTP_PASS: 'bad',
          SMTP_FROM: 'Zentra <me@gmail.com>',
        }),
      );

      const result = await service.sendPasswordResetEmail('user@test.com', 'https://app/reset');

      expect(result).toBe(false);
    });
  });

  describe('Resend fallback', () => {
    it('returns true when Resend responds without error', async () => {
      const send = jest.fn().mockResolvedValue({ data: { id: '1' }, error: null });
      (Resend as unknown as jest.Mock).mockImplementation(() => ({ emails: { send } }));

      const service = new EmailService(
        makeConfig({ RESEND_API_KEY: 're_123', SMTP_FROM: 'Zentra <noreply@zentra.app>' }),
      );

      const result = await service.sendVerificationEmail('user@test.com', 'https://app/verify');

      expect(result).toBe(true);
      expect(send).toHaveBeenCalled();
    });

    it('returns false when Resend returns an error object (does not throw)', async () => {
      const send = jest
        .fn()
        .mockResolvedValue({ data: null, error: { message: 'You can only send testing emails to your own email' } });
      (Resend as unknown as jest.Mock).mockImplementation(() => ({ emails: { send } }));

      const service = new EmailService(
        makeConfig({ RESEND_API_KEY: 're_123', SMTP_FROM: 'Zentra <onboarding@resend.dev>' }),
      );

      const result = await service.sendPasswordResetEmail('other@test.com', 'https://app/reset');

      expect(result).toBe(false);
    });
  });

  describe('SendGrid API', () => {
    it('returns true when SendGrid responds 202', async () => {
      const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 202, text: async () => '' });
      (global as any).fetch = fetchMock;

      const service = new EmailService(
        makeConfig({ SENDGRID_API_KEY: 'SG.test', SMTP_FROM: 'Zentra <me@gmail.com>' }),
      );

      const result = await service.sendVerificationEmail('user@test.com', 'https://app/verify');

      expect(result).toBe(true);
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.sendgrid.com/v3/mail/send',
        expect.objectContaining({ method: 'POST' }),
      );
      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.personalizations[0].to[0].email).toBe('user@test.com');
      expect(body.from).toEqual({ name: 'Zentra', email: 'me@gmail.com' });
    });

    it('returns false when SendGrid responds with an error', async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => '{"errors":[{"message":"bad api key"}]}',
      });
      (global as any).fetch = fetchMock;

      const service = new EmailService(
        makeConfig({ SENDGRID_API_KEY: 'SG.bad', SMTP_FROM: 'Zentra <me@gmail.com>' }),
      );

      const result = await service.sendPasswordResetEmail('other@test.com', 'https://app/reset');

      expect(result).toBe(false);
    });
  });

  describe('no provider configured', () => {
    it('returns true in development (console fallback)', async () => {
      const original = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const service = new EmailService(makeConfig({}));
      const result = await service.sendVerificationEmail('user@test.com', 'https://app/verify');

      expect(result).toBe(true);
      process.env.NODE_ENV = original;
    });

    it('returns false in production', async () => {
      const original = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const service = new EmailService(makeConfig({}));
      const result = await service.sendVerificationEmail('user@test.com', 'https://app/verify');

      expect(result).toBe(false);
      process.env.NODE_ENV = original;
    });
  });
});
