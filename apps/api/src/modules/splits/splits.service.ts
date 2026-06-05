import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '../../database/prisma.service'
import { DebtSimplifierService, DebtTransfer } from './debt-simplifier.service'
import { PlanLimitsService } from '../subscriptions/plan-limits.service'
import {
  CreateGroupDto,
  UpdateGroupDto,
  CreateExpenseDto,
  UpdateExpenseDto,
  CreateSettlementDto,
  CreateRecurringSplitExpenseDto,
  CreateSplitTemplateDto,
} from './dto'

@Injectable()
export class SplitsService {
  constructor(
    private prisma: PrismaService,
    private debtSimplifier: DebtSimplifierService,
    private planLimits: PlanLimitsService,
  ) {}

  async createGroup(userId: string, dto: CreateGroupDto) {
    await this.planLimits.checkSplitGroupLimit(userId)

    const group = await this.prisma.splitGroup.create({
      data: {
        name: dto.name,
        description: dto.description,
        icon: dto.icon || 'users',
        color: dto.color || '#3B82F6',
        currency: dto.currency || 'USD',
        createdById: userId,
      },
    })

    await this.prisma.splitGroupMember.create({
      data: {
        groupId: group.id,
        userId,
        role: 'ADMIN',
      },
    })

    return group
  }

  async findGroups(userId: string) {
    const memberGroups = await this.prisma.splitGroupMember.findMany({
      where: { userId },
      include: {
        group: {
          include: {
            members: {
              include: {
                user: { select: { id: true, name: true, avatar: true } },
              },
            },
            _count: { select: { expenses: true } },
          },
        },
      },
    })

    const createdGroups = await this.prisma.splitGroup.findMany({
      where: { createdById: userId },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, avatar: true } },
          },
        },
        _count: { select: { expenses: true } },
      },
    })

    const groupMap = new Map<string, any>()

    for (const mg of memberGroups) {
      if (!groupMap.has(mg.group.id)) {
        groupMap.set(mg.group.id, mg.group)
      }
    }

    for (const g of createdGroups) {
      if (!groupMap.has(g.id)) {
        groupMap.set(g.id, g)
      }
    }

    return Array.from(groupMap.values())
  }

  async findGroupById(id: string, userId: string) {
    const group = await this.prisma.splitGroup.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true, avatar: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, avatar: true } },
          },
        },
        expenses: {
          include: {
            paidBy: { select: { id: true, name: true, avatar: true } },
            splits: {
              include: {
                user: { select: { id: true, name: true, avatar: true } },
              },
            },
          },
          orderBy: { date: 'desc' },
        },
        settlements: {
          include: {
            fromUser: { select: { id: true, name: true, avatar: true } },
            toUser: { select: { id: true, name: true, avatar: true } },
          },
          orderBy: { date: 'desc' },
        },
      },
    })

    if (!group) {
      throw new NotFoundException('Group not found')
    }

    const isMember = group.members.some((m) => m.userId === userId)
    if (!isMember) {
      throw new ForbiddenException('You are not a member of this group')
    }

    return group
  }

  async updateGroup(id: string, userId: string, dto: UpdateGroupDto) {
    const group = await this.prisma.splitGroup.findUnique({ where: { id } })

    if (!group) {
      throw new NotFoundException('Group not found')
    }

    if (group.createdById !== userId) {
      const member = await this.prisma.splitGroupMember.findFirst({
        where: { groupId: id, userId },
      })
      if (!member || member.role !== 'ADMIN') {
        throw new ForbiddenException('Not authorized')
      }
    }

    return this.prisma.splitGroup.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.icon && { icon: dto.icon }),
        ...(dto.color && { color: dto.color }),
      },
    })
  }

  async deleteGroup(id: string, userId: string) {
    const group = await this.prisma.splitGroup.findUnique({ where: { id } })

    if (!group) {
      throw new NotFoundException('Group not found')
    }

    if (group.createdById !== userId) {
      throw new ForbiddenException('Only the creator can delete the group')
    }

    return this.prisma.splitGroup.delete({ where: { id } })
  }

  async inviteMember(groupId: string, userId: string, email: string) {
    await this.planLimits.checkSplitMemberLimit(groupId)

    const group = await this.prisma.splitGroup.findUnique({ where: { id: groupId } })

    if (!group) {
      throw new NotFoundException('Group not found')
    }

    const isAdmin = group.createdById === userId
    if (!isAdmin) {
      const member = await this.prisma.splitGroupMember.findFirst({
        where: { groupId, userId },
      })
      if (!member || member.role !== 'ADMIN') {
        throw new ForbiddenException('Not authorized')
      }
    }

    const user = await this.prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    })

    if (!user) {
      throw new NotFoundException(
        'No se encontro ningun usuario con ese email. El usuario debe estar registrado en Zentra.',
      )
    }

    const existing = await this.prisma.splitGroupMember.findFirst({
      where: { groupId, userId: user.id },
    })

    if (existing) {
      throw new BadRequestException('Este usuario ya es miembro del grupo')
    }

    const member = await this.prisma.splitGroupMember.create({
      data: {
        groupId,
        userId: user.id,
      },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
      },
    })

    await this.prisma.notification.create({
      data: {
        type: 'SPLIT_INVITE',
        title: `Invitacion a grupo: ${group.name}`,
        message: `Has sido invitado al grupo de division de gastos "${group.name}".`,
        userId: user.id,
        data: JSON.stringify({ groupId, groupName: group.name }),
      },
    })

    return member
  }

  async removeMember(groupId: string, userId: string, memberUserId: string) {
    const group = await this.prisma.splitGroup.findUnique({ where: { id: groupId } })

    if (!group) {
      throw new NotFoundException('Group not found')
    }

    if (group.createdById !== userId) {
      const member = await this.prisma.splitGroupMember.findFirst({
        where: { groupId, userId },
      })
      if (!member || member.role !== 'ADMIN') {
        throw new ForbiddenException('Not authorized')
      }
    }

    if (group.createdById === memberUserId) {
      throw new BadRequestException('Cannot remove the group creator')
    }

    const memberToRemove = await this.prisma.splitGroupMember.findUnique({
      where: { groupId_userId: { groupId, userId: memberUserId } },
    })

    if (!memberToRemove) {
      throw new NotFoundException('Member not found')
    }

    return this.prisma.splitGroupMember.delete({
      where: { groupId_userId: { groupId, userId: memberUserId } },
    })
  }

  async createExpense(userId: string, dto: CreateExpenseDto) {
    await this.planLimits.checkSplitExpenseLimit(userId)

    const group = await this.prisma.splitGroup.findUnique({
      where: { id: dto.groupId },
      include: { members: true },
    })

    if (!group) {
      throw new NotFoundException('Group not found')
    }

    const isMember = group.members.some((m) => m.userId === userId)
    if (!isMember) {
      throw new ForbiddenException('You are not a member of this group')
    }

    const memberIds = group.members.map((m) => m.userId)
    const invalidSplits = dto.splits.filter((s) => !memberIds.includes(s.userId))
    if (invalidSplits.length > 0) {
      throw new BadRequestException('All split participants must be group members')
    }

    if (!dto.splits.some((s) => s.userId === userId)) {
      throw new BadRequestException('You must include yourself in the splits')
    }

    if (dto.splitType === 'EQUAL') {
      const perPerson = dto.amount / dto.splits.length
      for (const split of dto.splits) {
        split.amount = Math.round(perPerson * 100) / 100
      }
      const totalSplit = dto.splits.reduce((sum, s) => sum + s.amount, 0)
      const diff = Math.round((dto.amount - totalSplit) * 100) / 100
      if (diff !== 0) {
        dto.splits[0].amount = Math.round((dto.splits[0].amount + diff) * 100) / 100
      }
    } else if (dto.splitType === 'PERCENTAGE') {
      const totalPercentage = dto.splits.reduce((sum, s) => sum + (s.percentage || 0), 0)
      if (Math.abs(totalPercentage - 100) > 0.01) {
        throw new BadRequestException('Percentages must sum to 100')
      }
      for (const split of dto.splits) {
        split.amount = Math.round((dto.amount * (split.percentage || 0)) / 100 * 100) / 100
      }
    } else if (dto.splitType === 'EXACT') {
      const totalSplit = dto.splits.reduce((sum, s) => sum + s.amount, 0)
      if (Math.abs(totalSplit - dto.amount) > 0.01) {
        throw new BadRequestException('Split amounts must sum to the total amount')
      }
    }

    const expense = await this.prisma.sharedExpense.create({
      data: {
        groupId: dto.groupId,
        paidById: userId,
        title: dto.title,
        description: dto.description,
        amount: dto.amount,
        currency: dto.currency || group.currency,
        date: new Date(dto.date),
        splitType: dto.splitType,
        splits: {
          create: dto.splits.map((s) => ({
            userId: s.userId,
            amount: s.amount,
            percentage: s.percentage,
          })),
        },
      },
      include: {
        paidBy: { select: { id: true, name: true, avatar: true } },
        splits: {
          include: {
            user: { select: { id: true, name: true, avatar: true } },
          },
        },
      },
    })

    const otherMembers = group.members.filter((m) => m.userId !== userId)
    for (const member of otherMembers) {
      await this.prisma.notification.create({
        data: {
          type: 'SPLIT_EXPENSE',
          title: `Nuevo gasto en ${group.name}`,
          message: `${expense.paidBy.name} agrego "${expense.title}" por ${expense.amount.toFixed(2)} ${expense.currency}.`,
          userId: member.userId,
          data: JSON.stringify({ groupId: group.id, expenseId: expense.id }),
        },
      })
    }

    return expense
  }

  async findExpenses(userId: string, groupId: string) {
    const isMember = await this.prisma.splitGroupMember.findFirst({
      where: { groupId, userId },
    })

    if (!isMember) {
      const group = await this.prisma.splitGroup.findUnique({ where: { id: groupId } })
      if (!group || group.createdById !== userId) {
        throw new ForbiddenException('You are not a member of this group')
      }
    }

    return this.prisma.sharedExpense.findMany({
      where: { groupId },
      include: {
        paidBy: { select: { id: true, name: true, avatar: true } },
        splits: {
          include: {
            user: { select: { id: true, name: true, avatar: true } },
          },
        },
      },
      orderBy: { date: 'desc' },
    })
  }

  async findExpenseById(id: string, userId: string) {
    const expense = await this.prisma.sharedExpense.findUnique({
      where: { id },
      include: {
        group: { include: { members: true } },
        paidBy: { select: { id: true, name: true, avatar: true } },
        splits: {
          include: {
            user: { select: { id: true, name: true, avatar: true } },
          },
        },
      },
    })

    if (!expense) {
      throw new NotFoundException('Expense not found')
    }

    const isMember = expense.group.members.some((m) => m.userId === userId)
    if (!isMember && expense.group.createdById !== userId) {
      throw new ForbiddenException('You are not a member of this group')
    }

    return expense
  }

  async updateExpense(id: string, userId: string, dto: UpdateExpenseDto) {
    const expense = await this.prisma.sharedExpense.findUnique({
      where: { id },
      include: { group: { include: { members: true } } },
    })

    if (!expense) {
      throw new NotFoundException('Expense not found')
    }

    if (expense.paidById !== userId) {
      throw new ForbiddenException('Only the person who paid can update the expense')
    }

    const group = expense.group
    const memberIds = group.members.map((m) => m.userId)

    if (dto.splits) {
      const invalidSplits = dto.splits.filter((s) => !memberIds.includes(s.userId))
      if (invalidSplits.length > 0) {
        throw new BadRequestException('All split participants must be group members')
      }
    }

    const newAmount = dto.amount || expense.amount
    const newSplitType = dto.splitType || expense.splitType
    const newSplits = dto.splits || []

    let splitsData: Array<{ userId: string; amount: number; percentage?: number }> = []

    if (dto.splits) {
      if (newSplitType === 'EQUAL') {
        const perPerson = newAmount / newSplits.length
        for (const split of newSplits) {
          split.amount = Math.round(perPerson * 100) / 100
        }
        const totalSplit = newSplits.reduce((sum, s) => sum + s.amount, 0)
        const diff = Math.round((newAmount - totalSplit) * 100) / 100
        if (diff !== 0) {
          newSplits[0].amount = Math.round((newSplits[0].amount + diff) * 100) / 100
        }
      } else if (newSplitType === 'PERCENTAGE') {
        for (const split of newSplits) {
          split.amount = Math.round((newAmount * (split.percentage || 0)) / 100 * 100) / 100
        }
      }
      splitsData = newSplits
    }

    return this.prisma.$transaction(async (tx) => {
      if (splitsData.length > 0) {
        await tx.expenseSplit.deleteMany({ where: { expenseId: id } })
        await tx.expenseSplit.createMany({
          data: splitsData.map((s) => ({
            expenseId: id,
            userId: s.userId,
            amount: s.amount,
            percentage: s.percentage,
          })),
        })
      }

      return tx.sharedExpense.update({
        where: { id },
        data: {
          ...(dto.title && { title: dto.title }),
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.amount && { amount: dto.amount }),
          ...(dto.date && { date: new Date(dto.date) }),
          ...(dto.splitType && { splitType: dto.splitType }),
        },
        include: {
          paidBy: { select: { id: true, name: true, avatar: true } },
          splits: {
            include: {
              user: { select: { id: true, name: true, avatar: true } },
            },
          },
        },
      })
    })
  }

  async deleteExpense(id: string, userId: string) {
    const expense = await this.prisma.sharedExpense.findUnique({ where: { id } })

    if (!expense) {
      throw new NotFoundException('Expense not found')
    }

    if (expense.paidById !== userId) {
      const group = await this.prisma.splitGroup.findUnique({
        where: { id: expense.groupId },
      })
      if (!group || group.createdById !== userId) {
        throw new ForbiddenException('Not authorized')
      }
    }

    return this.prisma.sharedExpense.delete({ where: { id } })
  }

  async getBalances(groupId: string, userId: string) {
    const isMember = await this.prisma.splitGroupMember.findFirst({
      where: { groupId, userId },
    })

    if (!isMember) {
      const group = await this.prisma.splitGroup.findUnique({ where: { id: groupId } })
      if (!group || group.createdById !== userId) {
        throw new ForbiddenException('You are not a member of this group')
      }
    }

    const [expenses, settlements] = await Promise.all([
      this.prisma.sharedExpense.findMany({
        where: { groupId },
        include: {
          splits: { select: { userId: true, amount: true, isPaid: true } },
          paidBy: { select: { id: true, name: true, avatar: true } },
        },
      }),
      this.prisma.settlement.findMany({
        where: { groupId },
        select: { fromUserId: true, toUserId: true, amount: true },
      }),
    ])

    const netBalances = this.debtSimplifier.calculateNetBalances(expenses, settlements)
    const simplifiedDebts = this.debtSimplifier.simplifyDebts(netBalances)

    const enrichedDebts: (DebtTransfer & { fromName: string; toName: string })[] = []
    for (const debt of simplifiedDebts) {
      const [fromUser, toUser] = await Promise.all([
        this.prisma.user.findUnique({
          where: { id: debt.from },
          select: { id: true, name: true, avatar: true },
        }),
        this.prisma.user.findUnique({
          where: { id: debt.to },
          select: { id: true, name: true, avatar: true },
        }),
      ])

      enrichedDebts.push({
        ...debt,
        fromName: fromUser?.name || 'Unknown',
        toName: toUser?.name || 'Unknown',
      })
    }

    return {
      netBalances: netBalances.map((nb) => ({
        ...nb,
        user: expenses[0]?.splits.find(() => true)
          ? undefined
          : undefined,
      })),
      simplifiedDebts: enrichedDebts,
    }
  }

  async getOverallBalances(userId: string) {
    const memberships = await this.prisma.splitGroupMember.findMany({
      where: { userId },
      select: { groupId: true },
    })

    const createdGroups = await this.prisma.splitGroup.findMany({
      where: { createdById: userId },
      select: { id: true },
    })

    const allGroupIds = [
      ...new Set([...memberships.map((m) => m.groupId), ...createdGroups.map((g) => g.id)]),
    ]

    const groupData = await Promise.all(
      allGroupIds.map(async (groupId) => {
        const [expenses, settlements] = await Promise.all([
          this.prisma.sharedExpense.findMany({
            where: { groupId },
            include: {
              splits: { select: { userId: true, amount: true, isPaid: true } },
            },
          }),
          this.prisma.settlement.findMany({
            where: { groupId },
            select: { fromUserId: true, toUserId: true, amount: true },
          }),
        ])
        return { groupId, expenses, settlements }
      }),
    )

    const overall = this.debtSimplifier.getOverallBalances(groupData, userId)

    return overall
  }

  async createSettlement(userId: string, dto: CreateSettlementDto) {
    const group = await this.prisma.splitGroup.findUnique({
      where: { id: dto.groupId },
      include: { members: true },
    })

    if (!group) {
      throw new NotFoundException('Group not found')
    }

    const isMember = group.members.some((m) => m.userId === userId)
    if (!isMember) {
      throw new ForbiddenException('You are not a member of this group')
    }

    const receiverMember = group.members.find((m) => m.userId === dto.toUserId)
    if (!receiverMember) {
      throw new BadRequestException('Receiver must be a group member')
    }

    const receiverUser = await this.prisma.user.findUnique({
      where: { id: dto.toUserId },
      select: { name: true },
    })

    const settlements = await this.prisma.settlement.findMany({
      where: { groupId: dto.groupId },
    })

    const expenses = await this.prisma.sharedExpense.findMany({
      where: { groupId: dto.groupId },
      include: { splits: { select: { userId: true, amount: true, isPaid: true } } },
    })

    const netBalances = this.debtSimplifier.calculateNetBalances(expenses, settlements)
    const debtorBalance = netBalances.find((b) => b.userId === userId)

    if (!debtorBalance || debtorBalance.amount >= 0) {
      throw new BadRequestException('No debt exists from you to this user')
    }

    const maxAmount = Math.abs(debtorBalance.amount)
    if (dto.amount > maxAmount + 0.01) {
      throw new BadRequestException(`Maximum settlement amount is ${maxAmount.toFixed(2)}`)
    }

    const settlement = await this.prisma.$transaction(async (tx) => {
      let transactionId: string | undefined

      let settleCategory = await tx.category.findFirst({
        where: { name: 'Pago de deuda', userId, isDefault: false },
      })

      if (!settleCategory) {
        settleCategory = await tx.category.create({
          data: {
            name: 'Pago de deuda',
            icon: 'hand-coins',
            color: '#10B981',
            type: 'EXPENSE',
            userId,
          },
        })
      }

      const expenseTx = await tx.transaction.create({
        data: {
          type: 'EXPENSE',
          title: `Pago a ${receiverUser?.name || 'miembro'}`,
          description: dto.notes || `Pago de deuda en grupo ${group.name}`,
          amount: dto.amount,
          currency: group.currency,
          date: dto.date ? new Date(dto.date) : new Date(),
          categoryId: settleCategory.id,
          userId,
        },
      })

      let receiverCategory = await tx.category.findFirst({
        where: { name: 'Pago de deuda', userId: dto.toUserId, isDefault: false },
      })

      if (!receiverCategory) {
        receiverCategory = await tx.category.create({
          data: {
            name: 'Pago de deuda',
            icon: 'hand-coins',
            color: '#10B981',
            type: 'INCOME',
            userId: dto.toUserId,
          },
        })
      }

      await tx.transaction.create({
        data: {
          type: 'INCOME',
          title: `Pago recibido de ${userId}`,
          description: dto.notes || `Pago de deuda en grupo ${group.name}`,
          amount: dto.amount,
          currency: group.currency,
          date: dto.date ? new Date(dto.date) : new Date(),
          categoryId: receiverCategory.id,
          userId: dto.toUserId,
        },
      })

      transactionId = expenseTx.id

      const settlement = await tx.settlement.create({
        data: {
          groupId: dto.groupId,
          fromUserId: userId,
          toUserId: dto.toUserId,
          amount: dto.amount,
          date: dto.date ? new Date(dto.date) : new Date(),
          notes: dto.notes,
          transactionId,
        },
        include: {
          fromUser: { select: { id: true, name: true, avatar: true } },
          toUser: { select: { id: true, name: true, avatar: true } },
        },
      })

      await tx.notification.create({
        data: {
          type: 'SPLIT_SETTLEMENT',
          title: `Pago recibido en ${group.name}`,
          message: `${settlement.fromUser.name} te pago ${settlement.amount.toFixed(2)} ${group.currency}.`,
          userId: dto.toUserId,
          data: JSON.stringify({ groupId: group.id, settlementId: settlement.id }),
        },
      })

      return settlement
    })

    return settlement
  }

  async findSettlements(groupId: string, userId: string) {
    const isMember = await this.prisma.splitGroupMember.findFirst({
      where: { groupId, userId },
    })

    if (!isMember) {
      const group = await this.prisma.splitGroup.findUnique({ where: { id: groupId } })
      if (!group || group.createdById !== userId) {
        throw new ForbiddenException('You are not a member of this group')
      }
    }

    return this.prisma.settlement.findMany({
      where: { groupId },
      include: {
        fromUser: { select: { id: true, name: true, avatar: true } },
        toUser: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: { date: 'desc' },
    })
  }

  async deleteSettlement(id: string, userId: string) {
    const settlement = await this.prisma.settlement.findUnique({ where: { id } })

    if (!settlement) {
      throw new NotFoundException('Settlement not found')
    }

    if (settlement.fromUserId !== userId) {
      throw new ForbiddenException('Only the person who paid can delete the settlement')
    }

    if (settlement.transactionId) {
      await this.prisma.transaction.deleteMany({
        where: { id: settlement.transactionId },
      })
    }

    return this.prisma.settlement.delete({ where: { id } })
  }

  async uploadReceipt(expenseId: string, userId: string, file: Express.Multer.File) {
    const expense = await this.prisma.sharedExpense.findUnique({ where: { id: expenseId } })
    if (!expense) throw new NotFoundException('Expense not found')
    if (expense.paidById !== userId) throw new ForbiddenException('Only the payer can upload receipts')

    const receiptUrl = `/uploads/receipts/${file.filename}`
    return this.prisma.sharedExpense.update({
      where: { id: expenseId },
      data: { receiptUrl },
    })
  }

  async deleteReceipt(expenseId: string, userId: string) {
    const expense = await this.prisma.sharedExpense.findUnique({ where: { id: expenseId } })
    if (!expense) throw new NotFoundException('Expense not found')
    if (expense.paidById !== userId) throw new ForbiddenException('Only the payer can delete receipts')

    return this.prisma.sharedExpense.update({
      where: { id: expenseId },
      data: { receiptUrl: null },
    })
  }

  async markSplitPaid(expenseId: string, splitId: string, userId: string) {
    const expense = await this.prisma.sharedExpense.findUnique({ where: { id: expenseId } })
    if (!expense) throw new NotFoundException('Expense not found')

    const split = await this.prisma.expenseSplit.findUnique({ where: { id: splitId } })
    if (!split || split.expenseId !== expenseId) throw new NotFoundException('Split not found')

    const isMember = await this.prisma.splitGroupMember.findFirst({
      where: { groupId: expense.groupId, userId },
    })
    if (!isMember && expense.paidById !== userId) throw new ForbiddenException('Not authorized')

    return this.prisma.expenseSplit.update({
      where: { id: splitId },
      data: { isPaid: true, paidAt: new Date() },
    })
  }

  async createRecurringExpense(userId: string, dto: CreateRecurringSplitExpenseDto) {
    const group = await this.prisma.splitGroup.findUnique({
      where: { id: dto.groupId },
      include: { members: true },
    })
    if (!group) throw new NotFoundException('Group not found')

    const isMember = group.members.some((m) => m.userId === userId)
    if (!isMember) throw new ForbiddenException('Not a member')

    return this.prisma.recurringSplitExpense.create({
      data: {
        groupId: dto.groupId,
        paidById: userId,
        title: dto.title,
        amount: dto.amount,
        currency: dto.currency || group.currency,
        frequency: dto.frequency,
        splitType: dto.splitType,
        nextDueDate: new Date(dto.nextDueDate),
      },
    })
  }

  async findRecurringExpenses(groupId: string, userId: string) {
    const isMember = await this.prisma.splitGroupMember.findFirst({ where: { groupId, userId } })
    if (!isMember) {
      const group = await this.prisma.splitGroup.findUnique({ where: { id: groupId } })
      if (!group || group.createdById !== userId) throw new ForbiddenException('Not a member')
    }

    return this.prisma.recurringSplitExpense.findMany({
      where: { groupId },
      include: {
        paidBy: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: { nextDueDate: 'asc' },
    })
  }

  async deleteRecurringExpense(id: string, userId: string) {
    const recurring = await this.prisma.recurringSplitExpense.findUnique({ where: { id } })
    if (!recurring) throw new NotFoundException('Recurring expense not found')
    if (recurring.paidById !== userId) throw new ForbiddenException('Not authorized')
    return this.prisma.recurringSplitExpense.delete({ where: { id } })
  }

  async toggleRecurringExpense(id: string, userId: string) {
    const recurring = await this.prisma.recurringSplitExpense.findUnique({ where: { id } })
    if (!recurring) throw new NotFoundException('Recurring expense not found')
    if (recurring.paidById !== userId) throw new ForbiddenException('Not authorized')

    return this.prisma.recurringSplitExpense.update({
      where: { id },
      data: { active: !recurring.active },
    })
  }

  async createTemplate(userId: string, dto: CreateSplitTemplateDto) {
    return this.prisma.splitTemplate.create({
      data: {
        userId,
        name: dto.name,
        splitType: dto.splitType,
        memberIds: dto.memberIds,
      },
    })
  }

  async findTemplates(userId: string) {
    return this.prisma.splitTemplate.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })
  }

  async deleteTemplate(id: string, userId: string) {
    const template = await this.prisma.splitTemplate.findUnique({ where: { id } })
    if (!template) throw new NotFoundException('Template not found')
    if (template.userId !== userId) throw new ForbiddenException('Not authorized')
    return this.prisma.splitTemplate.delete({ where: { id } })
  }
}
