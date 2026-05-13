import { Injectable, UnauthorizedException, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { EmailService } from '../../common/services/email.service';
import { RegisterDto, LoginDto, ForgotPasswordDto, ResetPasswordDto } from './dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private emailService: EmailService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        name: dto.name,
      },
    });

    await this.createDefaultCategories(user.id);

    await this.prisma.subscription.create({
      data: { userId: user.id, plan: 'free', status: 'active' },
    });

    const token = this.generateToken(user.id, user.email);

    return {
      user: this.sanitizeUser(user),
      token,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await bcrypt.compare(dto.password, user.password);

    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.generateToken(user.id, user.email);

    return {
      user: this.sanitizeUser(user),
      token,
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
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      return { message: 'If an account with that email exists, a reset link has been sent.' };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExp = new Date(Date.now() + 3600000);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExp },
    });

    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

    await this.emailService.sendPasswordResetEmail(user.email, resetUrl);

    return { message: 'If an account with that email exists, a reset link has been sent.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        resetToken: dto.token,
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

  private generateToken(userId: string, email: string) {
    return this.jwt.sign({ sub: userId, email });
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