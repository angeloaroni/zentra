import { UnauthorizedException, ConflictException, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;
  let jwt: any;
  let email: any;

  const baseUser = {
    id: 'user-1',
    email: 'test@test.com',
    password: 'hashed-password',
    name: 'Test',
    role: 'USER',
    emailVerified: false,
    verificationToken: null,
    resetToken: null,
    resetTokenExp: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    prisma = {
      user: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      category: { create: jest.fn().mockResolvedValue({}) },
      subscription: { create: jest.fn().mockResolvedValue({}) },
      refreshToken: {
        create: jest.fn().mockResolvedValue({ token: 'refresh-token-1' }),
        findUnique: jest.fn(),
        delete: jest.fn().mockResolvedValue({}),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };

    jwt = { sign: jest.fn().mockReturnValue('access-token') };
    email = {
      sendVerificationEmail: jest.fn().mockResolvedValue(true),
      sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
    };

    service = new AuthService(prisma, jwt, email);
  });

  describe('register', () => {
    it('throws ConflictException when email already exists', async () => {
      prisma.user.findFirst.mockResolvedValue(baseUser);

      await expect(
        service.register({ email: 'test@test.com', password: 'Password1', name: 'Test' }),
      ).rejects.toThrow(ConflictException);
    });

    it('creates user, default categories, subscription and sends verification email', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ ...baseUser, email: 'new@test.com' });
      prisma.user.update.mockResolvedValue({});

      const result = await service.register({
        email: 'New@Test.com',
        password: 'Password1',
        name: 'New',
      });

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ email: 'new@test.com' }),
        }),
      );
      expect(prisma.category.create).toHaveBeenCalledTimes(9);
      expect(prisma.subscription.create).toHaveBeenCalled();
      expect(email.sendVerificationEmail).toHaveBeenCalled();
      expect(result.token).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token-1');
      expect(result.user.password).toBeUndefined();
    });
  });

  describe('login', () => {
    it('throws UnauthorizedException when user does not exist', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nobody@test.com', password: 'Password1' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when password is invalid', async () => {
      prisma.user.findFirst.mockResolvedValue(baseUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ email: 'test@test.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('returns access and refresh tokens on valid credentials', async () => {
      prisma.user.findFirst.mockResolvedValue(baseUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login({ email: 'test@test.com', password: 'Password1' });

      expect(result.token).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token-1');
      expect(result.user.email).toBe('test@test.com');
      expect(result.user.password).toBeUndefined();
      expect(prisma.refreshToken.create).toHaveBeenCalled();
    });
  });

  describe('refreshTokens', () => {
    it('throws UnauthorizedException when token does not exist', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.refreshTokens('unknown')).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when token is expired', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        token: 'expired',
        expiresAt: new Date(Date.now() - 1000),
        user: { id: 'user-1', email: 'test@test.com' },
      });

      await expect(service.refreshTokens('expired')).rejects.toThrow(UnauthorizedException);
    });

    it('rotates the token and returns a new pair', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        token: 'old',
        expiresAt: new Date(Date.now() + 100000),
        user: { id: 'user-1', email: 'test@test.com' },
      });
      prisma.refreshToken.create.mockResolvedValue({ token: 'new-refresh' });

      const result = await service.refreshTokens('old');

      expect(prisma.refreshToken.delete).toHaveBeenCalledWith({ where: { id: 'rt-1' } });
      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('new-refresh');
    });
  });

  describe('logout', () => {
    it('deletes the refresh token', async () => {
      await service.logout('some-token');

      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { token: 'some-token' },
      });
    });
  });

  describe('verifyEmail', () => {
    it('throws BadRequestException when token is invalid', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(service.verifyEmail('bad-token')).rejects.toThrow(BadRequestException);
    });

    it('marks the user as verified and clears the token', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 'user-1' });
      prisma.user.update.mockResolvedValue({});

      const result = await service.verifyEmail('valid-token');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { emailVerified: true, verificationToken: null },
      });
      expect(result.message).toBe('Email verificado correctamente');
    });
  });

  describe('resendVerificationEmail', () => {
    it('returns a generic message when the user does not exist', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      const result = await service.resendVerificationEmail('nobody@test.com');

      expect(result.message).toContain('Si el email esta registrado');
      expect(email.sendVerificationEmail).not.toHaveBeenCalled();
    });

    it('returns a message when the email is already verified', async () => {
      prisma.user.findFirst.mockResolvedValue({ ...baseUser, emailVerified: true });

      const result = await service.resendVerificationEmail('test@test.com');

      expect(result.message).toBe('El email ya esta verificado.');
      expect(email.sendVerificationEmail).not.toHaveBeenCalled();
    });

    it('generates a new token and sends the email for unverified users', async () => {
      prisma.user.findFirst.mockResolvedValue(baseUser);
      prisma.user.update.mockResolvedValue({});

      await service.resendVerificationEmail('test@test.com');

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: expect.objectContaining({ verificationToken: expect.any(String) }),
        }),
      );
      expect(email.sendVerificationEmail).toHaveBeenCalled();
    });

    it('throws ServiceUnavailableException when the email cannot be sent', async () => {
      prisma.user.findFirst.mockResolvedValue(baseUser);
      prisma.user.update.mockResolvedValue({});
      email.sendVerificationEmail.mockResolvedValue(false);

      await expect(service.resendVerificationEmail('test@test.com')).rejects.toThrow(
        ServiceUnavailableException,
      );
    });
  });
});
