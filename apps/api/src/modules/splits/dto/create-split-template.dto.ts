import { IsString, IsOptional, IsIn, IsArray } from 'class-validator'

export class CreateSplitTemplateDto {
  @IsString()
  name: string

  @IsString()
  @IsIn(['EQUAL', 'PERCENTAGE', 'EXACT'])
  splitType: string

  @IsArray()
  @IsString({ each: true })
  memberIds: string[]
}
