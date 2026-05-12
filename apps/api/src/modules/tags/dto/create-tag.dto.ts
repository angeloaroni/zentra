import { IsString, IsNotEmpty, IsOptional, IsNumber, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTagDto {
  @ApiProperty({ example: 'Cumpleaños de Sofía' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '#FF6B6B', required: false })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiProperty({ example: 'cake' })
  @IsString()
  @IsNotEmpty()
  icon: string;

  @ApiProperty({ example: 500, required: false })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  budget?: number;

  @ApiProperty({ example: 'fam_xxx', required: false })
  @IsString()
  @IsOptional()
  familyId?: string;
}
