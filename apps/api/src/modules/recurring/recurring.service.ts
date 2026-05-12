import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class RecurringService implements OnModuleInit {
  private readonly logger = new Logger(RecurringService.name);

  constructor(private prisma: PrismaService) {}

  onModuleInit() {
    setInterval(() => this.processRecurring(), 60 * 60 * 1000);
    this.processRecurring();
  }

  async processRecurring() {
    this.logger.log('Checking recurring transactions...');

    const recurring = await this.prisma.transaction.findMany({
      where: { isRecurring: true },
    });

    let created = 0;

    for (const tx of recurring) {
      const nextDate = this.calculateNextDate(tx.date, tx.recurringFreq || 'MONTHLY');
      if (!nextDate || nextDate > new Date()) continue;

      const exists = await this.prisma.transaction.findFirst({
        where: {
          userId: tx.userId,
          title: tx.title,
          categoryId: tx.categoryId,
          date: {
            gte: this.startOfMonth(nextDate),
            lt: this.endOfMonth(nextDate),
          },
        },
      });

      if (exists) continue;

      await this.prisma.transaction.create({
        data: {
          type: tx.type,
          title: tx.title,
          description: tx.description,
          amount: tx.amount,
          currency: tx.currency,
          date: nextDate,
          categoryId: tx.categoryId,
          subcategory: tx.subcategory,
          paymentMethod: tx.paymentMethod,
          isRecurring: false,
          userId: tx.userId,
          familyId: tx.familyId,
        },
      });

      created++;
    }

    if (created > 0) {
      this.logger.log(`Created ${created} recurring transaction(s)`);
    }
  }

  private calculateNextDate(lastDate: Date, freq: string): Date | null {
    const next = new Date(lastDate);
    switch (freq) {
      case 'DAILY': next.setDate(next.getDate() + 1); break;
      case 'WEEKLY': next.setDate(next.getDate() + 7); break;
      case 'MONTHLY': next.setMonth(next.getMonth() + 1); break;
      case 'YEARLY': next.setFullYear(next.getFullYear() + 1); break;
      default: return null;
    }
    return next;
  }

  private startOfMonth(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  private endOfMonth(date: Date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
  }
}
