import { IsString, IsOptional, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateFamilyDto {
  @ApiProperty({ example: 'Familia García' })
  @IsString()
  name: string;
}

export class UpdateFamilyDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  name?: string;
}

export class InviteMemberDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;
}