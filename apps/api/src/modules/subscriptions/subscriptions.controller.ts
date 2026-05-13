import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { SubscriptionsService } from './subscriptions.service'
import { PlanLimitsService } from './plan-limits.service'
import { CreateSubscriptionDto, CheckoutSessionDto } from './dto'
import { Request } from 'express'

@Controller('subscriptions')
@UseGuards(JwtAuthGuard)
export class SubscriptionsController {
  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly planLimitsService: PlanLimitsService,
  ) {}

  @Get()
  async getMySubscription(@Req() req: Request) {
    return this.subscriptionsService.findByUserId((req as any).user.id)
  }

  @Get('usage')
  async getUsage(@Req() req: Request) {
    return this.planLimitsService.getUsage((req as any).user.id)
  }

  @Post('checkout')
  async createCheckoutSession(
    @Req() req: Request,
    @Body() dto: CheckoutSessionDto,
  ) {
    return this.subscriptionsService.createCheckoutSession(
      (req as any).user.id,
      dto.priceId,
    )
  }

  @Post('portal')
  async createPortalSession(@Req() req: Request) {
    return this.subscriptionsService.createPortalSession((req as any).user.id)
  }

  @Patch()
  async updatePlan(
    @Req() req: Request,
    @Body() dto: CreateSubscriptionDto,
  ) {
    return this.subscriptionsService.updatePlan((req as any).user.id, dto.plan)
  }

  @Post('cancel')
  async cancelSubscription(@Req() req: Request) {
    return this.subscriptionsService.cancelSubscription((req as any).user.id)
  }
}