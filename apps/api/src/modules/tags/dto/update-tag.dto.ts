import { IsString, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateTagDto {
  @ApiProperty({ example: 'Cumpleaños de Sofía', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: '#FF6B6B', required: false })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiProperty({ example: 'cake', required: false })
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiProperty({ example: 500, required: false })
  @IsNumber()
  @IsOptional()
  budget?: number;
}
