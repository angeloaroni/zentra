import { IsString, IsNumber, IsOptional, IsIn, IsDateString, Min } from 'class-validator'

export class CreateRecurringSplitExpenseDto {
  @IsString()
  groupId: string

  @IsString()
  title: string

  @IsNumber()
  @Min(0.01)
  amount: number

  @IsString()
  @IsOptional()
  currency?: string

  @IsString()
  @IsIn(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'])
  frequency: string

  @IsString()
  @IsIn(['EQUAL', 'PERCENTAGE', 'EXACT'])
  splitType: string

  @IsDateString()
  nextDueDate: string
}
