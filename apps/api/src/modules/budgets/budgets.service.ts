import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { getScopeUserIds, isFamilyMember } from '../families/family-access.helper';
import { PlanLimitsService } from '../subscriptions/plan-limits.service';

@Injectable()
export class BudgetsService {
  constructor(private prisma: PrismaService, private planLimits: PlanLimitsService) {}

  async create(userId: string, data: { amount: number; month: number; year: number; categoryId: string; familyId?: string }) {
    if (!data.familyId) {
      await this.planLimits.checkBudgetLimit(userId);
    }
    // familyId ONLY set when explicitly passed from frontend (family view)
    // Personal budgets always have familyId: null
    const familyId = data.familyId || null;

    // Check if budget already exists for this period
    const existing = await this.prisma.budget.findFirst({
      where: {
        userId,
        categoryId: data.categoryId,
        month: data.month,
        year: data.year,
      },
    });

    if (existing) {
      throw new ConflictException('Budget already exists for this period');
    }

    // Verify category belongs to user, family, or is default
    const categoryWhere: any = {
      id: data.categoryId,
      OR: [
        { userId },
        { isDefault: true },
      ],
    };
    if (familyId) {
      categoryWhere.OR.push({ familyId });
    }

    const category = await this.prisma.category.findFirst({
      where: categoryWhere,
    });

    if (!category) {
      throw new Error('Invalid category');
    }

    return this.prisma.budget.create({
      data: {
        amount: data.amount,
        month: data.month,
        year: data.year,
        categoryId: data.categoryId,
        userId,
        familyId,
      },
      include: {
        category: {
          select: { id: true, name: true, icon: true, color: true },
        },
      },
    });
  }

  async findMany(userId: string, options: {
    month?: number;
    year?: number;
    categoryId?: string;
    familyId?: string;
  } = {}) {
    const userIds = await getScopeUserIds(this.prisma, userId, options.familyId);

    const where: any = {
      userId: { in: userIds },
      ...(options.familyId ? { familyId: options.familyId } : { familyId: null }),
    };

    if (options.month) {
      where.month = options.month;
    }

    if (options.year) {
      where.year = options.year;
    }

    if (options.categoryId) {
      where.categoryId = options.categoryId;
    }

    return this.prisma.budget.findMany({
      where,
      include: {
        user: { select: { id: true, name: true } },
        category: {
          select: { id: true, name: true, icon: true, color: true },
        },
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
  }

  async findById(id: string, userId: string) {
    const budget = await this.prisma.budget.findUnique({
      where: { id },
      include: {
        category: {
          select: { id: true, name: true, icon: true, color: true },
        },
      },
    });

    if (!budget) {
      throw new NotFoundException('Budget not found');
    }

    // Owner can always access
    if (budget.userId === userId) {
      return budget;
    }

    // Family members can access family budgets
    if (budget.familyId) {
      const hasAccess = await isFamilyMember(this.prisma, userId, budget.familyId);
      if (hasAccess) return budget;
    }

    throw new NotFoundException('Budget not found');
  }

  async update(id: string, userId: string, data: Partial<{ amount: number }>) {
    const budget = await this.prisma.budget.findUnique({
      where: { id },
    });

    if (!budget) {
      throw new NotFoundException('Budget not found');
    }

    // Check access
    if (budget.userId !== userId) {
      if (budget.familyId) {
        const hasAccess = await isFamilyMember(this.prisma, userId, budget.familyId);
        if (!hasAccess) throw new NotFoundException('Budget not found');
      } else {
        throw new NotFoundException('Budget not found');
      }
    }

    return this.prisma.budget.update({
      where: { id },
      data,
      include: {
        category: {
          select: { id: true, name: true, icon: true, color: true },
        },
      },
    });
  }

  async remove(id: string, userId: string) {
    const budget = await this.prisma.budget.findUnique({
      where: { id },
    });

    if (!budget) {
      throw new NotFoundException('Budget not found');
    }

    // Check access
    if (budget.userId !== userId) {
      if (budget.familyId) {
        const hasAccess = await isFamilyMember(this.prisma, userId, budget.familyId);
        if (!hasAccess) throw new NotFoundException('Budget not found');
      } else {
        throw new NotFoundException('Budget not found');
      }
    }

    return this.prisma.budget.delete({ where: { id } });
  }

  async getCurrentMonthSummary(userId: string, familyId?: string) {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const userIds = await getScopeUserIds(this.prisma, userId, familyId);

    const budgets = await this.prisma.budget.findMany({
      where: {
        userId: { in: userIds },
        ...(familyId ? { familyId } : { familyId: null }),
        month,
        year,
      },
      include: {
        user: { select: { id: true, name: true } },
        category: {
          select: { id: true, name: true, icon: true, color: true },
        },
      },
    });

    // Get actual spending for current month from all family members
    const spendingByCategory = await this.prisma.transaction.groupBy({
      by: ['categoryId'],
      where: {
        userId: { in: userIds },
        ...(familyId ? { familyId } : { familyId: null }),
        type: 'EXPENSE',
        date: {
          gte: new Date(year, month - 1, 1),
          lt: new Date(year, month, 1),
        },
      },
      _sum: { amount: true },
    });

    const spendingMap = new Map();
    spendingByCategory.forEach((item) => {
      spendingMap.set(item.categoryId, item._sum.amount || 0);
    });

    return budgets.map((budget) => {
      const spent = spendingMap.get(budget.categoryId) || 0;
      const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;

      return {
        ...budget,
        spent,
        percentage,
        remaining: Math.max(0, budget.amount - spent),
        overBudget: spent > budget.amount,
      };
    });
  }

  async getAlerts(userId: string, familyId?: string) {
    const currentBudgets = await this.getCurrentMonthSummary(userId, familyId);
    return currentBudgets.filter((budget) => budget.percentage >= 80);
  }
}
