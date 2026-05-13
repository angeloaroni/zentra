import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { getScopeUserIds, isFamilyMember } from '../families/family-access.helper';
import { PlanLimitsService } from '../subscriptions/plan-limits.service';

@Injectable()
export class GoalsService {
  constructor(private prisma: PrismaService, private planLimits: PlanLimitsService) {}

  async create(userId: string, data: {
    name: string;
    description?: string;
    targetAmount: number;
    deadline?: string;
    icon?: string;
    color?: string;
    familyId?: string;
  }) {
    if (!data.familyId) {
      await this.planLimits.checkGoalLimit(userId);
    }
    // familyId ONLY set when explicitly passed from frontend (family view)
    // Personal goals always have familyId: null
    const familyId = data.familyId || null;

    return this.prisma.goal.create({
      data: {
        name: data.name,
        description: data.description,
        targetAmount: data.targetAmount,
        deadline: data.deadline ? new Date(data.deadline) : undefined,
        icon: data.icon,
        color: data.color,
        userId,
        familyId,
      },
    });
  }

  async findMany(userId: string, familyId?: string) {
    const userIds = await getScopeUserIds(this.prisma, userId, familyId);

    return this.prisma.goal.findMany({
      where: { userId: { in: userIds } },
      include: {
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string, userId: string) {
    const goal = await this.prisma.goal.findUnique({ where: { id } });

    if (!goal) {
      throw new NotFoundException('Goal not found');
    }

    // Owner can always access
    if (goal.userId === userId) {
      return goal;
    }

    // Family members can access family goals
    if (goal.familyId) {
      const hasAccess = await isFamilyMember(this.prisma, userId, goal.familyId);
      if (hasAccess) return goal;
    }

    throw new NotFoundException('Goal not found');
  }

  async update(id: string, userId: string, data: {
    name?: string;
    description?: string;
    targetAmount?: number;
    deadline?: string;
    icon?: string;
    color?: string;
  }) {
    const goal = await this.prisma.goal.findUnique({ where: { id } });

    if (!goal) {
      throw new NotFoundException('Goal not found');
    }

    // Check access
    if (goal.userId !== userId) {
      if (goal.familyId) {
        const hasAccess = await isFamilyMember(this.prisma, userId, goal.familyId);
        if (!hasAccess) throw new NotFoundException('Goal not found');
      } else {
        throw new NotFoundException('Goal not found');
      }
    }

    return this.prisma.goal.update({
      where: { id },
      data: {
        ...data,
        deadline: data.deadline ? new Date(data.deadline) : undefined,
      },
    });
  }

  async remove(id: string, userId: string) {
    const goal = await this.prisma.goal.findUnique({ where: { id } });

    if (!goal) {
      throw new NotFoundException('Goal not found');
    }

    // Check access
    if (goal.userId !== userId) {
      if (goal.familyId) {
        const hasAccess = await isFamilyMember(this.prisma, userId, goal.familyId);
        if (!hasAccess) throw new NotFoundException('Goal not found');
      } else {
        throw new NotFoundException('Goal not found');
      }
    }

    return this.prisma.goal.delete({ where: { id } });
  }

  async contribute(id: string, userId: string, amount: number) {
    const goal = await this.prisma.goal.findUnique({ where: { id } });

    if (!goal) {
      throw new NotFoundException('Goal not found');
    }

    // Check access
    if (goal.userId !== userId) {
      if (goal.familyId) {
        const hasAccess = await isFamilyMember(this.prisma, userId, goal.familyId);
        if (!hasAccess) throw new NotFoundException('Goal not found');
      } else {
        throw new NotFoundException('Goal not found');
      }
    }

    return this.prisma.goal.update({
      where: { id },
      data: { currentAmount: { increment: amount } },
    });
  }
}
