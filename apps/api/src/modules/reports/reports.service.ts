import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../database/prisma.service'

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getWeeklyDigest(userId: string) {
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

    const [thisWeekExpenses, lastWeekExpenses, topCategories, income] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: { userId, type: 'EXPENSE', date: { gte: weekAgo } },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: { userId, type: 'EXPENSE', date: { gte: twoWeeksAgo, lte: weekAgo } },
        _sum: { amount: true },
      }),
      this.prisma.transaction.groupBy({
        by: ['categoryId'],
        where: { userId, type: 'EXPENSE', date: { gte: weekAgo } },
        _sum: { amount: true },
        _count: true,
        orderBy: { _sum: { amount: 'desc' } },
        take: 3,
      }),
      this.prisma.transaction.aggregate({
        where: { userId, type: 'INCOME', date: { gte: weekAgo } },
        _sum: { amount: true },
      }),
    ])

    const thisWeekTotal = thisWeekExpenses._sum.amount || 0
    const lastWeekTotal = lastWeekExpenses._sum.amount || 0
    const incomeTotal = income._sum.amount || 0
    const savings = incomeTotal - thisWeekTotal

    const change = lastWeekTotal > 0
      ? ((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100
      : 0

    const categoriesWithNames = await Promise.all(
      topCategories.map(async (cat) => {
        const category = await this.prisma.category.findUnique({
          where: { id: cat.categoryId },
          select: { name: true, icon: true, color: true },
        })
        return {
          ...category,
          amount: cat._sum.amount || 0,
          count: cat._count,
        }
      })
    )

    return {
      period: { from: weekAgo, to: now },
      totalSpent: thisWeekTotal,
      totalIncome: incomeTotal,
      savings,
      change,
      topCategories: categoriesWithNames,
    }
  }

  async generatePDF(userId: string, month: number, year: number) {
    const start = new Date(year, month - 1, 1)
    const end = new Date(year, month, 0, 23, 59, 59)

    const [income, expenses, byCategory, accounts] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: { userId, type: 'INCOME', date: { gte: start, lte: end } },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: { userId, type: 'EXPENSE', date: { gte: start, lte: end } },
        _sum: { amount: true },
      }),
      this.prisma.transaction.groupBy({
        by: ['categoryId'],
        where: { userId, type: 'EXPENSE', date: { gte: start, lte: end } },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.account.findMany({ where: { userId } }),
    ])

    const categoriesWithNames = await Promise.all(
      byCategory.map(async (cat) => {
        const category = await this.prisma.category.findUnique({
          where: { id: cat.categoryId },
          select: { name: true, icon: true, color: true },
        })
        return { ...category, amount: cat._sum.amount || 0, count: cat._count }
      })
    )

    const totalIncome = income._sum.amount || 0
    const totalExpenses = expenses._sum.amount || 0
    const balance = totalIncome - totalExpenses
    const savingsRate = totalIncome > 0 ? (balance / totalIncome) * 100 : 0

    return {
      month,
      year,
      summary: { totalIncome, totalExpenses, balance, savingsRate },
      byCategory: categoriesWithNames.sort((a, b) => b.amount - a.amount),
      accounts: accounts.map(a => ({ name: a.name, balance: a.balance, type: a.type })),
    }
  }
}
