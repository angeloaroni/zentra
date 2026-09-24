import { Injectable, Logger, NotFoundException, ServiceUnavailableException, OnModuleInit } from '@nestjs/common'
import { PrismaService } from '../../database/prisma.service'
import { EmailService } from '../../common/services/email.service'

const MONTHS_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

@Injectable()
export class ReportsService implements OnModuleInit {
  private readonly logger = new Logger(ReportsService.name)
  private lastSentMonthKey: string | null = null

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  onModuleInit() {
    setInterval(() => this.maybeSendMonthlySummaries(), 6 * 60 * 60 * 1000)
  }

  private async maybeSendMonthlySummaries() {
    const now = new Date()
    if (now.getDate() !== 1) return

    const key = `${now.getFullYear()}-${now.getMonth()}`
    if (this.lastSentMonthKey === key) return
    this.lastSentMonthKey = key

    const users = await this.prisma.user.findMany({ select: { id: true } })
    this.logger.log(`Sending monthly summaries to ${users.length} user(s)`)

    for (const user of users) {
      try {
        await this.sendMonthlySummary(user.id)
      } catch (err) {
        this.logger.warn(`Monthly summary failed for ${user.id}: ${err.message}`)
      }
    }
  }

  async sendMonthlySummary(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      throw new NotFoundException('User not found')
    }

    const now = new Date()
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const month = prev.getMonth() + 1
    const year = prev.getFullYear()

    const report = await this.generatePDF(userId, month, year)
    const currency = await this.getDominantCurrency(userId)

    const sent = await this.emailService.sendMonthlySummaryEmail(user.email, {
      monthLabel: `${MONTHS_ES[prev.getMonth()]} ${year}`,
      currency,
      totalIncome: report.summary.totalIncome,
      totalExpenses: report.summary.totalExpenses,
      balance: report.summary.balance,
      savingsRate: report.summary.savingsRate,
      topCategories: report.byCategory
        .slice(0, 5)
        .map((c) => ({ name: c.name || 'Sin categoria', amount: c.amount })),
    })

    if (!sent) {
      throw new ServiceUnavailableException('No se pudo enviar el resumen por email')
    }

    return { message: `Resumen de ${MONTHS_ES[prev.getMonth()]} ${year} enviado a ${user.email}` }
  }

  private async getDominantCurrency(userId: string): Promise<string> {
    const grouped = await this.prisma.transaction.groupBy({
      by: ['currency'],
      where: { userId },
      _count: { currency: true },
      orderBy: { _count: { currency: 'desc' } },
      take: 1,
    })
    return grouped[0]?.currency || 'EUR'
  }

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
