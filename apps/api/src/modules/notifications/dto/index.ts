import { IsString, IsOptional } from 'class-validator'

export class MarkReadDto {
  @IsString()
  id!: string
}

export class MarkAllReadDto {
  @IsOptional()
  @IsString()
  type?: string
}