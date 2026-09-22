import { EmailService } from './email.service';

function makeConfig(values: Record<string, any>) {
  return {
    get: (key: string, def?: any) => (key in values ? values[key] : def),
  } as any;
}

describe('EmailService', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Brevo API', () => {
    it('returns true when Brevo responds successfully', async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        status: 201,
        text: async () => '{"messageId":"<123@brevo>"}',
      });
      (global as any).fetch = fetchMock;

      const service = new EmailService(
        makeConfig({ BREVO_API_KEY: 'xkeysib-test', EMAIL_FROM: 'Zentra <me@gmail.com>' }),
      );

      const result = await service.sendVerificationEmail('user@test.com', 'https://app/verify');

      expect(result).toBe(true);
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.brevo.com/v3/smtp/email',
        expect.objectContaining({ method: 'POST' }),
      );
      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe('https://api.brevo.com/v3/smtp/email');
      expect(options.headers['api-key']).toBe('xkeysib-test');
      const body = JSON.parse(options.body);
      expect(body.sender).toEqual({ name: 'Zentra', email: 'me@gmail.com' });
      expect(body.to[0].email).toBe('user@test.com');
      expect(body.htmlContent).toContain('https://app/verify');
    });

    it('returns false when Brevo responds with an error', async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => '{"code":"unauthorized","message":"Key not found"}',
      });
      (global as any).fetch = fetchMock;

      const service = new EmailService(
        makeConfig({ BREVO_API_KEY: 'bad', EMAIL_FROM: 'Zentra <me@gmail.com>' }),
      );

      const result = await service.sendPasswordResetEmail('other@test.com', 'https://app/reset');

      expect(result).toBe(false);
    });
  });

  describe('no API key configured', () => {
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
