import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({ datasources: { db: { url: process.env.DATABASE_URL } } });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Database connected successfully');
    } catch (err) {
      this.logger.error(`Database connection failed: ${err.message}`);
      this.logger.warn('App will start but DB operations will fail');
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}