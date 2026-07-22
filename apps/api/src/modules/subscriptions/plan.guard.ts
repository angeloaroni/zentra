import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '../../database/prisma.service'
import { Reflector } from '@nestjs/core'
import { IS_PUBLIC_KEY } from '../../common/guards/public.decorator'

export const PLAN_KEY = 'plan'

@Injectable()
export class PlanGuard implements CanActivate {
  constructor(
    private prisma: PrismaService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (isPublic) {
      return true
    }

    const requiredPlan = this.reflector.getAllAndOverride<string[]>(PLAN_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    if (!requiredPlan || requiredPlan.length === 0) {
      return true
    }

    const request = context.switchToHttp().getRequest()
    const userId = request.user?.id
    if (!userId) return false

    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (user?.role === 'ADMIN') return true

    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    })

    const plan = subscription?.plan || 'free'
    const planLevel: Record<string, number> = { free: 0, pro: 1, family: 2 }

    const userLevel = planLevel[plan] ?? 0
    const requiredLevel = Math.min(
      ...requiredPlan.map((p) => planLevel[p] ?? 0),
    )

    if (userLevel < requiredLevel) {
      throw new ForbiddenException(
        `This feature requires a ${requiredPlan.join(' or ')} plan. Upgrade to continue.`,
      )
    }

    return true
  }
}