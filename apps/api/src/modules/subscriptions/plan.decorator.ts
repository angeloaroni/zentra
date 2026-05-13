import { SetMetadata } from '@nestjs/common'
import { PLAN_KEY } from './plan.guard'

export const Plan = (...plans: string[]) => SetMetadata(PLAN_KEY, plans)