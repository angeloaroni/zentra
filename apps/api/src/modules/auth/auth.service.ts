import { Injectable, UnauthorizedException, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { createHash } from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { EmailService } from '../../common/services/email.service';
import { RegisterDto, LoginDto, ForgotPasswordDto, ResetPasswordDto } from './dto';

const REFRESH_TOKEN_EXPIRY_DAYS = 7;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private emailService: EmailService,
  ) {}

  async register(dto: RegisterDto) {
    const normalizedEmail = dto.email.toLowerCase();
    const existing = await this.prisma.user.findFirst({
      where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
    });

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        name: dto.name,
      },
    });

    await this.createDefaultCategories(user.id);

    await this.prisma.subscription.create({
      data: {
        userId: user.id,
        plan: 'free',
        status: 'active',
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
    });

    const accessToken = this.generateAccessToken(user.id, user.email);
    const refreshToken = await this.createRefreshToken(user.id);

    return {
      user: this.sanitizeUser(user),
      token: accessToken,
      refreshToken: refreshToken.token,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: { email: { equals: dto.email, mode: 'insensitive' } },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await bcrypt.compare(dto.password, user.password);

    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = this.generateAccessToken(user.id, user.email);
    const refreshToken = await this.createRefreshToken(user.id);

    return {
      user: this.sanitizeUser(user),
      token: accessToken,
      refreshToken: refreshToken.token,
    };
  }

  async validateUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    return this.sanitizeUser(user);
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findFirst({
      where: { email: { equals: dto.email, mode: 'insensitive' } },
    });

    if (!user) {
      return { message: 'If an account with that email exists, a reset link has been sent.' };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = createHash('sha256').update(resetToken).digest('hex');
    const resetTokenExp = new Date(Date.now() + 3600000);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { resetToken: hashedToken, resetTokenExp },
    });

    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

    await this.emailService.sendPasswordResetEmail(user.email, resetUrl);

    return { message: 'If an account with that email exists, a reset link has been sent.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const hashedToken = createHash('sha256').update(dto.token).digest('hex');
    const user = await this.prisma.user.findFirst({
      where: {
        resetToken: hashedToken,
        resetTokenExp: { gte: new Date() },
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExp: null,
      },
    });

    return { message: 'Password has been reset successfully' };
  }

  private generateAccessToken(userId: string, email: string) {
    return this.jwt.sign({ sub: userId, email }, { expiresIn: '15m' });
  }

  private async createRefreshToken(userId: string) {
    const token = crypto.randomBytes(40).toString('hex');
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    return this.prisma.refreshToken.create({
      data: { token, userId, expiresAt },
    });
  }

  async refreshTokens(refreshToken: string) {
    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Rotation: delete old token
    await this.prisma.refreshToken.delete({ where: { id: tokenRecord.id } });

    const accessToken = this.generateAccessToken(tokenRecord.user.id, tokenRecord.user.email);
    const newRefresh = await this.createRefreshToken(tokenRecord.user.id);

    return {
      accessToken,
      refreshToken: newRefresh.token,
    };
  }

  async logout(refreshToken: string) {
    await this.prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
  }

  private sanitizeUser(user: any) {
    const { password, resetToken, resetTokenExp, ...result } = user;
    return result;
  }

  private async createDefaultCategories(userId: string) {
    const categories = [
      { name: 'Alimentación', icon: 'utensils', color: '#10B981', type: 'EXPENSE' as const },
      { name: 'Transporte', icon: 'car', color: '#3B82F6', type: 'EXPENSE' as const },
      { name: 'Vivienda', icon: 'home', color: '#8B5CF6', type: 'EXPENSE' as const },
      { name: 'Salud', icon: 'heart', color: '#EF4444', type: 'EXPENSE' as const },
      { name: 'Ocio', icon: 'gamepad-2', color: '#F59E0B', type: 'EXPENSE' as const },
      { name: 'Educación', icon: 'graduation-cap', color: '#6366F1', type: 'EXPENSE' as const },
      { name: 'Nómina', icon: 'briefcase', color: '#10B981', type: 'INCOME' as const },
      { name: 'Freelance', icon: 'laptop', color: '#22C55E', type: 'INCOME' as const },
      { name: 'Inversiones', icon: 'trending-up', color: '#14B8A6', type: 'INCOME' as const },
    ];

    return Promise.all(
      categories.map((cat) =>
        this.prisma.category.create({
          data: { ...cat, userId, isDefault: true },
        }),
      ),
    );
  }
}