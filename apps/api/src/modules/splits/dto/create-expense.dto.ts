import { IsString, IsNumber, IsOptional, IsIn, IsArray, ValidateNested, IsDateString, Min, Max } from 'class-validator'
import { Type } from 'class-transformer'

class SplitInput {
  @IsString()
  userId: string

  @IsNumber()
  @Min(0)
  amount: number

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  percentage?: number
}

export class CreateExpenseDto {
  @IsString()
  groupId: string

  @IsString()
  title: string

  @IsString()
  @IsOptional()
  description?: string

  @IsNumber()
  @Min(0.01)
  amount: number

  @IsString()
  @IsOptional()
  currency?: string

  @IsDateString()
  date: string

  @IsString()
  @IsIn(['EQUAL', 'PERCENTAGE', 'EXACT'])
  splitType: string

  @IsString()
  @IsOptional()
  paidById?: string

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SplitInput)
  splits: SplitInput[]
}
