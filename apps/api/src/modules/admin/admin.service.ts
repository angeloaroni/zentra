import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const [
      totalUsers,
      freeUsers,
      proUsers,
      familyUsers,
      totalTransactions,
      totalFamilies,
      incomeResult,
      expenseResult,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.subscription.count({ where: { plan: 'free' } }),
      this.prisma.subscription.count({ where: { plan: 'pro' } }),
      this.prisma.subscription.count({ where: { plan: 'family' } }),
      this.prisma.transaction.count(),
      this.prisma.family.count(),
      this.prisma.transaction.aggregate({ where: { type: 'INCOME' }, _sum: { amount: true } }),
      this.prisma.transaction.aggregate({ where: { type: 'EXPENSE' }, _sum: { amount: true } }),
    ]);

    return {
      totalUsers,
      freeUsers,
      proUsers,
      familyUsers,
      totalTransactions,
      totalFamilies,
      totalIncome: incomeResult._sum.amount || 0,
      totalExpense: expenseResult._sum.amount || 0,
    };
  }

  async getUsers(search?: string) {
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const users = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        familyId: true,
        family: { select: { id: true, name: true } },
        subscription: { select: { plan: true, status: true } },
        _count: { select: { transactions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt,
      familyId: u.familyId,
      familyName: u.family?.name || null,
      plan: u.subscription?.plan || 'free',
      planStatus: u.subscription?.status || 'active',
      transactionCount: u._count.transactions,
    }));
  }

  async updatePlan(userId: string, plan: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const validPlans = ['free', 'pro', 'family'];
    if (!validPlans.includes(plan)) {
      throw new BadRequestException(`Invalid plan. Must be one of: ${validPlans.join(', ')}`);
    }

    const existing = await this.prisma.subscription.findUnique({ where: { userId } });

    if (existing) {
      return this.prisma.subscription.update({
        where: { userId },
        data: { plan, status: 'active' },
      });
    }

    return this.prisma.subscription.create({
      data: { userId, plan, status: 'active' },
    });
  }

  async deleteUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.delete({ where: { id: userId } });
    return { message: 'User deleted successfully' };
  }
}