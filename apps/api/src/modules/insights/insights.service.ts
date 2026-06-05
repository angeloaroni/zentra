import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../database/prisma.service'

@Injectable()
export class InsightsService {
  constructor(private prisma: PrismaService) {}

  async getInsights(userId: string) {
    const now = new Date()
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)

    const [currentExpenses, lastExpenses, currentByCategory, lastByCategory, topMerchants] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: { userId, type: 'EXPENSE', date: { gte: currentMonth } },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: { userId, type: 'EXPENSE', date: { gte: lastMonth, lte: lastMonthEnd } },
        _sum: { amount: true },
      }),
      this.prisma.transaction.groupBy({
        by: ['categoryId'],
        where: { userId, type: 'EXPENSE', date: { gte: currentMonth } },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.transaction.groupBy({
        by: ['categoryId'],
        where: { userId, type: 'EXPENSE', date: { gte: lastMonth, lte: lastMonthEnd } },
        _sum: { amount: true },
      }),
      this.prisma.transaction.groupBy({
        by: ['title'],
        where: { userId, type: 'EXPENSE', date: { gte: currentMonth } },
        _sum: { amount: true },
        _count: true,
        orderBy: { _sum: { amount: 'desc' } },
        take: 5,
      }),
    ])

    const currentTotal = currentExpenses._sum.amount || 0
    const lastTotal = lastExpenses._sum.amount || 0
    const insights: any[] = []

    if (lastTotal > 0) {
      const change = ((currentTotal - lastTotal) / lastTotal) * 100
      if (Math.abs(change) > 10) {
        insights.push({
          type: change > 0 ? 'SPENDING_INCREASE' : 'SPENDING_DECREASE',
          title: change > 0 ? 'Gastos aumentaron' : 'Gastos disminuyeron',
          message: `Tus gastos ${change > 0 ? 'aumentaron' : 'disminuyeron'} un ${Math.abs(change).toFixed(0)}% vs el mes pasado.`,
          value: change,
          icon: change > 0 ? 'trending-up' : 'trending-down',
        })
      }
    }

    for (const current of currentByCategory) {
      const last = lastByCategory.find(l => l.categoryId === current.categoryId)
      if (last && (last._sum.amount ?? 0) > 0) {
        const catChange = (((current._sum.amount ?? 0) - (last._sum.amount ?? 0)) / (last._sum.amount ?? 1)) * 100
        if (catChange > 30) {
          insights.push({
            type: 'CATEGORY_INCREASE',
            title: 'Gasto inusual detectado',
            message: `Un gasto subio ${catChange.toFixed(0)}% este mes.`,
            categoryId: current.categoryId,
            value: catChange,
            icon: 'alert-triangle',
          })
        }
      }
    }

    const incomeResult = await this.prisma.transaction.aggregate({
      where: { userId, type: 'INCOME', date: { gte: currentMonth } },
      _sum: { amount: true },
    })

    const incomeTotal = incomeResult._sum.amount || 0
    if (incomeTotal > 0) {
      const savingsRate = ((incomeTotal - currentTotal) / incomeTotal) * 100
      const projectedSavings = savingsRate * 12 / 100 * incomeTotal
      insights.push({
        type: 'SAVINGS_PROJECTION',
        title: 'Proyeccion de ahorro',
        message: `Si mantienes este ritmo, ahorraras ${projectedSavings.toFixed(0)} € este ano.`,
        value: projectedSavings,
        icon: 'piggy-bank',
      })
    }

    return insights
  }
}
