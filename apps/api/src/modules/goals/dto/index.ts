import { IsString, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateGoalDto {
  @ApiProperty({ example: 'Vacaciones' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Ahorro para vacaciones' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 5000 })
  @IsNumber()
  targetAmount: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  deadline?: string;

  @ApiPropertyOptional({ example: 'plane' })
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiPropertyOptional({ example: '#3B82F6' })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  familyId?: string;
}

export class UpdateGoalDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  targetAmount?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  deadline?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  color?: string;
}

export class ContributeToGoalDto {
  @ApiProperty({ example: 100 })
  @IsNumber()
  amount: number;
}