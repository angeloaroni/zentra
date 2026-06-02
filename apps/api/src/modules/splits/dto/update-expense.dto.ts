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

export class UpdateExpenseDto {
  @IsString()
  @IsOptional()
  title?: string

  @IsString()
  @IsOptional()
  description?: string

  @IsNumber()
  @IsOptional()
  @Min(0.01)
  amount?: number

  @IsDateString()
  @IsOptional()
  date?: string

  @IsString()
  @IsOptional()
  @IsIn(['EQUAL', 'PERCENTAGE', 'EXACT'])
  splitType?: string

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => SplitInput)
  splits?: SplitInput[]
}
