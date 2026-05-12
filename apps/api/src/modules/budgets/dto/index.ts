import { IsNumber, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBudgetDto {
  @ApiProperty({ example: 500 })
  @IsNumber()
  amount: number;

  @ApiProperty({ example: 5 })
  @IsNumber()
  month: number;

  @ApiProperty({ example: 2026 })
  @IsNumber()
  year: number;

  @ApiProperty()
  @IsString()
  categoryId: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  familyId?: string;
}

export class UpdateBudgetDto {
  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  amount?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  month?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  year?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  categoryId?: string;
}