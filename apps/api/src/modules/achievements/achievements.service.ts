import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../database/prisma.service'

@Injectable()
export class AchievementsService {
  constructor(private prisma: PrismaService) {}

  private readonly ACHIEVEMENTS = [
    { code: 'STREAK_7', name: 'Constante', description: '7 dias seguidos registrando gastos', icon: 'flame', category: 'habito', points: 10 },
    { code: 'STREAK_30', name: 'Disciplinado', description: '30 dias seguidos registrando gastos', icon: 'trophy', category: 'habito', points: 50 },
    { code: 'SAVINGS_100', name: 'Ahorrador', description: 'Ahorraste 100\u20ac este mes', icon: 'piggy-bank', category: 'ahorro', points: 15 },
    { code: 'SAVINGS_500', name: 'Gran Ahorrador', description: 'Ahorraste 500\u20ac este mes', icon: 'coins', category: 'ahorro', points: 30 },
    { code: 'GOAL_50', name: 'A Medio Camino', description: 'Llegaste al 50% de una meta', icon: 'target', category: 'metas', points: 10 },
    { code: 'GOAL_100', name: 'Meta Cumplida', description: 'Completaste una meta de ahorro', icon: 'check-circle', category: 'metas', points: 25 },
    { code: 'FIRST_SPLIT', name: 'Divisor', description: 'Creaste tu primer gasto dividido', icon: 'users', category: 'splits', points: 10 },
    { code: 'BUDGET_MASTER', name: 'Maestro del Presupuesto', description: '3 meses seguidos dentro de presupuesto', icon: 'shield', category: 'presupuesto', points: 40 },
    { code: 'DIVERSIFIED', name: 'Diversificado', description: 'Gastos en mas de 5 categorias', icon: 'pie-chart', category: 'variedad', points: 10 },
    { code: 'FIRST_TRANSACTION', name: 'Primer Paso', description: 'Registraste tu primera transaccion', icon: 'zap', category: 'habito', points: 5 },
  ]

  async getUserAchievements(userId: string) {
    const userAchievements = await this.prisma.userAchievement.findMany({
      where: { userId },
      include: { achievement: true },
    })

    const unlocked = new Set(userAchievements.map(ua => ua.achievement.code))

    return {
      unlocked: userAchievements.map(ua => ({
        ...ua.achievement,
        unlockedAt: ua.unlockedAt,
      })),
      available: this.ACHIEVEMENTS.filter(a => !unlocked.has(a.code)),
      total: this.ACHIEVEMENTS.length,
      points: userAchievements.reduce((sum, ua) => sum + ua.achievement.points, 0),
    }
  }

  async checkAndUnlock(userId: string) {
    const newAchievements: any[] = []

    const existing = await this.prisma.userAchievement.findMany({
      where: { userId },
      select: { achievementId: true },
    })
    const unlockedCodes = new Set<string>()
    for (const e of existing) {
      const ach = this.ACHIEVEMENTS.find(a => a.code === e.achievementId)
      if (ach) unlockedCodes.add(ach.code)
    }

    for (const achievement of this.ACHIEVEMENTS) {
      if (unlockedCodes.has(achievement.code)) continue

      let shouldUnlock = false

      switch (achievement.code) {
        case 'FIRST_TRANSACTION': {
          const count = await this.prisma.transaction.count({ where: { userId } })
          shouldUnlock = count >= 1
          break
        }
        case 'STREAK_7': {
          const streak = await this.calculateStreak(userId)
          shouldUnlock = streak >= 7
          break
        }
        case 'STREAK_30': {
          const streak = await this.calculateStreak(userId)
          shouldUnlock = streak >= 30
          break
        }
        case 'SAVINGS_100': {
          const savings = await this.getMonthlySavings(userId)
          shouldUnlock = savings >= 100
          break
        }
        case 'SAVINGS_500': {
          const savings = await this.getMonthlySavings(userId)
          shouldUnlock = savings >= 500
          break
        }
        case 'GOAL_50': {
          const goals = await this.prisma.goal.findMany({ where: { userId } })
          shouldUnlock = goals.some(g => g.targetAmount > 0 && (g.currentAmount / g.targetAmount) >= 0.5)
          break
        }
        case 'GOAL_100': {
          const goals = await this.prisma.goal.findMany({ where: { userId } })
          shouldUnlock = goals.some(g => g.currentAmount >= g.targetAmount && g.targetAmount > 0)
          break
        }
        case 'FIRST_SPLIT': {
          const count = await this.prisma.sharedExpense.count({
            where: { paidById: userId },
          })
          shouldUnlock = count >= 1
          break
        }
        case 'DIVERSIFIED': {
          const cats = await this.prisma.transaction.groupBy({
            by: ['categoryId'],
            where: { userId, type: 'EXPENSE' },
          })
          shouldUnlock = cats.length >= 5
          break
        }
      }

      if (shouldUnlock) {
        const achRecord = await this.prisma.achievement.findUnique({
          where: { code: achievement.code },
        })
        if (achRecord) {
          try {
            await this.prisma.userAchievement.create({
              data: { userId, achievementId: achRecord.id },
            })
            newAchievements.push(achievement)
          } catch {}
        }
      }
    }

    return newAchievements
  }

  private async calculateStreak(userId: string): Promise<number> {
    let streak = 0
    const currentDate = new Date()

    for (let i = 0; i < 365; i++) {
      const dayStart = new Date(currentDate)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(currentDate)
      dayEnd.setHours(23, 59, 59, 999)

      const count = await this.prisma.transaction.count({
        where: { userId, date: { gte: dayStart, lte: dayEnd } },
      })

      if (count > 0) {
        streak++
        currentDate.setDate(currentDate.getDate() - 1)
      } else {
        break
      }
    }

    return streak
  }

  private async getMonthlySavings(userId: string): Promise<number> {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1)

    const [income, expense] = await this.prisma.$transaction([
      this.prisma.transaction.aggregate({
        where: { userId, type: 'INCOME', date: { gte: start } },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: { userId, type: 'EXPENSE', date: { gte: start } },
        _sum: { amount: true },
      }),
    ])

    return (income._sum.amount || 0) - (expense._sum.amount || 0)
  }

  async seedAchievements() {
    for (const ach of this.ACHIEVEMENTS) {
      await this.prisma.achievement.upsert({
        where: { code: ach.code },
        update: {},
        create: ach,
      })
    }
  }
}
