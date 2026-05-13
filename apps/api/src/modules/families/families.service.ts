import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class FamiliesService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, name: string) {
    const family = await this.prisma.family.create({
      data: {
        name,
        createdById: userId,
      },
    });

    await this.prisma.familyMember.create({
      data: {
        familyId: family.id,
        userId,
        role: 'ADMIN',
      },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { familyId: family.id },
    });

    return family;
  }

  async findById(id: string) {
    const family = await this.prisma.family.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { id: true, name: true, avatar: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, avatar: true },
            },
          },
        },
      },
    });

    if (!family) {
      throw new NotFoundException('Family not found');
    }

    return family;
  }

  async findByUserId(userId: string) {
    return this.prisma.family.findMany({
      where: {
        OR: [
          { createdById: userId },
          { members: { some: { userId } } },
        ],
      },
      include: {
        createdBy: {
          select: { id: true, name: true, avatar: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, avatar: true },
            },
          },
        },
      },
    });
  }

  async update(id: string, userId: string, data: Partial<{ name: string }>) {
    const family = await this.prisma.family.findUnique({
      where: { id },
    });

    if (!family) {
      throw new NotFoundException('Family not found');
    }

    // Check if user is admin or creator
    if (family.createdById !== userId) {
      const member = await this.prisma.familyMember.findFirst({
        where: { familyId: id, userId },
      });

      if (!member || member.role !== 'ADMIN') {
        throw new ForbiddenException('Not authorized');
      }
    }

    return this.prisma.family.update({
      where: { id },
      data,
    });
  }

  async inviteMember(familyId: string, userId: string, email: string) {
    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException('No se encontro ningun usuario con ese email. El usuario debe estar registrado en Zentra para poder invitarlo.');
    }

    // Check if already a member
    const existing = await this.prisma.familyMember.findFirst({
      where: {
        familyId,
        userId: user.id,
      },
    });

    if (existing) {
      throw new BadRequestException('Este usuario ya es miembro de la familia');
    }

    // Check if user already belongs to another family
    if (user.familyId && user.familyId !== familyId) {
      throw new BadRequestException('Este usuario ya pertenece a otra familia');
    }

    // Add member and set user's familyId
    const [member] = await this.prisma.$transaction([
      this.prisma.familyMember.create({
        data: {
          familyId,
          userId: user.id,
        },
        include: {
          user: {
            select: { id: true, name: true, avatar: true },
          },
        },
      }),
      this.prisma.user.update({
        where: { id: user.id },
        data: { familyId },
      }),
    ]);

    return member;
  }

  async removeMember(familyId: string, userId: string, memberUserId: string) {
    // Check if user is admin or creator
    const family = await this.prisma.family.findUnique({
      where: { id: familyId },
    });

    if (!family) {
      throw new NotFoundException('Family not found');
    }

    if (family.createdById !== userId) {
      const member = await this.prisma.familyMember.findFirst({
        where: { familyId, userId },
      });

      if (!member || member.role !== 'ADMIN') {
        throw new ForbiddenException('Not authorized');
      }
    }

    // Remove member (but not if it's the last member or the creator)
    const memberToRemove = await this.prisma.familyMember.findUnique({
      where: {
        userId_familyId: {
          userId: memberUserId,
          familyId,
        },
      },
    });

    if (!memberToRemove) {
      throw new NotFoundException('Member not found');
    }

    // Check if trying to remove creator
    if (family.createdById === memberUserId) {
      throw new BadRequestException('Cannot remove family creator');
    }

    return this.prisma.familyMember.delete({
      where: {
        userId_familyId: {
          familyId,
          userId: memberUserId,
        },
      },
    });
  }

  async getMembers(familyId: string) {
    return this.prisma.familyMember.findMany({
      where: { familyId },
      include: {
        user: {
          select: { id: true, name: true, avatar: true, role: true },
        },
      },
    });
  }
}