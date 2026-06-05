import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../database/prisma.service'

@Injectable()
export class NetWorthService {
  constructor(private prisma: PrismaService) {}

  async getNetWorthHistory(userId: string, months: number = 12) {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth() - months, 1)

    const snapshots = await this.prisma.netWorthSnapshot.findMany({
      where: { userId, date: { gte: start } },
      orderBy: { date: 'asc' },
    })

    if (snapshots.length === 0) {
      const currentBalance = await this.getCurrentBalance(userId)
      return [{ date: now.toISOString().split('T')[0], balance: currentBalance }]
    }

    return snapshots.map(s => ({
      date: s.date.toISOString().split('T')[0],
      balance: s.totalBalance,
    }))
  }

  async getCurrentBalance(userId: string) {
    const accounts = await this.prisma.account.findMany({
      where: { userId },
    })
    return accounts.reduce((sum, acc) => sum + acc.balance, 0)
  }

  async createSnapshot(userId: string) {
    const balance = await this.getCurrentBalance(userId)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return this.prisma.netWorthSnapshot.upsert({
      where: { userId_date: { userId, date: today } },
      update: { totalBalance: balance },
      create: { userId, totalBalance: balance, date: today },
    })
  }
}
