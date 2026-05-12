import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { getScopeUserIds } from '../families/family-access.helper';

@Injectable()
export class TagsService {
  constructor(private prisma: PrismaService) {}

  private TAG_COLORS = [
    '#3B82F6', '#6366F1', '#10B981', '#EF4444',
    '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6',
    '#0EA5E9', '#84CC16', '#F97316', '#A855F7',
  ];

  private getRandomColor(): string {
    return this.TAG_COLORS[Math.floor(Math.random() * this.TAG_COLORS.length)];
  }

  async create(userId: string, dto: CreateTagDto) {
    return this.prisma.tag.create({
      data: {
        name: dto.name,
        color: dto.color || this.getRandomColor(),
        icon: dto.icon,
        budget: dto.budget || null,
        userId,
        familyId: dto.familyId || null,
      },
    });
  }

  async findAll(userId: string, familyId?: string) {
    const userIds = await getScopeUserIds(this.prisma, userId, familyId);

    const tags = await this.prisma.tag.findMany({
      where: {
        userId: { in: userIds },
        ...(familyId ? { familyId } : { familyId: null }),
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const tagsWithStats = await Promise.all(
      tags.map(async (tag) => {
        const transactions = await this.prisma.transaction.findMany({
          where: {
            tags: { some: { id: tag.id } },
            userId: { in: userIds },
            ...(familyId ? { familyId } : { familyId: null }),
            date: { gte: startOfMonth, lte: endOfMonth },
          },
          select: { amount: true, type: true },
        });

        const spent = transactions
          .filter((tx) => tx.type === 'EXPENSE')
          .reduce((sum, tx) => sum + tx.amount, 0);

        return {
          ...tag,
          stats: {
            spent,
            transactionCount: transactions.length,
            averagePerTransaction: transactions.length > 0 ? spent / transactions.length : 0,
          },
        };
      }),
    );

    return tagsWithStats;
  }

  async findOne(id: string, userId: string) {
    const tag = await this.prisma.tag.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true } },
      },
    });

    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    return tag;
  }

  async findByIdWithStats(id: string, userId: string, familyId?: string) {
    const tag = await this.prisma.tag.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true } },
      },
    });

    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    const userIds = await getScopeUserIds(this.prisma, userId, familyId);
    if (!userIds.includes(tag.userId)) {
      throw new NotFoundException('Tag not found');
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const transactions = await this.prisma.transaction.findMany({
      where: {
        tags: { some: { id } },
        userId: { in: userIds },
        ...(familyId ? { familyId } : { familyId: null }),
        date: { gte: startOfMonth, lte: endOfMonth },
      },
      include: {
        category: { select: { id: true, name: true, color: true, icon: true } },
        user: { select: { id: true, name: true } },
      },
      orderBy: { date: 'desc' },
    });

    const spent = transactions
      .filter(tx => tx.type === 'EXPENSE')
      .reduce((sum, tx) => sum + tx.amount, 0);

    return {
      ...tag,
      stats: {
        spent,
        transactionCount: transactions.length,
        firstDate: transactions.length > 0
          ? transactions[transactions.length - 1].date
          : null,
        lastDate: transactions.length > 0
          ? transactions[0].date
          : null,
        averagePerTransaction: transactions.length > 0
          ? spent / transactions.length
          : 0,
      },
      transactions,
    };
  }

  async update(id: string, userId: string, dto: UpdateTagDto) {
    const tag = await this.prisma.tag.findUnique({ where: { id } });

    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    if (tag.userId !== userId) {
      throw new NotFoundException('Tag not found');
    }

    return this.prisma.tag.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.color !== undefined && { color: dto.color }),
        ...(dto.icon !== undefined && { icon: dto.icon }),
        ...(dto.budget !== undefined && { budget: dto.budget }),
      },
    });
  }

  async remove(id: string, userId: string) {
    const tag = await this.prisma.tag.findUnique({ where: { id } });

    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    if (tag.userId !== userId) {
      throw new NotFoundException('Tag not found');
    }

    return this.prisma.tag.delete({ where: { id } });
  }

  async findByTagId(tagId: string, userId: string, familyId?: string) {
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
      },
      orderBy: { date: 'desc' },
    });
  }
}
