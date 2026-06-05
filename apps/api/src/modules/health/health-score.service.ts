import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../database/prisma.service'

@Injectable()
export class HealthScoreService {
  constructor(private prisma: PrismaService) {}

  async getScore(userId: string) {
    const now = new Date()
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1)

    const [income, expenses, accounts, monthsData] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: { userId, type: 'INCOME', date: { gte: currentMonth } },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: { userId, type: 'EXPENSE', date: { gte: currentMonth } },
        _sum: { amount: true },
      }),
      this.prisma.account.findMany({ where: { userId } }),
      this.prisma.transaction.groupBy({
        by: ['date'],
        where: { userId, type: 'INCOME', date: { gte: sixMonthsAgo } },
        _sum: { amount: true },
      }),
    ])

    const totalIncome = income._sum.amount || 0
    const totalExpenses = expenses._sum.amount || 0
    const totalBalance = accounts.reduce((s, a) => s + a.balance, 0)
    const monthlyExpenses = totalExpenses

    let savingsScore = 0
    if (totalIncome > 0) {
      const savingsRate = (totalIncome - totalExpenses) / totalIncome
      if (savingsRate >= 0.20) savingsScore = 25
      else if (savingsRate >= 0.10) savingsScore = 15
      else if (savingsRate >= 0) savingsScore = 5
      else savingsScore = 0
    }

    let emergencyScore = 0
    if (monthlyExpenses > 0) {
      const monthsCovered = totalBalance / monthlyExpenses
      if (monthsCovered >= 6) emergencyScore = 25
      else if (monthsCovered >= 3) emergencyScore = 15
      else if (monthsCovered >= 1) emergencyScore = 5
      else emergencyScore = 0
    }

    const categoriesUsed = await this.prisma.transaction.groupBy({
      by: ['categoryId'],
      where: { userId, type: 'EXPENSE', date: { gte: currentMonth } },
    })
    const diversificationScore = categoriesUsed.length >= 5 ? 25 : categoriesUsed.length >= 3 ? 15 : 5

    let consistencyScore = 25
    if (monthsData.length >= 3) {
      const amounts = monthsData.map(m => m._sum.amount || 0)
      const avg = amounts.reduce((s, a) => s + a, 0) / amounts.length
      const variance = amounts.reduce((s, a) => s + Math.pow(a - avg, 2), 0) / amounts.length
      const cv = avg > 0 ? Math.sqrt(variance) / avg : 0
      if (cv < 0.10) consistencyScore = 25
      else if (cv < 0.30) consistencyScore = 15
      else consistencyScore = 5
    }

    const totalScore = savingsScore + emergencyScore + diversificationScore + consistencyScore
    const label = totalScore >= 80 ? 'Excelente' : totalScore >= 60 ? 'Bueno' : totalScore >= 40 ? 'Regular' : 'Mejorable'

    return {
      score: totalScore,
      label,
      breakdown: {
        savings: { score: savingsScore, max: 25, description: 'Tasa de ahorro' },
        emergency: { score: emergencyScore, max: 25, description: 'Fondo de emergencia' },
        diversification: { score: diversificationScore, max: 25, description: 'Diversificacion de gastos' },
        consistency: { score: consistencyScore, max: 25, description: 'Consistencia de ingresos' },
      },
    }
  }
}
