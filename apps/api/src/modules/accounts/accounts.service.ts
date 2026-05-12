import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { getScopeUserIds, isFamilyMember } from '../families/family-access.helper';

@Injectable()
export class AccountsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, data: {
    name: string;
    type: string;
    icon?: string;
    color?: string;
    balance?: number;
    currency?: string;
    familyId?: string;
  }) {
    // familyId ONLY set when explicitly passed from frontend (family view)
    // Personal accounts always have familyId: null
    const familyId = data.familyId || null;

    return this.prisma.account.create({
      data: {
        name: data.name,
        type: data.type,
        icon: data.icon,
        color: data.color,
        balance: data.balance,
        currency: data.currency,
        userId,
        familyId,
      },
    });
  }

  async findMany(userId: string, familyId?: string) {
    const userIds = await getScopeUserIds(this.prisma, userId, familyId);

    return this.prisma.account.findMany({
      where: { userId: { in: userIds }, ...(familyId ? { familyId } : { familyId: null }) },
      include: {
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string, userId: string) {
    const account = await this.prisma.account.findUnique({ where: { id } });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    // Owner can always access
    if (account.userId === userId) {
      return account;
    }

    // Family members can access family accounts
    if (account.familyId) {
      const hasAccess = await isFamilyMember(this.prisma, userId, account.familyId);
      if (hasAccess) return account;
    }

    throw new NotFoundException('Account not found');
  }

  async update(id: string, userId: string, data: {
    name?: string;
    type?: string;
    icon?: string;
    color?: string;
    balance?: number;
    currency?: string;
  }) {
    const account = await this.prisma.account.findUnique({ where: { id } });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    // Check access
    if (account.userId !== userId) {
      if (account.familyId) {
        const hasAccess = await isFamilyMember(this.prisma, userId, account.familyId);
        if (!hasAccess) throw new NotFoundException('Account not found');
      } else {
        throw new NotFoundException('Account not found');
      }
    }

    return this.prisma.account.update({ where: { id }, data });
  }

  async remove(id: string, userId: string) {
    const account = await this.prisma.account.findUnique({ where: { id } });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    // Check access
    if (account.userId !== userId) {
      if (account.familyId) {
        const hasAccess = await isFamilyMember(this.prisma, userId, account.familyId);
        if (!hasAccess) throw new NotFoundException('Account not found');
      } else {
        throw new NotFoundException('Account not found');
      }
    }

    return this.prisma.account.delete({ where: { id } });
  }

  async getTotalBalance(userId: string, familyId?: string) {
    const userIds = await getScopeUserIds(this.prisma, userId, familyId);

    const result = await this.prisma.account.aggregate({
      where: { userId: { in: userIds } },
      _sum: { balance: true },
    });
    return result._sum.balance || 0;
  }
}
