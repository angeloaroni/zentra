import { Module } from '@nestjs/common'
import { SplitsController } from './splits.controller'
import { SplitsService } from './splits.service'
import { DebtSimplifierService } from './debt-simplifier.service'
import { SubscriptionsModule } from '../subscriptions/subscriptions.module'

@Module({
  imports: [SubscriptionsModule],
  controllers: [SplitsController],
  providers: [SplitsService, DebtSimplifierService],
  exports: [SplitsService],
})
export class SplitsModule {}
