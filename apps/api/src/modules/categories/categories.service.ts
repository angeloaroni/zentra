import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { getScopeUserIds, isFamilyMember } from '../families/family-access.helper';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, data: { name: string; icon: string; color: string; type: string; familyId?: string }) {
    return this.prisma.category.create({
      data: {
        name: data.name,
        icon: data.icon,
        color: data.color,
        type: data.type,
        userId,
        familyId: data.familyId || null,
      },
    });
  }

  async findMany(userId: string, options: {
    type?: 'INCOME' | 'EXPENSE' | 'BOTH';
    familyId?: string;
    includeDefault?: boolean;
  } = {}) {
    let where: any;

    if (options.familyId) {
      const conditions: any[] = [
        { familyId: options.familyId },
        { userId, isDefault: true },
      ];
      where = { OR: conditions };
    } else {
      where = {
        userId,
        familyId: null,
      };
    }

    if (options.type && options.type !== 'BOTH') {
      where.type = options.type;
    }

    return this.prisma.category.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string, userId: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    // Owner can always access
    if (category.userId === userId) {
      return category;
    }

    // Default categories are public
    if (category.isDefault) {
      return category;
    }

    // Family categories: check membership
    if (category.familyId) {
      const hasAccess = await isFamilyMember(this.prisma, userId, category.familyId);
      if (hasAccess) return category;
    }

    throw new NotFoundException('Category not found');
  }

  async update(id: string, userId: string, data: Partial<{ name: string; icon: string; color: string; type: string }>) {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    // Check access
    if (category.userId !== userId && !category.isDefault) {
      if (category.familyId) {
        const hasAccess = await isFamilyMember(this.prisma, userId, category.familyId);
        if (!hasAccess) throw new NotFoundException('Category not found');
      } else {
        throw new NotFoundException('Category not found');
      }
    }

    return this.prisma.category.update({
      where: { id },
      data,
    });
  }

  async remove(id: string, userId: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    // Check access
    if (category.userId !== userId && !category.isDefault) {
      if (category.familyId) {
        const hasAccess = await isFamilyMember(this.prisma, userId, category.familyId);
        if (!hasAccess) throw new NotFoundException('Category not found');
      } else {
        throw new NotFoundException('Category not found');
      }
    }

    // Check if category has transactions
    const transactionCount = await this.prisma.transaction.count({
      where: { categoryId: id },
    });

    if (transactionCount > 0) {
      throw new Error('Cannot delete category with existing transactions');
    }

    return this.prisma.category.delete({ where: { id } });
  }

  async getDefaultCategories() {
    return this.prisma.category.findMany({
      where: { isDefault: true },
      orderBy: { name: 'asc' },
    });
  }
}
