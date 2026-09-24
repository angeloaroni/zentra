import { IsString, IsOptional, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'MXN', 'COP', 'ARS', 'CLP', 'PEN', 'BRL', 'VES'];

export class UpdateProfileDto {
  @ApiProperty({ required: false, example: 'Juan García' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  avatar?: string;

  @ApiProperty({ required: false, example: 'EUR' })
  @IsOptional()
  @IsIn(CURRENCIES)
  currency?: string;
}

export class ChangePasswordDto {
  @ApiProperty({ example: 'currentPassword123' })
  @IsString()
  currentPassword: string;

  @ApiProperty({ example: 'newPassword456' })
  @IsString()
  newPassword: string;
}

export class DeleteAccountDto {
  @ApiProperty({ example: 'myPassword123' })
  @IsString()
  password: string;
}

export class JoinFamilyDto {
  @ApiProperty()
  @IsString()
  familyId: string;
}