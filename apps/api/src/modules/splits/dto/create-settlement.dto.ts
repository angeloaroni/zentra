import { IsString, IsNumber, IsOptional, IsDateString, Min } from 'class-validator'

export class CreateSettlementDto {
  @IsString()
  groupId: string

  @IsString()
  toUserId: string

  @IsNumber()
  @Min(0.01)
  amount: number

  @IsDateString()
  @IsOptional()
  date?: string

  @IsString()
  @IsOptional()
  notes?: string
}
