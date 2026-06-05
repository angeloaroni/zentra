import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsDate } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTransactionDto {
  @ApiProperty({ enum: ['INCOME', 'EXPENSE'] })
  @IsEnum(['INCOME', 'EXPENSE'] as const)
  type: 'INCOME' | 'EXPENSE';

  @ApiProperty({ example: 'Supermercado' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Compra semanal de alimentos' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 85.50 })
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @ApiProperty({ example: 'USD' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty({ example: '2026-05-06T10:30:00Z' })
  @IsDate()
  @Transform(({ value }) => new Date(value))
  date: Date;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @ApiProperty({ example: 'Frutas y verduras' })
  @IsString()
  @IsOptional()
  subcategory?: string;

  @ApiProperty({ example: 'Tarjeta de crédito' })
  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @ApiProperty({ example: false })
  @IsOptional()
  isRecurring?: boolean;

  @ApiProperty({ enum: ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] })
  @IsEnum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] as const)
  @IsOptional()
  recurringFreq?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

  @ApiProperty({ example: 'https://example.com/receipt.jpg' })
  @IsString()
  @IsOptional()
  attachmentUrl?: string;

  @ApiProperty({ example: 'Gasto familiar' })
  @IsString()
  @IsOptional()
  familyId?: string;

  @ApiProperty({ example: 'account-id-1' })
  @IsString()
  @IsOptional()
  accountId?: string;

  @ApiProperty({ example: ['tag-id-1', 'tag-id-2'] })
  @IsString({ each: true })
  @IsOptional()
  tagIds?: string[];
}
