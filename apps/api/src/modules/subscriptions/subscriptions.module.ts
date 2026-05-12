import { Module } from '@nestjs/common'
import { SubscriptionsController } from './subscriptions.controller'
import { WebhooksController } from './webhooks.controller'
import { SubscriptionsService } from './subscriptions.service'
import { PrismaModule } from '../../database/prisma.module'

@Module({
  imports: [PrismaModule],
  controllers: [SubscriptionsController, WebhooksController],
  providers: [SubscriptionsService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}