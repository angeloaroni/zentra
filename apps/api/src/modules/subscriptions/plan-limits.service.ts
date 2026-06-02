import { Injectable, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../database/prisma.service'

interface PlanLimits {
  transactionsPerMonth: number
  accounts: number
  budgets: number
  goals: number
  splitGroups: number
  splitMembersPerGroup: number
  splitExpensesPerMonth: number
}

const PLAN_LIMITS: Record<string, PlanLimits> = {
  free: { transactionsPerMonth: 50, accounts: 2, budgets: 3, goals: 3, splitGroups: 1, splitMembersPerGroup: 3, splitExpensesPerMonth: 10 },
  pro: { transactionsPerMonth: Infinity, accounts: Infinity, budgets: Infinity, goals: Infinity, splitGroups: Infinity, splitMembersPerGroup: Infinity, splitExpensesPerMonth: Infinity },
  family: { transactionsPerMonth: Infinity, accounts: Infinity, budgets: Infinity, goals: Infinity, splitGroups: Infinity, splitMembersPerGroup: Infinity, splitExpensesPerMonth: Infinity },
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

  async checkSplitGroupLimit(userId: string): Promise<void> {
    const plan = await this.getPlan(userId)
    const limits = this.getLimits(plan)

    if (limits.splitGroups === Infinity) return

    const count = await this.prisma.splitGroupMember.count({
      where: { userId },
    })

    const createdCount = await this.prisma.splitGroup.count({
      where: { createdById: userId },
    })

    const totalGroups = count + createdCount
    const uniqueGroupIds = new Set()

    const memberGroups = await this.prisma.splitGroupMember.findMany({
      where: { userId },
      select: { groupId: true },
    })
    memberGroups.forEach((g) => uniqueGroupIds.add(g.groupId))

    const createdGroups = await this.prisma.splitGroup.findMany({
      where: { createdById: userId },
      select: { id: true },
    })
    createdGroups.forEach((g) => uniqueGroupIds.add(g.id))

    if (uniqueGroupIds.size >= limits.splitGroups) {
      throw new BadRequestException(
        `Has alcanzado el limite de ${limits.splitGroups} grupo(s) del plan Gratis. Actualiza a Pro para grupos ilimitados.`,
      )
    }
  }

  async checkSplitMemberLimit(groupId: string): Promise<void> {
    const group = await this.prisma.splitGroup.findUnique({ where: { id: groupId } })
    if (!group) return

    const creator = await this.prisma.user.findUnique({ where: { id: group.createdById } })
    const creatorPlan = creator?.role === 'ADMIN' ? 'pro' : 'free'

    let plan = creatorPlan
    if (plan === 'free') {
      const subscription = await this.prisma.subscription.findUnique({
        where: { userId: group.createdById },
      })
      plan = subscription?.plan || 'free'
    }

    const limits = this.getLimits(plan)
    if (limits.splitMembersPerGroup === Infinity) return

    const memberCount = await this.prisma.splitGroupMember.count({
      where: { groupId },
    })

    const totalMembers = memberCount + 1

    if (totalMembers >= limits.splitMembersPerGroup) {
      throw new BadRequestException(
        `Has alcanzado el limite de ${limits.splitMembersPerGroup} miembros por grupo del plan Gratis. Actualiza a Pro para miembros ilimitados.`,
      )
    }
  }

  async checkSplitExpenseLimit(userId: string): Promise<void> {
    const plan = await this.getPlan(userId)
    const limits = this.getLimits(plan)

    if (limits.splitExpensesPerMonth === Infinity) return

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const userGroups = await this.prisma.splitGroupMember.findMany({
      where: { userId },
      select: { groupId: true },
    })

    const createdGroups = await this.prisma.splitGroup.findMany({
      where: { createdById: userId },
      select: { id: true },
    })

    const allGroupIds = [
      ...new Set([
        ...userGroups.map((g) => g.groupId),
        ...createdGroups.map((g) => g.id),
      ]),
    ]

    if (allGroupIds.length === 0) return

    const count = await this.prisma.sharedExpense.count({
      where: {
        groupId: { in: allGroupIds },
        date: { gte: startOfMonth },
      },
    })

    if (count >= limits.splitExpensesPerMonth) {
      throw new BadRequestException(
        `Has alcanzado el limite de ${limits.splitExpensesPerMonth} gastos compartidos mensuales del plan Gratis. Actualiza a Pro para gastos ilimitados.`,
      )
    }
  }

  async getUsage(userId: string): Promise<Record<string, { used: number; limit: number | string }>> {
    const plan = await this.getPlan(userId)
    const limits = this.getLimits(plan)

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const userGroups = await this.prisma.splitGroupMember.findMany({
      where: { userId },
      select: { groupId: true },
    })
    const createdGroups = await this.prisma.splitGroup.findMany({
      where: { createdById: userId },
      select: { id: true },
    })
    const allGroupIds = [
      ...new Set([
        ...userGroups.map((g) => g.groupId),
        ...createdGroups.map((g) => g.id),
      ]),
    ]

    const [transactions, accounts, budgets, goals, splitExpensesCount] = await Promise.all([
      this.prisma.transaction.count({
        where: { userId, date: { gte: startOfMonth }, familyId: null },
      }),
      this.prisma.account.count({ where: { userId, familyId: null } }),
      this.prisma.budget.count({ where: { userId, familyId: null } }),
      this.prisma.goal.count({ where: { userId, familyId: null } }),
      allGroupIds.length > 0
        ? this.prisma.sharedExpense.count({
            where: { groupId: { in: allGroupIds }, date: { gte: startOfMonth } },
          })
        : 0,
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
      splitExpenses: {
        used: splitExpensesCount,
        limit: limits.splitExpensesPerMonth === Infinity ? 'Ilimitado' : limits.splitExpensesPerMonth,
      },
    }
  }
}