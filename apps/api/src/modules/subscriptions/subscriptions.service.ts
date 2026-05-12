import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class SubscriptionsService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private stripe: any = null;

  constructor(private prisma: PrismaService) {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (stripeKey) {
      // Dynamic require to avoid TS issues with Stripe types
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Stripe = require('stripe');
      this.stripe = new Stripe(stripeKey);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private getStripe(): any {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured');
    }
    return this.stripe;
  }

  async findByUserId(userId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });
    if (!subscription) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new NotFoundException('User not found');
      return this.prisma.subscription.create({
        data: { userId, plan: 'free', status: 'active' },
      });
    }
    return subscription;
  }

  async createCheckoutSession(userId: string, priceId: string) {
    const stripe = this.getStripe();
    const subscription = await this.findByUserId(userId);

    let customerId = subscription.stripeCustomerId;

    if (!customerId) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new NotFoundException('User not found');

      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId },
      });
      customerId = customer.id;
      await this.prisma.subscription.update({
        where: { userId },
        data: { stripeCustomerId: customerId },
      });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/settings?billing=success`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/settings?billing=cancel`,
      metadata: { userId },
    });

    return { url: session.url };
  }

  async createPortalSession(userId: string) {
    const stripe = this.getStripe();
    const subscription = await this.findByUserId(userId);

    if (!subscription.stripeCustomerId) {
      throw new BadRequestException('No Stripe customer found');
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/settings`,
    });

    return { url: session.url };
  }

  async updatePlan(userId: string, plan: string) {
    await this.findByUserId(userId);
    return this.prisma.subscription.update({
      where: { userId },
      data: { plan },
    });
  }

  async cancelSubscription(userId: string) {
    const subscription = await this.findByUserId(userId);

    if (!subscription.stripeSubscriptionId) {
      return this.prisma.subscription.update({
        where: { userId },
        data: { plan: 'free', status: 'cancelled' },
      });
    }

    const stripe = this.getStripe();
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    return this.prisma.subscription.update({
      where: { userId },
      data: { cancelAtPeriodEnd: true },
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async handleWebhook(signature: string, rawBody: string): Promise<{ received: boolean }> {
    const stripe = this.getStripe();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new BadRequestException('Webhook secret not configured');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let event: any;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err) {
      throw new BadRequestException('Invalid signature');
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.userId;
        if (!userId) break;

        const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
        const priceId = lineItems.data[0]?.price?.id;

        const planMap: Record<string, string> = {};
        const prices = process.env.STRIPE_PRICES || '';
        for (const mapping of prices.split(',')) {
          const [pid, plan] = mapping.split('=');
          if (pid && plan) planMap[pid] = plan;
        }

        await this.prisma.subscription.upsert({
          where: { userId },
          update: {
            plan: planMap[priceId] || 'pro',
            status: 'active',
            stripeCustomerId: session.customer,
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
          create: {
            userId,
            plan: planMap[priceId] || 'pro',
            status: 'active',
            stripeCustomerId: session.customer,
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        });
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object;
        await this.prisma.subscription.updateMany({
          where: { stripeCustomerId: sub.customer },
          data: {
            status: sub.status === 'active' ? 'active' : 'cancelled',
            currentPeriodStart: new Date(sub.current_period_start * 1000),
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
            cancelAtPeriodEnd: sub.cancel_at_period_end,
          },
        });
        break;
      }

      case 'customer.subscription.deleted': {
        const deletedSub = event.data.object;
        await this.prisma.subscription.updateMany({
          where: { stripeCustomerId: deletedSub.customer },
          data: { plan: 'free', status: 'cancelled', cancelAtPeriodEnd: false },
        });
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        await this.prisma.subscription.updateMany({
          where: { stripeCustomerId: invoice.customer },
          data: { status: 'past_due' },
        });
        break;
      }
    }

    return { received: true };
  }
}