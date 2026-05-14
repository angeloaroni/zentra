import { Injectable, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../database/prisma.service'

interface PlanLimits {
  transactionsPerMonth: number
  accounts: number
  budgets: number
  goals: number
}

const PLAN_LIMITS: Record<string, PlanLimits> = {
  free: { transactionsPerMonth: 50, accounts: 2, budgets: 3, goals: 3 },
  pro: { transactionsPerMonth: Infinity, accounts: Infinity, budgets: Infinity, goals: Infinity },
  family: { transactionsPerMonth: Infinity, accounts: Infinity, budgets: Infinity, goals: Infinity },
}

@Injectable()
export class PlanLimitsService {
  constructor(private prisma: PrismaService) {}

  private async getPlan(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (user?.role === 'ADMIN') return 'pro'

    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    })
    return subscription?.plan || 'free'
  }

  private getLimits(plan: string): PlanLimits {
    return PLAN_LIMITS[plan] || PLAN_LIMITS.free
  }

  async checkTransactionLimit(userId: string): Promise<void> {
    const plan = await this.getPlan(userId)
    const limits = this.getLimits(plan)

    if (limits.transactionsPerMonth === Infinity) return

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const count = await this.prisma.transaction.count({
      where: {
        userId,
        date: { gte: startOfMonth },
        familyId: null,
      },
    })

    if (count >= limits.transactionsPerMonth) {
      throw new BadRequestException(
        `Has alcanzado el limite de ${limits.transactionsPerMonth} transacciones mensuales del plan Gratis. Actualiza a Pro para transacciones ilimitadas.`,
      )
    }
  }

  async checkAccountLimit(userId: string): Promise<void> {
    const plan = await this.getPlan(userId)
    const limits = this.getLimits(plan)

    if (limits.accounts === Infinity) return

    const count = await this.prisma.account.count({
      where: { userId, familyId: null },
    })

    if (count >= limits.accounts) {
      throw new BadRequestException(
        `Has alcanzado el limite de ${limits.accounts} cuentas del plan Gratis. Actualiza a Pro para cuentas ilimitadas.`,
      )
    }
  }

  async checkBudgetLimit(userId: string): Promise<void> {
    const plan = await this.getPlan(userId)
    const limits = this.getLimits(plan)

    if (limits.budgets === Infinity) return

    const count = await this.prisma.budget.count({
      where: { userId, familyId: null },
    })

    if (count >= limits.budgets) {
      throw new BadRequestException(
        `Has alcanzado el limite de ${limits.budgets} presupuestos del plan Gratis. Actualiza a Pro para presupuestos ilimitados.`,
      )
    }
  }

  async checkGoalLimit(userId: string): Promise<void> {
    const plan = await this.getPlan(userId)
    const limits = this.getLimits(plan)

    if (limits.goals === Infinity) return

    const count = await this.prisma.goal.count({
      where: { userId, familyId: null },
    })

    if (count >= limits.goals) {
      throw new BadRequestException(
        `Has alcanzado el limite de ${limits.goals} metas del plan Gratis. Actualiza a Pro para metas ilimitadas.`,
      )
    }
  }

  async getUsage(userId: string): Promise<Record<string, { used: number; limit: number | string }>> {
    const plan = await this.getPlan(userId)
    const limits = this.getLimits(plan)

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const [transactions, accounts, budgets, goals] = await Promise.all([
      this.prisma.transaction.count({
        where: { userId, date: { gte: startOfMonth }, familyId: null },
      }),
      this.prisma.account.count({ where: { userId, familyId: null } }),
      this.prisma.budget.count({ where: { userId, familyId: null } }),
      this.prisma.goal.count({ where: { userId, familyId: null } }),
    ])

    return {
      transactions: {
        used: transactions,
        limit: limits.transactionsPerMonth === Infinity ? 'Ilimitado' : limits.transactionsPerMonth,
      },
      accounts: {
        used: accounts,
        limit: limits.accounts === Infinity ? 'Ilimitado' : limits.accounts,
      },
      budgets: {
        used: budgets,
        limit: limits.budgets === Infinity ? 'Ilimitado' : limits.budgets,
      },
      goals: {
        used: goals,
        limit: limits.goals === Infinity ? 'Ilimitado' : limits.goals,
      },
    }
  }
}