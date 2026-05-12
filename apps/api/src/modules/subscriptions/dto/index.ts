import { IsString, IsIn, IsOptional, IsNumber } from 'class-validator'

export class CreateSubscriptionDto {
  @IsString()
  @IsIn(['free', 'pro', 'family'])
  plan!: string
}

export class CheckoutSessionDto {
  @IsString()
  @IsIn(['pro', 'family'])
  priceId!: string

  @IsOptional()
  @IsNumber()
  trialDays?: number
}