import { Controller, Get, UseGuards, Req } from '@nestjs/common'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { PlanGuard, Plan } from '../subscriptions/plan.guard'
import { InsightsService } from './insights.service'

@Controller('insights')
@UseGuards(JwtAuthGuard, PlanGuard)
@Plan('pro')
export class InsightsController {
  constructor(private insightsService: InsightsService) {}

  @Get()
  getInsights(@Req() req: any) {
    return this.insightsService.getInsights(req.user.id)
  }
}
