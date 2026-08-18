import { IsString, IsOptional, IsIn } from 'class-validator'

export class CreateGroupDto {
  @IsString()
  name: string

  @IsString()
  @IsOptional()
  description?: string

  @IsString()
  @IsOptional()
  icon?: string

  @IsString()
  @IsOptional()
  color?: string

  @IsString()
  @IsOptional()
  @IsIn(['USD', 'EUR', 'GBP', 'MXN', 'COP', 'ARS', 'CLP', 'PEN', 'BRL', 'VES'])
  currency?: string
}
