import { Module } from '@nestjs/common'
import { SubscriptionsController } from './subscriptions.controller'
import { WebhooksController } from './webhooks.controller'
import { SubscriptionsService } from './subscriptions.service'
import { PlanGuard } from './plan.guard'
import { PlanLimitsService } from './plan-limits.service'
import { PrismaModule } from '../../database/prisma.module'

@Module({
  imports: [PrismaModule],
  controllers: [SubscriptionsController, WebhooksController],
  providers: [SubscriptionsService, PlanGuard, PlanLimitsService],
  exports: [SubscriptionsService, PlanGuard, PlanLimitsService],
})
export class SubscriptionsModule {}