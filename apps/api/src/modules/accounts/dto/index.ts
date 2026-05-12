import { IsString, IsOptional, IsNumber, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAccountDto {
  @ApiProperty({ example: 'Banco principal' })
  @IsString()
  name: string;

  @ApiProperty({ enum: ['checking', 'savings', 'credit', 'cash', 'investment'] })
  @IsEnum(['checking', 'savings', 'credit', 'cash', 'investment'] as const)
  type: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiProperty({ required: false, example: '#6366F1' })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiProperty({ required: false, example: 0 })
  @IsNumber()
  @IsOptional()
  balance?: number;

  @ApiProperty({ required: false, example: 'USD' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  familyId?: string;
}

export class UpdateAccountDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ required: false })
  @IsEnum(['checking', 'savings', 'credit', 'cash', 'investment'] as const)
  @IsOptional()
  type?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  balance?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  currency?: string;
}