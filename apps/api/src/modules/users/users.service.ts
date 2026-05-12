import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import * as bcrypt from 'bcrypt';

const userSelect = {
  id: true,
  email: true,
  name: true,
  avatar: true,
  role: true,
  familyId: true,
  createdAt: true,
  updatedAt: true,
};

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: userSelect,
    });
  }

  updateProfile(id: string, data: Partial<{ name: string; avatar: string }>) {
    return this.prisma.user.update({
      where: { id },
      data,
      select: userSelect,
    });
  }

  updateAvatar(id: string, avatarUrl: string) {
    return this.prisma.user.update({
      where: { id },
      data: { avatar: avatarUrl },
      select: userSelect,
    });
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      throw new BadRequestException('La contraseña actual es incorrecta');
    }

    if (newPassword.length < 6) {
      throw new BadRequestException('La nueva contraseña debe tener al menos 6 caracteres');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { message: 'Contraseña actualizada correctamente' };
  }

  async deleteAccount(userId: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true, familyId: true },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new BadRequestException('La contraseña es incorrecta');
    }

    // Delete all user data in transaction
    await this.prisma.$transaction([
      this.prisma.transaction.deleteMany({ where: { userId } }),
      this.prisma.category.deleteMany({ where: { userId } }),
      this.prisma.budget.deleteMany({ where: { userId } }),
      this.prisma.goal.deleteMany({ where: { userId } }),
      this.prisma.account.deleteMany({ where: { userId } }),
      this.prisma.tag.deleteMany({ where: { userId } }),
      this.prisma.notification.deleteMany({ where: { userId } }),
      this.prisma.familyMember.deleteMany({ where: { userId } }),
      this.prisma.user.delete({ where: { id: userId } }),
    ]);

    return { message: 'Cuenta eliminada correctamente' };
  }

  async joinFamily(userId: string, familyId: string) {
    // Check if family exists
    const family = await this.prisma.family.findUnique({
      where: { id: familyId },
    });

    if (!family) {
      throw new NotFoundException('Family not found');
    }

    // Check if user already belongs to a family
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { familyId: true },
    });

    if (user?.familyId) {
      throw new BadRequestException('You already belong to a family. Leave your current family first.');
    }

    // Check if already a member
    const existingMember = await this.prisma.familyMember.findUnique({
      where: {
        userId_familyId: { userId, familyId },
      },
    });

    if (existingMember) {
      throw new BadRequestException('You are already a member of this family');
    }

    // Add as family member and set user's familyId
    await this.prisma.$transaction([
      this.prisma.familyMember.create({
        data: { userId, familyId, role: 'USER' },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { familyId },
      }),
    ]);

    return this.findById(userId);
  }

  async leaveFamily(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { familyId: true },
    });

    if (!user?.familyId) {
      throw new BadRequestException('You do not belong to a family');
    }

    // Check if user is the family creator
    const family = await this.prisma.family.findUnique({
      where: { id: user.familyId },
      select: { createdById: true },
    });

    if (family?.createdById === userId) {
      throw new BadRequestException('Family creator cannot leave. Delete the family instead.');
    }

    // Remove membership and clear user's familyId
    await this.prisma.$transaction([
      this.prisma.familyMember.deleteMany({
        where: { userId, familyId: user.familyId },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { familyId: null },
      }),
    ]);

    return this.findById(userId);
  }
}
