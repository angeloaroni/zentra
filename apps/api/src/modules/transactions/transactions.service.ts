import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateTransactionDto } from './dto';
import { getScopeUserIds, isFamilyMember } from '../families/family-access.helper';
import { PlanLimitsService } from '../subscriptions/plan-limits.service';

@Injectable()
export class TransactionsService {
  constructor(private prisma: PrismaService, private planLimits: PlanLimitsService) {}

  async create(userId: string, dto: CreateTransactionDto) {
    if (!dto.familyId) {
      await this.planLimits.checkTransactionLimit(userId);
    }
    // familyId ONLY set when explicitly passed from frontend (family view)
    // Personal transactions always have familyId: null
    const familyId = dto.familyId || null;

    // Verify category belongs to user, family, or is default
    const categoryWhere: any = {
      id: dto.categoryId,
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
      throw new BadRequestException('Invalid category');
    }

    // Prepare tags connection if tagIds provided
    const tagsConnect = dto.tagIds?.length
      ? { tags: { connect: dto.tagIds.map(id => ({ id })) } }
      : {};

    const transaction = await this.prisma.transaction.create({
      data: {
        type: dto.type,
        title: dto.title,
        description: dto.description,
        amount: dto.amount,
        currency: dto.currency || 'USD',
        date: dto.date,
        categoryId: dto.categoryId,
        subcategory: dto.subcategory,
        paymentMethod: dto.paymentMethod,
        isRecurring: dto.isRecurring,
        recurringFreq: dto.recurringFreq,
        attachmentUrl: dto.attachmentUrl,
        userId,
        familyId,
        accountId: dto.accountId || null,
        ...tagsConnect,
      },
      include: {
        category: {
          select: { id: true, name: true, icon: true, color: true },
        },
        tags: {
          select: { id: true, name: true, color: true, icon: true },
        },
      },
    });

    // Update account balance
    if (dto.accountId) {
      const balanceChange = dto.type === 'INCOME' ? dto.amount : -dto.amount;
      await this.prisma.account.update({
        where: { id: dto.accountId },
        data: { balance: { increment: balanceChange } },
      });
    }

    // Check tag budgets for notifications
    if (dto.tagIds?.length && dto.type === 'EXPENSE') {
      await this.checkTagBudgetAlerts(dto.tagIds, userId, familyId || undefined);
    }

    return transaction;
  }

  private async checkTagBudgetAlerts(tagIds: string[], userId: string, familyId?: string) {
    const userIds = await getScopeUserIds(this.prisma, userId, familyId);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const tags = await this.prisma.tag.findMany({
      where: { id: { in: tagIds }, budget: { not: null } },
    });

    for (const tag of tags) {
      if (!tag.budget) continue;

      const tagTransactions = await this.prisma.transaction.findMany({
        where: {
          tags: { some: { id: tag.id } },
          userId: { in: userIds },
          type: 'EXPENSE',
          date: { gte: startOfMonth, lte: endOfMonth },
        },
      });

      const spent = tagTransactions.reduce((sum, tx) => sum + tx.amount, 0);
      const percentage = (spent / tag.budget) * 100;

      if (percentage >= 100) {
        await this.prisma.notification.create({
          data: {
            type: 'TAG_BUDGET_EXCEEDED',
            title: `Presupuesto excedido: ${tag.name}`,
            message: `Has gastado ${spent.toFixed(2)} de ${tag.budget.toFixed(2)} (${percentage.toFixed(0)}%) en ${tag.name} este mes.`,
            userId,
            data: JSON.stringify({ tagId: tag.id, spent, budget: tag.budget, percentage }),
          },
        });
      } else if (percentage >= 80) {
        await this.prisma.notification.create({
          data: {
            type: 'TAG_BUDGET_WARNING',
            title: `Alerta: ${tag.name}`,
            message: `Has gastado el ${percentage.toFixed(0)}% del presupuesto en ${tag.name} este mes.`,
            userId,
            data: JSON.stringify({ tagId: tag.id, spent, budget: tag.budget, percentage }),
          },
        });
      }
    }
  }

  async findMany(userId: string, options: {
    skip?: number;
    take?: number;
    startDate?: Date;
    endDate?: Date;
    type?: 'INCOME' | 'EXPENSE';
    categoryId?: string;
    familyId?: string;
    search?: string;
    isRecurring?: boolean;
    minAmount?: number;
    maxAmount?: number;
    paymentMethod?: string;
    tagId?: string;
    accountId?: string;
  } = {}) {
    const userIds = await getScopeUserIds(this.prisma, userId, options.familyId);

    const where: any = {
      userId: { in: userIds },
      // In family mode: only family transactions (familyId set)
      // In personal mode: only personal transactions (familyId = null)
      ...(options.familyId ? { familyId: options.familyId } : { familyId: null }),
      ...(options.startDate && { date: { gte: options.startDate } }),
      ...(options.endDate && { date: { lte: options.endDate } }),
      ...(options.type && { type: options.type }),
      ...(options.categoryId && { categoryId: options.categoryId }),
      ...(options.isRecurring !== undefined && { isRecurring: options.isRecurring }),
      ...(options.paymentMethod && { paymentMethod: options.paymentMethod }),
      ...(options.tagId && { tags: { some: { id: options.tagId } } }),
      ...(options.accountId && { accountId: options.accountId }),
      ...(options.minAmount !== undefined && options.maxAmount !== undefined
        ? { amount: { gte: options.minAmount, lte: options.maxAmount } }
        : options.minAmount !== undefined
          ? { amount: { gte: options.minAmount } }
          : options.maxAmount !== undefined
            ? { amount: { lte: options.maxAmount } }
            : {}),
      ...(options.search && {
        OR: [
          { title: { contains: options.search, mode: 'insensitive' } },
          { description: { contains: options.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [transactions, total] = await this.prisma.$transaction([
      this.prisma.transaction.findMany({
        where,
        include: {
          user: { select: { id: true, name: true } },
          category: {
            select: { id: true, name: true, icon: true, color: true },
          },
          tags: {
            select: { id: true, name: true, color: true, icon: true },
          },
        },
        orderBy: { date: 'desc' },
        skip: options.skip,
        take: options.take,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return { transactions, total };
  }

  async findById(id: string, userId: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
      include: {
        category: {
          select: { id: true, name: true, icon: true, color: true },
        },
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    // Owner can always access
    if (transaction.userId === userId) {
      return transaction;
    }

    // Family members can access family transactions
    if (transaction.familyId) {
      const hasAccess = await isFamilyMember(this.prisma, userId, transaction.familyId);
      if (hasAccess) return transaction;
    }

    throw new NotFoundException('Transaction not found');
  }

  async update(id: string, userId: string, dto: Partial<CreateTransactionDto>) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    // Check access: owner or family member
    if (transaction.userId !== userId) {
      if (transaction.familyId) {
        const hasAccess = await isFamilyMember(this.prisma, userId, transaction.familyId);
        if (!hasAccess) throw new NotFoundException('Transaction not found');
      } else {
        throw new NotFoundException('Transaction not found');
      }
    }

    // Verify category if being updated
    if (dto.categoryId) {
      const category = await this.prisma.category.findFirst({
        where: {
          id: dto.categoryId,
          OR: [
            { userId },
            { isDefault: true },
            ...(transaction.familyId ? [{ familyId: transaction.familyId }] : []),
          ],
        },
      });

      if (!category) {
        throw new BadRequestException('Invalid category');
      }
    }

    // Revert old account balance
    if (transaction.accountId) {
      const oldChange = transaction.type === 'INCOME' ? -transaction.amount : transaction.amount;
      await this.prisma.account.update({
        where: { id: transaction.accountId },
        data: { balance: { increment: oldChange } },
      });
    }

    const updated = await this.prisma.transaction.update({
      where: { id },
      data: {
        type: dto.type,
        title: dto.title,
        description: dto.description,
        amount: dto.amount,
        currency: dto.currency,
        date: dto.date,
        categoryId: dto.categoryId,
        subcategory: dto.subcategory,
        paymentMethod: dto.paymentMethod,
        isRecurring: dto.isRecurring,
        recurringFreq: dto.recurringFreq,
        attachmentUrl: dto.attachmentUrl,
        familyId: dto.familyId,
        accountId: dto.accountId,
      },
      include: {
        category: {
          select: { id: true, name: true, icon: true, color: true },
        },
      },
    });

    // Apply new account balance
    const newAccountId = dto.accountId || transaction.accountId;
    if (newAccountId) {
      const newType = dto.type || transaction.type;
      const newAmount = dto.amount || transaction.amount;
      const newChange = newType === 'INCOME' ? newAmount : -newAmount;
      await this.prisma.account.update({
        where: { id: newAccountId },
        data: { balance: { increment: newChange } },
      });
    }

    return updated;
  }

  async remove(id: string, userId: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    // Check access: owner or family member
    if (transaction.userId !== userId) {
      if (transaction.familyId) {
        const hasAccess = await isFamilyMember(this.prisma, userId, transaction.familyId);
        if (!hasAccess) throw new NotFoundException('Transaction not found');
      } else {
        throw new NotFoundException('Transaction not found');
      }
    }

    // Revert account balance
    if (transaction.accountId) {
      const revertChange = transaction.type === 'INCOME' ? -transaction.amount : transaction.amount;
      await this.prisma.account.update({
        where: { id: transaction.accountId },
        data: { balance: { increment: revertChange } },
      });
    }

    return this.prisma.transaction.delete({ where: { id } });
  }

  async getSummary(userId: string, options: {
    startDate?: Date;
    endDate?: Date;
    familyId?: string;
    accountId?: string;
  } = {}) {
    const userIds = await getScopeUserIds(this.prisma, userId, options.familyId);

    const where: any = {
      userId: { in: userIds },
      ...(options.familyId ? { familyId: options.familyId } : { familyId: null }),
      ...(options.startDate && { date: { gte: options.startDate } }),
      ...(options.endDate && { date: { lte: options.endDate } }),
      ...(options.accountId && { accountId: options.accountId }),
    };

    const [income, expense] = await this.prisma.$transaction([
      this.prisma.transaction.aggregate({
        where: { ...where, type: 'INCOME' },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: { ...where, type: 'EXPENSE' },
        _sum: { amount: true },
      }),
    ]);

    const totalIncome = income._sum.amount || 0;
    const totalExpense = expense._sum.amount || 0;
    const balance = totalIncome - totalExpense;

    return {
      totalIncome,
      totalExpense,
      balance,
      savingsRate: totalIncome > 0 ? (balance / totalIncome) * 100 : 0,
    };
  }

  async getCashflow(userId: string, months: number = 6, familyId?: string) {
    const userIds = await getScopeUserIds(this.prisma, userId, familyId);
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth() - months + 1, 1)
    const baseWhere = {
      userId: { in: userIds },
      ...(familyId ? { familyId } : { familyId: null }),
      date: { gte: start },
    }

    const [incomeData, expenseData] = await this.prisma.$transaction([
      this.prisma.transaction.groupBy({
        by: ['date'],
        where: { ...baseWhere, type: 'INCOME' },
        _sum: { amount: true },
        orderBy: { date: 'asc' },
      }),
      this.prisma.transaction.groupBy({
        by: ['date'],
        where: { ...baseWhere, type: 'EXPENSE' },
        _sum: { amount: true },
        orderBy: { date: 'asc' },
      }),
    ])

    const monthlyMap: Record<string, { income: number; expense: number }> = {}

    for (let i = 0; i < months; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - months + 1 + i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      monthlyMap[key] = { income: 0, expense: 0 }
    }

    for (const item of incomeData) {
      const d = new Date(item.date)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (monthlyMap[key]) monthlyMap[key].income += item._sum?.amount || 0
    }

    for (const item of expenseData) {
      const d = new Date(item.date)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (monthlyMap[key]) monthlyMap[key].expense += item._sum?.amount || 0
    }

    return Object.entries(monthlyMap).map(([key, data]) => ({
      month: key,
      label: new Date(parseInt(key.split('-')[0]), parseInt(key.split('-')[1]) - 1).toLocaleDateString('es-ES', { month: 'short', year: '2-digit' }),
      income: data.income,
      expense: data.expense,
      balance: data.income - data.expense,
    }))
  }

  async getComparison(userId: string, familyId?: string) {
    const userIds = await getScopeUserIds(this.prisma, userId, familyId);
    const now = new Date()
    const currentStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const currentEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
    const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)

    const baseWhere = {
      userId: { in: userIds },
      ...(familyId ? { familyId } : { familyId: null }),
    }

    const [currentIncome, currentExpense, prevIncome, prevExpense] = await this.prisma.$transaction([
      this.prisma.transaction.aggregate({
        where: { ...baseWhere, type: 'INCOME', date: { gte: currentStart, lte: currentEnd } },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: { ...baseWhere, type: 'EXPENSE', date: { gte: currentStart, lte: currentEnd } },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: { ...baseWhere, type: 'INCOME', date: { gte: prevStart, lte: prevEnd } },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: { ...baseWhere, type: 'EXPENSE', date: { gte: prevStart, lte: prevEnd } },
        _sum: { amount: true },
      }),
    ])

    const currIncome = currentIncome._sum.amount || 0
    const currExpense = currentExpense._sum.amount || 0
    const pIncome = prevIncome._sum.amount || 0
    const pExpense = prevExpense._sum.amount || 0

    const pctChange = (current: number, previous: number) =>
      previous > 0 ? ((current - previous) / previous) * 100 : current > 0 ? 100 : 0

    return {
      current: { income: currIncome, expense: currExpense, balance: currIncome - currExpense },
      previous: { income: pIncome, expense: pExpense, balance: pIncome - pExpense },
      changes: {
        income: pctChange(currIncome, pIncome),
        expense: pctChange(currExpense, pExpense),
        balance: pctChange(currIncome - currExpense, pIncome - pExpense),
      },
    }
  }

  async getByCategory(userId: string, options: {
    startDate?: Date;
    endDate?: Date;
    familyId?: string;
  } = {}) {
    const userIds = await getScopeUserIds(this.prisma, userId, options.familyId);

    const where: any = {
      userId: { in: userIds },
      type: 'EXPENSE',
      ...(options.familyId ? { familyId: options.familyId } : { familyId: null }),
      ...(options.startDate && { date: { gte: options.startDate } }),
      ...(options.endDate && { date: { lte: options.endDate } }),
    };

    return this.prisma.transaction.groupBy({
      by: ['categoryId'],
      where,
      _sum: { amount: true },
      _count: true,
      orderBy: { _sum: { amount: 'desc' } },
    });
  }

  async findByTag(tagId: string, userId: string, familyId?: string) {
    const userIds = await getScopeUserIds(this.prisma, userId, familyId);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    return this.prisma.transaction.findMany({
      where: {
        tags: { some: { id: tagId } },
        userId: { in: userIds },
        date: { gte: startOfMonth, lte: endOfMonth },
      },
      include: {
        category: { select: { id: true, name: true, color: true, icon: true } },
        user: { select: { id: true, name: true } },
        tags: { select: { id: true, name: true, color: true, icon: true } },
      },
      orderBy: { date: 'desc' },
    });
  }

  async getOverview(userId: string, familyId?: string) {
    const userIds = await getScopeUserIds(this.prisma, userId, familyId)
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)

    const baseWhere = {
      userId: { in: userIds },
      ...(familyId ? { familyId } : { familyId: null }),
    }

    const [
      summary,
      recentTransactions,
      byCategory,
      goals,
      comparison,
      cashflowIncome,
      cashflowExpense,
    ] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: { ...baseWhere, date: { gte: startOfMonth } },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.transaction.findMany({
        where: baseWhere,
        include: {
          category: { select: { id: true, name: true, icon: true, color: true } },
          tags: { select: { id: true, name: true, color: true, icon: true } },
        },
        orderBy: { date: 'desc' },
        take: 8,
      }),
      this.prisma.transaction.groupBy({
        by: ['categoryId'],
        where: { ...baseWhere, type: 'EXPENSE', date: { gte: startOfMonth } },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.goal.findMany({
        where: { userId, familyId: familyId || null },
        select: { id: true, name: true, targetAmount: true, currentAmount: true, deadline: true, icon: true, color: true },
      }),
      this.prisma.$transaction([
        this.prisma.transaction.aggregate({
          where: { ...baseWhere, type: 'INCOME', date: { gte: startOfMonth } },
          _sum: { amount: true },
        }),
        this.prisma.transaction.aggregate({
          where: { ...baseWhere, type: 'EXPENSE', date: { gte: startOfMonth } },
          _sum: { amount: true },
        }),
        this.prisma.transaction.aggregate({
          where: { ...baseWhere, type: 'INCOME', date: { gte: lastMonthStart, lte: lastMonthEnd } },
          _sum: { amount: true },
        }),
        this.prisma.transaction.aggregate({
          where: { ...baseWhere, type: 'EXPENSE', date: { gte: lastMonthStart, lte: lastMonthEnd } },
          _sum: { amount: true },
        }),
      ]),
      this.prisma.transaction.groupBy({
        by: ['date'],
        where: { ...baseWhere, type: 'INCOME', date: { gte: sixMonthsAgo } },
        _sum: { amount: true },
        orderBy: { date: 'asc' },
      }),
      this.prisma.transaction.groupBy({
        by: ['date'],
        where: { ...baseWhere, type: 'EXPENSE', date: { gte: sixMonthsAgo } },
        _sum: { amount: true },
        orderBy: { date: 'asc' },
      }),
    ])

    const [curIncome, curExpense, prevIncome, prevExpense] = comparison
    const currIncome = curIncome._sum.amount || 0
    const currExpense = curExpense._sum.amount || 0
    const pIncome = prevIncome._sum.amount || 0
    const pExpense = prevExpense._sum.amount || 0

    const pctChange = (current: number, previous: number) =>
      previous > 0 ? ((current - previous) / previous) * 100 : current > 0 ? 100 : 0

    const categoriesWithNames = await Promise.all(
      byCategory.map(async (cat) => {
        const category = await this.prisma.category.findUnique({
          where: { id: cat.categoryId },
          select: { name: true, icon: true, color: true },
        })
        return { ...category, amount: cat._sum.amount || 0, count: cat._count }
      })
    )

    const monthlyMap: Record<string, { income: number; expense: number }> = {}
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      monthlyMap[key] = { income: 0, expense: 0 }
    }

    for (const item of cashflowIncome) {
      const d = new Date(item.date)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (monthlyMap[key]) monthlyMap[key].income += item._sum?.amount || 0
    }

    for (const item of cashflowExpense) {
      const d = new Date(item.date)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (monthlyMap[key]) monthlyMap[key].expense += item._sum?.amount || 0
    }

    const cashflow = Object.entries(monthlyMap).map(([key, data]) => ({
      month: key,
      income: data.income,
      expense: data.expense,
      balance: data.income - data.expense,
    }))

    return {
      summary: {
        totalIncome: currIncome,
        totalExpense: currExpense,
        balance: currIncome - currExpense,
        savingsRate: currIncome > 0 ? ((currIncome - currExpense) / currIncome) * 100 : 0,
      },
      recentTransactions,
      byCategory: categoriesWithNames.sort((a, b) => b.amount - a.amount),
      goals,
      comparison: {
        current: { income: currIncome, expense: currExpense, balance: currIncome - currExpense },
        previous: { income: pIncome, expense: pExpense, balance: pIncome - pExpense },
        changes: {
          income: pctChange(currIncome, pIncome),
          expense: pctChange(currExpense, pExpense),
          balance: pctChange(currIncome - currExpense, pIncome - pExpense),
        },
      },
      cashflow,
    }
  }
}
