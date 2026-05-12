import { Controller, Post, Req, Headers } from '@nestjs/common'
import { SubscriptionsService } from './subscriptions.service'
import { Request } from 'express'

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post('stripe')
  async handleStripeWebhook(
    @Req() req: Request,
    @Headers('stripe-signature') signature: string,
  ) {
    const rawBody = (req as any).rawBody || JSON.stringify(req.body)
    return this.subscriptionsService.handleWebhook(signature, rawBody)
  }
}