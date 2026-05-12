import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Alimentación' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'utensils' })
  @IsString()
  icon: string;

  @ApiProperty({ example: '#10B981' })
  @IsString()
  color: string;

  @ApiProperty({ enum: ['INCOME', 'EXPENSE'] })
  @IsEnum(['INCOME', 'EXPENSE'] as const)
  type: 'INCOME' | 'EXPENSE';

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  familyId?: string;
}

export class UpdateCategoryDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiProperty({ enum: ['INCOME', 'EXPENSE'], required: false })
  @IsEnum(['INCOME', 'EXPENSE'] as const)
  @IsOptional()
  type?: 'INCOME' | 'EXPENSE';
}