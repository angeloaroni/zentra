import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../database/prisma.service'

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async findMany(userId: string, options: { read?: boolean; type?: string; take?: number } = {}) {
    const where: any = { userId }
    if (options.read !== undefined) where.read = options.read
    if (options.type) where.type = options.type

    const [notifications, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options.take || 50,
      }),
      this.prisma.notification.count({ where }),
    ])

    return { notifications, total }
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, read: false },
    })
    return { count }
  }

  async markRead(userId: string, id: string) {
    const notification = await this.prisma.notification.findUnique({ where: { id } })
    if (!notification || notification.userId !== userId) {
      throw new NotFoundException('Notification not found')
    }
    return this.prisma.notification.update({
      where: { id },
      data: { read: true },
    })
  }

  async markAllRead(userId: string, type?: string) {
    const where: any = { userId, read: false }
    if (type) where.type = type

    return this.prisma.notification.updateMany({
      where,
      data: { read: true },
    })
  }

  async remove(userId: string, id: string) {
    const notification = await this.prisma.notification.findUnique({ where: { id } })
    if (!notification || notification.userId !== userId) {
      throw new NotFoundException('Notification not found')
    }
    return this.prisma.notification.delete({ where: { id } })
  }

  async clearAll(userId: string) {
    return this.prisma.notification.deleteMany({ where: { userId } })
  }
}